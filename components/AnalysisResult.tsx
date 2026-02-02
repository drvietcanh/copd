import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Info, FileText, Activity, ShieldAlert, Stethoscope, ClipboardList, Eye, Zap, Copy, Check, Download, Printer } from 'lucide-react';
import { PatientData } from '../types';
import { exportToPDF } from '../services/pdfService';

interface AnalysisResultProps {
  analysis: string;
  onReset: () => void;
  patientData?: PatientData;
  timestamp?: number;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis, onReset, patientData, timestamp }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const textToCopy = patientData 
        ? `BỆNH NHÂN: ${patientData.patientName || 'N/A'}\n${'='.repeat(50)}\n\n${analysis}`
        : analysis;
      
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleExportPDF = () => {
    if (!patientData) {
      alert('Không có dữ liệu bệnh nhân để xuất PDF.');
      return;
    }
    exportToPDF({ patientData, analysis, timestamp });
  };

  const handlePrint = () => {
    window.print();
  };
  // Parser updated for numbered sections (e.g., "0. Summary", "1. Title")
  const parseSections = (text: string) => {
    const sections: Record<string, string> = {};
    // Regex matches 0-6. Title
    const regex = /(?:^|\n)([0-6]\.\s+[^\n]+)([\s\S]*?)(?=(?:\n[0-6]\.\s+)|$)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();
      sections[title] = content;
    }
    return sections;
  };

  const parsedSections = parseSections(analysis);
  const sectionKeys = Object.keys(parsedSections);
  
  // Sort keys to ensure 0 comes first (though input order usually dictates this)
  sectionKeys.sort((a, b) => {
    const numA = parseInt(a.charAt(0));
    const numB = parseInt(b.charAt(0));
    return numA - numB;
  });

  const getIconForSection = (title: string) => {
    if (title.includes("Tóm Tắt")) return <Zap className="w-5 h-5 text-blue-600" />;
    if (title.includes("Chẩn đoán") || title.includes("Diagnostic")) return <Stethoscope className="w-5 h-5 text-purple-600" />;
    if (title.includes("Mức độ") || title.includes("Severity") || title.includes("GOLD")) return <ShieldAlert className="w-5 h-5 text-red-600" />;
    if (title.includes("Nguy cơ") || title.includes("Risk")) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    if (title.includes("Điều trị") || title.includes("Treatment")) return <FileText className="w-5 h-5 text-blue-600" />;
    if (title.includes("Quản lý") || title.includes("Management")) return <ClipboardList className="w-5 h-5 text-emerald-600" />;
    if (title.includes("Theo dõi") || title.includes("Monitoring")) return <Eye className="w-5 h-5 text-cyan-600" />;
    return <Info className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Lập Luận Lâm Sàng
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
              title="Copy toàn bộ phân tích"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 hidden sm:inline">Đã copy!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
            {patientData && (
              <>
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
                  title="Xuất PDF"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
                  title="In"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">In</span>
                </button>
              </>
            )}
            <button
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Đánh giá mới
            </button>
          </div>
        </div>

        {sectionKeys.length === 0 ? (
          // Fallback if regex doesn't match strict format
          <div className="whitespace-pre-wrap font-mono text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200">
            {analysis}
          </div>
        ) : (
          <div className="space-y-6">
            {sectionKeys.map((title) => {
              const isSummary = title.startsWith("0.");
              const content = parsedSections[title];
              
              if (isSummary) {
                 return (
                    <div key={title} className="bg-blue-50/50 rounded-xl border border-blue-100 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3 text-blue-800 font-bold uppercase tracking-wide text-xs">
                        <Zap className="w-4 h-4" />
                        Tóm tắt nhanh
                      </div>
                      <div className="grid gap-2 text-slate-800 font-medium text-base leading-relaxed whitespace-pre-wrap">
                        {content}
                      </div>
                    </div>
                 )
              }

              return (
                <div key={title} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-2 font-bold text-slate-800 text-lg">
                    {getIconForSection(title)}
                    {title}
                  </div>
                  <div className="p-4 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-400 mt-8 whitespace-pre-line">
        Hệ thống hỗ trợ ra quyết định lâm sàng dựa trên GOLD 2026.
        {"\n"}
        Không thay thế chẩn đoán và quyết định điều trị của bác sĩ.
      </div>
    </div>
  );
};

export default AnalysisResult;