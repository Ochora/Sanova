/**
 * Disability and support needs. Categories follow the functional domains used by the
 * Washington Group questions and the Persons with Disabilities Act 2020 (Uganda), in plain words.
 * People choose what to share; nothing here is required.
 */
import type { Member } from './types';

export interface DisabilityType {
  id: string;
  label: string;
  emoji: string;
  /** Short line for an emergency card / SOS message. */
  sosHint: string;
}

export const DISABILITIES: DisabilityType[] = [
  { id: 'mobility', label: 'Physical / mobility', emoji: '🦽', sosHint: 'has limited mobility — may need help moving' },
  { id: 'visual', label: 'Blind / low vision', emoji: '🦯', sosHint: 'is blind or has low vision — please call and guide by voice' },
  { id: 'hearing', label: 'Deaf / hard of hearing', emoji: '🦻', sosHint: 'is Deaf or hard of hearing — please text or write, do not only call' },
  { id: 'speech', label: 'Speech / communication', emoji: '🗣️', sosHint: 'has difficulty speaking — may not be able to answer a call' },
  { id: 'intellectual', label: 'Intellectual / learning', emoji: '🧩', sosHint: 'has a learning disability — please explain simply and calmly' },
  { id: 'developmental', label: 'Autism / developmental', emoji: '🌈', sosHint: 'is autistic or has a developmental disability — a calm, quiet approach helps' },
  { id: 'psychosocial', label: 'Psychosocial (mental health)', emoji: '💭', sosHint: 'lives with a psychosocial disability — please be calm and patient' },
  { id: 'albinism', label: 'Albinism', emoji: '☀️', sosHint: 'has albinism — protect skin and eyes from the sun' },
  { id: 'epilepsy', label: 'Epilepsy / seizures', emoji: '⚡', sosHint: 'has epilepsy — may have seizures' },
  { id: 'other', label: 'Other', emoji: '➕', sosHint: 'lives with a disability' },
];

export const DISABILITY_BY_ID: Record<string, DisabilityType> = Object.fromEntries(DISABILITIES.map((d) => [d.id, d]));

export const ASSISTIVE_OPTIONS = ['Wheelchair', 'Crutches / walking stick', 'Prosthesis', 'White cane', 'Hearing aid', 'Glasses', 'Sign language (USL)', 'Braille', 'Communication board'];

export function disabilityLabels(m: Member): string[] {
  return (m.disabilities ?? []).map((id) => DISABILITY_BY_ID[id]?.label ?? id);
}

/** One line to add to an SOS message or emergency card, or '' when nothing to say. */
export function supportLine(m: Member | undefined): string {
  if (!m) return '';
  if (m.supportNeeds?.trim()) return m.supportNeeds.trim();
  const hints = (m.disabilities ?? []).map((id) => DISABILITY_BY_ID[id]?.sosHint).filter(Boolean) as string[];
  if (!hints.length) return '';
  const first = m.name.split(' ')[0];
  return `${first} ${hints.join('; ')}.`;
}

export function hasSupportInfo(m: Member | undefined): boolean {
  return !!m && ((m.disabilities?.length ?? 0) > 0 || !!m.supportNeeds?.trim() || !!m.assistive?.trim());
}
