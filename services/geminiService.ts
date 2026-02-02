import { GoogleGenAI } from "@google/genai";
import { PatientData } from "../types";

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
// Ultra-aggressive sanitization - remove BOM at all costs
const sanitizeString = (str: string): string => {
  if (!str) return '';
  if (typeof str !== 'string') {
    str = String(str);
  }
  
  // Method 1: Remove ALL BOM characters using regex (global replace)
  let sanitized = str.replace(/\uFEFF/g, '').replace(/\u200B/g, '');
  
  // Method 2: Remove BOM from start (loop until completely gone)
  let iterations = 0;
  while (sanitized.length > 0 && sanitized.charCodeAt(0) === 0xFEFF && iterations < 100) {
    sanitized = sanitized.substring(1);
    iterations++;
  }
  
  // Method 3: Use TextEncoder/TextDecoder to normalize (if available)
  try {
    if (typeof TextEncoder !== 'undefined' && typeof TextDecoder !== 'undefined') {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
      const bytes = encoder.encode(sanitized);
      sanitized = decoder.decode(bytes);
    }
  } catch (e) {
    // Fallback if TextEncoder/Decoder not available
  }
  
  // Method 4: Manual character-by-character filter
  const chars: string[] = [];
  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i);
    // Absolutely skip BOM
    if (code === 0xFEFF) continue; // BOM
    if (code > 0x10FFFF) continue; // Invalid Unicode
    chars.push(sanitized[i]);
  }
  sanitized = chars.join('');
  
  // Method 5: Final aggressive BOM removal from start
  sanitized = sanitized.replace(/^\uFEFF+/, '');
  while (sanitized.length > 0 && sanitized.charCodeAt(0) === 0xFEFF) {
    sanitized = sanitized.substring(1);
  }
  
  // Method 6: If still has BOM, use array filter
  if (sanitized.length > 0 && sanitized.charCodeAt(0) === 0xFEFF) {
    sanitized = Array.from(sanitized).filter(char => char.charCodeAt(0) !== 0xFEFF).join('');
  }
  
  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  return sanitized.trim();
};

// Helper to ensure template strings don't have BOM
const cleanTemplate = (strings: TemplateStringsArray, ...values: any[]): string => {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += String(values[i]) + strings[i + 1];
  }
  return sanitizeString(result);
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

