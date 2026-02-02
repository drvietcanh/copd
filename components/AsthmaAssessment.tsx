import React, { useMemo, useState } from 'react';
import { Activity, Stethoscope, FileText, AlertTriangle, Sparkles } from 'lucide-react';
import { AsthmaData, buildAsthmaPromptForAiStudio, initialAsthmaData } from '../services/asthmaService';
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
    const act = parseInt(data.actScore || '0', 10);
    if (!act) return null;
    if (act >= 20) return { label: 'Kiểm soát tốt (ACT ≥ 20)', tone: 'emerald' as const };
    if (act >= 16) return { label: 'Kiểm soát một phần (ACT 16–19)', tone: 'amber' as const };
    return { label: 'Kiểm soát kém (ACT ≤ 15)', tone: 'red' as const };
  }, [data.actScore]);

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
            Kiểm soát triệu chứng
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">ACT (5–25)</label>
              <input
                type="number"
                min="5"
                max="25"
                value={data.actScore}
                onChange={(e) => handleChange('actScore', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ví dụ: 21"
              />
            </div>
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

