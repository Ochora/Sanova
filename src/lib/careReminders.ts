import * as Notifications from 'expo-notifications';
import { vaccineStatus } from './childHealth';
import { addDays, formatDate, fromDateKey, toDateKey } from './dates';
import { CHECKIN_CHANNEL, cancelIds, ensurePermission } from './notifications';
import { ancSchedule, lmpFromEdd } from './pregnancy';
import type { ChildCare, Member, Pregnancy, Visit } from './types';

async function at(dateKey: string, hour: number, title: string, body: string, data: Record<string, string>): Promise<string | null> {
  const d = fromDateKey(dateKey);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= Date.now() + 60_000) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d, channelId: CHECKIN_CHANNEL },
    });
  } catch {
    return null;
  }
}

async function collect(jobs: Promise<string | null>[]): Promise<string[]> {
  return (await Promise.all(jobs)).filter((x): x is string => !!x);
}

/** Antenatal visit reminders, a "pack your bag" nudge and a due-date note. Replaces old ones. */
export async function syncPregnancyReminders(p: Pregnancy, member?: Member): Promise<string[]> {
  await cancelIds(p.notificationIds);
  if (p.status !== 'active' || !(await ensurePermission())) return [];
  const who = member && member.relationship !== 'self' ? `${member.name.split(' ')[0]}'s` : 'Your';
  const today = toDateKey();
  const jobs: Promise<string | null>[] = [];
  for (const s of ancSchedule(p)) {
    if (s.done || s.due < today) continue;
    jobs.push(at(s.due, 8, `🤰 ${who} antenatal visit is due`, `Visit ${s.n} of 8 (around week ${s.week}). Take your antenatal card.`, { kind: 'pregnancy', id: p.id }));
  }
  for (const v of p.ancVisits) {
    if (v.nextDate && v.nextDate > today) {
      jobs.push(at(addDays(v.nextDate, -1), 18, '🤰 Antenatal visit tomorrow', `${who} next antenatal appointment is tomorrow${v.facility ? ` at ${v.facility}` : ''}.`, { kind: 'pregnancy', id: p.id }));
    }
  }
  const lmp = p.lmp ?? lmpFromEdd(p.edd);
  jobs.push(at(addDays(lmp, 32 * 7), 9, '🧳 Time to plan for the birth', 'Week 32: check your birth plan — facility, transport, money and mama kit.', { kind: 'pregnancy', id: p.id }));
  jobs.push(at(addDays(lmp, 36 * 7), 9, '🧳 Pack your bag', 'Week 36: keep your bag, antenatal card and transport money ready.', { kind: 'pregnancy', id: p.id }));
  jobs.push(at(p.edd, 8, '👶 Due date today', 'Only a few babies arrive on their due date. Keep your appointments and watch for signs of labour.', { kind: 'pregnancy', id: p.id }));
  return collect(jobs);
}

/** Reminders on the morning each vaccine visit is due. Replaces old ones. */
export async function syncChildReminders(child: Member, care: ChildCare | undefined): Promise<string[]> {
  if (care?.notificationIds.length) await cancelIds(care.notificationIds);
  if (!child.dob || !(await ensurePermission())) return [];
  const name = child.name.split(' ')[0];
  const today = toDateKey();
  const jobs = vaccineStatus(child.dob, care, today)
    .filter((s) => s.state === 'upcoming')
    .slice(0, 6)
    .map((s) =>
      at(s.due, 8, `💉 ${name}'s ${s.visit.label} vaccines are due`, `${s.visit.vaccines.join(', ')}. Take the child health card.`, { kind: 'child', id: child.id }),
    );
  return collect(jobs);
}

export async function syncVisitReminders(v: Visit, member?: Member): Promise<string[]> {
  await cancelIds(v.notificationIds);
  if (!v.followUp || v.followUp <= toDateKey() || !(await ensurePermission())) return [];
  const who = member && member.relationship !== 'self' ? `${member.name.split(' ')[0]}'s` : 'Your';
  return collect([
    at(addDays(v.followUp, -1), 18, '🏥 Follow-up visit tomorrow', `${who} follow-up at ${v.facility} is tomorrow (${formatDate(v.followUp)}).`, { kind: 'visit', id: v.id }),
    at(v.followUp, 8, '🏥 Follow-up visit today', `${who} follow-up at ${v.facility} is today.`, { kind: 'visit', id: v.id }),
  ]);
}