// Build base prompt and sanitize immediately
const BASE_SYSTEM_PROMPT_RAW = `
SYSTEM ROLE:
Bạn là trợ lý AI hỗ trợ ra quyết định lâm sàng về COPD (Clinical Decision Support System).
Nhiệm vụ: Phân tích dữ liệu và trình bày thông tin hỗ trợ ra quyết định cho bác sĩ.

QUY TẮC TUÂN THỦ NGHIÊM NGẶT (SAFETY & COMPLIANCE):

1. NGÔN NGỮ TƯ VẤN (KHÔNG RA LỆNH):
   - ❌ CẤM DÙNG: "phải", "bắt buộc", "yêu cầu", "cần chuyển", "ngừng ngay", "chuyển sang".
   - ✅ SỬ DỤNG: "có thể cân nhắc", "hướng dẫn GOLD 2026 khuyến cáo xem xét", "một phương án thường được xem xét là", "dữ liệu gợi ý lựa chọn...".

2. GẮN NHÃN NGUỒN THÔNG TIN (LABELING):
   Bắt buộc sử dụng các tiền tố sau cho mỗi luận điểm quan trọng:
   - [Theo GOLD 2026]: Khi thông tin dựa hoàn toàn vào hướng dẫn GOLD 2026.
   - [Gợi ý AI]: Khi là suy luận logic của hệ thống dựa trên tổng hợp dữ liệu.
   - [Cần cân nhắc lâm sàng]: Khi là yếu tố cá thể hóa, bệnh đồng mắc hoặc dữ liệu chưa rõ ràng cần bác sĩ đánh giá thêm.

3. QUY TRÌNH ĐỀ XUẤT ĐIỀU TRỊ:
   - Nguyên tắc: Nêu [LÝ DO/CƠ CHẾ] trước -> sau đó mới nêu [GỢI Ý].
   - Cảnh báo bắt buộc: Bất cứ khi nào gợi ý thay đổi thuốc hoặc khởi trị, phải kết thúc đoạn đó hoặc câu đó bằng câu:
     "Quyết định cuối cùng phụ thuộc đánh giá lâm sàng trực tiếp của bác sĩ điều trị."

CẤU TRÚC PHẢN HỒI (BẮT BUỘC SỬ DỤNG CÁC TIÊU ĐỀ ĐÁNH SỐ SAU):

0. Tóm Tắt Tổng Quan
(BẮT BUỘC định dạng chính xác như sau, không giải thích thêm, điền thông tin tương ứng):
🟦 GOLD {A/B/E}
🫁 Mức độ tắc nghẽn: GOLD {1–4} ({FEV1_Percent}%)
🔥 Nguy cơ đợt cấp: {Thấp / Cao}
📈 Triệu chứng: CAT {score} / mMRC {grade}

1. Chẩn đoán & Kiểu hình
(Tóm tắt bệnh cảnh. Nếu là Chuyên khoa: Phân tích sâu Phenotype. Nếu là Đa khoa: Chỉ nêu chẩn đoán sơ bộ).

2. Đánh giá Mức độ & Nguy cơ (GOLD 2026)
(Phân nhóm GOLD A/B/E, mức độ tắc nghẽn).

QUY TẮC PHÂN NHÓM GOLD 2026 (BẮT BUỘC TUÂN THỦ):
- ĐIỀU KIỆN XÁC NHẬN COPD (BẮT BUỘC):
  * Nếu FEV1/FVC ≥ 0.70 (sau giãn phế quản nếu có): CHƯA ĐỦ TIÊU CHUẨN CHẨN ĐOÁN COPD theo GOLD.
  * Khi chưa đủ tiêu chuẩn COPD: KHÔNG gán nhãn GOLD A/B/E hoặc GOLD 1–4 như chẩn đoán xác định.
    Thay vào đó: nêu "chưa đủ tiêu chuẩn COPD", gợi ý đánh giá lại (spirometry sau BD, loại trừ hen/suy tim/béo phì/giãn phế quản...) và kết luận phải dựa đánh giá lâm sàng.

- Mức độ tắc nghẽn (GOLD 1-4):
  * GOLD 1 (Nhẹ): FEV1% ≥ 80%
  * GOLD 2 (Trung bình): 50% ≤ FEV1% < 80%
  * GOLD 3 (Nặng): 30% ≤ FEV1% < 50%
  * GOLD 4 (Rất nặng): FEV1% < 30%

- Phân nhóm GOLD (A/B/E):
  * Triệu chứng:
    - Cao: CAT ≥ 10 HOẶC mMRC ≥ 2
    - Thấp: CAT < 10 VÀ mMRC < 2
  * Nguy cơ đợt cấp:
    - Cao: ≥2 đợt cấp/năm HOẶC ≥1 nhập viện/năm
    - Thấp: 0-1 đợt cấp/năm VÀ 0 nhập viện
  * Nhóm:
    - GOLD E: Nguy cơ cao (ưu tiên, bất kể triệu chứng)
    - GOLD A: Triệu chứng thấp + Nguy cơ thấp
    - GOLD B: Triệu chứng cao + Nguy cơ thấp

3. Các Yếu tố Nguy cơ Chính
(Tiền sử đợt cấp, Eosinophil, hút thuốc, bệnh đồng mắc).

4. Đối chiếu Điều trị với GOLD 2026
(Nhận xét sự phù hợp của phác đồ hiện tại. Dùng nhãn [Theo GOLD 2026] để so sánh).

5. Cân nhắc Quản lý (Thuốc & Không dùng thuốc)
(Đề xuất cụ thể. TUÂN THỦ NGHIÊM NGẶT quy tắc số 3: Lý do -> Gợi ý -> Disclaimer).

BẮT BUỘC bao gồm cho mỗi thuốc được đề xuất:
- Tên thuốc: Generic name + Brand name phổ biến tại VN (nếu có)
- Liều lượng: Dose cụ thể (ví dụ: 18mcg, 50/25mcg, 100/6mcg)
- Tần suất: Số lần/ngày (ví dụ: 1 lần/ngày, 2 lần/ngày)
- Cách dùng: Inhaler technique (DPI/MDI) nếu cần
- Thời gian điều trị: Khi nào đánh giá lại (ví dụ: sau 3 tháng)
- Contraindications: Chống chỉ định (ví dụ: Glaucoma với anticholinergics)
- Warnings: Cảnh báo (ví dụ: Tăng nguy cơ viêm phổi với ICS)
- Tương tác thuốc: Nếu có bệnh đồng mắc (ví dụ: Beta-blockers với LABA)
- Monitoring: Cần theo dõi gì (ví dụ: Đường huyết với ICS nếu có ĐTĐ)

Ví dụ format:
"LAMA (Tiotropium - Spiriva):
- Liều: 18mcg/ngày (1 viên nang)
- Cách dùng: DPI, hít sâu 1 lần/ngày
- Chống chỉ định: Glaucoma góc đóng, tắc nghẽn đường tiểu
- Cảnh báo: Khô miệng, táo bón
- Đánh giá lại: Sau 3 tháng"

6. Ghi chú Theo dõi
(Kế hoạch tái khám và các dấu hiệu cảnh báo).
`;

