import { PatientData } from '../types';

export interface CalculationResult {
  field: keyof PatientData;
  value: string;
  calculated: boolean;
}

/**
 * Auto-calculate FEV1/FVC ratio from FEV1 and FVC
 */
export const calculateFev1FvcRatio = (fev1L: string, fvcL: string): string | null => {
  const fev1 = parseFloat(fev1L);
  const fvc = parseFloat(fvcL);
  
  if (!isNaN(fev1) && !isNaN(fvc) && fvc > 0) {
    const ratio = fev1 / fvc;
    return ratio.toFixed(2);
  }
  return null;
};

/**
 * Auto-calculate BMI from weight and height
 */
export const calculateBMI = (weightKg: string, heightCm: string): string | null => {
  const weight = parseFloat(weightKg);
  const height = parseFloat(heightCm);
  
  if (!isNaN(weight) && !isNaN(height) && height > 0 && weight > 0) {
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    return bmi.toFixed(1);
  }
  return null;
};

/**
 * Auto-calculate pack-years from years and packs per day
 */
export const calculatePackYears = (years: string, packsPerDay: string): string | null => {
  const y = parseFloat(years);
  const p = parseFloat(packsPerDay);
  
  if (!isNaN(y) && !isNaN(p) && y >= 0 && p >= 0) {
    const packYears = y * p;
    return Math.round(packYears).toString();
  }
  return null;
};

/**
 * Smart calculations - auto-calculate all possible fields
 */
export const performSmartCalculations = (
  data: PatientData,
  changedField: keyof PatientData,
  changedValue: any
): CalculationResult[] => {
  const results: CalculationResult[] = [];
  
  // Calculate FEV1/FVC ratio if FEV1 or FVC changed
  if (changedField === 'fev1L' || changedField === 'fvcL') {
    const ratio = calculateFev1FvcRatio(data.fev1L, data.fvcL);
    if (ratio) {
      results.push({
        field: 'fev1FvcRatio',
        value: ratio,
        calculated: true
      });
    }
  }
  
  // Note: BMI and pack-years need additional fields (weight/height, years/packs)
  // These will be handled in InputForm when those fields are added
  
  return results;
};

/**
 * Calculate FEV1/FVC from current data
 */
export const recalculateFev1Fvc = (data: PatientData): Partial<PatientData> => {
  const updates: Partial<PatientData> = {};
  
  if (data.fev1L && data.fvcL) {
    const ratio = calculateFev1FvcRatio(data.fev1L, data.fvcL);
    if (ratio) {
      updates.fev1FvcRatio = ratio;
    }
  }
  
  return updates;
};
