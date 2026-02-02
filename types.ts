export enum SmokingStatus {
  NEVER = 'Chưa từng hút',
  FORMER = 'Đã cai thuốc',
  CURRENT = 'Đang hút thuốc',
}

export enum Gender {
  MALE = 'Nam',
  FEMALE = 'Nữ',
  OTHER = 'Khác',
}

export interface PatientData {
  // ID info
  patientName: string;

  // Demographics
  age: string;
  sex: Gender;
  bmi: string;
  smokingHistory: SmokingStatus;
  packYears: string;

  // Symptoms
  mMRC: string; // 0-4
  catScore: string; // 0-40
  cough: boolean;
  sputum: boolean;

  // Exacerbations
  exacerbationsLast12m: string;
  hospitalizationsLast12m: string;

  // Spirometry
  fev1L: string;
  fev1Percent: string;
  fvcL: string;
  fev1FvcRatio: string;
  postBdReversibility: boolean; // Is there significant reversibility?

  // Labs & Imaging
  eosinophils: string; // cells/uL
  imagingFindings: string;

  // Clinical Context
  currentTreatment: string;
  comorbidities: string;
}

export interface AssessmentRecord {
  id: string;
  timestamp: number;
  data: PatientData;
  analysis: string;
}

export const initialPatientData: PatientData = {
  patientName: '',
  age: '',
  sex: Gender.MALE,
  bmi: '',
  smokingHistory: SmokingStatus.FORMER,
  packYears: '',
  mMRC: '0',
  catScore: '',
  cough: false,
  sputum: false,
  exacerbationsLast12m: '0',
  hospitalizationsLast12m: '0',
  fev1L: '',
  fev1Percent: '',
  fvcL: '',
  fev1FvcRatio: '',
  postBdReversibility: false,
  eosinophils: '',
  imagingFindings: '',
  currentTreatment: '',
  comorbidities: '',
};