/**
 * Mind (mental wellbeing) check-ins.
 *
 * The optional "deeper check" uses PHQ-2 and GAD-2, short public-domain screening
 * questions widely used in primary care. A positive screen is NOT a diagnosis — it is a
 * prompt to talk to someone. Wording and thresholds must be reviewed by the clinical
 * advisory board (ideally with Butabika / Mental Health Uganda) before public launch.
 */
import { addDays, toDateKey } from './dates';
import type { MoodKind, MoodLog } from './types';

export interface Feeling {
  id: string;
  label: string;
  emoji: string;
  heavy?: boolean; // a harder feeling — used to gently offer support
}

export const FEELINGS: Feeling[] = [
  { id: 'happy', label: 'Happy', emoji: '😊' },
  { id: 'calm', label: 'Calm', emoji: '😌' },
  { id: 'grateful', label: 'Grateful', emoji: '🙏' },
  { id: 'hopeful', label: 'Hopeful', emoji: '🌤️' },
  { id: 'motivated', label: 'Motivated', emoji: '💪' },
  { id: 'loved', label: 'Loved', emoji: '🥰' },
  { id: 'tired', label: 'Tired', emoji: '🥱' },
  { id: 'stressed', label: 'Stressed', emoji: '😫', heavy: true },
  { id: 'anxious', label: 'Anxious / worried', emoji: '😟', heavy: true },
  { id: 'sad', label: 'Sad', emoji: '😢', heavy: true },
  { id: 'lonely', label: 'Lonely', emoji: '🫥', heavy: true },
  { id: 'angry', label: 'Angry / irritable', emoji: '😠', heavy: true },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '🌊', heavy: true },
  { id: 'numb', label: 'Empty / numb', emoji: '😶', heavy: true },
];

export const FEELING_BY_ID: Record<string, Feeling> = Object.fromEntries(FEELINGS.map((f) => [f.id, f]));

export const MOOD_SCALE = [
  { v: 5, emoji: '🤩', label: 'Great' },
  { v: 4, emoji: '😊', label: 'Good' },
  { v: 3, emoji: '😐', label: 'Okay' },
  { v: 2, emoji: '😔', label: 'Low' },
  { v: 1, emoji: '😞', label: 'Very low' },
];

/** PHQ-2 / GAD-2 — "Over the last 2 weeks, how often have you been bothered by…" */
export const SCREEN_QUESTIONS = {
  phq: ['Little interest or pleasure in doing things', 'Feeling down, depressed or hopeless'],
  gad: ['Feeling nervous, anxious or on edge', 'Not being able to stop or control worrying'],
};
export const SCREEN_ANSWERS = [
  { v: 0, label: 'Not at all' },
  { v: 1, label: 'Several days' },
  { v: 2, label: 'More than half the days' },
  { v: 3, label: 'Nearly every day' },
];

export function kindForNow(d: Date = new Date()): MoodKind {
  return d.getHours() < 15 ? 'morning' : 'evening';
}

export function heavyCount(feelings: string[]): number {
  return feelings.filter((f) => FEELING_BY_ID[f]?.heavy).length;
}

/** Offer the short PHQ-2/GAD-2 check when things sound hard, or if it hasn't been done for a week. */
export function shouldOfferDeeperCheck(
  mood: number,
  feelings: string[],
  past: MoodLog[],
  today: string = toDateKey(),
): 'recommended' | 'optional' | 'no' {
  const recentLow = past.filter((l) => l.date >= addDays(today, -3) && l.mood <= 2).length;
  if (mood <= 2 || heavyCount(feelings) >= 2 || recentLow >= 2) return 'recommended';
  const lastScreen = [...past].reverse().find((l) => l.screen);
  if (!lastScreen || lastScreen.date <= addDays(today, -7)) return 'optional';
  return 'no';
}

export type MindLevel = 'great' | 'okay' | 'low' | 'support' | 'urgent';

export interface MindResult {
  level: MindLevel;
  title: string;
  message: string;
  phqPositive: boolean;
  gadPositive: boolean;
  suggestions: { id: 'breathe' | 'ground' | 'text' | 'talk' | 'ai' | 'walk' | 'water' | 'sleep' | 'journal'; label: string }[];
}

