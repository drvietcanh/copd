import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

type GeminiHttpErrorPayload =
  | {
      error?: {
        code?: number;
        message?: string;
        status?: string;
      };
    }
  | any;

// Helper to remove BOM and sanitize strings for ByteString conversion
// Ultra-aggressive sanitization using TextEncoder/TextDecoder
const sanitizeString = (str: string): string => {
  if (!str) return '';
  if (typeof str !== 'string') {
    str = String(str);
  }
  
  // Method 1: Remove BOM using regex
  let sanitized = str.replace(/\uFEFF/g, '').replace(/\u200B/g, '');
  
  // Method 2: Remove BOM from start (loop)
  while (sanitized.length > 0 && sanitized.charCodeAt(0) === 0xFEFF) {
    sanitized = sanitized.substring(1);
  }
  
  // Method 3: Use TextEncoder/TextDecoder to normalize (Node.js environment)
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
    const bytes = encoder.encode(sanitized);
    sanitized = decoder.decode(bytes);
  } catch (e) {
    // Fallback if TextEncoder/Decoder not available
    console.warn('TextEncoder/Decoder not available, using fallback');
  }
  
  // Method 4: Manual filter
  const chars: string[] = [];
  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i);
    if (code === 0xFEFF) continue; // BOM
    if (code > 0x10FFFF) continue; // Invalid Unicode
    chars.push(sanitized[i]);
  }
  sanitized = chars.join('');
  
  // Method 5: Final BOM check
  while (sanitized.length > 0 && sanitized.charCodeAt(0) === 0xFEFF) {
    sanitized = sanitized.substring(1);
  }
  
  // Normalize
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  return sanitized.trim();
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const extractGeminiHttpError = (raw: string) => {
  const text = String(raw || '');
  try {
    const parsed: GeminiHttpErrorPayload = JSON.parse(text);
    const status = parsed?.error?.status;
    const message = parsed?.error?.message;
    const code = parsed?.error?.code;
    return { code, status, message, rawText: text };
  } catch {
    return { code: undefined as number | undefined, status: undefined as string | undefined, message: undefined as string | undefined, rawText: text };
  }
};

const isInvalidApiKeyError = (info: { status?: string; message?: string; rawText?: string }) => {
  const hay = `${info.status || ''} ${info.message || ''} ${info.rawText || ''}`.toLowerCase();
  return (
    info.status === 'UNAUTHENTICATED' ||
    hay.includes('api key not valid') ||
    hay.includes('api_key_invalid') ||
    hay.includes('invalid api key') ||
    hay.includes('api key invalid') ||
    hay.includes('invalidapikey') ||
    hay.includes('apikeynotvalid')
  );
};

