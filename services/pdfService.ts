import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PatientData } from '../types';

interface ExportOptions {
  patientData: PatientData;
  analysis: string;
  timestamp?: number;
  element?: HTMLElement | null;
}

export const exportToPDF = async ({ patientData, analysis, timestamp, element }: ExportOptions): Promise<void> => {
  // If a DOM element is provided, render it to canvas to preserve Vietnamese text
  if (element) {
    const canvas = await html2canvas(element, {
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Fit image to page width
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      position = heightLeft - imgHeight;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Footer (timestamp + disclaimer) — add simple overlay on each page
    const totalPages = pdf.getNumberOfPages();
    const dateStr = timestamp
      ? new Date(timestamp).toLocaleString('vi-VN')
      : new Date().toLocaleString('vi-VN');

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Generated: ${dateStr} | Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      pdf.text('Hệ thống hỗ trợ ra quyết định lâm sàng - Không thay thế chẩn đoán của bác sĩ', pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    const fileName = `COPD_Assessment_${patientData.patientName || 'Patient'}_${Date.now()}.pdf`;
    pdf.save(fileName);
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
  };

  // Header
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GOLD 2026 COPD Assessment Report', pageWidth / 2, 20, { align: 'center' });

  yPos = 40;

  // Patient Information Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('THÔNG TIN BỆNH NHÂN', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const patientInfo = [
    `Họ và Tên: ${patientData.patientName || 'N/A'}`,
    `Tuổi: ${patientData.age || 'N/A'} | Giới tính: ${patientData.sex || 'N/A'} | BMI: ${patientData.bmi || 'N/A'} kg/m²`,
    `Tiền sử hút thuốc: ${patientData.smokingHistory || 'N/A'} (${patientData.packYears || '0'} bao-năm)`,
    `mMRC: ${patientData.mMRC || '0'} | CAT: ${patientData.catScore || 'N/A'}`,
    `Đợt cấp (12T): ${patientData.exacerbationsLast12m || '0'} | Nhập viện: ${patientData.hospitalizationsLast12m || '0'}`,
    `FEV1: ${patientData.fev1L || 'N/A'}L (${patientData.fev1Percent || 'N/A'}%) | FEV1/FVC: ${patientData.fev1FvcRatio || 'N/A'}`,
    `Eosinophils: ${patientData.eosinophils || 'N/A'} cells/µL`,
    `Điều trị hiện tại: ${patientData.currentTreatment || 'Chưa rõ'}`,
    `Bệnh kèm: ${patientData.comorbidities || 'Không'}`
  ];

  patientInfo.forEach(line => {
    checkPageBreak(6);
    doc.text(line, margin, yPos);
    yPos += 6;
  });

  yPos += 5;
  checkPageBreak(10);

  // Analysis Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PHÂN TÍCH LÂM SÀNG', margin, yPos);
  yPos += 8;

  // Parse and format analysis
  const sections = analysis.split(/(?=\d+\.\s+)/).filter(s => s.trim());
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  sections.forEach(section => {
    const lines = doc.splitTextToSize(section.trim(), pageWidth - 2 * margin);
    
    lines.forEach((line: string) => {
      checkPageBreak(6);
      
      // Bold section headers
      if (line.match(/^\d+\.\s+/)) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
      }
      
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    
    yPos += 3; // Space between sections
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const dateStr = timestamp 
      ? new Date(timestamp).toLocaleString('vi-VN')
      : new Date().toLocaleString('vi-VN');
    doc.text(
      `Generated: ${dateStr} | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'Hệ thống hỗ trợ ra quyết định lâm sàng - Không thay thế chẩn đoán của bác sĩ',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  // Save PDF
  const fileName = `COPD_Assessment_${patientData.patientName || 'Patient'}_${Date.now()}.pdf`;
  doc.save(fileName);
};
