import { PatientData } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export const validatePatientData = (data: PatientData): ValidationError[] => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate FEV1/FVC ratio (must be < 0.7 for COPD diagnosis)
  if (data.fev1FvcRatio && data.fvcL && data.fev1L) {
    const fev1 = parseFloat(data.fev1L);
    const fvc = parseFloat(data.fvcL);
    const ratio = parseFloat(data.fev1FvcRatio);
    
    if (!isNaN(fev1) && !isNaN(fvc) && !isNaN(ratio) && fvc > 0) {
      const calculatedRatio = fev1 / fvc;
      const difference = Math.abs(ratio - calculatedRatio);
      
      // FEV1/FVC ratio thường được đo trực tiếp, có thể khác với tính toán do làm tròn
      // Cho phép sai số lớn hơn (0.15) vì có thể có sự khác biệt do:
      // - Làm tròn số trong báo cáo
      // - FEV1/FVC được đo trực tiếp từ máy
      // - Có thể có post-BD values khác pre-BD
      if (difference > 0.15) {
        // Chỉ warning, không block submit vì ratio có thể được đo trực tiếp
        warnings.push({
          field: 'fev1FvcRatio',
          message: `⚠️ Tỷ lệ FEV1/FVC có sự khác biệt lớn. Tính toán từ FEV1/FVC: ${calculatedRatio.toFixed(2)}, nhập: ${ratio.toFixed(2)}. Nếu FEV1/FVC được đo trực tiếp từ máy, có thể bỏ qua cảnh báo này.`
        });
      } else if (difference > 0.05) {
        // Sai số nhỏ, chỉ thông báo nhẹ
        warnings.push({
          field: 'fev1FvcRatio',
          message: `ℹ️ Tỷ lệ FEV1/FVC hơi khác so với tính toán (${calculatedRatio.toFixed(2)} vs ${ratio.toFixed(2)}). Có thể do làm tròn số.`
        });
      }
      
      // Validate COPD threshold (< 0.7)
      if (ratio >= 0.7) {
        errors.push({
          field: 'fev1FvcRatio',
          message: 'Tỷ lệ FEV1/FVC ≥ 0.7 không phù hợp chẩn đoán COPD. Cần < 0.7.'
        });
      }
    }
  }

  // Validate FEV1%
  if (data.fev1Percent) {
    const fev1Percent = parseFloat(data.fev1Percent);
    if (!isNaN(fev1Percent)) {
      if (fev1Percent < 0 || fev1Percent > 150) {
        errors.push({
          field: 'fev1Percent',
          message: 'FEV1% phải trong khoảng 0-150%'
        });
      }
      
      // Validate FEV1% vs FEV1L consistency (nếu có cả 2)
      // FEV1% thường được tính từ FEV1L và predicted FEV1
      // Không validate strict vì predicted values khác nhau theo dân tộc/giới tính
      if (data.fev1L) {
        const fev1L = parseFloat(data.fev1L);
        if (!isNaN(fev1L) && fev1L > 0) {
          // FEV1% thường trong khoảng 30-120% cho COPD patients
          // Nếu FEV1L rất thấp (<0.5L) nhưng FEV1% cao (>80%), có thể có vấn đề
          if (fev1L < 0.5 && fev1Percent > 80) {
            warnings.push({
              field: 'fev1Percent',
              message: `⚠️ FEV1L rất thấp (${fev1L}L) nhưng FEV1% cao (${fev1Percent}%). Vui lòng kiểm tra lại.`
            });
          }
          // Ngược lại, FEV1L cao nhưng FEV1% thấp cũng cần cảnh báo
          if (fev1L > 3.0 && fev1Percent < 50) {
            warnings.push({
              field: 'fev1Percent',
              message: `⚠️ FEV1L cao (${fev1L}L) nhưng FEV1% thấp (${fev1Percent}%). Vui lòng kiểm tra lại.`
            });
          }
        }
      }
    }
  }

  // Validate CAT score
  if (data.catScore) {
    const catScore = parseInt(data.catScore);
    if (!isNaN(catScore)) {
      if (catScore < 0 || catScore > 40) {
        errors.push({
          field: 'catScore',
          message: 'Điểm CAT phải trong khoảng 0-40'
        });
      }
    }
  }

  // Validate mMRC
  const mMRC = parseInt(data.mMRC);
  if (!isNaN(mMRC) && (mMRC < 0 || mMRC > 4)) {
    errors.push({
      field: 'mMRC',
      message: 'mMRC phải trong khoảng 0-4'
    });
  }

  // Validate age
  if (data.age) {
    const age = parseInt(data.age);
    if (!isNaN(age)) {
      if (age < 0 || age > 150) {
        errors.push({
          field: 'age',
          message: 'Tuổi phải hợp lý (0-150)'
        });
      }
    }
  }

  // Validate BMI
  if (data.bmi) {
    const bmi = parseFloat(data.bmi);
    if (!isNaN(bmi)) {
      if (bmi < 10 || bmi > 60) {
        errors.push({
          field: 'bmi',
          message: 'BMI phải trong khoảng 10-60 kg/m²'
        });
      }
    }
  }

  // Validate pack years
  if (data.packYears) {
    const packYears = parseFloat(data.packYears);
    if (!isNaN(packYears) && packYears < 0) {
      errors.push({
        field: 'packYears',
        message: 'Số bao-năm không thể âm'
      });
    }
  }

  // Validate exacerbations
  if (data.exacerbationsLast12m) {
    const exac = parseInt(data.exacerbationsLast12m);
    if (!isNaN(exac) && exac < 0) {
      errors.push({
        field: 'exacerbationsLast12m',
        message: 'Số đợt cấp không thể âm'
      });
    }
  }

  // Validate hospitalizations
  if (data.hospitalizationsLast12m) {
    const hosp = parseInt(data.hospitalizationsLast12m);
    if (!isNaN(hosp) && hosp < 0) {
      errors.push({
        field: 'hospitalizationsLast12m',
        message: 'Số lần nhập viện không thể âm'
      });
    }
  }

  // Check for critical missing data
  if (!data.fev1Percent || !data.fev1FvcRatio) {
    warnings.push({
      field: 'spirometry',
      message: '⚠️ Thiếu dữ liệu hô hấp ký quan trọng (FEV1%, FEV1/FVC)'
    });
  }

  if (!data.catScore && data.mMRC === '0') {
    warnings.push({
      field: 'symptoms',
      message: '⚠️ Thiếu đánh giá triệu chứng (CAT hoặc mMRC)'
    });
  }

  if (!data.exacerbationsLast12m) {
    warnings.push({
      field: 'exacerbations',
      message: '⚠️ Thiếu thông tin đợt cấp 12 tháng qua'
    });
  }

  return [...errors, ...warnings];
};

export const hasCriticalErrors = (errors: ValidationError[]): boolean => {
  return errors.some(err => !err.message.includes('⚠️'));
};
