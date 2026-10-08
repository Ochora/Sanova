/**
 * Child health: immunisation visits, growth and development milestones.
 *
 * Immunisation follows the UNEPI/Ministry of Health routine schedule (2022) plus the malaria
 * vaccine added to routine immunisation in 2025 (6, 7, 8 and 18 months, in districts where it is
 * offered). Sources disagree on a few details (e.g. which visit gives IPV), so each visit is
 * shown as a clinic visit and the health worker's child health card is the final word.
 * Milestones follow WHO / CDC "learn the signs" ages. MUAC cut-offs are WHO (6–59 months).
 */
import { addDays, daysBetween, fromDateKey, toDateKey } from './dates';
import { ageInMonths } from './dosing';
import type { ChildCare, GrowthEntry } from './types';

export interface VaccineVisit {
  id: string;
  label: string;
  days?: number; // offset from birth in days
  months?: number; // or in months
  vaccines: string[];
  note?: string;
}

export const VACCINE_VISITS: VaccineVisit[] = [
  { id: 'birth', label: 'At birth', days: 0, vaccines: ['BCG', 'Polio (OPV 0)', 'Hepatitis B birth dose'], note: 'Give within the first days — polio by 2 weeks at the latest.' },
  { id: 'w6', label: '6 weeks', days: 42, vaccines: ['Polio (OPV 1)', 'DPT-HepB-Hib 1', 'Pneumococcal (PCV) 1', 'Rotavirus 1', 'IPV'] },
  { id: 'w10', label: '10 weeks', days: 70, vaccines: ['Polio (OPV 2)', 'DPT-HepB-Hib 2', 'Pneumococcal (PCV) 2', 'Rotavirus 2'] },
  { id: 'w14', label: '14 weeks', days: 98, vaccines: ['Polio (OPV 3)', 'DPT-HepB-Hib 3', 'Pneumococcal (PCV) 3', 'IPV'] },
  { id: 'm6', label: '6 months', months: 6, vaccines: ['Malaria vaccine 1', 'Vitamin A'], note: 'Malaria vaccine is given in districts where it is offered.' },
  { id: 'm7', label: '7 months', months: 7, vaccines: ['Malaria vaccine 2'] },
  { id: 'm8', label: '8 months', months: 8, vaccines: ['Malaria vaccine 3'] },
  { id: 'm9', label: '9 months', months: 9, vaccines: ['Measles-Rubella 1', 'Yellow fever'] },
  { id: 'm18', label: '18 months', months: 18, vaccines: ['Measles-Rubella 2', 'Malaria vaccine 4'] },
];

export function addMonths(dateKey: string, months: number): string {
  const d = fromDateKey(dateKey);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toDateKey(d);
}

export function visitDue(dob: string, v: VaccineVisit): string {
  return v.months !== undefined ? addMonths(dob, v.months) : addDays(dob, v.days ?? 0);
}

export type VaccineState = 'done' | 'due' | 'overdue' | 'upcoming';

export interface VaccineStatus {
  visit: VaccineVisit;
  due: string;
  state: VaccineState;
  givenOn?: string;
}

/** Due = from the due date for 2 weeks; overdue after that. */
export function vaccineStatus(dob: string, care: ChildCare | undefined, today: string = toDateKey()): VaccineStatus[] {
  return VACCINE_VISITS.map((visit) => {
    const due = visitDue(dob, visit);
    const givenOn = care?.vaccines[visit.id];
    let state: VaccineState = 'upcoming';
    if (givenOn) state = 'done';
    else if (today >= due && today <= addDays(due, 14)) state = 'due';
    else if (today > addDays(due, 14)) state = 'overdue';
    return { visit, due, state, givenOn };
  });
}

export function nextVaccine(dob: string, care: ChildCare | undefined, today: string = toDateKey()): VaccineStatus | undefined {
  const all = vaccineStatus(dob, care, today);
  return all.find((s) => s.state === 'overdue') ?? all.find((s) => s.state === 'due') ?? all.find((s) => s.state === 'upcoming');
}

// ---------- Growth ----------
export type MuacClass = 'normal' | 'moderate' | 'severe';

/** WHO MUAC cut-offs for children 6–59 months. */
export function muacClass(cm: number): MuacClass {
  if (cm < 11.5) return 'severe';
  if (cm < 12.5) return 'moderate';
  return 'normal';
}

export interface GrowthFlag {
  tone: 'good' | 'warn' | 'danger';
  message: string;
}

