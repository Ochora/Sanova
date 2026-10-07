/**
 * Rule-based triage for the daily check-in.
 *
 * This is deliberately conservative: anything ambiguous escalates. It is NOT a diagnosis
 * and does not replace a health worker. Rules are drawn from widely used danger-sign
 * guidance (WHO/IMCI danger signs for children, maternal danger signs, test-all-fevers
 * malaria policy) and must be reviewed by Sanova's clinical advisers before public launch.
 */
import { toDateKey } from './dates';
import type { CheckIn, TriageLevel } from './types';

export type SymptomSeverity = 'red' | 'orange' | 'yellow';

export interface Symptom {
  id: string;
  label: string;
  severity: SymptomSeverity;
  group: 'danger' | 'common';
  /** Only shown/considered when this is true for the person. */
  onlyFor?: 'child' | 'pregnant';
  keywords?: string[];
  homeCare?: string;
}

export const SYMPTOMS: Symptom[] = [
  // ---- Danger signs (RED) ----
  { id: 'breathing', label: 'Difficulty breathing', severity: 'red', group: 'danger', keywords: ['cant breathe', "can't breathe", 'cannot breathe', 'short of breath', 'gasping', 'difficulty breathing'] },
  { id: 'chest_pain', label: 'Chest pain or pressure', severity: 'red', group: 'danger', keywords: ['chest pain', 'chest pressure', 'tight chest'] },
  { id: 'unconscious', label: 'Fainted / very drowsy / hard to wake', severity: 'red', group: 'danger', keywords: ['unconscious', 'fainted', 'collapsed', 'hard to wake', 'not waking'] },
  { id: 'convulsions', label: 'Convulsions / fits', severity: 'red', group: 'danger', keywords: ['convulsion', 'fits', 'seizure', 'shaking uncontrollably'] },
  { id: 'confusion', label: 'Sudden confusion', severity: 'red', group: 'danger', keywords: ['confused', 'confusion', 'not making sense'] },
  { id: 'stroke', label: 'Face drooping, arm weakness or slurred speech', severity: 'red', group: 'danger', keywords: ['face drooping', 'slurred', 'one side weak', 'stroke'] },
  { id: 'severe_bleeding', label: 'Heavy bleeding that will not stop', severity: 'red', group: 'danger', keywords: ['bleeding heavily', 'heavy bleeding', "won't stop bleeding", 'vomiting blood', 'coughing blood'] },
  { id: 'stiff_neck', label: 'Stiff neck with fever', severity: 'red', group: 'danger', keywords: ['stiff neck'] },
  { id: 'vomit_all', label: 'Vomiting everything / cannot keep fluids down', severity: 'red', group: 'danger', keywords: ['vomiting everything', 'cannot keep', "can't keep anything"] },
  { id: 'snakebite', label: 'Snake bite', severity: 'red', group: 'danger', keywords: ['snake'] },
  { id: 'no_drink', label: 'Child unable to drink or breastfeed', severity: 'red', group: 'danger', onlyFor: 'child', keywords: ['not breastfeeding', 'unable to drink', 'refusing to feed'] },
  { id: 'preg_bleeding', label: 'Bleeding from the vagina', severity: 'red', group: 'danger', onlyFor: 'pregnant' },
  { id: 'preg_headache', label: 'Severe headache or blurred vision', severity: 'red', group: 'danger', onlyFor: 'pregnant' },
  { id: 'preg_fluid', label: 'Waters broke / leaking fluid', severity: 'red', group: 'danger', onlyFor: 'pregnant' },
  { id: 'preg_movement', label: 'Baby moving less or not at all', severity: 'red', group: 'danger', onlyFor: 'pregnant' },

  // ---- Needs a health worker (ORANGE) ----
  { id: 'fever', label: 'Fever / feeling hot', severity: 'orange', group: 'common', keywords: ['fever', 'hot body', 'feverish', 'omusujja'] },
  { id: 'cough_2w', label: 'Cough for more than 2 weeks', severity: 'orange', group: 'common', keywords: ['cough for weeks', 'long cough'] },
  { id: 'blood_stool', label: 'Blood in stool or urine', severity: 'orange', group: 'common', keywords: ['blood in stool', 'blood in urine', 'bloody diarrhoea', 'bloody diarrhea'] },
  { id: 'yellow_eyes', label: 'Yellow eyes or skin', severity: 'orange', group: 'common', keywords: ['yellow eyes', 'jaundice'] },
  { id: 'urine_pain', label: 'Pain when passing urine', severity: 'orange', group: 'common', keywords: ['pain when urinating', 'burning urine'] },
  { id: 'severe_pain', label: 'Severe pain anywhere', severity: 'orange', group: 'common', keywords: ['severe pain', 'very painful'] },
  { id: 'rash_fever', label: 'New rash', severity: 'orange', group: 'common', keywords: ['rash'] },
  { id: 'dehydration', label: 'Very thirsty, little or no urine, sunken eyes', severity: 'orange', group: 'common', keywords: ['sunken eyes', 'no urine'] },

  // ---- Mild (YELLOW) ----
  { id: 'headache', label: 'Headache', severity: 'yellow', group: 'common', keywords: ['headache', 'omutwe'], homeCare: 'Rest in a quiet place, drink water, and use paracetamol only as directed on the pack.' },
  { id: 'cough', label: 'Cough (recent)', severity: 'yellow', group: 'common', keywords: ['cough'], homeCare: 'Warm fluids, honey and lemon (not for babies under 1 year), and rest. Cover your cough.' },
  { id: 'cold', label: 'Runny nose / sore throat', severity: 'yellow', group: 'common', keywords: ['runny nose', 'sore throat', 'flu', 'cold'], homeCare: 'Rest, warm fluids and salt-water gargles for a sore throat.' },
  { id: 'diarrhoea', label: 'Diarrhoea (no blood)', severity: 'yellow', group: 'common', keywords: ['diarrhoea', 'diarrhea', 'running stomach'], homeCare: 'Drink ORS after every loose stool. Children: give ORS and zinc and keep breastfeeding.' },
  { id: 'vomiting', label: 'Nausea or vomiting (keeping fluids down)', severity: 'yellow', group: 'common', keywords: ['nausea', 'vomit'], homeCare: 'Take small, frequent sips of clean water or ORS. Eat light food when you can.' },
  { id: 'body_aches', label: 'Body aches / joint pain', severity: 'yellow', group: 'common', keywords: ['body aches', 'joint pain', 'body pain'], homeCare: 'Rest and stay hydrated. Body aches with fever need a malaria test.' },
  { id: 'fatigue', label: 'Tired / weak', severity: 'yellow', group: 'common', keywords: ['tired', 'weak', 'fatigue', 'no energy', 'amaanyi'], homeCare: 'Rest, eat regular meals and drink water. Tiredness lasting days needs a check-up.' },
  { id: 'stomach', label: 'Mild stomach pain', severity: 'yellow', group: 'common', keywords: ['stomach ache', 'stomach pain', 'abdominal'], homeCare: 'Eat light food and drink water. Get checked if pain becomes severe or lasts more than a day.' },
  { id: 'itch', label: 'Itching / mild skin irritation', severity: 'yellow', group: 'common', keywords: ['itch'], homeCare: 'Keep the skin clean and dry and avoid scratching.' },
];

