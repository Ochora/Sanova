import { describe, expect, it } from '@jest/globals';
import { upsertLog } from '../adherence';
import { earnedBadges, medicineStreak, nextBadge, streakFromDays } from '../streaks';
import type { Medication } from '../types';

describe('check-in streak', () => {
  const T = '2026-10-07';
  it('counts consecutive days including today', () => {
    const s = streakFromDays(new Set(['2026-10-05', '2026-10-06', '2026-10-07']), T);
    expect(s).toMatchObject({ current: 3, best: 3, doneToday: true, atRisk: false });
    expect(s.week.map((w) => w.done)).toEqual([false, false, false, false, true, true, true]);
  });
  it('keeps yesterday’s streak alive (at risk) until today ends', () => {
    const s = streakFromDays(new Set(['2026-10-05', '2026-10-06']), T);
    expect(s).toMatchObject({ current: 2, doneToday: false, atRisk: true });
  });
  it('breaks after a missed day but remembers the best', () => {
    const s = streakFromDays(new Set(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-10-05']), T);
    expect(s.current).toBe(0);
    expect(s.best).toBe(4);
  });
  it('awards badges by milestone', () => {
    expect(earnedBadges(7).map((b) => b.id)).toEqual(['first', 'd3', 'd7']);
    expect(nextBadge(7)?.days).toBe(14);
  });
});

describe('medicine streak', () => {
  const med: Medication = { id: 'm', memberId: 's', name: 'X', dose: '1', times: ['08:00'], startDate: '2026-10-01', notificationIds: [], createdAt: '' };
  it('counts fully-taken days and stops at a missed one', () => {
    let logs = upsertLog([], 'm', '2026-10-04', '08:00', 'taken');
    logs = upsertLog(logs, 'm', '2026-10-05', '08:00', 'taken');
    logs = upsertLog(logs, 'm', '2026-10-06', '08:00', 'taken');
    const now = new Date(2026, 9, 7, 7, 0); // before today's dose
    expect(medicineStreak([med], logs, now)).toMatchObject({ current: 3, doneToday: false, hasMeds: true });
    const after = upsertLog(logs, 'm', '2026-10-07', '08:00', 'taken');
    expect(medicineStreak([med], after, new Date(2026, 9, 7, 9, 0)).current).toBe(4);
  });
});
