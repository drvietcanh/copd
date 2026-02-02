import React, { useState, useRef, useEffect } from 'react';
import { PatientData, Gender, SmokingStatus } from '../types';
import { ChevronDown, ChevronUp, Stethoscope, User, Activity, FileText, Plus, X, Search, Sparkles, Calculator, Zap } from 'lucide-react';
import { recalculateFev1Fvc } from '../services/calculationService';

interface InputFormProps {
  data: PatientData;
  onChange: (key: keyof PatientData, value: any) => void;
  onSubmit: () => void;
  loading: boolean;
}

// Các danh sách gợi ý nhập liệu nhanh
const COMORBIDITIES_OPTIONS = [
  "Tăng huyết áp", "Đái tháo đường", "Suy tim", "Bệnh mạch vành (IHD)", 
  "Loạn nhịp tim", "Lo âu/Trầm cảm", "Loãng xương", 
  "Trào ngược (GERD)", "Ngưng thở khi ngủ (OSA)", "Ung thư phổi", "Giãn phế quản"
];

const IMAGING_OPTIONS = [
  "Khí phế thũng (Emphysema)", "Dày thành phế quản", "Kén khí (Bullae)", 
  "Giãn phế quản", "Nốt phổi", "Xẹp phổi", "Bình thường"
];

// Danh sách cho Chips (nhóm thuốc chính)
const TREATMENT_CLASSES = [
  "SABA (Cắt cơn)", "SAMA", "LAMA", "LABA", "ICS", 
  "LAMA + LABA", "ICS + LABA", "Triple (ICS/LAMA/LABA)"
];

// Danh sách gợi ý đầy đủ cho Auto-complete (bao gồm tên thuốc phổ biến tại VN)
const MEDICATION_SUGGESTIONS = [
  ...TREATMENT_CLASSES,
  "Ventolin (Salbutamol)", "Berodual (Ipratropium/Fenoterol)", 
  "Spiriva (Tiotropium)", "Ultibro (Indacaterol/Glycopyrronium)",
  "Anoro (Umeclidinium/Vilanterol)", "Spiolto (Tiotropium/Olodaterol)",
  "Seretide (Salmeterol/Fluticasone)", "Symbicort (Budesonide/Formoterol)",
  "Foster (Beclometasone/Formoterol)", 
  "Trelegy (Fluticasone/Umeclidinium/Vilanterol)", "Trimbow (Beclometasone/Formoterol/Glycopyrronium)",
  "Theophylline", "Medrol (Methylprednisolone)", "Prednisolone",
  "Azithromycin", "Roflumilast (PDE4i)", "N-acetylcysteine"
];