export const SYMPTOM_BY_ID: Record<string, Symptom> = Object.fromEntries(SYMPTOMS.map((s) => [s.id, s]));

export interface TriageContext {
  ageYears?: number;
  pregnant?: boolean;
  /** Previous check-ins for the same person, any order. */
  history?: CheckIn[];
  today?: string;
}

export interface TriageInput {
  feeling: number; // 1..5
  symptoms: string[];
  temperature?: number;
  notes?: string;
}

export interface TriageResult {
  level: TriageLevel;
  title: string;
  reasons: string[];
  actions: string[];
  homeCare: string[];
  matchedFromNotes: string[];
}

const RANK: Record<TriageLevel, number> = { green: 0, yellow: 1, orange: 2, red: 3 };
const maxLevel = (a: TriageLevel, b: TriageLevel) => (RANK[b] > RANK[a] ? b : a);

/** Symptom ids detected in free text that were not ticked. */
export function symptomsFromText(text: string | undefined, available: Symptom[] = SYMPTOMS): string[] {
  if (!text) return [];
  const t = ` ${text.toLowerCase()} `;
  return available.filter((s) => s.keywords?.some((k) => t.includes(k))).map((s) => s.id);
}

export function symptomsFor(ctx: { ageYears?: number; pregnant?: boolean }): Symptom[] {
  const isChild = ctx.ageYears !== undefined && ctx.ageYears < 5;
  return SYMPTOMS.filter(
    (s) => !s.onlyFor || (s.onlyFor === 'child' && isChild) || (s.onlyFor === 'pregnant' && ctx.pregnant),
  );
}

