/**
 * A small, curated set of well-established medicine safety checks relevant in Uganda.
 * This is NOT a complete interaction database — the full version will sync with the
 * National Drug Authority register and a licensed interaction source. Every warning tells
 * the user to confirm with a pharmacist or clinician; none tells them to stop a medicine.
 */

/** Generic ingredient → names people actually type (generic + common brands/regimens). */
const INGREDIENTS: Record<string, string[]> = {
  rifampicin: ['rifampicin', 'rifampin', 'rhze', 'rhz', ' rh ', 'rifinah', 'tb tablets', 'tb drugs'],
  dolutegravir: ['dolutegravir', 'dtg', ' tld', 'tivicay'],
  efavirenz: ['efavirenz', 'efv', ' tle '],
  nevirapine: ['nevirapine', 'nvp'],
  lopinavir: ['lopinavir', 'aluvia', 'kaletra', 'lpv'],
  'artemether-lumefantrine': ['artemether', 'lumefantrine', 'coartem', 'lonart', ' al '],
  cotrimoxazole: ['cotrimoxazole', 'co-trimoxazole', 'septrin', 'bactrim', 'sulfamethoxazole'],
  'sulfadoxine-pyrimethamine': ['sulfadoxine', 'fansidar', ' sp ', 'iptp'],
  warfarin: ['warfarin'],
  aspirin: ['aspirin'],
  nsaid: ['ibuprofen', 'brufen', 'diclofenac', 'cataflam', 'naproxen', 'indomethacin', 'piroxicam'],
  metronidazole: ['metronidazole', 'flagyl'],
  fluconazole: ['fluconazole', 'diflucan'],
  'hormonal contraceptive': ['contraceptive', 'family planning pill', 'microgynon', 'implant', 'jadelle', 'implanon', 'depo', 'sayana', 'microlut'],
  sildenafil: ['sildenafil', 'viagra', 'tadalafil'],
  nitrate: ['isosorbide', 'glyceryl trinitrate', 'nitroglycerin', 'gtn'],
  methotrexate: ['methotrexate'],
  ciprofloxacin: ['ciprofloxacin', 'cipro'],
  'antacid/iron/calcium': ['antacid', 'magnesium', 'ferrous', 'iron', 'calcium', 'relcer', 'gaviscon'],
  simvastatin: ['simvastatin'],
  clarithromycin: ['clarithromycin'],
  metformin: ['metformin', 'glucophage'],
  doxycycline: ['doxycycline'],
  amoxicillin: ['amoxicillin', 'amoxyl', 'augmentin', 'amoxiclav'],
  penicillin: ['penicillin', 'ampicillin', 'cloxacillin', 'flucloxacillin', 'benzylpenicillin', 'benzathine', 'ampiclox', 'pen v'],
};

export function ingredientsOf(name: string): string[] {
  const n = ` ${name.toLowerCase()} `;
  return Object.entries(INGREDIENTS)
    .filter(([, aliases]) => aliases.some((a) => n.includes(a)))
    .map(([k]) => k);
}

interface Rule {
  a: string;
  b: string;
  severity: 'serious' | 'caution';
  message: string;
}

const RULES: Rule[] = [
  { a: 'rifampicin', b: 'dolutegravir', severity: 'serious', message: 'Rifampicin lowers dolutegravir levels. The dolutegravir dose usually needs adjusting — confirm with your clinician.' },
  { a: 'rifampicin', b: 'hormonal contraceptive', severity: 'serious', message: 'Rifampicin can make hormonal family planning (pills, implants) less effective. Ask about extra or alternative protection.' },
  { a: 'rifampicin', b: 'nevirapine', severity: 'serious', message: 'Rifampicin and nevirapine are generally not used together. Confirm your regimen with your clinician.' },
  { a: 'rifampicin', b: 'lopinavir', severity: 'serious', message: 'Rifampicin strongly lowers lopinavir/ritonavir levels. Your clinician needs to review this combination.' },
  { a: 'efavirenz', b: 'artemether-lumefantrine', severity: 'caution', message: 'Efavirenz can lower lumefantrine levels. Complete the full malaria course and return if fever persists.' },
  { a: 'cotrimoxazole', b: 'sulfadoxine-pyrimethamine', severity: 'serious', message: 'Do not take SP (Fansidar/IPTp) while on cotrimoxazole (Septrin) — both are sulfa drugs. Tell your antenatal clinic.' },
  { a: 'cotrimoxazole', b: 'methotrexate', severity: 'serious', message: 'Cotrimoxazole increases methotrexate toxicity. Your prescriber must review this.' },
  { a: 'warfarin', b: 'aspirin', severity: 'serious', message: 'Warfarin with aspirin increases bleeding risk.' },
  { a: 'warfarin', b: 'nsaid', severity: 'serious', message: 'Warfarin with painkillers like ibuprofen or diclofenac increases bleeding risk. Paracetamol is usually preferred — ask your pharmacist.' },
  { a: 'warfarin', b: 'metronidazole', severity: 'serious', message: 'Metronidazole can strongly increase the effect of warfarin (bleeding risk). Your INR may need checking.' },
  { a: 'warfarin', b: 'cotrimoxazole', severity: 'serious', message: 'Cotrimoxazole can increase the effect of warfarin (bleeding risk). Your INR may need checking.' },
  { a: 'warfarin', b: 'fluconazole', severity: 'serious', message: 'Fluconazole can increase the effect of warfarin (bleeding risk).' },
  { a: 'sildenafil', b: 'nitrate', severity: 'serious', message: 'Sildenafil/tadalafil with nitrates can cause a dangerous drop in blood pressure. Do not combine.' },
  { a: 'simvastatin', b: 'clarithromycin', severity: 'serious', message: 'Clarithromycin raises simvastatin levels and the risk of muscle damage. Ask your prescriber.' },
  { a: 'ciprofloxacin', b: 'antacid/iron/calcium', severity: 'caution', message: 'Antacids, iron and calcium reduce ciprofloxacin absorption. Take ciprofloxacin at least 2 hours before or 6 hours after them.' },
  { a: 'doxycycline', b: 'antacid/iron/calcium', severity: 'caution', message: 'Antacids, iron and calcium reduce doxycycline absorption. Separate the doses by 2–3 hours.' },
];

