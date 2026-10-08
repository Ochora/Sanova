import { daysBetween, formatDate, toDateKey } from './dates';
import type { Visit } from './types';

export function visitText(v: Visit, patient: string): string {
  const lines = [`🏥 ${patient} — ${v.kind === 'admission' ? 'hospital admission' : 'hospital visit'}`];
  lines.push(`${v.facility}${v.ward ? `, ${v.ward}` : ''}`);
  lines.push(v.dateOut && v.dateOut !== v.dateIn ? `${formatDate(v.dateIn)} – ${formatDate(v.dateOut)}` : v.kind === 'admission' && !v.dateOut ? `Admitted ${formatDate(v.dateIn)} (still in hospital)` : formatDate(v.dateIn));
  if (v.reason) lines.push(`Reason: ${v.reason}`);
  if (v.diagnoses.length) lines.push(`Diagnosis: ${v.diagnoses.join(', ')}`);
  if (v.doctors.length) lines.push(`Doctors: ${v.doctors.map((d) => `${d.name}${d.role ? ` (${d.role})` : ''}${d.phone ? ` ${d.phone}` : ''}`).join('; ')}`);
  if (v.tests) lines.push(`Tests: ${v.tests}`);
  if (v.treatment) lines.push(`Treatment: ${v.treatment}`);
  if (v.notes) lines.push(`Notes: ${v.notes}`);
  if (v.updates.length) {
    lines.push('', 'Updates:');
    for (const u of v.updates) lines.push(`• ${formatDate(u.date)}: ${u.text}${u.by ? ` — ${u.by}` : ''}`);
  }
  if (v.followUp) lines.push(`Follow-up: ${formatDate(v.followUp)}`);
  lines.push('', 'Shared from the Sanova health app.');
  return lines.join('\n');
}


export function isAdmitted(v: Visit): boolean {
  return v.kind === 'admission' && !v.dateOut;
}

export function admittedDay(v: Visit, today: string = toDateKey()): number {
  return daysBetween(v.dateIn, today) + 1;
}

export const VISIT_EMOJI: Record<Visit['kind'], string> = { admission: '🛏️', outpatient: '🩺', emergency: '🚑', other: '📋' };