const SAMPLE_SCENARIOS: Record<string, PatientData> = {
  "gold_1": {
    patientName: 'Nguyễn Văn A (GOLD 1 - Nhẹ)',
    age: '58',
    sex: Gender.MALE,
    bmi: '24',
    smokingHistory: SmokingStatus.FORMER,
    packYears: '20',
    mMRC: '1',
    catScore: '8',
    cough: false,
    sputum: false,
    exacerbationsLast12m: '0',
    hospitalizationsLast12m: '0',
    fev1L: '2.1',
    fev1Percent: '82',
    fvcL: '3.0',
    fev1FvcRatio: '0.68',
    postBdReversibility: false,
    eosinophils: '150',
    imagingFindings: 'Bình thường',
    currentTreatment: 'SABA khi cần',
    comorbidities: 'Không',
  },
  "gold_2": {
    patientName: 'Trần Thị B (GOLD 2 - Trung bình)',
    age: '68',
    sex: Gender.FEMALE,
    bmi: '28',
    smokingHistory: SmokingStatus.NEVER,
    packYears: '0',
    mMRC: '2',
    catScore: '22',
    cough: true,
    sputum: true,
    exacerbationsLast12m: '1',
    hospitalizationsLast12m: '0',
    fev1L: '1.4',
    fev1Percent: '60',
    fvcL: '2.5',
    fev1FvcRatio: '0.56',
    postBdReversibility: false,
    eosinophils: '100',
    imagingFindings: 'Dày thành phế quản',
    currentTreatment: 'LAMA đơn trị',
    comorbidities: 'Tăng huyết áp',
  },
  "gold_3": {
    patientName: 'Lê Thị C (GOLD 3 - Nặng)',
    age: '65',
    sex: Gender.FEMALE,
    bmi: '21',
    smokingHistory: SmokingStatus.FORMER,
    packYears: '40',
    mMRC: '3',
    catScore: '24',
    cough: true,
    sputum: true,
    exacerbationsLast12m: '2',
    hospitalizationsLast12m: '1',
    fev1L: '1.10',
    fev1Percent: '42',
    fvcL: '2.50',
    fev1FvcRatio: '0.44',
    postBdReversibility: false,
    eosinophils: '350',
    imagingFindings: 'Khí phế thũng lan tỏa, kén khí thùy trên',
    currentTreatment: 'LAMA + LABA',
    comorbidities: 'Suy tim, Loãng xương',
  },
  "gold_4": {
    patientName: 'Phạm Văn D (GOLD 4 - Rất nặng)',
    age: '78',
    sex: Gender.MALE,
    bmi: '19',
    smokingHistory: SmokingStatus.FORMER,
    packYears: '60',
    mMRC: '4',
    catScore: '28',
    cough: true,
    sputum: true,
    exacerbationsLast12m: '3',
    hospitalizationsLast12m: '2',
    fev1L: '0.7',
    fev1Percent: '28',
    fvcL: '2.0',
    fev1FvcRatio: '0.35',
    postBdReversibility: false,
    eosinophils: '200',
    imagingFindings: 'Khí phế thũng toàn thể (Severe Emphysema)',
    currentTreatment: 'LAMA + LABA + ICS',
    comorbidities: 'Suy tim, Loãng xương, Trầm cảm',
  },
  "aco": {
    patientName: 'Hoàng Văn E (Nghi ACO)',
    age: '55',
    sex: Gender.MALE,
    bmi: '26',
    smokingHistory: SmokingStatus.CURRENT,
    packYears: '30',
    mMRC: '2',
    catScore: '15',
    cough: true,
    sputum: false,
    exacerbationsLast12m: '2',
    hospitalizationsLast12m: '0',
    fev1L: '1.8',
    fev1Percent: '65',
    fvcL: '3.2',
    fev1FvcRatio: '0.60',
    postBdReversibility: true,
    eosinophils: '450',
    imagingFindings: 'Kén khí nhỏ',
    currentTreatment: 'ICS + LABA',
    comorbidities: 'Viêm mũi dị ứng',
  }
};

