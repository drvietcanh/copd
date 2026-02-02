import { Gender } from '../types';

export type Disease = 'COPD' | 'ASTHMA';

export interface AsthmaData {
  patientName: string;
  age: string;
  sex: Gender;

  // Control & symptoms
  actScore: string; // 5-25
  daytimeSymptomsPerWeek: string; // number
  nightAwakeningsPerMonth: string; // number
  relieverUsePerWeek: string; // number
  activityLimitation: boolean;

  // Risk
  exacerbationsLast12m: string; // number
  hospitalizationsLast12m: string; // number

  // Lung function
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

  actScore: '',
  daytimeSymptomsPerWeek: '',
  nightAwakeningsPerMonth: '',
  relieverUsePerWeek: '',
  activityLimitation: false,

  exacerbationsLast12m: '0',
  hospitalizationsLast12m: '0',

  fev1Percent: '',
  postBdReversibility: false,

  eosinophils: '',
  allergiesAtopy: false,
  comorbidities: '',

  currentTreatment: '',
  triggers: '',
};

const sanitize = (s: any) => String(s ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

const buildAsthmaPatientDescription = (data: AsthmaData) => {
  return sanitize(`
DỮ LIỆU BỆNH NHÂN (HEN PHẾ QUẢN):
- Họ tên/Mã: ${sanitize(data.patientName || 'N/A')}
- Tuổi: ${sanitize(data.age || 'N/A')}, Giới: ${sanitize(data.sex || 'N/A')}

KIỂM SOÁT TRIỆU CHỨNG:
- ACT: ${sanitize(data.actScore || 'N/A')} (5–25)
- Triệu chứng ban ngày/tuần: ${sanitize(data.daytimeSymptomsPerWeek || 'N/A')}
- Thức giấc ban đêm/tháng: ${sanitize(data.nightAwakeningsPerMonth || 'N/A')}
- Dùng thuốc cắt cơn/tuần: ${sanitize(data.relieverUsePerWeek || 'N/A')}
- Hạn chế hoạt động: ${data.activityLimitation ? 'Có' : 'Không'}

NGUY CƠ:
- Đợt cấp 12 tháng: ${sanitize(data.exacerbationsLast12m || '0')}
- Nhập viện 12 tháng: ${sanitize(data.hospitalizationsLast12m || '0')}

CHỨC NĂNG HÔ HẤP:
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

