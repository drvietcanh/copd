import React, { useState, useEffect } from 'react';
import { Key, X, ExternalLink, Save, ShieldCheck, AlertCircle, Wand2 } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  onSave: (key: string) => void;
  manualMode: boolean;
  onToggleManualMode: (enabled: boolean) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  currentKey,
  onSave,
  manualMode,
  onToggleManualMode,
}) => {
  const [inputKey, setInputKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputKey(currentKey);
    }
  }, [isOpen, currentKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(inputKey.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Cấu hình Gemini API</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 flex gap-3 items-start">
            <Wand2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 space-y-1">
              <p className="font-semibold">Không dùng API (AI Studio thủ công)</p>
              <p>
                Nếu Gemini API bị giới hạn quota/billing, bật chế độ này để app tạo prompt và bạn chạy trên Google AI Studio rồi dán kết quả về.
              </p>
              <label className="mt-2 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={manualMode}
                  onChange={(e) => onToggleManualMode(e.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span className="font-semibold text-emerald-800">Bật chế độ AI Studio thủ công</span>
              </label>
            </div>
          </div>

          <div className="text-sm text-slate-600 leading-relaxed">
            Nếu bạn vẫn muốn gọi trực tiếp Gemini API, có thể nhập API Key cá nhân. (Lưu ý: nhiều tài khoản free tier có thể bị quota = 0.)
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Gemini API Key của bạn
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              disabled={manualMode}
              placeholder="Dán API Key bắt đầu bằng AIza..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 space-y-1">
              <p className="font-semibold">Chưa có API Key?</p>
              <p>Bạn có thể lấy miễn phí tại Google AI Studio.</p>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 underline font-medium mt-1"
              >
                Lấy API Key tại đây <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
            <ShieldCheck className="w-3.5 h-3.5" />
            Key được lưu trên trình duyệt của bạn, không gửi về server.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            Lưu Cấu hình
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;