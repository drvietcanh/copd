import { PatientData } from '../types';

/**
 * GOLD 2026 Severity Classification (GOLD 1-4)
 * Based on FEV1% predicted
 */
export const classifyGOLDSeverity = (fev1Percent: string): 'GOLD1' | 'GOLD2' | 'GOLD3' | 'GOLD4' | 'UNKNOWN' => {
  const fev1 = parseFloat(fev1Percent);
  if (isNaN(fev1) || fev1 <= 0) return 'UNKNOWN';
  
  if (fev1 >= 80) return 'GOLD1';      // Mild
  if (fev1 >= 50) return 'GOLD2';      // Moderate
  if (fev1 >= 30) return 'GOLD3';      // Severe
  return 'GOLD4';                      // Very Severe (< 30%)
};

/**
 * GOLD 2026 Group Classification (A/B/E)
 * 
 * Symptoms assessment:
 * - High symptoms: CAT ≥ 10 OR mMRC ≥ 2
 * - Low symptoms: CAT < 10 AND mMRC < 2
 * 
 * Exacerbation risk:
 * - High risk: ≥2 exacerbations/year OR ≥1 hospitalization/year
 * - Low risk: 0-1 exacerbations/year AND 0 hospitalizations
 * 
 * Groups:
 * - A: Low symptoms, Low risk
 * - B: High symptoms, Low risk
 * - E: High risk (regardless of symptoms)
 */
export const classifyGOLDGroup = (data: PatientData): 'A' | 'B' | 'E' | 'UNKNOWN' => {
  const cat = parseFloat(data.catScore || '0');
  const mMRC = parseFloat(data.mMRC || '0');
  const exac = parseFloat(data.exacerbationsLast12m || '0');
  const hosp = parseFloat(data.hospitalizationsLast12m || '0');
  
  // Check for missing critical data
  if (isNaN(cat) && isNaN(mMRC)) return 'UNKNOWN';
  if (isNaN(exac) && isNaN(hosp)) return 'UNKNOWN';
  
  // GOLD E: High risk (≥2 exacerbations OR ≥1 hospitalization)
  // This takes priority over symptoms
  if (exac >= 2 || hosp >= 1) {
    return 'E';
  }
  
  // Determine symptom level
  // High symptoms: CAT ≥ 10 OR mMRC ≥ 2
  // Low symptoms: CAT < 10 AND mMRC < 2
  const hasHighSymptoms = (cat >= 10) || (mMRC >= 2);
  const hasLowSymptoms = (cat < 10 || isNaN(cat)) && (mMRC < 2 || isNaN(mMRC));
  
  // If we can't determine symptoms, return UNKNOWN
  if (!hasHighSymptoms && !hasLowSymptoms) {
    return 'UNKNOWN';
  }
  
  // At this point, we know it's low risk (0-1 exac, 0 hosp)
  if (hasLowSymptoms) {
    return 'A';  // Low symptoms, Low risk
  }
  
  if (hasHighSymptoms) {
    return 'B';  // High symptoms, Low risk
  }
  
  return 'UNKNOWN';
};

/**
 * Get exacerbation risk level
 */
export const getExacerbationRisk = (data: PatientData): 'LOW' | 'HIGH' => {
  const exac = parseFloat(data.exacerbationsLast12m || '0');
  const hosp = parseFloat(data.hospitalizationsLast12m || '0');
  
  if (exac >= 2 || hosp >= 1) {
    return 'HIGH';
  }
  return 'LOW';
};

/**
 * Get symptom level
 */
export const getSymptomLevel = (data: PatientData): 'LOW' | 'HIGH' | 'UNKNOWN' => {
  const cat = parseFloat(data.catScore || '0');
  const mMRC = parseFloat(data.mMRC || '0');
  
  // If both are missing, return UNKNOWN
  if (isNaN(cat) && isNaN(mMRC)) return 'UNKNOWN';
  
  // High symptoms: CAT ≥ 10 OR mMRC ≥ 2
  if ((cat >= 10) || (mMRC >= 2)) {
    return 'HIGH';
  }
  
  // Low symptoms: CAT < 10 AND mMRC < 2
  if ((cat < 10 || isNaN(cat)) && (mMRC < 2 || isNaN(mMRC))) {
    return 'LOW';
  }
  
  return 'UNKNOWN';
};

/**
 * Comprehensive GOLD 2026 classification
 */
export interface GOLDClassification {
  severity: 'GOLD1' | 'GOLD2' | 'GOLD3' | 'GOLD4' | 'UNKNOWN';
  group: 'A' | 'B' | 'E' | 'UNKNOWN';
  symptomLevel: 'LOW' | 'HIGH' | 'UNKNOWN';
  exacerbationRisk: 'LOW' | 'HIGH';
  fev1Percent: number;
  catScore: number;
  mMRC: number;
  exacerbations: number;
  hospitalizations: number;
}

export const getGOLDClassification = (data: PatientData): GOLDClassification => {
  return {
    severity: classifyGOLDSeverity(data.fev1Percent || '0'),
    group: classifyGOLDGroup(data),
    symptomLevel: getSymptomLevel(data),
    exacerbationRisk: getExacerbationRisk(data),
    fev1Percent: parseFloat(data.fev1Percent || '0'),
    catScore: parseFloat(data.catScore || '0'),
    mMRC: parseFloat(data.mMRC || '0'),
    exacerbations: parseFloat(data.exacerbationsLast12m || '0'),
    hospitalizations: parseFloat(data.hospitalizationsLast12m || '0'),
  };
};

export interface ACODetectionResult {
  acoSuspected: boolean;
  reasons?: string[];
}

/**
 * Detects features suggestive of Asthma–COPD Overlap (ACO).
 * This is a heuristic flag only, NOT a definitive diagnosis.
 */
export const detectACO = (options: {
  copdConfirmed: boolean;
  bronchodilatorReversibility: boolean;
  bloodEosinophils: number;
  historyOfAsthmaOrAllergy: boolean;
}): ACODetectionResult => {
  const { copdConfirmed, bronchodilatorReversibility, bloodEosinophils, historyOfAsthmaOrAllergy } = options;

  if (!copdConfirmed) {
    return { acoSuspected: false };
  }

  const reasons: string[] = [];

  if (bronchodilatorReversibility) {
    reasons.push(
      'Có đáp ứng giãn phế quản rõ, gợi ý thành phần hen trong bệnh cảnh tắc nghẽn đường thở.'
    );
  }

  if (!Number.isNaN(bloodEosinophils) && bloodEosinophils >= 300) {
    reasons.push(
      'Eosinophil máu ≥ 300 cells/µL, thường liên quan đến phenotype viêm eosinophilic và đáp ứng tốt hơn với ICS.'
    );
  }

  if (historyOfAsthmaOrAllergy) {
    reasons.push(
      'Tiền sử hen hoặc bệnh lý dị ứng, làm tăng khả năng bệnh nhân có đặc điểm chồng lấp hen–COPD.'
    );
  }

  if (reasons.length === 0) {
    return { acoSuspected: false };
  }

  return {
    acoSuspected: true,
    reasons,
  };
};