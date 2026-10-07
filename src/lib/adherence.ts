import { addDays, daysBetween, timeToMinutes, toDateKey } from './dates';
import type { DoseLog, DoseStatus, Medication } from './types';

/** A dose is "missed" once it is this many minutes overdue without being logged. */
export const MISSED_AFTER_MIN = 120;

export type DoseState = 'taken' | 'skipped' | 'due' | 'upcoming' | 'missed';

export interface ScheduledDose {
  med: Medication;
  date: string;
  time: string;
  state: DoseState;
  log?: DoseLog;
}

export function isActiveOn(med: Medication, date: string): boolean {
  if (med.archived) return false;
  const offset = daysBetween(med.startDate, date);
  if (offset < 0) return false;
  if (med.durationDays !== undefined && offset >= med.durationDays) return false;
  return true;
}

export function endDate(med: Medication): string | undefined {
  return med.durationDays === undefined ? undefined : addDays(med.startDate, med.durationDays - 1);
}

export function findLog(logs: DoseLog[], medId: string, date: string, time: string) {
  return logs.find((l) => l.medId === medId && l.date === date && l.time === time);
}

function stateFor(log: DoseLog | undefined, date: string, time: string, now: Date): DoseState {
  if (log) return log.status;
  const today = toDateKey(now);
  if (date < today) return 'missed';
  if (date > today) return 'upcoming';
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const diff = nowMin - timeToMinutes(time);
  if (diff >= MISSED_AFTER_MIN) return 'missed';
  if (diff >= -30) return 'due';
  return 'upcoming';
}

/** All doses scheduled on `date`, sorted by time. */
export function dosesForDay(
  meds: Medication[],
  logs: DoseLog[],
  date: string,
  now: Date = new Date(),
): ScheduledDose[] {
  const out: ScheduledDose[] = [];
  for (const med of meds) {
    if (!isActiveOn(med, date)) continue;
    for (const time of med.times) {
      const log = findLog(logs, med.id, date, time);
      out.push({ med, date, time, log, state: stateFor(log, date, time, now) });
    }
  }
  return out.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

export interface AdherenceSummary {
  scheduled: number; // doses whose time has passed (or were logged)
  taken: number;
  skipped: number;
  missed: number;
  rate: number | null; // 0..1, null when nothing scheduled yet
}

/**
 * Adherence over the `days` days ending on `endKey` (inclusive).
 * Only counts doses that are already due (or were logged early) so a dose later today does not drag the rate down.
 */
export function adherence(
  meds: Medication[],
  logs: DoseLog[],
  days = 7,
  now: Date = new Date(),
  endKey: string = toDateKey(now),
): AdherenceSummary {
  let scheduled = 0;
  let taken = 0;
  let skipped = 0;
  let missed = 0;
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endKey, -i);
    for (const d of dosesForDay(meds, logs, date, now)) {
      if (d.state === 'upcoming' || d.state === 'due') continue;
      scheduled++;
      if (d.state === 'taken') taken++;
      else if (d.state === 'skipped') skipped++;
      else missed++;
    }
  }
  return { scheduled, taken, skipped, missed, rate: scheduled ? taken / scheduled : null };
}

/** Per-day rate for a mini chart (oldest first). */
export function dailyRates(
  meds: Medication[],
  logs: DoseLog[],
  days = 7,
  now: Date = new Date(),
): { date: string; rate: number | null }[] {
  const end = toDateKey(now);
  const out: { date: string; rate: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    out.push({ date, rate: adherence(meds, logs, 1, now, date).rate });
  }
  return out;
}

export function upsertLog(
  logs: DoseLog[],
  medId: string,
  date: string,
  time: string,
  status: DoseStatus | null,
): DoseLog[] {
  const rest = logs.filter((l) => !(l.medId === medId && l.date === date && l.time === time));
  if (status === null) return rest;
  return [...rest, { medId, date, time, status, at: new Date().toISOString() }];
}
