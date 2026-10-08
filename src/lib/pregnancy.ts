/**
 * Pregnancy journey: dates, week-by-week guidance, antenatal (ANC) schedule and postnatal care.
 *
 * Sources: WHO 2016 ANC recommendations (8 contacts: ≤12, 20, 26, 30, 34, 36, 38, 40 weeks),
 * adopted by Uganda's Ministry of Health; WHO postnatal care recommendations (checks at
 * 24 hours, day 3, days 7–14 and 6 weeks); Uganda Td schedule for women of childbearing age.
 * "Baby size" comparisons are approximate and for fun. Content must be reviewed by a midwife /
 * obstetrician on Sanova's clinical board before public launch.
 */
import { addDays, daysBetween, toDateKey } from './dates';
import type { Pregnancy } from './types';

export const PREGNANCY_DAYS = 280;

export function eddFromLmp(lmp: string): string {
  return addDays(lmp, PREGNANCY_DAYS);
}

export function lmpFromEdd(edd: string): string {
  return addDays(edd, -PREGNANCY_DAYS);
}

export function eddFromWeeks(weeks: number, today: string = toDateKey()): string {
  return addDays(today, PREGNANCY_DAYS - Math.round(weeks * 7));
}

export interface Gestation {
  weeks: number;
  days: number;
  totalDays: number;
  trimester: 1 | 2 | 3;
  daysLeft: number;
  progress: number; // 0..1
  overdue: boolean;
}

export function gestation(edd: string, today: string = toDateKey()): Gestation {
  const totalDays = Math.max(0, PREGNANCY_DAYS - daysBetween(today, edd));
  const weeks = Math.floor(totalDays / 7);
  return {
    weeks,
    days: totalDays % 7,
    totalDays,
    trimester: weeks < 13 ? 1 : weeks < 28 ? 2 : 3,
    daysLeft: Math.max(0, daysBetween(today, edd)),
    progress: Math.min(1, totalDays / PREGNANCY_DAYS),
    overdue: today > edd,
  };
}

export interface WeekInfo {
  week: number;
  size: string;
  emoji: string;
  baby: string;
  mum: string;
}