export function evaluateMind(log: Pick<MoodLog, 'mood' | 'feelings' | 'stress' | 'sleep' | 'screen' | 'safetyFlag' | 'kind'>): MindResult {
  const phq = log.screen ? log.screen.phq[0] + log.screen.phq[1] : 0;
  const gad = log.screen ? log.screen.gad[0] + log.screen.gad[1] : 0;
  const phqPositive = phq >= 3;
  const gadPositive = gad >= 3;
  const heavy = heavyCount(log.feelings);

  if (log.safetyFlag) {
    return {
      level: 'urgent',
      title: "You don't have to carry this alone",
      message:
        "Thank you for telling me. What you're feeling matters, and talking to someone right now can really help. Please reach out to one of the people or lines below.",
      phqPositive,
      gadPositive,
      suggestions: [
        { id: 'talk', label: 'Call a counsellor now' },
        { id: 'text', label: 'Message someone you trust' },
        { id: 'breathe', label: 'Breathe with me for one minute' },
      ],
    };
  }

  if (phqPositive || gadPositive || log.mood === 1) {
    return {
      level: 'support',
      title: 'It sounds like things have been heavy',
      message:
        phqPositive || gadPositive
          ? 'Your answers suggest you may be going through a hard stretch. That is common and it is treatable. Talking to a counsellor or health worker is a strong next step.'
          : "I'm sorry today feels so hard. You don't have to fix everything now — just take the next small step.",
      phqPositive,
      gadPositive,
      suggestions: [
        { id: 'talk', label: 'Talk to a counsellor (free)' },
        { id: 'text', label: 'Text a friend' },
        { id: 'ai', label: 'Talk it through with Sanova' },
        { id: 'breathe', label: 'One-minute breathing' },
      ],
    };
  }

  if (log.mood === 2 || heavy >= 2 || (log.stress ?? 0) >= 4) {
    return {
      level: 'low',
      title: 'Be gentle with yourself today',
      message: 'Hard days happen to everyone. A few small things can make a real difference.',
      phqPositive,
      gadPositive,
      suggestions: [
        { id: 'breathe', label: 'One-minute breathing' },
        { id: 'text', label: 'Reach out to someone' },
        { id: 'walk', label: 'Take a 10-minute walk outside' },
        { id: 'ai', label: 'Talk it through with Sanova' },
      ],
    };
  }

  if (log.mood === 3) {
    return {
      level: 'okay',
      title: log.kind === 'morning' ? 'Steady start' : 'A steady day',
      message: log.kind === 'morning' ? 'One small thing that would make today better?' : 'Rest well — tomorrow is a fresh start.',
      phqPositive,
      gadPositive,
      suggestions:
        log.kind === 'morning'
          ? [
              { id: 'water', label: 'Drink a glass of water' },
              { id: 'walk', label: 'Get some morning sunlight' },
            ]
          : [
              { id: 'sleep', label: 'Phone down 30 minutes before bed' },
              { id: 'journal', label: 'Write one thing that went well' },
            ],
    };
  }

  return {
    level: 'great',
    title: log.kind === 'morning' ? 'Love that energy! ☀️' : 'What a good day! 🌙',
    message: log.kind === 'morning' ? 'Carry it with you — and share a smile with someone today.' : 'Notice what made today good — you can do more of it.',
    phqPositive,
    gadPositive,
    suggestions: [],
  };
}

const MORNING_PROMPTS = [
  'What is one thing you want to do for yourself today?',
  'What would make today a good day?',
  'Who could you check on today?',
  'What is one small win you are aiming for?',
];
const EVENING_PROMPTS = [
  'What went well today, even something small?',
  'What made you smile today?',
  'What is one thing you handled well today?',
];

export function promptFor(kind: MoodKind, date: string = toDateKey()): string {
  const list = kind === 'morning' ? MORNING_PROMPTS : EVENING_PROMPTS;
  const n = Number(date.replace(/-/g, '')) % list.length;
  return list[n];
}

/** Average mood per day for the last `days` days (null when no log). */
export function moodTrend(logs: MoodLog[], memberId: string | undefined, days = 7, today: string = toDateKey()) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);
    const ls = logs.filter((l) => l.memberId === memberId && l.date === date);
    return { date, mood: ls.length ? ls.reduce((s, l) => s + l.mood, 0) / ls.length : null };
  });
}

/** Phrases that suggest the person may be in crisis — used to surface help immediately in chat. */
const CRISIS = [
  'kill myself',
  'end my life',
  'suicide',
  'suicidal',
  'want to die',
  "don't want to live",
  'dont want to live',
  'better off dead',
  'hurt myself',
  'harm myself',
  'no reason to live',
  'end it all',
];
export function soundsLikeCrisis(text: string): boolean {
  const t = text.toLowerCase();
  return CRISIS.some((c) => t.includes(c));
}