// Sanitize base prompt once at module load
const BASE_SYSTEM_PROMPT = sanitizeString(BASE_SYSTEM_PROMPT_RAW);

const parseFloatSafe = (val: string): number => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

// Phân tích sơ bộ để xác định Context cho Prompt
const getAnalysisContext = (data: PatientData) => {
  // 1. Data Quality Checks
  const hasSpirometry = !!(data.fev1L?.trim() && data.fev1FvcRatio?.trim() && data.fvcL?.trim());
  const hasHistory = data.exacerbationsLast12m?.trim() !== '';
  const exacerbationsCount = parseFloatSafe(data.exacerbationsLast12m);

  const missingKeys: string[] = [];
  if (!data.eosinophils?.trim()) missingKeys.push("Eosinophils");
  if (!data.imagingFindings?.trim()) missingKeys.push("Hình ảnh học");
  if (!data.catScore?.trim() && data.mMRC === '0') missingKeys.push("Điểm CAT");

  // 2. Clinical Certainty
  let copdConfidence: 'low' | 'moderate' | 'high' = 'low';
  if (hasSpirometry && hasHistory) copdConfidence = 'high';
  else if (hasSpirometry || hasHistory) copdConfidence = 'moderate';

  // ACO Suspicion Check (Asthma-COPD Overlap features)
  const eos = parseFloatSafe(data.eosinophils);
  const isReversible = data.postBdReversibility;
  const acoSuspicion = (isReversible || eos >= 300);

  // 3. Phenotypes
  const phenotype = {
    isEosinophilic: eos >= 300,
    hasChronicBronchitis: data.cough && data.sputum,
    hasEmphysema: /khí phế thũng|emphysema|kén khí|bullae|giãn phế nang/i.test(data.imagingFindings || ''),
  };

  // 4. Report Mode Determination (Verbosity Rules)
  let reportMode: 'short' | 'standard' | 'detailed' = 'detailed';
  
  if (copdConfidence === 'high' && hasSpirometry && exacerbationsCount >= 2) {
    reportMode = 'short';
  } else if (copdConfidence === 'moderate' || copdConfidence === 'high') {
    reportMode = 'standard';
  } else {
    reportMode = 'detailed';
  }

  return {
    reportMode,
    dataQuality: { hasSpirometry, hasHistory, missingKeys },
    clinicalCertainty: { copdConfidence, acoSuspicion },
    phenotype
  };
};