export const WEEKS: WeekInfo[] = [
  { week: 4, size: 'a sesame seed (simsim)', emoji: '🌱', baby: 'Your baby is just beginning to form. The neural tube — which becomes the brain and spine — is developing.', mum: 'You may notice a missed period, tiredness or tender breasts. Start folic acid now if you have not already.' },
  { week: 6, size: 'a bean', emoji: '🟤', baby: "A tiny heart has started beating. Eyes, ears and arms are starting to form.", mum: 'Morning sickness may begin. Eat small, frequent meals and sip water.' },
  { week: 8, size: 'a groundnut', emoji: '🥜', baby: 'Fingers and toes are forming and the baby is starting to move — too small for you to feel yet.', mum: 'Book your first antenatal visit before 12 weeks — it is one of the most important.' },
  { week: 10, size: 'a grape', emoji: '🍇', baby: 'All the major organs have formed and are starting to work.', mum: 'You may feel very tired. Rest when you can.' },
  { week: 12, size: 'a lime', emoji: '🟢', baby: 'Your baby can open and close its fingers and kick, and its kidneys have started working.', mum: 'For many mothers, nausea starts to ease from now.' },
  { week: 14, size: 'a lemon', emoji: '🍋', baby: 'Your baby can make faces and may suck its thumb.', mum: 'From 13 weeks you can start malaria prevention tablets (IPTp-SP) at the antenatal clinic.' },
  { week: 16, size: 'an avocado', emoji: '🥑', baby: 'Bones are getting harder and your baby can hear sounds.', mum: 'Your bump may start to show. Keep taking iron and folic acid every day.' },
  { week: 18, size: 'a sweet potato', emoji: '🍠', baby: 'Your baby is yawning, stretching and practising swallowing.', mum: 'You may feel the first flutters of movement between 16 and 22 weeks.' },
  { week: 20, size: 'a banana', emoji: '🍌', baby: 'Halfway there! Your baby is covered in a protective coating called vernix.', mum: 'Antenatal visit due around now. Ask about deworming tablets (given once after the first trimester).' },
  { week: 22, size: 'a maize cob', emoji: '🌽', baby: 'Eyebrows and eyelashes are growing. Your baby can feel your touch through your belly.', mum: 'Back aches are common — wear flat shoes and bend your knees when lifting.' },
  { week: 24, size: 'a pawpaw', emoji: '🥭', baby: 'The lungs are developing and your baby has regular sleep and wake times.', mum: 'Watch for swelling of the face or hands, or a bad headache — these need a health worker straight away.' },
  { week: 26, size: 'a cabbage', emoji: '🥬', baby: 'Your baby can open its eyes and responds to your voice.', mum: 'Antenatal visit due. Keep sleeping under a treated mosquito net every night.' },
  { week: 28, size: 'a pineapple', emoji: '🍍', baby: 'Third trimester begins! Your baby can blink and is building fat.', mum: 'Count your baby\'s movements each day. If they slow down or stop, go to a health facility the same day.' },
  { week: 30, size: 'a coconut', emoji: '🥥', baby: 'The brain is growing fast and your baby is gaining weight quickly.', mum: 'You may feel short of breath or have heartburn — eat smaller meals.' },
  { week: 32, size: 'a large pawpaw', emoji: '🍈', baby: 'Toenails and fingernails have grown. Your baby is practising breathing.', mum: 'Plan your birth now: facility, transport, money, a birth companion and your mama kit.' },
  { week: 34, size: 'a small watermelon', emoji: '🍉', baby: 'Your baby\'s lungs and nervous system are nearly mature.', mum: 'Sleep on your left side — it helps blood flow to the baby.' },
  { week: 36, size: 'a pumpkin', emoji: '🎃', baby: 'Your baby is getting into position for birth, usually head down.', mum: 'Antenatal visits are now every 2 weeks. Pack your bag and keep it by the door.' },
  { week: 38, size: 'a big watermelon', emoji: '🍉', baby: 'Your baby is ready to be born at any time from now.', mum: 'Know the signs of labour: regular painful contractions, a "show" of mucus, or your waters breaking.' },
  { week: 40, size: 'a small jackfruit', emoji: '🍈', baby: 'Due date! Only a few babies arrive exactly on the day — that is normal.', mum: 'If you pass 41 weeks, the health worker may advise helping labour start. Keep your appointments.' },
];

export function weekInfo(weeks: number): WeekInfo {
  let best = WEEKS[0];
  for (const w of WEEKS) if (w.week <= weeks) best = w;
  return best;
}

/** WHO / Uganda 8 antenatal contacts, by gestational week. */
export const ANC_WEEKS = [12, 20, 26, 30, 34, 36, 38, 40];

export interface AncSlot {
  n: number;
  week: number;
  due: string; // date of that week
  done: boolean;
}

export function ancSchedule(p: Pregnancy): AncSlot[] {
  const lmp = p.lmp ?? lmpFromEdd(p.edd);
  const visits = [...p.ancVisits].sort((a, b) => a.date.localeCompare(b.date));
  return ANC_WEEKS.map((week, i) => ({
    n: i + 1,
    week,
    due: addDays(lmp, week * 7),
    // a contact counts as done when there are at least n recorded visits
    done: visits.length >= i + 1,
  }));
}

export function nextAnc(p: Pregnancy, today: string = toDateKey()): AncSlot | undefined {
  const booked = [...p.ancVisits].map((v) => v.nextDate).filter((d): d is string => !!d && d >= today).sort()[0];
  const slot = ancSchedule(p).find((s) => !s.done);
  if (!slot) return undefined;
  return booked ? { ...slot, due: booked } : slot;
}

export const DOS = [
  { emoji: '🏥', text: 'Go for all 8 antenatal visits — start before 12 weeks.' },
  { emoji: '💊', text: 'Take iron and folic acid tablets every day.' },
  { emoji: '🦟', text: 'Sleep under a treated mosquito net every night.' },
  { emoji: '🛡️', text: 'Take malaria prevention (IPTp-SP) at the clinic from 13 weeks — unless you take Septrin; tell the health worker.' },
  { emoji: '💉', text: 'Get your Td (tetanus) injections at the antenatal clinic.' },
  { emoji: '🩸', text: 'Test for HIV, syphilis and hepatitis B so your baby can be protected.' },
  { emoji: '🥗', text: 'Eat an extra meal a day: beans, greens (dodo, nakati), eggs, fish, fruit.' },
  { emoji: '💧', text: 'Drink plenty of clean, boiled water.' },
  { emoji: '🛏️', text: 'Rest, and sleep on your left side in late pregnancy.' },
  { emoji: '🧳', text: 'Plan to give birth at a health facility with a skilled health worker.' },
];