const InputForm: React.FC<InputFormProps> = ({ data, onChange, onSubmit, loading }) => {
  const [activeSection, setActiveSection] = useState<string>('demographics');
  const [medInput, setMedInput] = useState('');
  const [showSamples, setShowSamples] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSamples(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? '' : section);
  };

  const loadExampleData = (key: string) => {
    const scenario = SAMPLE_SCENARIOS[key];
    if (scenario) {
      (Object.keys(scenario) as Array<keyof PatientData>).forEach((k) => {
        onChange(k, scenario[k]);
      });
      setActiveSection('demographics');
      setShowSamples(false);
    }
  };

  // Smart calculation wrapper for onChange
  const handleChangeWithCalculation = (key: keyof PatientData, value: any) => {
    onChange(key, value);
    
    // Auto-calculate FEV1/FVC ratio when FEV1 or FVC changes
    if (key === 'fev1L' || key === 'fvcL') {
      const updatedData = { ...data, [key]: value };
      const calculated = recalculateFev1Fvc(updatedData);
      if (calculated.fev1FvcRatio) {
        // Immediately update FEV1/FVC ratio (no delay needed)
        onChange('fev1FvcRatio', calculated.fev1FvcRatio);
      } else {
        // Clear ratio if calculation not possible
        onChange('fev1FvcRatio', '');
      }
    }
  };

  // Auto-calculate FEV1/FVC whenever FEV1 or FVC changes
  useEffect(() => {
    if (data.fev1L && data.fvcL) {
      const calculated = recalculateFev1Fvc(data);
      if (calculated.fev1FvcRatio) {
        // Only update if different to avoid unnecessary re-renders
        const currentRatio = parseFloat(data.fev1FvcRatio || '0');
        const newRatio = parseFloat(calculated.fev1FvcRatio);
        if (Math.abs(currentRatio - newRatio) > 0.001) {
          onChange('fev1FvcRatio', calculated.fev1FvcRatio);
        }
      }
    } else if (!data.fev1L || !data.fvcL) {
      // Clear ratio if either FEV1 or FVC is missing
      if (data.fev1FvcRatio) {
        onChange('fev1FvcRatio', '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.fev1L, data.fvcL]);

  // Hàm hỗ trợ bật/tắt các từ khóa trong ô text
  const toggleKeyword = (field: keyof PatientData, keyword: string) => {
    const currentText = (data[field] as string) || "";
    let items = currentText.split(',').map(s => s.trim()).filter(Boolean);
    
    if (items.includes(keyword)) {
      items = items.filter(i => i !== keyword);
    } else {
      items.push(keyword);
    }
    
    onChange(field, items.join(', '));
  };

  const addKeyword = (field: keyof PatientData, keyword: string) => {
    const currentText = (data[field] as string) || "";
    let items = currentText.split(',').map(s => s.trim()).filter(Boolean);
    
    if (!items.includes(keyword)) {
      items.push(keyword);
      onChange(field, items.join(', '));
    }
  };

  const isSelected = (field: keyof PatientData, keyword: string) => {
    const currentText = (data[field] as string) || "";
    return currentText.includes(keyword);
  };

  const handleMedInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && medInput.trim()) {
      e.preventDefault();
      addKeyword('currentTreatment', medInput.trim());
      setMedInput('');
    }
  };

  const SectionHeader = ({ title, id, icon: Icon }: { title: string; id: string; icon: any }) => (
    <button
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between p-4 bg-white border border-slate-200 ${
        activeSection === id ? 'rounded-t-lg border-b-0' : 'rounded-lg hover:border-blue-300'
      } transition-all duration-200 group`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${activeSection === id ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500 group-hover:text-blue-500'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-semibold text-slate-700 group-hover:text-blue-700">{title}</span>
      </div>
      {activeSection === id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
    </button>
  );

  // Component hiển thị nhóm nút chọn (Chips)
  const OptionGroup = ({ title, options, field }: { title: string, options: string[], field: keyof PatientData }) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = isSelected(field, opt);
          return (
            <button
              key={opt}
              onClick={() => toggleKeyword(field, opt)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${
                active 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                  : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {active && <X className="w-3 h-3" />}
              {!active && <Plus className="w-3 h-3 opacity-50" />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      
      <div className="flex justify-end gap-2 relative" ref={dropdownRef}>
         <button
            type="button"
            onClick={() => setShowSamples(!showSamples)}
            className="text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 border border-blue-100 px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Quick Templates
            <ChevronDown className={`w-3 h-3 transition-transform ${showSamples ? 'rotate-180' : ''}`} />
          </button>
          
          {showSamples && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in">
              <div className="p-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-50 bg-slate-50/50">
                Chọn tình huống
              </div>
              <div className="p-1">
                <button 
                  onClick={() => loadExampleData('gold_1')}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                >
                  1. COPD GOLD 1 (Nhẹ)
                </button>
                <button 
                  onClick={() => loadExampleData('gold_2')}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                >
                  2. COPD GOLD 2 (Trung bình)
                </button>
                <button 
                  onClick={() => loadExampleData('gold_3')}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                >
                  3. COPD GOLD 3 (Nặng)
                </button>
                <button 
                  onClick={() => loadExampleData('gold_4')}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                >
                  4. COPD GOLD 4 (Rất nặng)
                </button>
                <button 
                  onClick={() => loadExampleData('aco')}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                >
                  5. Nghi ngờ ACO (Hen-COPD)
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Demographics Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <SectionHeader title="Thông tin Nhân khẩu học" id="demographics" icon={User} />
        {activeSection === 'demographics' && (
          <div className="p-6 border border-t-0 border-slate-200 rounded-b-lg bg-white animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và Tên / Mã Bệnh nhân</label>
                <input
                  type="text"
                  value={data.patientName}
                  onChange={(e) => onChange('patientName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ví dụ: Nguyễn Văn A (hoặc Mã HS)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tuổi</label>
                <input
                  type="number"
                  value={data.age}
                  onChange={(e) => onChange('age', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Năm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label>
                <select
                  value={data.sex}
                  onChange={(e) => onChange('sex', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {Object.values(Gender).map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">BMI (kg/m²)</label>
                <input
                  type="number"
                  value={data.bmi}
                  onChange={(e) => onChange('bmi', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ví dụ: 22.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tiền sử Hút thuốc</label>
                <select
                  value={data.smokingHistory}
                  onChange={(e) => onChange('smokingHistory', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {Object.values(SmokingStatus).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Số bao-năm (Pack Years)</label>
                <input
                  type="number"
                  value={data.packYears}
                  onChange={(e) => onChange('packYears', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Tổng số bao-năm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Symptoms Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <SectionHeader title="Triệu chứng & Đợt cấp" id="symptoms" icon={Stethoscope} />
        {activeSection === 'symptoms' && (
          <div className="p-6 border border-t-0 border-slate-200 rounded-b-lg bg-white animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2">Khó thở (mMRC)</label>
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => onChange('mMRC', n.toString())}
                      className={`flex-1 min-w-[3rem] py-2 rounded-md border text-sm font-medium transition-all ${
                        data.mMRC === n.toString()
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2 italic">
                  {data.mMRC === '0' && "Khó thở khi gắng sức mạnh."}
                  {data.mMRC === '1' && "Khó thở khi đi nhanh/lên dốc."}
                  {data.mMRC === '2' && "Đi chậm hơn người cùng tuổi."}
                  {data.mMRC === '3' && "Phải dừng lại để thở khi đi 100m."}
                  {data.mMRC === '4' && "Khó thở khi thay quần áo/không ra khỏi nhà."}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2">Điểm CAT (0-40)</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={data.catScore}
                  onChange={(e) => onChange('catScore', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ví dụ: 15"
                />
                <div className="flex gap-2 mt-3">
                   <button onClick={() => onChange('catScore', '5')} className="text-xs px-2 py-1 bg-white border rounded hover:bg-slate-100">Thấp (&lt;10)</button>
                   <button onClick={() => onChange('catScore', '15')} className="text-xs px-2 py-1 bg-white border rounded hover:bg-slate-100">Cao (&ge;10)</button>
                </div>
              </div>

              <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                 <span className="text-sm font-bold text-slate-700">Triệu chứng khác</span>
                 <label className="flex items-center gap-3 cursor-pointer p-2 bg-white rounded border border-slate-200 hover:border-blue-400 transition-colors">
                   <input
                     type="checkbox"
                     checked={data.cough}
                     onChange={(e) => onChange('cough', e.target.checked)}
                     className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                   />
                   <span className="text-sm font-medium text-slate-700">Ho mạn tính</span>
                 </label>
                 <label className="flex items-center gap-3 cursor-pointer p-2 bg-white rounded border border-slate-200 hover:border-blue-400 transition-colors">
                   <input
                     type="checkbox"
                     checked={data.sputum}
                     onChange={(e) => onChange('sputum', e.target.checked)}
                     className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                   />
                   <span className="text-sm font-medium text-slate-700">Khạc đờm hàng ngày</span>
                 </label>
              </div>

              <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-sm font-bold text-slate-700">Tiền sử 12 tháng qua</span>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Số đợt cấp trung bình/nhẹ</label>
                  <input
                    type="number"
                    min="0"
                    value={data.exacerbationsLast12m}
                    onChange={(e) => onChange('exacerbationsLast12m', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Số đợt cấp nặng (Nhập viện)</label>
                  <input
                    type="number"
                    min="0"
                    value={data.hospitalizationsLast12m}
                    onChange={(e) => onChange('hospitalizationsLast12m', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spirometry Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <SectionHeader title="Chức năng Hô hấp & Xét nghiệm" id="spirometry" icon={Activity} />
        {activeSection === 'spirometry' && (
          <div className="p-6 border border-t-0 border-slate-200 rounded-b-lg bg-white animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                FEV1 (L)
                <span className="text-xs text-slate-400 font-normal">(Tự động tính FEV1/FVC)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={data.fev1L}
                onChange={(e) => handleChangeWithCalculation('fev1L', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ví dụ: 1.25"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">FEV1 (% Dự đoán)</label>
              <input
                type="number"
                min="0"
                value={data.fev1Percent}
                onChange={(e) => onChange('fev1Percent', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ví dụ: 45"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                FVC (L)
                <span className="text-xs text-slate-400 font-normal">(Tự động tính FEV1/FVC)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={data.fvcL}
                onChange={(e) => handleChangeWithCalculation('fvcL', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ví dụ: 2.80"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                Chỉ số FEV1/FVC
                {data.fev1L && data.fvcL ? (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <Calculator className="w-3 h-3" />
                    Tự động tính
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-normal">
                    (Nhập FEV1 và FVC để tự động tính)
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                max="1"
                value={data.fev1FvcRatio}
                readOnly={!!(data.fev1L && data.fvcL)}
                className={`w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none ${
                  data.fev1L && data.fvcL 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed font-medium' 
                    : 'bg-white'
                }`}
                placeholder={data.fev1L && data.fvcL ? "Tự động tính từ FEV1/FVC" : "Ví dụ: 0.55 (Nhập FEV1 và FVC để tự động tính)"}
                title={data.fev1L && data.fvcL ? "Tự động tính từ FEV1 và FVC. Không thể chỉnh sửa thủ công." : "Nhập FEV1 và FVC để tự động tính"}
              />
            </div>
            <div className="md:col-span-2">
                 <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-400">
                   <input
                     type="checkbox"
                     checked={data.postBdReversibility}
                     onChange={(e) => onChange('postBdReversibility', e.target.checked)}
                     className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                   />
                   <div>
                      <span className="block text-sm font-medium text-slate-800">Có đáp ứng giãn phế quản (Reversibility)</span>
                      <span className="block text-xs text-slate-500">Tăng FEV1 &gt; 12% và &gt; 200ml</span>
                   </div>
                 </label>
            </div>
            <div className="md:col-span-2 border-t border-slate-100 pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Eosinophils máu (cells/µL)</label>
              <div className="relative">
                <input
                  type="number"
                  value={data.eosinophils}
                  onChange={(e) => onChange('eosinophils', e.target.value)}
                  className="w-full pl-3 pr-12 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ví dụ: 150"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                   tb/µL
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Quan trọng để xác định đáp ứng ICS (ngưỡng &ge; 300).</p>
            </div>
            </div>
          </div>
        )}
      </div>

       {/* Context Section */}
       <div className="bg-white rounded-lg shadow-sm">
        <SectionHeader title="Bối cảnh Lâm sàng (Điều trị & Bệnh kèm)" id="context" icon={FileText} />
        {activeSection === 'context' && (
          <div className="p-6 border border-t-0 border-slate-200 rounded-b-lg bg-white animate-fade-in">
             <div className="mb-6">
              <label className="block text-sm font-bold text-slate-800 mb-3">Điều trị hiện tại</label>
              
              {/* Auto-complete Search Input */}
              <div className="mb-3 relative group z-20">
                <div className="flex items-center">
                   <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                   <input
                    type="text"
                    value={medInput}
                    onChange={(e) => setMedInput(e.target.value)}
                    onKeyDown={handleMedInputKeyDown}
                    list="med-suggestions"
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nhập tên thuốc hoặc nhóm thuốc để thêm nhanh..."
                   />
                   <datalist id="med-suggestions">
                     {MEDICATION_SUGGESTIONS.map(med => (
                       <option key={med} value={med} />
                     ))}
                   </datalist>
                   <button 
                     onClick={() => medInput.trim() && addKeyword('currentTreatment', medInput.trim())}
                     className="ml-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-sm font-medium border border-blue-200"
                   >
                     Thêm
                   </button>
                </div>
              </div>

              <OptionGroup title="Nhóm thuốc chính" options={TREATMENT_CLASSES} field="currentTreatment" />
              
              <textarea
                rows={3}
                value={data.currentTreatment}
                onChange={(e) => onChange('currentTreatment', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm mt-2"
                placeholder="Danh sách thuốc đã chọn sẽ hiển thị tại đây..."
              />
              <p className="text-xs text-slate-400 mt-1 text-right">Nhập vào ô trên hoặc chọn từ danh sách để thêm.</p>
            </div>
            
            <div className="border-t border-slate-100 pt-6">
              <label className="block text-sm font-bold text-slate-800 mb-3">Hình ảnh học (CT/X-Quang)</label>
              <OptionGroup title="Dấu hiệu phổ biến" options={IMAGING_OPTIONS} field="imagingFindings" />
               <textarea
                rows={2}
                value={data.imagingFindings}
                onChange={(e) => onChange('imagingFindings', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm mb-4"
                placeholder="Kết quả hình ảnh học..."
              />

              <label className="block text-sm font-bold text-slate-800 mb-3">Bệnh đồng mắc</label>
              <OptionGroup title="Bệnh thường gặp" options={COMORBIDITIES_OPTIONS} field="comorbidities" />
              <textarea
                rows={2}
                value={data.comorbidities}
                onChange={(e) => onChange('comorbidities', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                placeholder="Ghi chú thêm về bệnh đồng mắc..."
              />
            </div>
          </div>
        )}
      </div>

      <div className="pt-4">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang phân tích...
            </>
          ) : (
            'Tạo Đánh giá theo GOLD 2026'
          )}
        </button>
        <p className="text-center text-xs text-slate-400 mt-3">
          Công cụ này chỉ nhằm hỗ trợ ra quyết định. Không thay thế chẩn đoán của bác sĩ.
        </p>
      </div>
    </div>
  );
};

export default InputForm;