// Helper to sanitize a single field value
const sanitizeField = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return sanitizeString(str);
};

// Helper function to build patient description
const buildPatientDescription = (data: PatientData): string => {
  // Sanitize all string fields before using them
  const age = sanitizeField(data.age);
  const sex = sanitizeField(data.sex);
  const bmi = sanitizeField(data.bmi);
  const smokingHistory = sanitizeField(data.smokingHistory);
  const packYears = sanitizeField(data.packYears);
  const mMRC = sanitizeField(data.mMRC);
  const catScore = sanitizeField(data.catScore);
  const exacerbationsLast12m = sanitizeField(data.exacerbationsLast12m);
  const hospitalizationsLast12m = sanitizeField(data.hospitalizationsLast12m);
  const fev1L = sanitizeField(data.fev1L);
  const fev1Percent = sanitizeField(data.fev1Percent);
  const fev1FvcRatio = sanitizeField(data.fev1FvcRatio);
  const eosinophils = sanitizeField(data.eosinophils);
  const imagingFindings = sanitizeField(data.imagingFindings || 'N/A');
  const currentTreatment = sanitizeField(data.currentTreatment || 'Chưa rõ');
  const comorbidities = sanitizeField(data.comorbidities || 'Không');
  
  const desc = `
  DỮ LIỆU BỆNH NHÂN:

  1. NHÂN KHẨU:
  - Tuổi: ${age}, Giới: ${sex}, BMI: ${bmi}
  - Thuốc lá: ${smokingHistory} (${packYears} bao thuốc-năm)

  2. LÂM SÀNG:
  - mMRC: ${mMRC}, CAT: ${catScore}
  - Ho: ${data.cough ? '+' : '-'}, Đờm: ${data.sputum ? '+' : '-'}
  - Đợt cấp (12T): ${exacerbationsLast12m} (Nhập viện: ${hospitalizationsLast12m})

  3. CẬN LÂM SÀNG:
  - FEV1: ${fev1L}L (${fev1Percent}%), FEV1/FVC: ${fev1FvcRatio}
  - Reversibility: ${data.postBdReversibility ? 'Có' : 'Không'}
  - EOS máu: ${eosinophils}
  - Hình ảnh: ${imagingFindings}

  4. ĐIỀU TRỊ & BỆNH KÈM:
  - Thuốc hiện tại: ${currentTreatment}
  - Bệnh kèm: ${comorbidities}
  `;
  // Sanitize the entire description one more time
  return sanitizeString(desc);
};

export const buildGeminiPromptForAiStudio = (
  data: PatientData,
  userMode: 'GP' | 'SPECIALIST' = 'SPECIALIST'
): { systemInstruction: string; patientDescription: string; fullPrompt: string } => {
  const context = getAnalysisContext(data);
  const patientDescription = sanitizeString(sanitizeString(buildPatientDescription(data)));
  const systemInstruction = sanitizeString(sanitizeString(buildSystemInstruction(context, userMode)));

  const fullPrompt = sanitizeString(
    cleanTemplate`SYSTEM INSTRUCTION:
${systemInstruction}

PATIENT DATA:
${patientDescription}

YÊU CẦU:
- Tạo báo cáo theo đúng cấu trúc và quy tắc đã nêu trong SYSTEM INSTRUCTION.
- Trả về trực tiếp nội dung báo cáo (không giải thích thêm về cách làm).`
  );

  return { systemInstruction, patientDescription, fullPrompt };
};

