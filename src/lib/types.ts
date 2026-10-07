export type Sex = 'female' | 'male';

export interface Member {
  id: string;
  name: string;
  relationship: 'self' | string; // "self", "child", "mother", ...
  dob?: string; // YYYY-MM-DD
  sex?: Sex;
  bloodGroup?: string;
  conditions: string[];
  allergies: string[];
  pregnant?: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
}

export interface Profile {
  district?: string;
  language: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  memberId: string;
  name: string;
  dose: string; // e.g. "1 tablet", "500 mg"
  times: string[]; // "HH:MM" 24h
  startDate: string; // YYYY-MM-DD
  durationDays?: number; // undefined = ongoing
  reason?: string;
  prescriber?: string;
  instructions?: string;
  notificationIds: string[];
  createdAt: string;
  archived?: boolean;
}

export type DoseStatus = 'taken' | 'skipped';

export interface DoseLog {
  medId: string;
  date: string; // YYYY-MM-DD
  time: string; // scheduled HH:MM
  status: DoseStatus;
  at: string; // ISO timestamp of logging
}

export type TriageLevel = 'green' | 'yellow' | 'orange' | 'red';

export interface CheckIn {
  id: string;
  memberId: string;
  at: string; // ISO
  date: string; // YYYY-MM-DD
  feeling: number; // 1 (very bad) .. 5 (great)
  symptoms: string[]; // symptom ids
  temperature?: number;
  notes?: string;
  level: TriageLevel;
}

export type RecordCategory =
  | 'lab'
  | 'prescription'
  | 'diagnosis'
  | 'discharge'
  | 'imaging'
  | 'vaccination'
  | 'other';

export interface HealthRecord {
  id: string;
  memberId: string;
  title: string;
  category: RecordCategory;
  date: string;
  notes?: string;
  imageUri?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'consultation'
  | 'lab'
  | 'medication'
  | 'transport'
  | 'admission'
  | 'insurance'
  | 'other';

export interface Expense {
  id: string;
  memberId: string;
  amount: number; // UGX
  category: ExpenseCategory;
  date: string;
  note?: string;
  createdAt: string;
}

export interface Facility {
  id: string;
  name: string;
  type: string;
  district: string;
  lat: number;
  lng: number;
  phone?: string;
  open24h?: boolean;
  custom?: boolean;
}

export interface Settings {
  lockEnabled: boolean;
  remindersEnabled: boolean;
  cardFields: {
    dob: boolean;
    bloodGroup: boolean;
    allergies: boolean;
    conditions: boolean;
    medications: boolean;
    contacts: boolean;
  };
}

export type MoodKind = 'morning' | 'evening';

export interface MoodLog {
  id: string;
  memberId: string;
  at: string; // ISO
  date: string; // YYYY-MM-DD
  kind: MoodKind;
  mood: number; // 1 (very low) .. 5 (great)
  feelings: string[]; // e.g. 'anxious', 'calm'
  sleep?: number; // morning: 1 (very poor) .. 5 (great)
  energy?: number; // morning: 1..5
  stress?: number; // evening: 1 (none) .. 5 (overwhelming)
  intention?: string; // morning
  wentWell?: string; // evening
  gratitude?: string; // evening
  note?: string;
  /** PHQ-2 / GAD-2 answers (0..3 each) when the deeper check was done. */
  screen?: { phq: [number, number]; gad: [number, number] };
  /** User said they were having thoughts of self-harm. Drives support prompts only. */
  safetyFlag?: boolean;
}

export interface AppData {
  version: 1;
  onboarded: boolean;
  profile: Profile;
  members: Member[];
  contacts: EmergencyContact[];
  medications: Medication[];
  doseLogs: DoseLog[];
  checkIns: CheckIn[];
  moodLogs: MoodLog[];
  records: HealthRecord[];
  expenses: Expense[];
  facilities: Facility[]; // user-added only
  settings: Settings;
}
