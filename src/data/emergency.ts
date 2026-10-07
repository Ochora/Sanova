/**
 * Emergency numbers shown on the SOS screen. 999 and 112 are Uganda's toll-free
 * police/emergency lines. Add verified ambulance / Ministry of Health hotlines here
 * before public release (the product document lists an MOH line that still needs
 * confirmation from the Ministry).
 */
export const EMERGENCY_NUMBERS: { label: string; number: string; note: string }[] = [
  { label: 'Emergency (Police)', number: '999', note: 'Toll-free, any network' },
  { label: 'Emergency', number: '112', note: 'Toll-free, works on any phone' },
];
