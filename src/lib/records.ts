import type { ExpenseCategory, RecordCategory } from './types';

export const RECORD_CATEGORIES: { id: RecordCategory; label: string; icon: string; color: string }[] = [
  { id: 'lab', label: 'Lab result', icon: 'flask', color: '#2563A8' },
  { id: 'prescription', label: 'Prescription', icon: 'medkit', color: '#0E6E5C' },
  { id: 'diagnosis', label: 'Diagnosis / report', icon: 'document-text', color: '#6B4EAD' },
  { id: 'discharge', label: 'Discharge summary', icon: 'exit', color: '#B4520B' },
  { id: 'imaging', label: 'X-ray / scan', icon: 'scan', color: '#3D5A6C' },
  { id: 'vaccination', label: 'Vaccination card', icon: 'shield-checkmark', color: '#1F7A45' },
  { id: 'other', label: 'Other', icon: 'folder', color: '#5F6B67' },
];

export const RECORD_CAT = Object.fromEntries(RECORD_CATEGORIES.map((c) => [c.id, c])) as Record<
  RecordCategory,
  (typeof RECORD_CATEGORIES)[number]
>;

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; icon: string; color: string }[] = [
  { id: 'consultation', label: 'Consultation', icon: 'person', color: '#0E6E5C' },
  { id: 'lab', label: 'Lab tests', icon: 'flask', color: '#2563A8' },
  { id: 'medication', label: 'Medicines', icon: 'medkit', color: '#6B4EAD' },
  { id: 'transport', label: 'Transport', icon: 'bicycle', color: '#B4520B' },
  { id: 'admission', label: 'Admission', icon: 'bed', color: '#D93A2B' },
  { id: 'insurance', label: 'Insurance', icon: 'shield', color: '#1F7A45' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#5F6B67' },
];

export const EXPENSE_CAT = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, c])) as Record<
  ExpenseCategory,
  (typeof EXPENSE_CATEGORIES)[number]
>;
