/**
 * Mental-health support lines in Uganda. Numbers were checked against TherapyRoute's
 * Uganda crisis-line list (verified August 2026) and findahelpline.com in October 2026.
 * Re-verify with each organisation before public launch.
 * Note: as of 2026 Uganda has no verified 24/7 general mental-health helpline —
 * for immediate danger use 999 / 112 or go to the nearest hospital.
 */
export interface SupportLine {
  id: string;
  name: string;
  what: string;
  phone?: string;
  display?: string;
  whatsapp?: string;
  hours: string;
  free: boolean;
}

export const SUPPORT_LINES: SupportLine[] = [
  {
    id: 'mhu',
    name: 'Mental Health Uganda',
    what: 'Free counselling helpline — talk to a trained counsellor',
    phone: '0800212121',
    display: '0800 21 21 21',
    whatsapp: '+256706708961',
    hours: 'Mon–Fri, 8:30am – 5:00pm',
    free: true,
  },
  {
    id: 'butabika',
    name: 'Butabika National Referral Mental Hospital',
    what: 'National mental hospital call centre — advice and referral',
    phone: '0800211306',
    display: '0800 211 306',
    hours: 'Hospital open 24/7; phone line hours may vary',
    free: true,
  },
  {
    id: 'sauti',
    name: 'Sauti 116 Child Helpline',
    what: 'For children and young people, and anyone facing abuse or violence',
    phone: '116',
    hours: '24 hours, all networks',
    free: true,
  },
  {
    id: 'fida',
    name: 'FIDA Uganda',
    what: 'Free, confidential support for women, youth and children',
    phone: '0800111511',
    display: '0800 111 511',
    hours: 'Call for hours',
    free: true,
  },
];

export const EMERGENCY_LINE = { name: 'Police / Emergency', phone: '999', alt: '112' };