// Helper function to build system instruction
const buildSystemInstruction = (
  context: ReturnType<typeof getAnalysisContext>,
  userMode: 'GP' | 'SPECIALIST'
): string => {
  let userModeInstruction = "";
  if (userMode === 'GP') {
    userModeInstruction = `
    --------------------------------------------------
    ⚠️ CHẾ ĐỘ NGƯỜI DÙNG: BÁC SĨ ĐA KHOA (GP / BASIC)
    --------------------------------------------------
    YÊU CẦU ĐẶC BIỆT:
    1. Rút gọn tối đa phần phân tích Hô hấp ký (Mục 1 & 2):
       - KHÔNG đi sâu vào cơ chế FEV1, Reversibility.
       - Chỉ cần nêu kết luận: Tắc nghẽn Nhẹ/Vừa/Nặng.
    2. Ngôn ngữ:
       - Sử dụng tiếng Việt đơn giản, tránh lạm dụng thuật ngữ tiếng Anh chuyên sâu (trừ tên thuốc/GOLD).
       - Giải thích ngắn gọn nếu dùng thuật ngữ như "Phenotype" hay "Trapping".
    3. Trọng tâm:
       - Tập trung vào Phân nhóm GOLD (A/B/E).
       - Đánh giá triệu chứng (CAT/mMRC) và Nguy cơ đợt cấp.
       - Đề xuất thuốc căn bản (LAMA, LABA) và giáo dục bệnh nhân.
    `;
  } else {
    userModeInstruction = `
    --------------------------------------------------
    👨‍⚕️ CHẾ ĐỘ NGƯỜI DÙNG: BÁC SĨ CHUYÊN KHOA (SPECIALIST)
    --------------------------------------------------
    YÊU CẦU ĐẶC BIỆT:
    1. Phân tích sâu Hô hấp ký & Phenotype:
       - Biện luận chi tiết về FEV1, đáp ứng giãn phế quản, và Eosinophil.
       - Phân tích kỹ phenotype (Khí phế thũng vs Viêm phế quản mạn vs ACO).
    2. Ngôn ngữ:
       - Sử dụng văn phong chuyên ngành Hô hấp.
    3. Trọng tâm:
       - Chiến lược tối ưu hóa phác đồ.
       - Các can thiệp chuyên sâu (Giảm thể tích phổi, thở máy, điều trị sinh học nếu có).
    `;
  }

  let adaptiveInstruction = "";
  switch (context.reportMode) {
    case 'short':
      adaptiveInstruction = `- [Internal Logic] Dữ liệu đầy đủ: Tập trung tối đa vào phân tầng nguy cơ.`;
      break;
    case 'detailed':
      adaptiveInstruction = `- [Internal Logic] Dữ liệu thiếu: Biện luận kỹ các khoảng trống dữ liệu.`;
      break;
    default:
      adaptiveInstruction = `- [Internal Logic] Cân bằng chẩn đoán và điều trị.`;
      break;
  }

  // Phenotype logic
  if (context.clinicalCertainty.acoSuspicion) {
    adaptiveInstruction += `\n- [QUAN TRỌNG - ACO] Có yếu tố gợi ý ACO (Reversibility/High EOS). Xem xét vai trò ICS.`;
  }

  if (context.phenotype.hasEmphysema) {
    adaptiveInstruction += `
    \n- [QUAN TRỌNG - KHÍ PHẾ THŨNG]:
      + Xác định ưu thế Khí phế thũng.
      + Nhấn mạnh LAMA/LABA để giảm căng giãn phổi động.
      + Nếu là Chuyên khoa (SPECIALIST): Đề cập can thiệp giảm thể tích phổi (LVRS/BLVR) nếu nặng.
    `;
  }

  if (context.phenotype.hasChronicBronchitis) {
    adaptiveInstruction += `
    \n- [QUAN TRỌNG - VIÊM PHẾ QUẢN MẠN]:
      + Xác định ưu thế Viêm phế quản mạn.
      + Nhấn mạnh nguy cơ đợt cấp nhiễm trùng.
      + Nếu FEV1 < 50% & đợt cấp nhiều: Xem xét Roflumilast/Azithromycin (kèm cảnh báo).
    `;
  }

  const fullInstruction = `${BASE_SYSTEM_PROMPT}\n\n${userModeInstruction}\n\n${adaptiveInstruction}`;
  return sanitizeString(fullInstruction);
};

