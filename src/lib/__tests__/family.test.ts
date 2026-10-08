import { describe, expect, it } from '@jest/globals';
import { addMonths, growthFlags, milestoneState, MILESTONES, muacClass, nextVaccine, vaccineStatus, isUnderFive } from '../childHealth';
import { supportLine } from '../inclusion';
import { buildBundle, healthSummary, importBundle } from '../portable';
import { ancSchedule, eddFromLmp, eddFromWeeks, gestation, inPostnatal, nextAnc, postnatalDay, weekInfo } from '../pregnancy';
import type { Member, Pregnancy } from '../types';
import { emptyDataForTest } from './fixtures';

const preg = (over: Partial<Pregnancy> = {}): Pregnancy => ({
  id: 'p', memberId: 'me', lmp: '2026-05-01', edd: eddFromLmp('2026-05-01'), createdAt: '', status: 'active', ancVisits: [], checklist: [], notificationIds: [], ...over,
});

describe('pregnancy', () => {
  it('computes due date and gestation', () => {
    expect(eddFromLmp('2026-05-01')).toBe('2027-02-05');
    const g = gestation('2027-02-05', '2026-10-08');
    expect(g.weeks).toBe(22);
    expect(g.days).toBe(6);
    expect(g.trimester).toBe(2);
    expect(g.daysLeft).toBe(120);
    expect(gestation(eddFromWeeks(30, '2026-10-08'), '2026-10-08').weeks).toBe(30);
  });
  it('gives week-by-week guidance', () => {
    expect(weekInfo(22).size).toBe('a maize cob');
    expect(weekInfo(3).week).toBe(4);
    expect(weekInfo(41).week).toBe(40);
  });
  it('schedules the 8 ANC contacts and tracks the next one', () => {
    const p = preg({ ancVisits: [{ id: 'a', date: '2026-07-20' }] });
    const s = ancSchedule(p);
    expect(s).toHaveLength(8);
    expect(s[0]).toMatchObject({ week: 12, done: true });
    expect(nextAnc(p, '2026-10-08')).toMatchObject({ n: 2, week: 20 });
    const booked = preg({ ancVisits: [{ id: 'a', date: '2026-07-20', nextDate: '2026-10-20' }] });
    expect(nextAnc(booked, '2026-10-08')?.due).toBe('2026-10-20');
  });
  it('tracks the 6-week postnatal period', () => {
    const p = preg({ status: 'delivered', delivery: { date: '2026-10-01', babyIds: [] } });
    expect(postnatalDay('2026-10-01', '2026-10-08')).toBe(8);
    expect(inPostnatal(p, '2026-10-08')).toBe(true);
    expect(inPostnatal(p, '2026-11-11')).toBe(true); // day 42
    expect(inPostnatal(p, '2026-11-12')).toBe(false); // day 43
  });
});

describe('child health', () => {
  it('builds vaccine due dates and states', () => {
    const s = vaccineStatus('2026-08-01', { vaccines: { birth: '2026-08-01' }, growth: [], milestones: {}, notificationIds: [] }, '2026-10-08');
    expect(s.find((x) => x.visit.id === 'birth')?.state).toBe('done');
    expect(s.find((x) => x.visit.id === 'w6')).toMatchObject({ due: '2026-09-12', state: 'overdue' });
    expect(s.find((x) => x.visit.id === 'w10')).toMatchObject({ due: '2026-10-10', state: 'upcoming' });
    expect(s.find((x) => x.visit.id === 'm9')?.due).toBe('2027-05-01');
    expect(nextVaccine('2026-08-01', undefined, '2026-10-08')?.visit.id).toBe('birth');
  });
  it('adds months safely', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(isUnderFive('2022-01-01', '2026-10-08')).toBe(true);
    expect(isUnderFive('2021-01-01', '2026-10-08')).toBe(false);
  });
  it('classifies MUAC and weight trends', () => {
    expect(muacClass(11.2)).toBe('severe');
    expect(muacClass(12.0)).toBe('moderate');
    expect(muacClass(13.1)).toBe('normal');
    const f = growthFlags([{ id: 'a', date: '2026-08-01', weightKg: 7.2 }, { id: 'b', date: '2026-09-01', weightKg: 6.9, muacCm: 11.9 }], 10);
    expect(f.map((x) => x.tone)).toEqual(['warn', 'danger']);
  });
  it('flags late milestones', () => {
    const sit = MILESTONES.find((m) => m.id === 'm9-sit')!;
    expect(milestoneState(sit, 7, undefined)).toBe('later');
    expect(milestoneState(sit, 9, undefined)).toBe('now');
    expect(milestoneState(sit, 12, undefined)).toBe('late');
    expect(milestoneState(sit, 12, { vaccines: {}, growth: [], milestones: { 'm9-sit': '2026-01-01' }, notificationIds: [] })).toBe('done');
  });
});

describe('inclusion', () => {
  it('writes a support line for SOS / emergency card', () => {
    const m: Member = { id: 'x', name: 'Akello Grace', relationship: 'self', conditions: [], allergies: [], disabilities: ['hearing'] };
    expect(supportLine(m)).toMatch(/Akello is Deaf or hard of hearing — please text/);
    expect(supportLine({ ...m, supportNeeds: 'I use USL — write things down' })).toBe('I use USL — write things down');
    expect(supportLine({ ...m, disabilities: [] })).toBe('');
  });
});

describe('hospital visits in summary and transfer', () => {
  const base = emptyDataForTest();
  const data = {
    ...base,
    members: base.members.map((m) => (m.id === 'kid' ? { ...m, disabilities: ['mobility'] } : m)),
    visits: [
      { id: 'v1', memberId: 'kid', kind: 'admission' as const, facility: 'Mulago Hospital', dateIn: '2026-09-01', dateOut: '2026-09-04', diagnoses: ['Severe malaria'], doctors: [{ name: 'Dr. Namuli' }], treatment: 'IV artesunate', updates: [], createdAt: '', notificationIds: ['n'] },
    ],
    records: base.records.map((r) => ({ ...r, visitId: 'v1' })),
  };
  it('lists diagnoses and doctors in the summary', () => {
    const s = healthSummary(data, 'kid', { medicines: false, conditions: true, recentCheckIns: false, adherence: false, visits: true });
    expect(s).toMatch(/Mulago Hospital: Severe malaria \(Dr Namuli\)/);
    expect(s).toMatch(/Disability: Physical \/ mobility/);
  });
  it('carries visits and their photos to another phone', () => {
    const b = buildBundle(data, 'kid');
    expect(b.visits?.[0].notificationIds).toEqual([]);
    const r = importBundle(base, JSON.parse(JSON.stringify(b)), false);
    const v = r.data.visits.find((x) => x.memberId === r.memberId)!;
    expect(v.diagnoses).toEqual(['Severe malaria']);
    expect(r.data.records.find((x) => x.memberId === r.memberId)?.visitId).toBe(v.id);
  });
});

describe('pregnancy medicine check', () => {
  it('warns about medicines usually avoided in pregnancy', async () => {
    const { pregnancyWarnings } = await import('../drugs');
    expect(pregnancyWarnings('Brufen 400mg')).toHaveLength(1);
    expect(pregnancyWarnings('Doxycycline')[0].message).toMatch(/avoided in pregnancy/);
    expect(pregnancyWarnings('Paracetamol')).toHaveLength(0);
  });
});
