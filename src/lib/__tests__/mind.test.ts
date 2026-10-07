import { describe, expect, it } from '@jest/globals';
import { offlineReply, CRISIS_REPLY } from '../companionText';
import { evaluateMind, shouldOfferDeeperCheck, soundsLikeCrisis } from '../mind';
import type { MoodLog } from '../types';

const log = (over: Partial<MoodLog>): MoodLog => ({ id: 'x', memberId: 'm', at: '', date: '2026-10-08', kind: 'morning', mood: 4, feelings: [], ...over });

describe('mind check', () => {
  it('celebrates a good day', () => {
    expect(evaluateMind(log({ mood: 5 })).level).toBe('great');
  });
  it('is gentle on a low day', () => {
    expect(evaluateMind(log({ mood: 2 })).level).toBe('low');
    expect(evaluateMind(log({ mood: 3, feelings: ['sad', 'lonely'] })).level).toBe('low');
  });
  it('recommends talking when screening is positive', () => {
    const r = evaluateMind(log({ mood: 3, screen: { phq: [2, 1], gad: [0, 0] } }));
    expect(r.level).toBe('support');
    expect(r.phqPositive).toBe(true);
  });
  it('prioritises safety', () => {
    expect(evaluateMind(log({ mood: 2, safetyFlag: true })).level).toBe('urgent');
  });
  it('offers the deeper check when things sound hard', () => {
    expect(shouldOfferDeeperCheck(2, [], [], '2026-10-08')).toBe('recommended');
    expect(shouldOfferDeeperCheck(4, [], [log({ screen: { phq: [0, 0], gad: [0, 0] }, date: '2026-10-06' })], '2026-10-08')).toBe('no');
    expect(shouldOfferDeeperCheck(4, [], [], '2026-10-08')).toBe('optional');
  });
});

describe('companion safety', () => {
  it('detects crisis language', () => {
    expect(soundsLikeCrisis('I just want to die')).toBe(true);
    expect(soundsLikeCrisis('I am tired of work')).toBe(false);
  });
  it('offline listener answers crisis with help lines', () => {
    expect(offlineReply('sometimes I think about suicide', 0)).toBe(CRISIS_REPLY);
    expect(CRISIS_REPLY).toMatch(/0800 21 21 21/);
    expect(offlineReply('worried about school fees', 0)).toMatch(/Money and work/);
  });
});