// Call API route (secure, server-side)
const callApiRoute = async (
  patientDescription: string,
  systemInstruction: string,
  userMode: 'GP' | 'SPECIALIST'
): Promise<string> => {
  const apiUrl = '/api/assess';
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientDescription,
        systemInstruction,
        userMode,
      }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If JSON parsing fails, use status text
      }
      
      // Provide helpful messages for common status codes
      if (response.status === 401) {
        throw new Error("API Key không hợp lệ trên server. Vui lòng kiểm tra biến môi trường GEMINI_API_KEY (Vercel/Netlify) hoặc dùng chế độ thủ công trong phần Cài đặt.");
      } else if (response.status === 500) {
        throw new Error(`Lỗi server: ${errorMessage}. Vui lòng kiểm tra logs trên nền tảng deploy (Vercel/Netlify) hoặc thử lại sau.`);
      } else if (response.status === 429) {
        throw new Error("Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau vài phút.");
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.analysis || "Không tạo được phân tích. Vui lòng thử lại.";
  } catch (error: any) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Network request failed')) {
      throw new Error("Không thể kết nối đến server API. Vui lòng kiểm tra:\n1. Kết nối mạng\n2. API route /api/assess có hoạt động không\n3. Thử nhập API Key cá nhân trong phần Cài đặt.");
    }
    // Re-throw with the original error message
    throw error;
  }
};

