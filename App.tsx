import React, { useState, useEffect } from 'react';
import { initialPatientData, PatientData, AssessmentRecord } from './types';
import InputForm from './components/InputForm';
import AnalysisResult from './components/AnalysisResult';
import PatientList from './components/PatientList';
import ApiKeyModal from './components/ApiKeyModal';
import StatisticsDashboard from './components/StatisticsDashboard';
import { calculateStatistics } from './services/statisticsService';
import { analyzePatientData, buildGeminiPromptForAiStudio } from './services/geminiService';
import { saveAssessment, getAllAssessments, deleteAssessment } from './services/storageService';
import { loadDraft, clearDraft, hasDraft, saveDraft, setupAutoSave } from './services/draftService';
import { Activity, ShieldCheck, List, PlusCircle, Settings, Stethoscope, HeartPulse } from 'lucide-react';
import ManualAiStudioModal from './components/ManualAiStudioModal';

const App: React.FC = () => {
  const [patientData, setPatientData] = useState<PatientData>(initialPatientData);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for History
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'assessment' | 'history' | 'statistics'>('assessment');

  // State for API Key Management
  const [userApiKey, setUserApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualPrompt, setManualPrompt] = useState('');

  // State for User Mode (GP vs Specialist)
  const [userMode, setUserMode] = useState<'GP' | 'SPECIALIST'>('SPECIALIST');

  // Load history from IndexedDB on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setHistoryLoading(true);
        const records = await getAllAssessments();
        setHistory(records);
      } catch (err) {
        console.error('Error loading history:', err);
        setError('Không thể tải lịch sử đánh giá.');
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    // Load saved API key on mount
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setUserApiKey(savedKey);
    }
    const savedManual = localStorage.getItem('copd_manual_ai_studio');
    if (savedManual === '1') {
      setManualMode(true);
    }

    // Load draft on mount
    const draft = loadDraft();
    if (draft && hasDraft()) {
      const shouldRestore = window.confirm(
        'Có bản nháp chưa lưu. Bạn có muốn khôi phục không?'
      );
      if (shouldRestore) {
        setPatientData(draft);
      } else {
        clearDraft();
      }
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (currentView === 'assessment' && !analysis) {
      const cleanup = setupAutoSave(patientData, (data) => {
        saveDraft(data);
      });
      return cleanup;
    } else if (analysis) {
      // Clear draft after successful analysis
      clearDraft();
    }
  }, [patientData, currentView, analysis]);

  const handleSaveApiKey = (key: string) => {
    setUserApiKey(key);
    if (key) {
      localStorage.setItem('gemini_api_key', key);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  };

  const handleToggleManualMode = (enabled: boolean) => {
    setManualMode(enabled);
    localStorage.setItem('copd_manual_ai_studio', enabled ? '1' : '0');
    if (enabled) {
      // Avoid confusing state: manual mode ignores API key
      setUserApiKey('');
      localStorage.removeItem('gemini_api_key');
    }
  };

  const handleDataChange = (key: keyof PatientData, value: any) => {
    setPatientData((prev) => ({ ...prev, [key]: value }));
  };

  const openManualWorkflow = () => {
    const { fullPrompt } = buildGeminiPromptForAiStudio(patientData, userMode);
    setManualPrompt(fullPrompt);
    setIsManualModalOpen(true);
  };

  const handleUseManualResult = async (analysisText: string) => {
    setAnalysis(analysisText);
    setError(null);

    const newRecord: AssessmentRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: { ...patientData },
      analysis: analysisText
    };

    setHistory(prev => [newRecord, ...prev]);

    try {
      await saveAssessment(newRecord);
    } catch (storageErr) {
      console.error('Error saving to IndexedDB:', storageErr);
    }
  };

  const handleAnalyze = async () => {
    // Validate data before submitting
    const { validatePatientData, hasCriticalErrors } = await import('./services/validationService');
    const validationErrors = validatePatientData(patientData);
    
    if (hasCriticalErrors(validationErrors)) {
      const errorMessages = validationErrors
        .filter(err => !err.message.includes('⚠️'))
        .map(err => err.message)
        .join('\n');
      setError(`Vui lòng sửa các lỗi sau:\n${errorMessages}`);
      return;
    }

    // Show warnings but allow proceed
    const warnings = validationErrors.filter(err => err.message.includes('⚠️'));
    if (warnings.length > 0) {
      const warningMessages = warnings.map(w => w.message).join('\n');
      if (!window.confirm(`${warningMessages}\n\nBạn có muốn tiếp tục không?`)) {
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      if (manualMode) {
        setLoading(false);
        openManualWorkflow();
        return;
      }
      // Pass the userApiKey AND userMode to the service
      const result = await analyzePatientData(patientData, userApiKey, userMode);
      setAnalysis(result);
      
      // Save to history (both state and IndexedDB)
      const newRecord: AssessmentRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data: { ...patientData },
        analysis: result
      };
      
      // Update state immediately for UI
      setHistory(prev => [newRecord, ...prev]);
      
      // Save to IndexedDB (async, don't block)
      try {
        await saveAssessment(newRecord);
      } catch (storageErr) {
        console.error('Error saving to IndexedDB:', storageErr);
        // Don't show error to user, data is still in memory
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.";
      setError(message);
      // If quota/rate-limit, offer manual workflow
      if (
        /quota|rate limit|resource_exhausted|429|vượt quá giới hạn/i.test(message)
      ) {
        openManualWorkflow();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setError(null);
    setPatientData(initialPatientData);
    setCurrentView('assessment');
    clearDraft();
  };

  const handleSelectRecord = (record: AssessmentRecord) => {
    setPatientData(record.data);
    setAnalysis(record.analysis);
    setCurrentView('assessment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) {
      return;
    }

    try {
      await deleteAssessment(id);
      setHistory(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError('Không thể xóa đánh giá. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <ApiKeyModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        currentKey={userApiKey}
        onSave={handleSaveApiKey}
        manualMode={manualMode}
        onToggleManualMode={handleToggleManualMode}
      />
      <ManualAiStudioModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        prompt={manualPrompt}
        onUseResult={handleUseManualResult}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('assessment')}>
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Activity className="w-6 h-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">GOLD 2026</h1>
              <p className="text-xs text-slate-500 font-medium">Hỗ trợ Quyết định Lâm sàng COPD</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
             {/* User Mode Toggle */}
             <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
                <button
                  onClick={() => setUserMode('GP')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full transition-all ${
                    userMode === 'GP' 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Chế độ Đa khoa: Ngôn ngữ đơn giản, tập trung điều trị cơ bản"
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Đa khoa</span>
                </button>
                <button
                  onClick={() => setUserMode('SPECIALIST')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full transition-all ${
                    userMode === 'SPECIALIST' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Chế độ Chuyên khoa: Phân tích sâu Phenotype, Hô hấp ký"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Chuyên khoa</span>
                </button>
             </div>

             <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setCurrentView('assessment')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    currentView === 'assessment' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden lg:inline">Đánh giá mới</span>
                </button>
                <button
                  onClick={() => setCurrentView('history')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    currentView === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden lg:inline">Lịch sử ({history.length})</span>
                </button>
                <button
                  onClick={() => setCurrentView('statistics')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    currentView === 'statistics' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Thống kê"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden lg:inline">Thống kê</span>
                </button>
             </div>
             
             {/* Settings Button */}
             <button
               onClick={() => setIsSettingsOpen(true)}
               className={`p-2 rounded-lg border transition-all ${
                  userApiKey 
                  ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                  : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
               }`}
               title="Cài đặt API Key"
             >
               <Settings className="w-5 h-5" />
             </button>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3 animate-pulse">
            <Activity className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {currentView === 'statistics' ? (
          <div className="animate-fade-in">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Thống kê</h2>
              <p className="text-slate-500">Phân tích dữ liệu từ các đánh giá đã thực hiện.</p>
            </div>
            <StatisticsDashboard statistics={calculateStatistics(history)} />
          </div>
        ) : currentView === 'history' ? (
          <div className="animate-fade-in">
             <div className="mb-8">
               <h2 className="text-2xl font-bold text-slate-800">Lịch sử Đánh giá</h2>
               <p className="text-slate-500">Danh sách các bệnh nhân đã được phân tích.</p>
             </div>
             {historyLoading ? (
               <div className="flex items-center justify-center py-12">
                 <div className="flex flex-col items-center gap-3">
                   <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   <p className="text-slate-500 text-sm">Đang tải lịch sử...</p>
                 </div>
               </div>
             ) : (
               <PatientList 
                 records={history} 
                 onSelect={handleSelectRecord}
                 onDelete={handleDeleteRecord}
               />
             )}
          </div>
        ) : (
          /* Assessment View */
          !analysis ? (
            <div className="animate-fade-in">
               <div className="mb-8 text-center max-w-2xl mx-auto">
                 <h2 className="text-3xl font-bold text-slate-800 mb-3">Đánh giá Bệnh nhân</h2>
                 <p className="text-slate-500 mb-4">
                   Nhập các thông số lâm sàng bên dưới để tạo báo cáo đánh giá tuân thủ hướng dẫn GOLD 2026.
                   Mọi dữ liệu được xử lý bảo mật qua Google Gemini.
                 </p>
                 {userMode === 'GP' && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-sm font-medium">
                      <HeartPulse className="w-4 h-4" />
                      Đang ở chế độ Bác sĩ Đa khoa (Đơn giản hóa)
                    </div>
                 )}
               </div>
               <InputForm
                 data={patientData}
                 onChange={handleDataChange}
                 onSubmit={handleAnalyze}
                 loading={loading}
               />
            </div>
          ) : (
            <AnalysisResult 
              analysis={analysis} 
              onReset={handleReset}
              patientData={patientData}
              timestamp={Date.now()}
            />
          )
        )}
      </main>
    </div>
  );
};

export default App;