export function triage(input: TriageInput, ctx: TriageContext = {}): TriageResult {
  const available = symptomsFor(ctx);
  const fromNotes = symptomsFromText(input.notes, available).filter((id) => !input.symptoms.includes(id));
  const ids = [...new Set([...input.symptoms, ...fromNotes])];
  const symptoms = ids.map((id) => SYMPTOM_BY_ID[id]).filter(Boolean);

  const isChild = ctx.ageYears !== undefined && ctx.ageYears < 5;
  const isInfant = ctx.ageYears !== undefined && ctx.ageYears < 1;
  const reasons: string[] = [];
  let level: TriageLevel = 'green';

  for (const s of symptoms) {
    level = maxLevel(level, s.severity);
    if (s.severity !== 'yellow') reasons.push(s.label);
  }

  const temp = input.temperature;
  const hasFever = ids.includes('fever') || (temp !== undefined && temp >= 37.5);
  if (temp !== undefined) {
    if (temp >= 40 || temp < 35) {
      level = maxLevel(level, 'red');
      reasons.push(temp < 35 ? `Very low temperature (${temp}°C)` : `Very high temperature (${temp}°C)`);
    } else if (temp >= 37.5) {
      level = maxLevel(level, 'orange');
      reasons.push(`Temperature ${temp}°C`);
    }
  }
  if (hasFever && isInfant) {
    level = maxLevel(level, 'red');
    reasons.push('Fever in a baby under 1 year');
  }
  if (ctx.pregnant && symptoms.length > 0 && level !== 'red') {
    if (hasFever || RANK[level] >= RANK.yellow) {
      level = maxLevel(level, 'orange');
      reasons.push('Feeling unwell during pregnancy');
    }
  }
  if (isChild && hasFever && ids.includes('diarrhoea')) {
    level = maxLevel(level, 'orange');
  }

  if (input.feeling <= 1 && level !== 'red') {
    level = maxLevel(level, 'orange');
    reasons.push('You said you feel very unwell');
  } else if (input.feeling <= 2 && level === 'green') {
    level = 'yellow';
  }

  // Same symptom on 3 consecutive check-in days (including today) → see a health worker.
  if (ctx.history && ctx.history.length && level !== 'red') {
    const today = ctx.today ?? toDateKey();
    const pastDays = [...new Set(ctx.history.filter((c) => c.date < today).map((c) => c.date))].sort().reverse();
    if (pastDays.length >= 2) {
      const [d1, d2] = pastDays;
      const onDay = (d: string) => new Set(ctx.history!.filter((c) => c.date === d).flatMap((c) => c.symptoms));
      const s1 = onDay(d1);
      const s2 = onDay(d2);
      const recurring = ids.filter((id) => s1.has(id) && s2.has(id));
      if (recurring.length) {
        level = maxLevel(level, 'orange');
        reasons.push(`${SYMPTOM_BY_ID[recurring[0]]?.label ?? 'Symptoms'} on 3 check-ins in a row`);
      }
    }
  }

  const homeCare = symptoms.filter((s) => s.homeCare).map((s) => s.homeCare!);
  const actions: string[] = [];
  let title: string;

  switch (level) {
    case 'red':
      title = 'Get emergency help now';
      actions.push(
        'Call 999 or 112, or go to the nearest hospital immediately.',
        'Use SOS to send your location to your emergency contacts.',
        'Do not wait to see if it gets better.',
      );
      if (isChild) actions.push('Keep the child warm and, if possible, continue breastfeeding on the way.');
      break;
    case 'orange':
      title = 'See a health worker today';
      actions.push('Visit a health centre, clinic or your VHT today.');
      if (hasFever) actions.push('Fever in Uganda should be tested for malaria within 24 hours — ask for a malaria test (RDT).');
      if (ids.includes('cough_2w')) actions.push('A cough longer than 2 weeks should be checked for TB. TB testing is free at government facilities.');
      if (ids.includes('dehydration') || ids.includes('diarrhoea')) actions.push('Keep drinking ORS on the way.');
      actions.push('If it gets worse — trouble breathing, fits, confusion — treat it as an emergency.');
      break;
    case 'yellow':
      title = 'Mild symptoms — care for yourself at home';
      actions.push(
        'Rest and drink plenty of clean water.',
        'Check in again tomorrow so we can track how you feel.',
        'See a health worker if you get a fever, symptoms last more than 3 days, or you feel worse.',
      );
      break;
    default:
      title = 'You are doing well';
      actions.push('Keep it up — drink water, sleep under a treated mosquito net, and take your medicines on time.');
  }

  return { level, title, reasons: [...new Set(reasons)], actions, homeCare, matchedFromNotes: fromNotes };
}

export const LEVEL_META: Record<TriageLevel, { label: string; color: string; bg: string }> = {
  green: { label: 'Well', color: '#1F7A45', bg: '#E3F3E9' },
  yellow: { label: 'Mild', color: '#8A6A00', bg: '#FBF1CC' },
  orange: { label: 'See a health worker', color: '#B4520B', bg: '#FCE6D3' },
  red: { label: 'Emergency', color: '#B42318', bg: '#FBE0DC' },
};
