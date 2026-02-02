import { AssessmentRecord } from '../types';

export interface Statistics {
  totalPatients: number;
  goldDistribution: {
    a: number;
    b: number;
    e: number;
    unknown: number;
  };
  severityDistribution: {
    gold1: number;
    gold2: number;
    gold3: number;
    gold4: number;
    unknown: number;
  };
  phenotypeDistribution: {
    eosinophilic: number;
    emphysema: number;
    chronicBronchitis: number;
    aco: number;
  };
  averageExacerbations: number;
  averageHospitalizations: number;
  averageFEV1: number;
  averageCAT: number;
  averageAge: number;
}

const parseFloatSafe = (val: string): number => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

const classifyGOLD = (record: AssessmentRecord): 'A' | 'B' | 'E' | 'unknown' => {
  const exac = parseFloatSafe(record.data.exacerbationsLast12m);
  const hosp = parseFloatSafe(record.data.hospitalizationsLast12m);
  const cat = parseFloatSafe(record.data.catScore);
  const mMRC = parseFloatSafe(record.data.mMRC);

  // GOLD E: High risk (≥2 exacerbations OR ≥1 hospitalization)
  // This takes priority over symptoms per GOLD 2026
  if (exac >= 2 || hosp >= 1) {
    return 'E';
  }

  // Determine symptom level per GOLD 2026:
  // High symptoms: CAT ≥ 10 OR mMRC ≥ 2
  // Low symptoms: CAT < 10 AND mMRC < 2
  const hasHighSymptoms = (cat >= 10) || (mMRC >= 2);
  const hasLowSymptoms = (cat < 10 || cat === 0) && (mMRC < 2);

  // GOLD A: Low symptoms, Low risk
  if (hasLowSymptoms) {
    return 'A';
  }

  // GOLD B: High symptoms, Low risk
  if (hasHighSymptoms) {
    return 'B';
  }

  return 'unknown';
};

const classifySeverity = (fev1Percent: string): 'gold1' | 'gold2' | 'gold3' | 'gold4' | 'unknown' => {
  const fev1 = parseFloatSafe(fev1Percent);
  if (fev1 >= 80) return 'gold1';
  if (fev1 >= 50) return 'gold2';
  if (fev1 >= 30) return 'gold3';
  if (fev1 > 0) return 'gold4';
  return 'unknown';
};

const detectPhenotype = (record: AssessmentRecord) => {
  const eos = parseFloatSafe(record.data.eosinophils);
  const isReversible = record.data.postBdReversibility;
  const hasEmphysema = /khí phế thũng|emphysema|kén khí|bullae|giãn phế nang/i.test(record.data.imagingFindings || '');
  const hasChronicBronchitis = record.data.cough && record.data.sputum;

  return {
    eosinophilic: eos >= 300,
    emphysema: hasEmphysema,
    chronicBronchitis: hasChronicBronchitis,
    aco: isReversible || eos >= 300,
  };
};

export const calculateStatistics = (records: AssessmentRecord[]): Statistics => {
  if (records.length === 0) {
    return {
      totalPatients: 0,
      goldDistribution: { a: 0, b: 0, e: 0, unknown: 0 },
      severityDistribution: { gold1: 0, gold2: 0, gold3: 0, gold4: 0, unknown: 0 },
      phenotypeDistribution: { eosinophilic: 0, emphysema: 0, chronicBronchitis: 0, aco: 0 },
      averageExacerbations: 0,
      averageHospitalizations: 0,
      averageFEV1: 0,
      averageCAT: 0,
      averageAge: 0,
    };
  }

  const goldCounts = { a: 0, b: 0, e: 0, unknown: 0 };
  const severityCounts = { gold1: 0, gold2: 0, gold3: 0, gold4: 0, unknown: 0 };
  const phenotypeCounts = { eosinophilic: 0, emphysema: 0, chronicBronchitis: 0, aco: 0 };

  let totalExac = 0;
  let totalHosp = 0;
  let totalFEV1 = 0;
  let fev1Count = 0;
  let totalCAT = 0;
  let catCount = 0;
  let totalAge = 0;
  let ageCount = 0;

  records.forEach(record => {
    // GOLD classification
    const gold = classifyGOLD(record);
    goldCounts[gold]++;

    // Severity classification
    const severity = classifySeverity(record.data.fev1Percent || '');
    severityCounts[severity]++;

    // Phenotype detection
    const phenotype = detectPhenotype(record);
    if (phenotype.eosinophilic) phenotypeCounts.eosinophilic++;
    if (phenotype.emphysema) phenotypeCounts.emphysema++;
    if (phenotype.chronicBronchitis) phenotypeCounts.chronicBronchitis++;
    if (phenotype.aco) phenotypeCounts.aco++;

    // Averages
    const exac = parseFloatSafe(record.data.exacerbationsLast12m);
    const hosp = parseFloatSafe(record.data.hospitalizationsLast12m);
    const fev1 = parseFloatSafe(record.data.fev1Percent);
    const cat = parseFloatSafe(record.data.catScore);
    const age = parseFloatSafe(record.data.age);

    totalExac += exac;
    totalHosp += hosp;
    if (fev1 > 0) {
      totalFEV1 += fev1;
      fev1Count++;
    }
    if (cat > 0) {
      totalCAT += cat;
      catCount++;
    }
    if (age > 0) {
      totalAge += age;
      ageCount++;
    }
  });

  return {
    totalPatients: records.length,
    goldDistribution: goldCounts,
    severityDistribution: severityCounts,
    phenotypeDistribution: phenotypeCounts,
    averageExacerbations: totalExac / records.length,
    averageHospitalizations: totalHosp / records.length,
    averageFEV1: fev1Count > 0 ? totalFEV1 / fev1Count : 0,
    averageCAT: catCount > 0 ? totalCAT / catCount : 0,
    averageAge: ageCount > 0 ? totalAge / ageCount : 0,
  };
};
