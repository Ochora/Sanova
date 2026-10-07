import { describe, expect, it } from '@jest/globals';
import { adherence, dosesForDay, isActiveOn, upsertLog } from '../adherence';
import { addDays, ageInYears, isValidDateKey, isValidTime, toDateKey } from '../dates';
import { allergyWarnings, ingredientsOf, interactionWarnings, medicationTips } from '../drugs';
import { distanceKm, estimateTravelMinutes } from '../geo';
import { triage } from '../triage';
import type { CheckIn, Medication } from '../types';

const med = (over: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  memberId: 'self',
  name: 'Coartem',
  dose: '4 tablets',
  times: ['08:00', '20:00'],
  startDate: '2026-10-01',
  durationDays: 3,
  notificationIds: [],
  createdAt: '',
  ...over,
});

describe('dates', () => {
  it('validates keys and times', () => {
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('2026-02-28')).toBe(true);
    expect(isValidTime('8:05')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('computes age', () => {
    expect(ageInYears('2000-10-08', '2026-10-07')).toBe(25);
    expect(ageInYears('2000-10-07', '2026-10-07')).toBe(26);
  });
});

describe('adherence', () => {
  it('respects course duration', () => {
    const m = med();
    expect(isActiveOn(m, '2026-09-30')).toBe(false);
    expect(isActiveOn(m, '2026-10-03')).toBe(true);
    expect(isActiveOn(m, '2026-10-04')).toBe(false);
  });

  it('classifies dose states by time of day', () => {
    const now = new Date(2026, 9, 2, 11, 0); // 2 Oct 11:00
    const doses = dosesForDay([med()], [], '2026-10-02', now);
    expect(doses.map((d) => d.state)).toEqual(['missed', 'upcoming']);
    const at0815 = dosesForDay([med()], [], '2026-10-02', new Date(2026, 9, 2, 8, 15));
    expect(at0815[0].state).toBe('due');
  });

  it('computes rate from logs, ignoring future doses', () => {
    let logs = upsertLog([], 'm1', '2026-10-01', '08:00', 'taken');
    logs = upsertLog(logs, 'm1', '2026-10-01', '20:00', 'taken');
    logs = upsertLog(logs, 'm1', '2026-10-02', '08:00', 'skipped');
    const now = new Date(2026, 9, 2, 12, 0);
    const s = adherence([med()], logs, 7, now);
    expect(s).toMatchObject({ scheduled: 3, taken: 2, skipped: 1, missed: 0 });
    expect(s.rate).toBeCloseTo(2 / 3);
    // un-logging removes the entry
    expect(upsertLog(logs, 'm1', '2026-10-02', '08:00', null)).toHaveLength(2);
  });
});

describe('triage', () => {
  it('is green when well', () => {
    expect(triage({ feeling: 5, symptoms: [] }).level).toBe('green');
  });
  it('mild symptoms are yellow with home care', () => {
    const r = triage({ feeling: 3, symptoms: ['headache'] });
    expect(r.level).toBe('yellow');
    expect(r.homeCare.length).toBe(1);
  });
  it('fever is orange and recommends a malaria test', () => {
    const r = triage({ feeling: 3, symptoms: ['fever'] });
    expect(r.level).toBe('orange');
    expect(r.actions.join(' ')).toMatch(/malaria/i);
  });
  it('temperature alone escalates', () => {
    expect(triage({ feeling: 4, symptoms: [], temperature: 38.4 }).level).toBe('orange');
    expect(triage({ feeling: 4, symptoms: [], temperature: 40.2 }).level).toBe('red');
  });
  it('danger signs and free-text red flags are red', () => {
    expect(triage({ feeling: 3, symptoms: ['convulsions'] }).level).toBe('red');
    const r = triage({ feeling: 3, symptoms: [], notes: 'Since morning I cannot breathe well' });
    expect(r.level).toBe('red');
    expect(r.matchedFromNotes).toContain('breathing');
  });
  it('fever in an infant is red', () => {
    expect(triage({ feeling: 3, symptoms: ['fever'] }, { ageYears: 0 }).level).toBe('red');
  });
  it('pregnancy escalates mild symptoms', () => {
    expect(triage({ feeling: 3, symptoms: ['headache'] }, { pregnant: true }).level).toBe('orange');
  });
  it('recurring symptom over 3 days escalates', () => {
    const h = (date: string): CheckIn => ({ id: date, memberId: 's', at: '', date, feeling: 3, symptoms: ['fatigue'], level: 'yellow' });
    const r = triage({ feeling: 3, symptoms: ['fatigue'] }, { history: [h('2026-10-05'), h('2026-10-06')], today: '2026-10-07' });
    expect(r.level).toBe('orange');
  });
});

describe('drugs', () => {
  it('maps brands to ingredients', () => {
    expect(ingredientsOf('Coartem 80/480')).toContain('artemether-lumefantrine');
    expect(ingredientsOf('TLD')).toContain('dolutegravir');
    expect(ingredientsOf('Septrin 960mg')).toContain('cotrimoxazole');
    expect(ingredientsOf('oral rehydration')).toEqual([]);
  });
  it('flags well-known interactions', () => {
    const w = interactionWarnings('Rifampicin', ['TLD (tenofovir/lamivudine/dolutegravir)']);
    expect(w[0]?.severity).toBe('serious');
    expect(interactionWarnings('Fansidar', ['Septrin'])).toHaveLength(1);
    expect(interactionWarnings('Paracetamol', ['Septrin'])).toHaveLength(0);
  });
  it('flags allergy classes', () => {
    expect(allergyWarnings('Amoxicillin 500mg', ['Penicillin'])).toHaveLength(1);
    expect(allergyWarnings('Septrin', ['sulfa drugs'])).toHaveLength(1);
    expect(allergyWarnings('Paracetamol', ['Penicillin'])).toHaveLength(0);
  });
  it('gives tips', () => {
    expect(medicationTips('Flagyl')[0]).toMatch(/alcohol/);
  });
});

describe('geo', () => {
  it('measures distance Kampala → Jinja ~ 65-75 km', () => {
    const d = distanceKm({ lat: 0.3136, lng: 32.5811 }, { lat: 0.4244, lng: 33.2042 });
    expect(d).toBeGreaterThan(65);
    expect(d).toBeLessThan(75);
    expect(estimateTravelMinutes(1)).toBeGreaterThan(2);
  });
});

it('toDateKey uses local date', () => {
  expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
});
