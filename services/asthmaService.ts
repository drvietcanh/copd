import { Gender } from '../types';

export type Disease = 'COPD' | 'ASTHMA';

export interface AsthmaData {
  patientName: string;
  age: string;
  sex: Gender;

  // Control & symptoms
  actQ1: string; // 1-5
  actQ2: string; // 1-5
  actQ3: string; // 1-5
  actQ4: string; // 1-5
  actQ5: string; // 1-5
  daytimeSymptomsPerWeek: string; // number
  nightAwakeningsPerMonth: string; // number
  relieverUsePerWeek: string; // number
  activityLimitation: boolean;

  // Risk
  exacerbationsLast12m: string; // number
  hospitalizationsLast12m: string; // number

  // Lung function
  fev1L: string;
  fvcL: string;
  fev1FvcRatio: string;
  fev1Percent: string; // % predicted
  postBdReversibility: boolean;

  // Inflammation / comorbidity
  eosinophils: string; // cells/uL
  allergiesAtopy: boolean;
  comorbidities: string;

  currentTreatment: string;
  triggers: string;
}

export const initialAsthmaData: AsthmaData = {
  patientName: '',
  age: '',
  sex: Gender.MALE,

  actQ1: '',
  actQ2: '',
  actQ3: '',
  actQ4: '',
  actQ5: '',
  daytimeSymptomsPerWeek: '',
  nightAwakeningsPerMonth: '',
  relieverUsePerWeek: '',
  activityLimitation: false,

  exacerbationsLast12m: '0',
  hospitalizationsLast12m: '0',

  fev1L: '',
  fvcL: '',
  fev1FvcRatio: '',
  fev1Percent: '',
  postBdReversibility: false,

  eosinophils: '',
  allergiesAtopy: false,
  comorbidities: '',

  currentTreatment: '',
  triggers: '',
};

