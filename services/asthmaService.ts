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

const ASTHMA_SYSTEM_PROMPT = sanitize(`
SYSTEM ROLE:
Bạn là trợ lý AI hỗ trợ ra quyết định lâm sàng về Hen phế quản (Asthma).
Mục tiêu: tóm tắt mức độ kiểm soát, nguy cơ, và gợi ý quản lý theo guideline (GINA hiện hành) theo cách thận trọng.

NGUYÊN TẮC:
- Không ra lệnh. Dùng "có thể cân nhắc...". Luôn nhắc: "Quyết định cuối cùng phụ thuộc đánh giá lâm sàng trực tiếp của bác sĩ điều trị."
- Ưu tiên an toàn: nhấn mạnh tránh SABA đơn thuần kéo dài; đề xuất controller phù hợp nếu kiểm soát kém/đợt cấp.

CẤU TRÚC PHẢN HỒI (BẮT BUỘC):
0. Tóm Tắt Tổng Quan
1. Chẩn đoán / Mức độ kiểm soát
2. Nguy cơ đợt cấp & yếu tố nguy cơ
3. Đối chiếu điều trị hiện tại
4. Cân nhắc quản lý (thuốc & không dùng thuốc)
5. Theo dõi
`);

export const buildAsthmaPromptForAiStudio = (data: AsthmaData) => {
  const patientDescription = buildAsthmaPatientDescription(data);
  const systemInstruction = ASTHMA_SYSTEM_PROMPT;
  const fullPrompt = sanitize(`SYSTEM INSTRUCTION:\n${systemInstruction}\n\nPATIENT DATA:\n${patientDescription}`);
  return { systemInstruction, patientDescription, fullPrompt };
};

export const analyzeAsthmaData = async (
  data: AsthmaData
): Promise<string> => {
  const { systemInstruction, patientDescription } = buildAsthmaPromptForAiStudio(data);
  const response = await fetch('/api/assess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction, patientDescription, userMode: 'GP' }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  const json = await response.json();
  return json.analysis || 'Không tạo được phân tích. Vui lòng thử lại.';
};

