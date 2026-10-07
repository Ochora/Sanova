import { dosesForDay } from './adherence';
import { addDays, toDateKey } from './dates';
import type { CheckIn, DoseLog, Medication } from './types';

export interface StreakInfo {
  /** Consecutive days up to today (or up to yesterday if today isn't done yet). */
  current: number;
  best: number;
  doneToday: boolean;
  /** Streak exists but today isn't done yet — "check in to keep it". */
  atRisk: boolean;
  /** Oldest → newest, 7 entries ending today. */
  week: { date: string; done: boolean }[];
}

function runEndingAt(days: Set<string>, end: string): number {
  let n = 0;
  let d = end;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

function bestRun(days: Set<string>): number {
  let best = 0;
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue; // not the start of a run
    best = Math.max(best, runEndingAt(days, lastOfRun(days, d)));
  }
  return best;
}

function lastOfRun(days: Set<string>, start: string): string {
  let d = start;
  while (days.has(addDays(d, 1))) d = addDays(d, 1);
  return d;
}

export function streakFromDays(days: Set<string>, today: string = toDateKey()): StreakInfo {
  const doneToday = days.has(today);
  const current = doneToday ? runEndingAt(days, today) : runEndingAt(days, addDays(today, -1));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, done: days.has(date) };
  });
  return { current, best: Math.max(bestRun(days), current), doneToday, atRisk: !doneToday && current > 0, week };
}

export function checkInStreak(checkIns: CheckIn[], memberId: string | undefined, today?: string): StreakInfo {
  const days = new Set(checkIns.filter((c) => c.memberId === memberId).map((c) => c.date));
  return streakFromDays(days, today);
}

/**
 * Medicine streak: consecutive days on which every scheduled dose was marked taken.
 * Days with no doses scheduled are skipped over (they neither add to nor break the streak).
 */
export function medicineStreak(
  meds: Medication[],
  logs: DoseLog[],
  now: Date = new Date(),
  lookback = 120,
): { current: number; doneToday: boolean; hasMeds: boolean } {
  const today = toDateKey(now);
  const todayDoses = dosesForDay(meds, logs, today, now);
  const doneToday = todayDoses.length > 0 && todayDoses.every((d) => d.state === 'taken');
  let current = doneToday ? 1 : 0;
  let hasMeds = todayDoses.length > 0;
  for (let i = 1; i <= lookback; i++) {
    const date = addDays(today, -i);
    const doses = dosesForDay(meds, logs, date, now);
    if (doses.length === 0) continue;
    hasMeds = true;
    if (doses.every((d) => d.state === 'taken')) current++;
    else break;
  }
  return { current, doneToday, hasMeds };
}

export interface Badge {
  id: string;
  days: number;
  title: string;
  emoji: string;
  blurb: string;
}

export const CHECKIN_BADGES: Badge[] = [
  { id: 'first', days: 1, title: 'First step', emoji: '🌱', blurb: 'Your very first check-in' },
  { id: 'd3', days: 3, title: 'Warming up', emoji: '🔥', blurb: '3 days in a row' },
  { id: 'd7', days: 7, title: 'One full week', emoji: '⭐', blurb: '7 days in a row' },
  { id: 'd14', days: 14, title: 'Two strong weeks', emoji: '💪', blurb: '14 days in a row' },
  { id: 'd30', days: 30, title: 'Health habit', emoji: '🏅', blurb: '30 days in a row' },
  { id: 'd60', days: 60, title: 'Unstoppable', emoji: '🚀', blurb: '60 days in a row' },
  { id: 'd100', days: 100, title: 'Century', emoji: '👑', blurb: '100 days in a row' },
];

/** Badges earned for a best-streak value. */
export function earnedBadges(best: number): Badge[] {
  return CHECKIN_BADGES.filter((b) => best >= b.days);
}

export function nextBadge(current: number): Badge | undefined {
  return CHECKIN_BADGES.find((b) => b.days > current);
}

export function streakMessage(n: number): string {
  if (n <= 1) return 'Great start! Come back tomorrow to build your streak.';
  if (n < 3) return 'Two days running — you are building a habit!';
  if (n < 7) return `${n} days strong. Keep the fire going!`;
  if (n < 14) return `${n} days! Your body thanks you for paying attention.`;
  if (n < 30) return `${n} days — that is real commitment.`;
  return `${n} days. You are a Sanova legend!`;
}
