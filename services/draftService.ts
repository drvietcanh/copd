import { PatientData } from '../types';

const DRAFT_KEY = 'copd_assistant_draft';
const DRAFT_TIMESTAMP_KEY = 'copd_assistant_draft_timestamp';
const AUTO_SAVE_INTERVAL = 5000; // 5 seconds

export const saveDraft = (data: PatientData): void => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving draft:', error);
  }
};

export const loadDraft = (): PatientData | null => {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      return JSON.parse(draft);
    }
  } catch (error) {
    console.error('Error loading draft:', error);
  }
  return null;
};

export const clearDraft = (): void => {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Error clearing draft:', error);
  }
};

export const hasDraft = (): boolean => {
  return localStorage.getItem(DRAFT_KEY) !== null;
};

export const getDraftAge = (): number | null => {
  try {
    const timestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY);
    if (timestamp) {
      return Date.now() - parseInt(timestamp);
    }
  } catch (error) {
    console.error('Error getting draft age:', error);
  }
  return null;
};

export const setupAutoSave = (
  data: PatientData,
  onSave: (data: PatientData) => void
): (() => void) => {
  const intervalId = setInterval(() => {
    onSave(data);
  }, AUTO_SAVE_INTERVAL);

  return () => clearInterval(intervalId);
};