export const analyzePatientData = async (
  data: PatientData, 
  userApiKey?: string, 
  userMode: 'GP' | 'SPECIALIST' = 'SPECIALIST'
): Promise<string> => {
  // Calculate Context
  const context = getAnalysisContext(data);
  
  // Build patient description and system instruction
  let patientDescription = buildPatientDescription(data);
  let systemInstruction = buildSystemInstruction(context, userMode);
  
  // Aggressive sanitization to remove BOM and problematic characters
  // Do this multiple times to ensure all BOMs are removed
  patientDescription = sanitizeString(sanitizeString(patientDescription));
  systemInstruction = sanitizeString(sanitizeString(systemInstruction));
  
  // Final check: ensure no BOM at start
  if (patientDescription.charCodeAt(0) === 0xFEFF) {
    patientDescription = patientDescription.substring(1);
  }
  if (systemInstruction.charCodeAt(0) === 0xFEFF) {
    systemInstruction = systemInstruction.substring(1);
  }

  // If user provided API key, use direct HTTP call to avoid SDK BOM issues
  if (userApiKey) {
    // Retry logic with exponential backoff
    const maxRetries = 3;
    let lastError: Error | null = null;

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
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${userApiKey}`;
        
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
        
        let httpResponse: Response;
        try {
          httpResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
        } catch (fetchError: any) {
          // Network error or CORS error
          console.error('Fetch error:', fetchError);
          throw new Error(
            `Không thể kết nối đến Gemini API: ${fetchError.message || 'Network error'}. ` +
            `Vui lòng kiểm tra kết nối mạng hoặc thử nhập API Key khác.`
          );
        }

        if (!httpResponse.ok) {
          let errorText = '';
          try {
            errorText = await httpResponse.text();
          } catch (e) {
            errorText = `HTTP ${httpResponse.status}: ${httpResponse.statusText}`;
          }
          
          console.error('Gemini API error response:', {
            status: httpResponse.status,
            statusText: httpResponse.statusText,
            body: errorText
          });
          
          const info = extractGeminiHttpError(errorText);
          
          // Keep a compact error message for UI, but classify common cases.
          if (isInvalidApiKeyError(info)) {
            throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại trong phần Cài đặt.");
          }
          if (isKeyPermissionOrReferrerError(info)) {
            throw new Error(
              "API Key bị từ chối quyền (thường do giới hạn domain/referrer). " +
              "Vui lòng vào Google AI Studio → chọn API key → Application restrictions → " +
              "HTTP referrers → thêm: https://*.vercel.app/*"
            );
          }
          
          // Show detailed error
          const errorMsg = info.message || info.rawText || httpResponse.statusText || 'Unknown error';
          throw new Error(
            `Gemini API error (${httpResponse.status}): ${errorMsg}`
          );
        }

        let responseData: any;
        try {
          responseData = await httpResponse.json();
        } catch (jsonError: any) {
          console.error('JSON parse error:', jsonError);
          throw new Error("Phản hồi từ Gemini API không hợp lệ (không phải JSON).");
        }
        
        if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content) {
          throw new Error("Phản hồi từ AI không hợp lệ.");
        }

        const result = responseData.candidates[0].content.parts[0].text;
        if (!result || result.trim().length === 0) {
          throw new Error("Phản hồi từ AI rỗng. Vui lòng thử lại.");
        }

        // Sanitize result before returning
        return sanitizeString(result);
      } catch (error: any) {
        lastError = error;
        
        console.error(`Attempt ${attempt + 1}/${maxRetries} failed:`, {
          message: error?.message,
          status: error?.status,
          name: error?.name,
          stack: error?.stack
        });
        
        // Check for specific error types that should not retry
        if (
          error?.message?.includes('API Key không hợp lệ') ||
          error?.message?.includes('API_KEY') ||
          error?.status === 401 ||
          error?.message?.includes('UNAUTHENTICATED')
        ) {
          throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại trong phần Cài đặt.");
        }
        
        if (
          error?.message?.includes('QUOTA') || 
          error?.status === 429 ||
          error?.message?.includes('RESOURCE_EXHAUSTED')
        ) {
          throw new Error("Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau vài phút hoặc kiểm tra quota API Key.");
        }
        
        if (
          error?.message?.includes('bị từ chối quyền') ||
          error?.message?.includes('PERMISSION_DENIED') ||
          error?.status === 403
        ) {
          throw error; // Re-throw với message đã được format
        }

        // If not last attempt, wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // If all retries failed
    console.error("Gemini Analysis Error after retries:", lastError);
    
    // Extract detailed error message
    let errorMessage = "Không thể phân tích dữ liệu sau nhiều lần thử.";
    
    if (lastError) {
      const errMsg = lastError.message || String(lastError);
      
      // Check for specific error types
      if (errMsg.includes('API Key không hợp lệ') || errMsg.includes('API_KEY') || lastError?.status === 401) {
        errorMessage = "API Key không hợp lệ. Vui lòng kiểm tra lại trong phần Cài đặt.";
      } else if (errMsg.includes('QUOTA') || errMsg.includes('429') || lastError?.status === 429) {
        errorMessage = "Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau vài phút hoặc kiểm tra quota API Key.";
      } else if (errMsg.includes('bị từ chối quyền') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('referrer')) {
        errorMessage = "API Key bị từ chối quyền (thường do giới hạn domain/referrer). Vui lòng kiểm tra phần API key restrictions trong Google AI Studio.";
      } else if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('Network request failed')) {
        errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.";
      } else if (errMsg.includes('Gemini API error')) {
        // Extract the actual error from Gemini API
        errorMessage = errMsg.replace('Gemini API error: ', 'Lỗi từ Gemini API: ');
      } else {
        // Show the actual error message if available
        errorMessage = `Không thể phân tích dữ liệu: ${errMsg}`;
      }
    }
    
    throw new Error(errorMessage);
  }

  // Otherwise, use API route (secure, server-side)
  return await callApiRoute(patientDescription, systemInstruction, userMode);
};