const isKeyPermissionOrReferrerError = (info: { status?: string; message?: string; rawText?: string }) => {
  const hay = `${info.status || ''} ${info.message || ''} ${info.rawText || ''}`.toLowerCase();
  return (
    info.status === 'PERMISSION_DENIED' ||
    hay.includes('permission_denied') ||
    hay.includes('referer') ||
    hay.includes('referrer') ||
    hay.includes('api key is not authorized') ||
    hay.includes('api key not authorized') ||
    hay.includes('not authorized')
  );
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY không được cấu hình trên server.' 
      });
    }

    let { patientDescription, systemInstruction, userMode } = req.body;

    if (!patientDescription || !systemInstruction) {
      return res.status(400).json({ 
        error: 'Thiếu dữ liệu bệnh nhân hoặc hướng dẫn hệ thống.' 
      });
    }

    // Sanitize strings to remove BOM and problematic characters
    patientDescription = sanitizeString(String(patientDescription));
    systemInstruction = sanitizeString(String(systemInstruction));

    // Bypass SDK and call API directly via HTTP to avoid BOM issues
    // The SDK seems to have issues with BOM serialization
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Ultra-aggressive sanitization
        let cleanPatientDesc = sanitizeString(patientDescription);
        let cleanSystemInst = sanitizeString(systemInstruction);
        
        // Remove BOM completely
        cleanPatientDesc = cleanPatientDesc.replace(/^\uFEFF+/, '').replace(/\uFEFF/g, '');
        cleanSystemInst = cleanSystemInst.replace(/^\uFEFF+/, '').replace(/\uFEFF/g, '');
        
        // Rebuild from char codes
        const rebuildString = (str: string): string => {
          const codes: number[] = [];
          for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code !== 0xFEFF && code <= 0x10FFFF) {
              codes.push(code);
            }
          }
          return String.fromCharCode(...codes);
        };
        
        const safeContents = rebuildString(cleanPatientDesc);
        const safeSystemInst = rebuildString(cleanSystemInst);
        
        // Call Gemini API directly via HTTP
        // Use a stable model name supported by v1beta generateContent
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const requestBody = {
          contents: [{
            role: 'user',
            parts: [{ text: safeContents }]
          }],
          systemInstruction: {
            parts: [{ text: safeSystemInst }]
          },
          generationConfig: {
            temperature: 0.2
          }
        };
        
        const httpResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!httpResponse.ok) {
          const errorText = await httpResponse.text();
          const info = extractGeminiHttpError(errorText);
          if (isInvalidApiKeyError(info)) {
            const err: any = new Error("API Key không hợp lệ.");
            err.status = 401;
            throw err;
          }
          if (isKeyPermissionOrReferrerError(info)) {
            const err: any = new Error(
              "API Key bị từ chối quyền (thường do giới hạn domain/referrer). Vui lòng kiểm tra phần API key restrictions trong Google AI Studio."
            );
            err.status = 403;
            throw err;
          }
          throw new Error(
            `Gemini API error: ${httpResponse.status} - ${info.message || info.rawText || httpResponse.statusText}`
          );
        }

        const responseData = await httpResponse.json();
        
        if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content) {
          throw new Error('Phản hồi từ AI không hợp lệ.');
        }

        const result = responseData.candidates[0].content.parts[0].text;
        if (!result || result.trim().length === 0) {
          throw new Error('Phản hồi từ AI rỗng.');
        }

        // Sanitize result before returning
        const cleanResult = sanitizeString(result);

        return res.status(200).json({ 
          analysis: cleanResult,
          model: 'gemini-2.0-flash'
        });
      } catch (error: any) {
        lastError = error;
        
        // Check for ByteString conversion error
        if (error?.message?.includes('ByteString') || error?.message?.includes('65279')) {
          console.error('ByteString conversion error:', error.message);
          // Try to sanitize more aggressively
          patientDescription = sanitizeString(patientDescription);
          systemInstruction = sanitizeString(systemInstruction);
          // Continue to retry with sanitized strings
          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Check for specific error types
        if (error?.message?.includes('API_KEY') || error?.status === 401 || error?.message?.includes('API Key không hợp lệ')) {
          return res.status(401).json({ 
            error: 'API Key không hợp lệ.' 
          });
        }

        if (error?.status === 403) {
          return res.status(403).json({
            error: error?.message || 'API Key bị từ chối quyền.'
          });
        }
        
        if (error?.message?.includes('QUOTA') || error?.status === 429) {
          return res.status(429).json({ 
            error: 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau vài phút.' 
          });
        }

        // If not last attempt, wait before retry
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // If all retries failed
    console.error("Gemini API Error after retries:", lastError);
    
    // Extract detailed error message
    let errorMessage = 'Không thể phân tích dữ liệu sau nhiều lần thử.';
    let statusCode = 500;
    
    if (lastError) {
      const errMsg = lastError.message || String(lastError);
      
      // Check for specific error types
      if (errMsg.includes('API Key không hợp lệ') || errMsg.includes('API_KEY') || lastError?.status === 401) {
        errorMessage = 'API Key không hợp lệ. Vui lòng kiểm tra lại biến môi trường GEMINI_API_KEY trên server.';
        statusCode = 401;
      } else if (errMsg.includes('QUOTA') || errMsg.includes('429') || lastError?.status === 429) {
        errorMessage = 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau vài phút hoặc kiểm tra quota API Key.';
        statusCode = 429;
      } else if (errMsg.includes('bị từ chối quyền') || errMsg.includes('PERMISSION_DENIED')) {
        errorMessage = 'API Key bị từ chối quyền. Vui lòng kiểm tra phần API key restrictions trong Google AI Studio.';
        statusCode = 403;
      } else if (errMsg.includes('Gemini API error')) {
        errorMessage = errMsg.replace('Gemini API error: ', 'Lỗi từ Gemini API: ');
      } else {
        errorMessage = `Không thể phân tích dữ liệu: ${errMsg}`;
      }
    }
    
    return res.status(statusCode).json({ 
      error: errorMessage 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Lỗi server không xác định.' 
    });
  }
}