export const DONTS = [
  { emoji: '🍺', text: 'No alcohol, cigarettes or shisha.' },
  { emoji: '🌿', text: 'No herbal mixtures to "open the way" or speed up labour — they can harm you and the baby.' },
  { emoji: '💊', text: 'No medicines without asking a health worker (including some painkillers and antibiotics).' },
  { emoji: '🏋️', text: 'Avoid very heavy lifting and exhausting work, especially late in pregnancy.' },
  { emoji: '🥩', text: 'Avoid raw or undercooked meat, eggs and unboiled milk.' },
  { emoji: '🪨', text: 'Don\'t eat soil or clay — the craving can be a sign of anaemia; tell the health worker.' },
  { emoji: '🏠', text: 'Don\'t plan to deliver at home without a skilled birth attendant.' },
];

export const DANGER_SIGNS = [
  'Bleeding from the vagina',
  'Severe headache or blurred vision',
  'Fits / convulsions',
  'Severe pain in the belly',
  'Fever',
  'Baby moving less, or not at all',
  'Waters breaking before labour',
  'Swelling of the face or hands',
  'Difficulty breathing',
  'Vomiting everything',
];

export const BIRTH_PLAN = [
  { id: 'facility', text: 'Chosen where I will give birth' },
  { id: 'transport', text: 'Arranged transport (and a back-up)' },
  { id: 'money', text: 'Saved money for transport and needs' },
  { id: 'companion', text: 'Chosen a birth companion' },
  { id: 'kit', text: 'Mama kit and baby clothes ready' },
  { id: 'donor', text: 'Identified a possible blood donor' },
  { id: 'children', text: 'Arranged care for other children at home' },
  { id: 'docs', text: 'Antenatal card packed in my bag' },
];

// ---------- Postnatal ----------
export const POSTNATAL_DAYS = 42;

export const PNC_CHECKS = [
  { day: 1, label: 'Within 24 hours of birth' },
  { day: 3, label: 'Day 3' },
  { day: 10, label: 'Between day 7 and 14' },
  { day: 42, label: '6 weeks — also discuss family planning' },
];

export function postnatalDay(deliveryDate: string, today: string = toDateKey()): number {
  return daysBetween(deliveryDate, today) + 1;
}

export function inPostnatal(p: Pregnancy, today: string = toDateKey()): boolean {
  return p.status === 'delivered' && !!p.delivery && postnatalDay(p.delivery.date, today) <= POSTNATAL_DAYS;
}

export const MOTHER_DANGER = [
  'Heavy bleeding (soaking a pad in under an hour)',
  'Fever or chills',
  'Bad-smelling discharge',
  'Severe headache, blurred vision or fits',
  'Painful, red or hot breast',
  'Pain or swelling in one leg',
  'Feeling very sad, hopeless or unable to cope',
];

export const NEWBORN_DANGER = [
  'Not feeding well or not breastfeeding',
  'Fits / convulsions',
  'Fast breathing or chest pulling in',
  'Fever, or feels cold',
  'Yellow palms or soles',
  'Redness, pus or bad smell at the cord',
  'Very sleepy, floppy or not moving',
];

export const POSTNATAL_CARE = [
  { emoji: '🤱', text: 'Breastfeed only (no water or other foods) for the first 6 months. Start within 1 hour of birth.' },
  { emoji: '🫂', text: 'Keep the baby warm — skin-to-skin, a hat and wrapped in a blanket.' },
  { emoji: '🧼', text: 'Keep the cord clean and dry. Put nothing on it.' },
  { emoji: '🦟', text: 'You and the baby sleep under a treated mosquito net.' },
  { emoji: '💉', text: 'Take the baby for the birth vaccines (BCG, polio, hepatitis B).' },
  { emoji: '🥘', text: 'Eat well and drink plenty — you need extra energy to make milk.' },
  { emoji: '👪', text: 'Talk about family planning at your 6-week check.' },
  { emoji: '💜', text: 'Feeling low or tearful is common after birth. If it lasts more than 2 weeks, talk to someone.' },
];
