/**
 * Standard doses by age for a small set of very common medicines in Uganda.
 *
 * Sources: WHO Guidelines for malaria (artemether-lumefantrine weight/age bands),
 * WHO/UNICEF IMCI (amoxicillin DT, zinc, ORS), WHO deworming guidance (albendazole),
 * WHO cotrimoxazole prophylaxis guidance, and common paracetamol age bands (BNF for Children).
 * Age bands approximate weight bands — weight-based dosing by a health worker is always
 * preferred, and THE PRESCRIPTION ALWAYS WINS. Must be reviewed by a pharmacist before launch.
 */
import { ingredientsOf } from './drugs';

export interface DoseSuggestion {
  ingredient: string;
  dose: string; // e.g. "2 tablets (20/120 mg)"
  times?: string[]; // schedule suggestion
  durationDays?: number;
  howOften: string; // human description
  note?: string;
  /** No age-standard dose — a clinician must decide (e.g. young infants). */
  needsClinician?: boolean;
}

type Band = { maxMonths: number; s: Omit<DoseSuggestion, 'ingredient'> };
const Y = (years: number) => years * 12;
const INF = Number.POSITIVE_INFINITY;
const CLINICIAN = (why: string): Omit<DoseSuggestion, 'ingredient'> => ({
  dose: '',
  howOften: '',
  needsClinician: true,
  note: why,
});

