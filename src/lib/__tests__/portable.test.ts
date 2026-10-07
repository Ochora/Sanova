import { describe, expect, it } from '@jest/globals';
import { emptyDataForTest } from './fixtures';
import { buildBundle, healthSummary, importBundle, parseBundle } from '../portable';

describe('profile transfer', () => {
  const parent = emptyDataForTest();

  it('exports only the chosen person', () => {
    const b = buildBundle(parent, 'kid', { guardian: { name: 'Norman', phone: '0772000000' } });
    expect(b.member.name).toBe('Grace');
    expect(b.medications.map((m) => m.name)).toEqual(['Coartem']);
    expect(b.doseLogs).toHaveLength(1);
    expect(b.checkIns).toHaveLength(1);
    expect(b.records[0]).not.toHaveProperty('imageUri');
    expect(b.contacts[0]).toMatchObject({ name: 'Norman', relationship: 'Parent / guardian' });
    expect(b.medications[0].notificationIds).toEqual([]);
  });

  it('round-trips through JSON and imports as the new owner', () => {
    const b = parseBundle(JSON.stringify(buildBundle(parent, 'kid', { guardian: { name: 'Norman', phone: '0772000000' } })));
    const fresh = { ...emptyDataForTest(), members: [], medications: [], doseLogs: [], checkIns: [], records: [], contacts: [], onboarded: false };
    const r = importBundle(fresh, b, true);
    const me = r.data.members.find((m) => m.relationship === 'self')!;
    expect(me.name).toBe('Grace');
    expect(r.data.onboarded).toBe(true);
    expect(r.data.medications[0].memberId).toBe(me.id);
    expect(r.data.doseLogs[0].medId).toBe(r.data.medications[0].id);
    expect(r.data.contacts[0].name).toBe('Norman');
  });

  it('imports as a dependant without touching the owner', () => {
    const b = buildBundle(parent, 'kid');
    const r = importBundle(parent, b, false, 'Child');
    expect(r.data.members.filter((m) => m.relationship === 'self')).toHaveLength(1);
    expect(r.data.members).toHaveLength(3);
  });

  it('rejects other files', () => {
    expect(() => parseBundle('{"hello":1}')).toThrow(/isn't a Sanova/);
    expect(() => parseBundle('not json')).toThrow();
  });

  it('builds a shareable summary without mental-health data', () => {
    const s = healthSummary(parent, 'kid', { medicines: true, conditions: true, recentCheckIns: true, adherence: false }, new Date(2026, 9, 8, 12));
    expect(s).toMatch(/Grace/);
    expect(s).toMatch(/Coartem/);
    expect(s).toMatch(/Allergies: Penicillin/);
    expect(s).not.toMatch(/mood/i);
  });
});
