import type { Handler } from '@netlify/functions';

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
const sanitizeString = (str: string): string => {
  if (!str) return '';
  if (typeof str !== 'string') str = String(str);

  let sanitized = str.replace(/\uFEFF/g, '').replace(/\u200B/g, '');

  while (sanitized.length > 0 && sanitized.charCodeAt(0) === 0xFEFF) {
    sanitized = sanitized.substring(1);
  }

  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
    sanitized = decoder.decode(encoder.encode(sanitized));
  } catch {
    // ignore
  }

  const chars: string[] = [];
  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i);
    if (code === 0xFEFF) continue;
    if (code > 0x10ffff) continue;
    chars.push(sanitized[i]);
  }
  sanitized = chars.join('');

  while (sanitized.length > 0 && sanitized.charCodeAt(0) === 0xFEFF) {
    sanitized = sanitized.substring(1);
  }

  return sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const extractGeminiHttpError = (raw: string) => {
  const text = String(raw || '');
  try {
    const parsed: GeminiHttpErrorPayload = JSON.parse(text);
    return {
      code: parsed?.error?.code as number | undefined,
      status: parsed?.error?.status as string | undefined,
      message: parsed?.error?.message as string | undefined,
      rawText: text,
    };
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

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '{}' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'GEMINI_API_KEY không được cấu hình trên server.' }),
    };
  }

  let body: any = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Body không hợp lệ (JSON).' }) };
  }

  let { patientDescription, systemInstruction } = body;
  if (!patientDescription || !systemInstruction) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Thiếu dữ liệu bệnh nhân hoặc hướng dẫn hệ thống.' }),
    };
  }

  patientDescription = sanitizeString(String(patientDescription));
  systemInstruction = sanitizeString(String(systemInstruction));

  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      let cleanPatientDesc = sanitizeString(patientDescription).replace(/^\uFEFF+/, '').replace(/\uFEFF/g, '');
      let cleanSystemInst = sanitizeString(systemInstruction).replace(/^\uFEFF+/, '').replace(/\uFEFF/g, '');

      const rebuildString = (str: string): string => {
        const codes: number[] = [];
        for (let i = 0; i < str.length; i++) {
          const code = str.charCodeAt(i);
          if (code !== 0xfeff && code <= 0x10ffff) codes.push(code);
        }
        return String.fromCharCode(...codes);
      };

      const safeContents = rebuildString(cleanPatientDesc);
      const safeSystemInst = rebuildString(cleanSystemInst);

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [{ role: 'user', parts: [{ text: safeContents }] }],
        systemInstruction: { parts: [{ text: safeSystemInst }] },
        generationConfig: { temperature: 0.2 },
      };

      const httpResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!httpResponse.ok) {
        const errorText = await httpResponse.text();
        const info = extractGeminiHttpError(errorText);

        if (isInvalidApiKeyError(info)) {
          const err: any = new Error('API Key không hợp lệ.');
          err.status = 401;
          throw err;
        }
        if (isKeyPermissionOrReferrerError(info)) {
          const err: any = new Error(
            'API Key bị từ chối quyền (thường do giới hạn domain/referrer). Vui lòng kiểm tra phần API key restrictions trong Google AI Studio.'
          );
          err.status = 403;
          throw err;
        }

        throw new Error(`Gemini API error: ${httpResponse.status} - ${info.message || info.rawText || httpResponse.statusText}`);
      }

      const responseData: any = await httpResponse.json();
      const result = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!result || String(result).trim().length === 0) {
        throw new Error('Phản hồi từ AI rỗng.');
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ analysis: sanitizeString(String(result)), model: 'gemini-2.0-flash' }),
      };
    } catch (err: any) {
      lastError = err;

      if (err?.status === 401) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'API Key không hợp lệ.' }) };
      }
      if (err?.status === 403) {
        return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: err?.message || 'API Key bị từ chối quyền.' }) };
      }
      if (String(err?.message || '').includes('QUOTA') || err?.status === 429) {
        return { statusCode: 429, headers: corsHeaders, body: JSON.stringify({ error: 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau vài phút.' }) };
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  const errMsg = lastError?.message || String(lastError || '');
  return {
    statusCode: 500,
    headers: corsHeaders,
    body: JSON.stringify({ error: `Không thể phân tích dữ liệu: ${errMsg || 'Không rõ nguyên nhân'}` }),
  };
};

