import { describe, expect, it } from '@jest/globals';
import { ageInMonths, suggestDose } from '../dosing';

describe('standard doses by age', () => {
  it('Coartem follows the WHO/Uganda age bands', () => {
    expect(suggestDose('Coartem', 2)?.needsClinician).toBe(true);
    expect(suggestDose('Coartem', 18)?.dose).toBe('1 tablet');
    expect(suggestDose('Coartem 20/120', 5 * 12)?.dose).toBe('2 tablets');
    expect(suggestDose('Lonart', 9 * 12)?.dose).toBe('3 tablets');
    const adult = suggestDose('Coartem', 30 * 12)!;
    expect(adult).toMatchObject({ dose: '4 tablets', durationDays: 3, times: ['08:00', '20:00'] });
  });
  it('amoxicillin dispersible bands and weight-based gap', () => {
    expect(suggestDose('Amoxicillin', 8)?.dose).toMatch(/^250 mg/);
    expect(suggestDose('Amoxyl', 30)?.dose).toMatch(/^500 mg/);
    expect(suggestDose('amoxicillin', 8 * 12)?.needsClinician).toBe(true);
  });
  it('albendazole, zinc, paracetamol', () => {
    expect(suggestDose('Albendazole', 18)?.dose).toMatch(/^200 mg/);
    expect(suggestDose('Zentel', 36)?.dose).toMatch(/^400 mg/);
    expect(suggestDose('Zinc tablets', 4)?.dose).toMatch(/^10 mg/);
    expect(suggestDose('Panadol', 40 * 12)?.howOften).toMatch(/max 4 g/);
  });
  it('asks for a birth date and ignores unknown medicines', () => {
    expect(suggestDose('Coartem', undefined)?.needsClinician).toBe(true);
    expect(suggestDose('Vitamin C', 100)).toBeUndefined();
  });
  it('computes age in months', () => {
    expect(ageInMonths('2025-10-08', new Date(2026, 9, 8))).toBe(12);
    expect(ageInMonths('2025-10-09', new Date(2026, 9, 8))).toBe(11);
  });
});