const TABLE: Record<string, { label: string; bands: Band[] }> = {
  'artemether-lumefantrine': {
    label: 'Artemether-lumefantrine (Coartem 20/120 mg)',
    bands: [
      { maxMonths: 4, s: CLINICIAN('Babies under 4 months (or under 5 kg) need a dose decided by a health worker.') },
      { maxMonths: Y(3), s: { dose: '1 tablet', times: ['08:00', '20:00'], durationDays: 3, howOften: 'Twice a day for 3 days (6 doses)' } },
      { maxMonths: Y(7), s: { dose: '2 tablets', times: ['08:00', '20:00'], durationDays: 3, howOften: 'Twice a day for 3 days (6 doses)' } },
      { maxMonths: Y(12), s: { dose: '3 tablets', times: ['08:00', '20:00'], durationDays: 3, howOften: 'Twice a day for 3 days (6 doses)' } },
      { maxMonths: INF, s: { dose: '4 tablets', times: ['08:00', '20:00'], durationDays: 3, howOften: 'Twice a day for 3 days (6 doses)' } },
    ],
  },
  paracetamol: {
    label: 'Paracetamol',
    bands: [
      { maxMonths: 3, s: CLINICIAN('Babies under 3 months with fever must be seen by a health worker.') },
      { maxMonths: Y(1), s: { dose: '60–120 mg (2.5–5 ml of 120 mg/5 ml syrup)', times: ['08:00', '14:00', '20:00'], durationDays: 3, howOften: 'Every 4–6 hours if needed — max 4 doses in 24 hours' } },
      { maxMonths: Y(6), s: { dose: '120–240 mg (5–10 ml of 120 mg/5 ml syrup)', times: ['08:00', '14:00', '20:00'], durationDays: 3, howOften: 'Every 4–6 hours if needed — max 4 doses in 24 hours' } },
      { maxMonths: Y(12), s: { dose: '250–500 mg (½–1 tablet of 500 mg)', times: ['08:00', '14:00', '20:00'], durationDays: 3, howOften: 'Every 4–6 hours if needed — max 4 doses in 24 hours' } },
      { maxMonths: INF, s: { dose: '500 mg–1 g (1–2 tablets of 500 mg)', times: ['08:00', '14:00', '20:00'], durationDays: 3, howOften: 'Every 4–6 hours if needed — max 4 g (8 tablets) in 24 hours' } },
    ],
  },
  amoxicillin: {
    label: 'Amoxicillin',
    bands: [
      { maxMonths: 2, s: CLINICIAN('Babies under 2 months with infection need urgent assessment by a health worker.') },
      { maxMonths: 12, s: { dose: '250 mg (1 dispersible tablet)', times: ['08:00', '20:00'], durationDays: 5, howOften: 'Twice a day for 5 days' } },
      { maxMonths: Y(3), s: { dose: '500 mg (2 dispersible tablets of 250 mg)', times: ['08:00', '20:00'], durationDays: 5, howOften: 'Twice a day for 5 days' } },
      { maxMonths: Y(5), s: { dose: '750 mg (3 dispersible tablets of 250 mg)', times: ['08:00', '20:00'], durationDays: 5, howOften: 'Twice a day for 5 days' } },
      { maxMonths: Y(12), s: CLINICIAN('For children 5–12 years the dose depends on weight — follow the prescription.') },
      { maxMonths: INF, s: { dose: '500 mg (1 capsule)', times: ['07:00', '14:00', '21:00'], durationDays: 5, howOften: 'Three times a day for 5–7 days' } },
    ],
  },
  albendazole: {
    label: 'Albendazole (deworming)',
    bands: [
      { maxMonths: 12, s: CLINICIAN('Deworming is not routinely given under 1 year.') },
      { maxMonths: Y(2), s: { dose: '200 mg (½ tablet of 400 mg)', times: ['08:00'], durationDays: 1, howOften: 'Single dose (usually every 6 months)' } },
      { maxMonths: INF, s: { dose: '400 mg (1 tablet)', times: ['08:00'], durationDays: 1, howOften: 'Single dose (usually every 6 months)' } },
    ],
  },
  zinc: {
    label: 'Zinc (for diarrhoea)',
    bands: [
      { maxMonths: 2, s: CLINICIAN('Babies under 2 months with diarrhoea must be seen by a health worker.') },
      { maxMonths: 6, s: { dose: '10 mg (½ tablet of 20 mg)', times: ['08:00'], durationDays: 10, howOften: 'Once a day for 10 days' } },
      { maxMonths: Y(5), s: { dose: '20 mg (1 tablet)', times: ['08:00'], durationDays: 10, howOften: 'Once a day for 10 days' } },
      { maxMonths: INF, s: CLINICIAN('Zinc for diarrhoea is a standard dose for children under 5 — older people should follow the prescription.') },
    ],
  },
  ors: {
    label: 'ORS (oral rehydration salts)',
    bands: [
      { maxMonths: Y(2), s: { dose: '50–100 ml (¼–½ cup) after each loose stool', howOften: 'After every loose stool, plus keep breastfeeding' } },
      { maxMonths: Y(10), s: { dose: '100–200 ml (½–1 cup) after each loose stool', howOften: 'After every loose stool' } },
      { maxMonths: INF, s: { dose: 'As much as wanted', howOften: 'After every loose stool, until diarrhoea stops' } },
    ],
  },
  cotrimoxazole: {
    label: 'Cotrimoxazole (Septrin) — daily prophylaxis',
    bands: [
      { maxMonths: 6, s: { dose: '120 mg', times: ['08:00'], howOften: 'Once a day, ongoing (HIV prophylaxis)', note: 'Prophylaxis dose. Treatment doses for infections are different — follow the prescription.' } },
      { maxMonths: Y(5), s: { dose: '240 mg', times: ['08:00'], howOften: 'Once a day, ongoing (HIV prophylaxis)', note: 'Prophylaxis dose. Treatment doses for infections are different — follow the prescription.' } },
      { maxMonths: Y(14), s: { dose: '480 mg (1 single-strength tablet)', times: ['08:00'], howOften: 'Once a day, ongoing (HIV prophylaxis)', note: 'Prophylaxis dose. Treatment doses for infections are different — follow the prescription.' } },
      { maxMonths: INF, s: { dose: '960 mg (1 double-strength tablet)', times: ['08:00'], howOften: 'Once a day, ongoing (HIV prophylaxis)', note: 'Prophylaxis dose. Treatment doses for infections are different — follow the prescription.' } },
    ],
  },
};

export function ageInMonths(dob: string, on: Date = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number);
  let months = (on.getFullYear() - y) * 12 + (on.getMonth() + 1 - m);
  if (on.getDate() < d) months -= 1;
  return Math.max(0, months);
}

export function doseLabel(ingredient: string): string | undefined {
  return TABLE[ingredient]?.label;
}

/** Standard dose for the person's age, or undefined if the medicine isn't in the table. */
export function suggestDose(medName: string, ageMonths: number | undefined): DoseSuggestion | undefined {
  const ingredient = ingredientsOf(medName).find((i) => TABLE[i]);
  if (!ingredient) return undefined;
  if (ageMonths === undefined) {
    return { ingredient, dose: '', howOften: '', needsClinician: true, note: 'Add a date of birth to see the standard dose for this age.' };
  }
  const band = TABLE[ingredient].bands.find((b) => ageMonths < b.maxMonths)!;
  return { ingredient, ...band.s };
}