export function growthFlags(entries: GrowthEntry[], ageMonths: number): GrowthFlag[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const flags: GrowthFlag[] = [];
  const last = sorted[sorted.length - 1];
  if (!last) return flags;
  if (last.muacCm !== undefined && ageMonths >= 6 && ageMonths < 60) {
    const c = muacClass(last.muacCm);
    if (c === 'severe') flags.push({ tone: 'danger', message: `Arm measurement (MUAC) ${last.muacCm} cm is in the RED zone — severe malnutrition. Take the child to a health facility today.` });
    else if (c === 'moderate') flags.push({ tone: 'warn', message: `Arm measurement (MUAC) ${last.muacCm} cm is in the YELLOW zone — the child needs a nutrition check soon.` });
    else flags.push({ tone: 'good', message: `Arm measurement (MUAC) ${last.muacCm} cm is in the GREEN zone. 👍` });
  }
  const weighed = sorted.filter((e) => e.weightKg !== undefined);
  if (weighed.length >= 2) {
    const a = weighed[weighed.length - 2];
    const b = weighed[weighed.length - 1];
    const diff = b.weightKg! - a.weightKg!;
    const days = Math.max(1, Math.round((fromDateKey(b.date).getTime() - fromDateKey(a.date).getTime()) / 86400000));
    if (diff < 0) flags.push({ tone: 'danger', message: `Weight went down by ${Math.abs(diff).toFixed(1)} kg since ${a.date}. A child should keep gaining — see a health worker.` });
    else if (diff === 0 && days >= 28 && ageMonths < 24) flags.push({ tone: 'warn', message: 'No weight gain in the last month. Young children should gain every month — ask a health worker.' });
    else if (diff > 0) flags.push({ tone: 'good', message: `Gained ${diff.toFixed(1)} kg since the last weighing. Well done! 🎉` });
  }
  return flags;
}

// ---------- Milestones ----------
export interface Milestone {
  id: string;
  months: number;
  text: string;
  emoji: string;
}

export const MILESTONES: Milestone[] = [
  { id: 'm2-smile', months: 2, text: 'Smiles when you talk or smile', emoji: '😊' },
  { id: 'm2-eyes', months: 2, text: 'Follows you with their eyes', emoji: '👀' },
  { id: 'm4-head', months: 4, text: 'Holds head steady without support', emoji: '👶' },
  { id: 'm4-coo', months: 4, text: 'Makes cooing sounds', emoji: '🗨️' },
  { id: 'm6-roll', months: 6, text: 'Rolls over', emoji: '🔄' },
  { id: 'm6-reach', months: 6, text: 'Reaches for and grabs toys', emoji: '🧸' },
  { id: 'm6-laugh', months: 6, text: 'Laughs', emoji: '😄' },
  { id: 'm9-sit', months: 9, text: 'Sits without support', emoji: '🪑' },
  { id: 'm9-name', months: 9, text: 'Looks when you call their name', emoji: '📣' },
  { id: 'm12-stand', months: 12, text: 'Pulls up to stand / walks holding on', emoji: '🚶' },
  { id: 'm12-wave', months: 12, text: 'Waves bye-bye', emoji: '👋' },
  { id: 'm12-mama', months: 12, text: 'Says "mama" or "dada" (or similar)', emoji: '🗣️' },
  { id: 'm18-walk', months: 18, text: 'Walks alone', emoji: '🚶' },
  { id: 'm18-words', months: 18, text: 'Says several single words', emoji: '💬' },
  { id: 'm18-point', months: 18, text: 'Points to show you things', emoji: '👉' },
  { id: 'm24-run', months: 24, text: 'Runs and kicks a ball', emoji: '⚽' },
  { id: 'm24-two', months: 24, text: 'Puts two words together ("more milk")', emoji: '🗯️' },
  { id: 'm36-talk', months: 36, text: 'Talks in short sentences', emoji: '📢' },
  { id: 'm36-play', months: 36, text: 'Plays pretend (cooking, feeding a doll)', emoji: '🎎' },
];

export type MilestoneState = 'done' | 'now' | 'late' | 'later';

/** 'late' = 3+ months past the usual age and not yet ticked. */
export function milestoneState(m: Milestone, ageMonths: number, care: ChildCare | undefined): MilestoneState {
  if (care?.milestones[m.id]) return 'done';
  if (ageMonths >= m.months + 3) return 'late';
  if (ageMonths >= m.months - 1) return 'now';
  return 'later';
}

export function isUnderFive(dob: string | undefined, today: string = toDateKey()): boolean {
  if (!dob) return false;
  return addMonths(dob, 60) > today;
}

export function ageText(dob: string, today: string = toDateKey()): string {
  const days = daysBetween(dob, today);
  if (days < 56) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'}`;
  const months = ageInMonths(dob);
  if (months < 24) return `${months} months`;
  return `${Math.floor(months / 12)} years`;
}