const sanitize = (s: any) => String(s ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

export const computeActScore = (data: AsthmaData): number | null => {
  const qs = [data.actQ1, data.actQ2, data.actQ3, data.actQ4, data.actQ5].map((v) => parseInt(v || '', 10));
  if (qs.some((n) => isNaN(n))) return null;
  const sum = qs.reduce((a, b) => a + b, 0);
  // ACT total should be 5..25 (each 1..5)
  if (sum < 5 || sum > 25) return null;
  return sum;
};

export type GinaStep = 1 | 2 | 3 | 4 | 5;

export interface GinaStepRecommendation {
  actScore: number | null;
  exacerbations: number;
  hospitalizations: number;
  currentStep: GinaStep;
  nextStep: GinaStep | null;
  currentSummary: string;
  nextSummary: string | null;
}

const GINA_STEP_TEXT: Record<GinaStep, string> = {
  1: 'Step 1: Sử dụng ICS–formoterol liều thấp khi cần (không dùng SABA đơn trị).',
  2: 'Step 2: Điều trị duy trì ICS liều thấp hàng ngày hoặc ICS–formoterol liều thấp khi cần.',
  3: 'Step 3: Điều trị duy trì ICS–LABA liều thấp.',
  4: 'Step 4: ICS–LABA liều trung bình/cao, cân nhắc thêm LAMA.',
  5: 'Step 5: Chuyển chuyên khoa, cân nhắc sinh học (anti-IgE, anti-IL5, anti-IL4R) và tối ưu hóa điều trị phối hợp.',
};

export const getGinaStepRecommendation = (data: AsthmaData): GinaStepRecommendation => {
  const act = computeActScore(data);
  const exac = parseFloat(data.exacerbationsLast12m || '0');
  const hosp = parseFloat(data.hospitalizationsLast12m || '0');

  // Baseline: nếu chưa có ACT, giả định Step 1
  let currentStep: GinaStep = 1;

  if (act !== null) {
    if (act >= 20 && exac === 0 && hosp === 0) {
      currentStep = 1;
    } else if (act >= 20 && (exac > 0 || hosp > 0)) {
      // Kiểm soát tốt nhưng có đợt cấp → tăng bậc controller
      currentStep = 3;
    } else if (act >= 16 && act <= 19) {
      currentStep = 2;
    } else if (act <= 15) {
      currentStep = 3;
    }
  }

  // Nguy cơ cao (nhiều đợt cấp / nhập viện) → Step 4–5
  if (exac >= 2 || hosp >= 1) {
    currentStep = currentStep < 4 ? 4 : currentStep;
  }

  // Gợi ý bước tiếp theo (nếu chưa kiểm soát tối ưu)
  let nextStep: GinaStep | null = null;
  if (currentStep === 1 && act !== null && act < 20) nextStep = 2;
  else if (currentStep === 2 && act !== null && act < 20) nextStep = 3;
  else if (currentStep === 3 && (act !== null && act <= 15 || exac >= 2 || hosp >= 1)) nextStep = 4;
  else if (currentStep === 4 && (act !== null && act <= 15 || exac >= 2 || hosp >= 1)) nextStep = 5;

  return {
    actScore: act,
    exacerbations: isNaN(exac) ? 0 : exac,
    hospitalizations: isNaN(hosp) ? 0 : hosp,
    currentStep,
    nextStep,
    currentSummary: GINA_STEP_TEXT[currentStep],
    nextSummary: nextStep ? GINA_STEP_TEXT[nextStep] : null,
  };
};

const buildAsthmaPatientDescription = (data: AsthmaData) => {
  const actScore = computeActScore(data);
  return sanitize(`
DỮ LIỆU BỆNH NHÂN (HEN PHẾ QUẢN):
- Họ tên/Mã: ${sanitize(data.patientName || 'N/A')}
- Tuổi: ${sanitize(data.age || 'N/A')}, Giới: ${sanitize(data.sex || 'N/A')}

KIỂM SOÁT TRIỆU CHỨNG:
- ACT: ${actScore ?? 'N/A'} (5–25)
- Triệu chứng ban ngày/tuần: ${sanitize(data.daytimeSymptomsPerWeek || 'N/A')}
- Thức giấc ban đêm/tháng: ${sanitize(data.nightAwakeningsPerMonth || 'N/A')}
- Dùng thuốc cắt cơn/tuần: ${sanitize(data.relieverUsePerWeek || 'N/A')}
- Hạn chế hoạt động: ${data.activityLimitation ? 'Có' : 'Không'}

NGUY CƠ:
- Đợt cấp 12 tháng: ${sanitize(data.exacerbationsLast12m || '0')}
- Nhập viện 12 tháng: ${sanitize(data.hospitalizationsLast12m || '0')}

CHỨC NĂNG HÔ HẤP:
- FEV1 (L): ${sanitize(data.fev1L || 'N/A')}
- FVC (L): ${sanitize(data.fvcL || 'N/A')}
- FEV1/FVC: ${sanitize(data.fev1FvcRatio || 'N/A')}
- FEV1% dự đoán: ${sanitize(data.fev1Percent || 'N/A')}%
- Reversibility sau giãn PQ: ${data.postBdReversibility ? 'Có' : 'Không/Chưa rõ'}

VIÊM/ĐỒNG MẮC:
- EOS máu: ${sanitize(data.eosinophils || 'N/A')}
- Dị ứng/Atopy: ${data.allergiesAtopy ? 'Có' : 'Không/Chưa rõ'}
- Bệnh kèm: ${sanitize(data.comorbidities || 'Không')}

ĐIỀU TRỊ & YẾU TỐ KHỞI PHÁT:
- Thuốc hiện tại: ${sanitize(data.currentTreatment || 'Chưa rõ')}
- Yếu tố khởi phát/Trigger: ${sanitize(data.triggers || 'Chưa rõ')}
`);
};

const ASTHMA_SYSTEM_PROMPT_BASE = sanitize(`
SYSTEM ROLE:
Bạn là trợ lý AI hỗ trợ ra quyết định lâm sàng về Hen phế quản (Asthma).
Mục tiêu: tóm tắt mức độ kiểm soát, nguy cơ, và gợi ý quản lý theo guideline (GINA hiện hành) theo cách thận trọng.

NGUYÊN TẮC:
- Không ra lệnh. Tránh dùng các từ: "phải", "bắt buộc", "yêu cầu", "bắt buộc tăng liều"... Thay vào đó dùng: "có thể cân nhắc...", "GINA gợi ý rằng...", "một lựa chọn thường được xem xét là...".
- Luôn kết thúc mỗi đoạn gợi ý bằng câu: "Quyết định cuối cùng phụ thuộc đánh giá lâm sàng trực tiếp của bác sĩ điều trị."
- Ưu tiên an toàn: nhấn mạnh tránh SABA đơn thuần kéo dài; đề xuất điều trị CÓ ICS phù hợp nếu kiểm soát kém/đợt cấp.

NHÃN THÔNG TIN (BẮT BUỘC):
- Mọi luận điểm quan trọng PHẢI có đúng một trong các nhãn sau ở đầu câu:
  * [According to GINA]: khi nội dung hoàn toàn dựa trên khuyến cáo GINA.
  * [AI Suggestion]: khi là suy luận/ưu tiên điều trị do hệ thống đề xuất dựa trên dữ liệu cụ thể của ca bệnh.
  * [Clinical judgment required]: khi cần cá thể hóa, có nhiều lựa chọn tương đương, hoặc thiếu dữ kiện; phải nhấn mạnh vai trò đánh giá trực tiếp của bác sĩ.

CẤU TRÚC PHẢN HỒI (BẮT BUỘC):
0. Tóm Tắt Tổng Quan
1. Chẩn đoán / Mức độ kiểm soát
2. Nguy cơ đợt cấp & yếu tố nguy cơ
3. Đối chiếu điều trị hiện tại
 4. Clinical Reasoning – Asthma (GINA)
    - [According to GINA]: Giải thích MỨC ĐỘ KIỂM SOÁT hen dựa trên ACT, triệu chứng ban ngày/ban đêm, dùng thuốc cắt cơn, và hạn chế hoạt động.
    - [According to GINA]: Phân tích CÁC YẾU TỐ NGUY CƠ ĐỢT CẤP: tiền sử đợt cấp, nhập viện, FEV1 giảm, dùng SABA thường xuyên, kém tuân thủ, tiếp tục hút thuốc, dị nguyên nghề nghiệp, béo phì, rối loạn tâm thần...
    - [According to GINA]: Nêu RATIONALE của việc LUÔN có ICS trong điều trị hen (giảm viêm đường thở, giảm đợt cấp, giảm tử vong) và tại sao SABA-đơn-trị bị khuyến cáo TRÁNH dùng dài hạn.
    - [AI Suggestion]: Liên hệ dữ liệu của ca bệnh này với các bậc điều trị GINA (Step 1–5), ghi rõ Step hiện tại và vì sao có hoặc không cần tăng/giảm Step.
    - [Clinical judgment required]: Chỉ ra những điểm cần bác sĩ cân nhắc thêm (dịch tễ, đồng mắc, khả năng tuân thủ, chi phí/khả dụng thuốc).
 5. Cân nhắc quản lý (thuốc & không dùng thuốc)
 6. Theo dõi
`);

export const buildAsthmaPromptForAiStudio = (data: AsthmaData, userMode: 'GP' | 'SPECIALIST') => {
  const patientDescription = buildAsthmaPatientDescription(data);

  const modeInstruction =
    userMode === 'GP'
      ? sanitize(`
CHẾ ĐỘ NGƯỜI DÙNG: BÁC SĨ ĐA KHOA (GP)
- Ưu tiên NGÔN NGỮ ĐƠN GIẢN, tránh thuật ngữ quá chuyên sâu.
- Tập trung mô tả:
  [According to GINA] MỨC ĐỘ KIỂM SOÁT hen (tốt/một phần/không kiểm soát) và những yếu tố nguy cơ đợt cấp quan trọng.
  [AI Suggestion] Gợi ý bậc điều trị GINA chính (Step 1–4) và bước tiếp theo NẾU kiểm soát chưa tốt.
- [According to GINA] KHÔNG liệt kê chi tiết về biologics; chỉ cần nêu chung "có thể cân nhắc sinh học ở Step 5" nếu phù hợp, không nêu tên thuốc cụ thể.
- Hạn chế đi sâu vào can thiệp chuyên sâu – luôn đặt dưới nhãn [Clinical judgment required] và nhấn mạnh vai trò chuyển chuyên khoa khi cần.`)
      : sanitize(`
CHẾ ĐỘ NGƯỜI DÙNG: BÁC SĨ CHUYÊN KHOA HÔ HẤP
- Cho phép dùng THUẬT NGỮ CHUYÊN KHOA nhưng vẫn cần cấu trúc rõ ràng.
- [According to GINA] Phân tích đầy đủ bậc điều trị GINA hiện tại (Step 1–5) và lý do nên/không nên tăng/giảm bậc.
- [According to GINA] Nêu gợi ý PHENOTYPE:
   • Nếu EOS ≥ 300 cells/µL hoặc có đợt cấp nhiều: gợi ý "eosinophilic asthma" (ghi rõ dưới nhãn này).
   • Nhấn mạnh yếu tố dị ứng/atopy khi có, gợi ý hen dị ứng.
- [AI Suggestion] Đề xuất rõ lựa chọn controller cụ thể trong mỗi Step (ICS–formoterol, ICS–LABA...) với cảnh báo an toàn.
- [Clinical judgment required] Khi đề cập sinh học (anti-IgE, anti-IL5, anti-IL4R) hoặc phối hợp phức tạp, luôn kèm nhận định về tiêu chuẩn chọn bệnh nhân và khuyến cáo chuyển chuyên khoa nếu chưa điều trị tại trung tâm có kinh nghiệm.`);

  const systemInstruction = sanitize(`${ASTHMA_SYSTEM_PROMPT_BASE}\n\n${modeInstruction}`);
  const fullPrompt = sanitize(`SYSTEM INSTRUCTION:\n${systemInstruction}\n\nPATIENT DATA:\n${patientDescription}`);
  return { systemInstruction, patientDescription, fullPrompt };
};

export const analyzeAsthmaData = async (
  data: AsthmaData,
  userMode: 'GP' | 'SPECIALIST'
): Promise<string> => {
  const { systemInstruction, patientDescription } = buildAsthmaPromptForAiStudio(data, userMode);
  const response = await fetch('/api/assess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction, patientDescription, userMode }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  const json = await response.json();
  return json.analysis || 'Không tạo được phân tích. Vui lòng thử lại.';
};

