import React, { useMemo, useState } from 'react';
import { X, ClipboardCopy, ExternalLink, CheckCircle2, MessageSquareText, Sparkles } from 'lucide-react';

interface ManualAiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  onUseResult: (analysisText: string) => void;
}

const ManualAiStudioModal: React.FC<ManualAiStudioModalProps> = ({
  isOpen,
  onClose,
  prompt,
  onUseResult,
}) => {
  const [copied, setCopied] = useState(false);
  const [resultText, setResultText] = useState('');

  const promptPreview = useMemo(() => {
    const trimmed = (prompt || '').trim();
    if (trimmed.length <= 900) return trimmed;
    return `${trimmed.slice(0, 900)}\n...\n(Đã rút gọn preview — nội dung copy sẽ là toàn bộ prompt)`;
  }, [prompt]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // Fallback: select text manually
      setCopied(false);
      alert('Không thể copy tự động. Vui lòng bôi đen prompt và copy thủ công.');
    }
  };

  const handleUse = () => {
    const text = resultText.trim();
    if (!text) return;
    onUseResult(text);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Chế độ AI Studio thủ công (không cần API)</h3>
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
          <div className="text-sm text-slate-600 leading-relaxed">
            Do quota/billing của Gemini API, bạn có thể chạy phân tích bằng Google AI Studio: copy prompt bên dưới,
            dán vào AI Studio, rồi dán kết quả về đây.
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={handleCopy}
              className="px-3 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-200 flex items-center gap-2 transition-colors"
            >
              <ClipboardCopy className="w-4 h-4" />
              {copied ? 'Đã copy' : 'Copy prompt'}
            </button>
            <a
              href="https://gemini.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-2 transition-colors"
            >
              Mở Gemini <Sparkles className="w-4 h-4" />
            </a>
            <a
              href="https://chatgpt.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 flex items-center gap-2 transition-colors"
            >
              Mở ChatGPT <MessageSquareText className="w-4 h-4" />
            </a>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Prompt (preview)</label>
            <textarea
              className="w-full h-40 px-4 py-3 border border-slate-300 rounded-lg outline-none text-xs font-mono bg-slate-50"
              value={promptPreview}
              readOnly
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Dán kết quả từ AI Studio vào đây</label>
            <textarea
              className="w-full h-56 px-4 py-3 border border-slate-300 rounded-lg outline-none text-sm"
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              placeholder="Dán nội dung báo cáo từ AI Studio..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleUse}
            disabled={!resultText.trim()}
            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm shadow-blue-200 transition-colors"
          >
            Dùng kết quả
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualAiStudioModal;