export interface DrugWarning {
  severity: 'serious' | 'caution';
  message: string;
  with?: string;
}

export function interactionWarnings(newName: string, existingNames: string[]): DrugWarning[] {
  const mine = ingredientsOf(newName);
  const out: DrugWarning[] = [];
  for (const other of existingNames) {
    const theirs = ingredientsOf(other);
    for (const r of RULES) {
      const hit = (mine.includes(r.a) && theirs.includes(r.b)) || (mine.includes(r.b) && theirs.includes(r.a));
      if (hit && !out.some((w) => w.message === r.message)) out.push({ severity: r.severity, message: r.message, with: other });
    }
  }
  return out;
}

/** Allergy → ingredient groups that should trigger a warning. */
const ALLERGY_CLASSES: { match: string[]; ingredients: string[]; label: string }[] = [
  { match: ['penicillin', 'amoxicillin', 'ampicillin'], ingredients: ['penicillin', 'amoxicillin'], label: 'penicillin-type antibiotic' },
  { match: ['sulfa', 'sulpha', 'sulphonamide', 'sulfonamide', 'septrin', 'cotrimoxazole'], ingredients: ['cotrimoxazole', 'sulfadoxine-pyrimethamine'], label: 'sulfa medicine' },
  { match: ['aspirin', 'nsaid', 'ibuprofen', 'diclofenac'], ingredients: ['aspirin', 'nsaid'], label: 'aspirin/NSAID painkiller' },
];

export function allergyWarnings(medName: string, allergies: string[]): DrugWarning[] {
  const mine = ingredientsOf(medName);
  const lowerName = medName.toLowerCase();
  const out: DrugWarning[] = [];
  for (const allergy of allergies) {
    const a = allergy.toLowerCase().trim();
    if (!a) continue;
    const cls = ALLERGY_CLASSES.find((c) => c.match.some((m) => a.includes(m)));
    if ((cls && mine.some((i) => cls.ingredients.includes(i))) || (a.length >= 4 && lowerName.includes(a))) {
      out.push({
        severity: 'serious',
        message: `Allergy alert: you recorded an allergy to "${allergy}" and ${medName} ${cls ? `is a ${cls.label}` : 'may contain it'}. Do not start it until a clinician or pharmacist confirms it is safe.`,
      });
    }
  }
  return out;
}

const TIPS: Record<string, string> = {
  metronidazole: 'Avoid alcohol while taking metronidazole and for at least 2 days after the last dose.',
  'artemether-lumefantrine': 'Take with food or milk (some fat helps absorption) and finish the full 3-day course even if you feel better.',
  rifampicin: 'Take on an empty stomach. Orange-red urine, sweat or tears is expected and harmless.',
  ciprofloxacin: 'Avoid taking with milk alone, antacids or iron. Drink plenty of water.',
  doxycycline: 'Swallow with a full glass of water and stay upright for 30 minutes. It can make you sunburn easily.',
  metformin: 'Take with or just after meals to reduce stomach upset.',
  cotrimoxazole: 'Drink plenty of water. Stop and seek care urgently if you develop a skin rash or peeling.',
  nsaid: 'Take after food. Avoid if you have stomach ulcers, kidney problems or are in late pregnancy unless a clinician advises.',
  efavirenz: 'Often taken at bedtime; vivid dreams or dizziness in the first weeks are common.',
  dolutegravir: 'Take iron, calcium or antacids at least 2 hours after (or 6 hours before) dolutegravir unless taken together with food.',
};

export function medicationTips(name: string): string[] {
  return ingredientsOf(name)
    .map((i) => TIPS[i])
    .filter(Boolean);
}
