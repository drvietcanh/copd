import React, { useMemo, useState } from 'react';
import { Activity, Stethoscope, FileText, AlertTriangle, Sparkles } from 'lucide-react';
import { AsthmaData, buildAsthmaPromptForAiStudio, computeActScore, initialAsthmaData } from '../services/asthmaService';
import { Gender } from '../types';

interface AsthmaAssessmentProps {
  manualMode: boolean;
  onOpenManual: (prompt: string) => void;
  onSetAnalysis: (analysis: string) => void;
  onSetError: (error: string | null) => void;
  onSetLoading: (loading: boolean) => void;
}

const AsthmaAssessment: React.FC<AsthmaAssessmentProps> = ({
  manualMode,
  onOpenManual,
  onSetAnalysis,
  onSetError,
  onSetLoading,
}) => {
  const [data, setData] = useState<AsthmaData>(initialAsthmaData);

  const handleChange = (key: keyof AsthmaData, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const quickSummary = useMemo(() => {
    const act = computeActScore(data);
    if (!act) return null;
    if (act >= 20) return { label: 'Kiểm soát tốt (ACT ≥ 20)', tone: 'emerald' as const };
    if (act >= 16) return { label: 'Kiểm soát một phần (ACT 16–19)', tone: 'amber' as const };
    return { label: 'Kiểm soát kém (ACT ≤ 15)', tone: 'red' as const };
  }, [data]);

  const actScore = useMemo(() => computeActScore(data), [data]);

  const ACT_QUESTIONS: Array<{
    key: keyof AsthmaData;
    title: string;
    options: Array<{ score: number; label: string }>;
  }> = [
    {
      key: 'actQ1',
      title: '1) Trong 4 tuần qua, hen ảnh hưởng đến hoạt động hằng ngày của bạn mức nào?',
      options: [
        { score: 5, label: 'Không ảnh hưởng' },
        { score: 4, label: 'Ảnh hưởng rất ít' },
        { score: 3, label: 'Ảnh hưởng một phần' },
        { score: 2, label: 'Ảnh hưởng nhiều' },
        { score: 1, label: 'Ảnh hưởng rất nhiều / không làm được' },
      ],
    },
    {
      key: 'actQ2',
      title: '2) Trong 4 tuần qua, bạn bị khó thở bao lâu một lần?',
      options: [
        { score: 5, label: 'Không có' },
        { score: 4, label: '1–2 lần/tuần' },
        { score: 3, label: '3–6 lần/tuần' },
        { score: 2, label: 'Mỗi ngày 1 lần' },
        { score: 1, label: 'Nhiều lần mỗi ngày' },
      ],
    },
    {
      key: 'actQ3',
      title: '3) Trong 4 tuần qua, bạn thức giấc ban đêm/khó ngủ do triệu chứng hen bao lâu một lần?',
      options: [
        { score: 5, label: 'Không có' },
        { score: 4, label: '1–2 lần' },
        { score: 3, label: '1 lần/tuần' },
        { score: 2, label: '2–3 lần/tuần' },
        { score: 1, label: '≥4 lần/tuần' },
      ],
    },
    {
      key: 'actQ4',
      title: '4) Trong 4 tuần qua, bạn dùng thuốc cắt cơn (SABA/reliever) bao lâu một lần?',
      options: [
        { score: 5, label: 'Không dùng' },
        { score: 4, label: '≤1 lần/tuần' },
        { score: 3, label: '2–3 lần/tuần' },
        { score: 2, label: '1 lần/ngày' },
        { score: 1, label: 'Nhiều lần/ngày' },
      ],
    },
    {
      key: 'actQ5',
      title: '5) Bạn tự đánh giá mức độ kiểm soát hen của mình trong 4 tuần qua như thế nào?',
      options: [
        { score: 5, label: 'Kiểm soát hoàn toàn' },
        { score: 4, label: 'Kiểm soát tốt' },
        { score: 3, label: 'Kiểm soát một phần' },
        { score: 2, label: 'Kiểm soát kém' },
        { score: 1, label: 'Không kiểm soát' },
      ],
    },
  ];

  const handleAnalyze = async () => {
    onSetError(null);
    if (manualMode) {
      const { fullPrompt } = buildAsthmaPromptForAiStudio(data);
      onOpenManual(fullPrompt);
      return;
    }

    onSetLoading(true);
    try {
      const { analyzeAsthmaData } = await import('../services/asthmaService');
      const result = await analyzeAsthmaData(data);
      onSetAnalysis(result);
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Đã xảy ra lỗi không xác định.';
      onSetError(msg);
      if (/quota|rate limit|resource_exhausted|429|vượt quá giới hạn/i.test(msg)) {
        const { fullPrompt } = buildAsthmaPromptForAiStudio(data);
        onOpenManual(fullPrompt);
      }
    } finally {
      onSetLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-800 mb-3">Đánh giá Bệnh nhân Hen phế quản</h2>
        <p className="text-slate-500 mb-4">
          Nhập dữ liệu cơ bản để tạo báo cáo đánh giá Hen. (COPD/GOLD sẽ được ẩn khi chọn Asthma.)
        </p>
        {quickSummary && (
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium ${
              quickSummary.tone === 'emerald'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : quickSummary.tone === 'amber'
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-red-50 text-red-700 border-red-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            {quickSummary.label}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-lg mb-4">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            Thông tin cơ bản
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Họ và Tên / Mã Bệnh nhân</label>
              <input
                type="text"
                value={data.patientName}
                onChange={(e) => handleChange('patientName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tuổi</label>
              <input
                type="number"
                value={data.age}
                onChange={(e) => handleChange('age', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label>
              <select
                value={data.sex}
                onChange={(e) => handleChange('sex', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Object.values(Gender).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-lg mb-4">
            <Activity className="w-5 h-5 text-blue-600" />
            Asthma Control Test (ACT)
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-sm font-semibold text-slate-700">Tổng điểm ACT</div>
              <div className="text-sm font-bold text-slate-900">
                {actScore ?? '—'} <span className="text-slate-400 font-medium">/ 25</span>
              </div>
            </div>

            <div className="space-y-4">
              {ACT_QUESTIONS.map((q) => (
                <div key={q.key} className="p-4 bg-white border border-slate-200 rounded-lg">
                  <div className="text-sm font-bold text-slate-800 mb-3">{q.title}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.options.map((opt) => {
                      const selected = (data[q.key] as string) === String(opt.score);
                      return (
                        <button
                          key={opt.score}
                          type="button"
                          onClick={() => handleChange(q.key, String(opt.score))}
                          className={`text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            selected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md mr-2 ${
                            selected ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {opt.score}
                          </span>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-lg mb-4">
            <Activity className="w-5 h-5 text-blue-600" />
            Checklist triệu chứng đơn giản
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Triệu chứng ban ngày / tuần</label>
              <input
                type="number"
                min="0"
                value={data.daytimeSymptomsPerWeek}
                onChange={(e) => handleChange('daytimeSymptomsPerWeek', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Thức giấc ban đêm / tháng</label>
              <input
                type="number"
                min="0"
                value={data.nightAwakeningsPerMonth}
                onChange={(e) => handleChange('nightAwakeningsPerMonth', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dùng thuốc cắt cơn / tuần</label>
              <input
                type="number"
                min="0"
                value={data.relieverUsePerWeek}
                onChange={(e) => handleChange('relieverUsePerWeek', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={data.activityLimitation}
                onChange={(e) => handleChange('activityLimitation', e.target.checked)}
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Hạn chế hoạt động do triệu chứng</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-lg mb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            Nguy cơ & điều trị
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Đợt cấp 12 tháng</label>
              <input
                type="number"
                min="0"
                value={data.exacerbationsLast12m}
                onChange={(e) => handleChange('exacerbationsLast12m', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nhập viện 12 tháng</label>
              <input
                type="number"
                min="0"
                value={data.hospitalizationsLast12m}
                onChange={(e) => handleChange('hospitalizationsLast12m', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">FEV1% dự đoán</label>
              <input
                type="number"
                min="0"
                value={data.fev1Percent}
                onChange={(e) => handleChange('fev1Percent', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={data.postBdReversibility}
                onChange={(e) => handleChange('postBdReversibility', e.target.checked)}
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Có reversibility sau giãn PQ</span>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Điều trị hiện tại</label>
              <textarea
                rows={2}
                value={data.currentTreatment}
                onChange={(e) => handleChange('currentTreatment', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                placeholder="Ví dụ: ICS-formoterol, SABA PRN..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Trigger</label>
              <textarea
                rows={2}
                value={data.triggers}
                onChange={(e) => handleChange('triggers', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                placeholder="Ví dụ: dị nguyên, gắng sức, nhiễm virus..."
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-600">
                Nếu bị quota API, app sẽ tự mở chế độ thủ công để bạn chạy trên Gemini/ChatGPT và dán kết quả.
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleAnalyze}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
          >
            Tạo đánh giá Hen
          </button>
          <p className="text-center text-xs text-slate-400 mt-3">
            Công cụ này chỉ nhằm hỗ trợ ra quyết định. Không thay thế chẩn đoán của bác sĩ.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AsthmaAssessment;

