/**
 * Moving one person's health data between phones.
 *
 * A ".sanova" file holds everything about ONE person (profile, medicines and dose history,
 * check-ins, mood logs, records incl. photos, expenses). Parents/guardians export a child's
 * profile; when the child gets their own phone they import it at sign-up and it becomes theirs.
 */
import { adherence, isActiveOn } from './adherence';
import { ageInYears, formatDate, formatTime12, toDateKey } from './dates';
import { uid } from './id';
import { LEVEL_META, SYMPTOM_BY_ID } from './triage';
import type { AppData, CheckIn, DoseLog, EmergencyContact, Expense, HealthRecord, Medication, Member, MoodLog } from './types';

export const BUNDLE_FORMAT = 'sanova.profile';

export interface PortableRecord extends Omit<HealthRecord, 'imageUri'> {
  imageBase64?: string;
  imageExt?: string;
}

export interface SanovaBundle {
  format: typeof BUNDLE_FORMAT;
  version: 1;
  exportedAt: string;
  exportedBy?: string;
  member: Member;
  medications: Medication[];
  doseLogs: DoseLog[];
  checkIns: CheckIn[];
  moodLogs: MoodLog[];
  records: PortableRecord[];
  expenses: Expense[];
  contacts: EmergencyContact[];
}

export interface BundleOptions {
  includeMood?: boolean;
  includeExpenses?: boolean;
  guardian?: { name: string; phone: string };
}

/** Everything about one member, without photos (the caller attaches them). */
export function buildBundle(data: AppData, memberId: string, opts: BundleOptions = {}): SanovaBundle {
  const member = data.members.find((m) => m.id === memberId);
  if (!member) throw new Error('Member not found');
  const meds = data.medications.filter((m) => m.memberId === memberId);
  const medIds = new Set(meds.map((m) => m.id));
  const self = data.members.find((m) => m.relationship === 'self');
  return {
    format: BUNDLE_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: self && self.id !== memberId ? self.name : undefined,
    member: { ...member },
    medications: meds.map((m) => ({ ...m, notificationIds: [] })),
    doseLogs: data.doseLogs.filter((l) => medIds.has(l.medId)),
    checkIns: data.checkIns.filter((c) => c.memberId === memberId),
    moodLogs: opts.includeMood === false ? [] : data.moodLogs.filter((c) => c.memberId === memberId),
    records: data.records.filter((r) => r.memberId === memberId).map(({ imageUri, ...r }) => ({ ...r })),
    expenses: opts.includeExpenses === false ? [] : data.expenses.filter((e) => e.memberId === memberId),
    contacts: opts.guardian?.phone
      ? [{ id: uid('c_'), name: opts.guardian.name, phone: opts.guardian.phone, relationship: 'Parent / guardian' }]
      : [],
  };
}

export function parseBundle(text: string): SanovaBundle {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a Sanova profile file.");
  }
  const b = obj as Partial<SanovaBundle>;
  if (b?.format !== BUNDLE_FORMAT || b.version !== 1 || !b.member?.name) {
    throw new Error("This file isn't a Sanova profile file, or it was made by a newer version of Sanova.");
  }
  return {
    format: BUNDLE_FORMAT,
    version: 1,
    exportedAt: b.exportedAt ?? '',
    exportedBy: b.exportedBy,
    member: { ...b.member, conditions: b.member.conditions ?? [], allergies: b.member.allergies ?? [] },
    medications: b.medications ?? [],
    doseLogs: b.doseLogs ?? [],
    checkIns: b.checkIns ?? [],
    moodLogs: b.moodLogs ?? [],
    records: b.records ?? [],
    expenses: b.expenses ?? [],
    contacts: b.contacts ?? [],
  };
}

export interface ImportResult {
  data: AppData;
  memberId: string;
  /** New record id → photo to write to disk. */
  photos: { recordId: string; base64: string; ext: string }[];
}

/**
 * Merge a bundle into this phone's data with fresh IDs.
 * `asSelf` = the person is taking ownership of their own profile (e.g. a child on their own phone).
 */
export function importBundle(data: AppData, bundle: SanovaBundle, asSelf: boolean, relationship = 'Child'): ImportResult {
  const memberId = uid('m_');
  const medMap = new Map<string, string>();
  for (const m of bundle.medications) medMap.set(m.id, uid('med_'));
  const photos: ImportResult['photos'] = [];

  const member: Member = { ...bundle.member, id: memberId, relationship: asSelf ? 'self' : relationship };
  const members = asSelf
    ? [member, ...data.members.filter((m) => m.relationship !== 'self')]
    : [...data.members, member];

  const records: HealthRecord[] = bundle.records.map(({ imageBase64, imageExt, ...r }) => {
    const id = uid('r_');
    if (imageBase64) photos.push({ recordId: id, base64: imageBase64, ext: imageExt || '.jpg' });
    return { ...r, id, memberId };
  });

  const existingPhones = new Set(data.contacts.map((c) => c.phone.replace(/\D/g, '')));
  const contacts = asSelf
    ? [...data.contacts, ...bundle.contacts.filter((c) => !existingPhones.has(c.phone.replace(/\D/g, ''))).map((c) => ({ ...c, id: uid('c_') }))]
    : data.contacts;

  return {
    memberId,
    photos,
    data: {
      ...data,
      onboarded: asSelf ? true : data.onboarded,
      members,
      contacts,
      medications: [
        ...data.medications,
        ...bundle.medications.map((m) => ({ ...m, id: medMap.get(m.id)!, memberId, notificationIds: [] })),
      ],
      doseLogs: [
        ...data.doseLogs,
        ...bundle.doseLogs.filter((l) => medMap.has(l.medId)).map((l) => ({ ...l, medId: medMap.get(l.medId)! })),
      ],
      checkIns: [...data.checkIns, ...bundle.checkIns.map((c) => ({ ...c, id: uid('ci_'), memberId }))],
      moodLogs: [...data.moodLogs, ...bundle.moodLogs.map((c) => ({ ...c, id: uid('mo_'), memberId }))],
      records: [...data.records, ...records],
      expenses: [...data.expenses, ...bundle.expenses.map((e) => ({ ...e, id: uid('e_'), memberId }))],
    },
  };
}

export interface SummaryOptions {
  medicines: boolean;
  conditions: boolean;
  recentCheckIns: boolean;
  adherence: boolean;
}

/** A readable health summary for WhatsApp/SMS/email. Mood/mental-health data is never included. */
export function healthSummary(data: AppData, memberId: string, opts: SummaryOptions, now: Date = new Date()): string {
  const m = data.members.find((x) => x.id === memberId);
  if (!m) return '';
  const today = toDateKey(now);
  const lines: string[] = [`🩺 Health summary — ${m.name}`];
  const bits = [m.dob ? `${ageInYears(m.dob, today)} yrs` : null, m.sex, m.bloodGroup ? `Blood group ${m.bloodGroup}` : null].filter(Boolean);
  if (bits.length) lines.push(bits.join(' · '));
  if (m.pregnant) lines.push('Currently pregnant');
  if (opts.conditions) {
    lines.push(`Allergies: ${m.allergies.length ? m.allergies.join(', ') : 'none known'}`);
    if (m.conditions.length) lines.push(`Conditions: ${m.conditions.join(', ')}`);
  }
  const meds = data.medications.filter((x) => x.memberId === memberId && isActiveOn(x, today));
  if (opts.medicines) {
    lines.push('', '💊 Current medicines:');
    if (!meds.length) lines.push('• None');
    for (const x of meds) {
      lines.push(`• ${x.name} — ${x.dose} at ${x.times.map(formatTime12).join(', ')}${x.reason ? ` (for ${x.reason})` : ''}${x.prescriber ? ` · by ${x.prescriber}` : ''}`);
    }
  }
  if (opts.adherence && meds.length) {
    const a = adherence(meds, data.doseLogs, 7, now);
    if (a.rate !== null) lines.push(`Last 7 days: ${Math.round(a.rate * 100)}% of doses taken (${a.missed} missed).`);
  }
  if (opts.recentCheckIns) {
    const recent = data.checkIns.filter((c) => c.memberId === memberId).slice(-3).reverse();
    if (recent.length) {
      lines.push('', '📋 Recent check-ins:');
      for (const c of recent) {
        const s = c.symptoms.map((id) => SYMPTOM_BY_ID[id]?.label ?? id).join(', ') || 'no symptoms';
        lines.push(`• ${formatDate(c.date)}: ${LEVEL_META[c.level].label} — ${s}${c.temperature ? `, ${c.temperature}°C` : ''}`);
      }
    }
  }
  lines.push('', `Shared from the Sanova health app on ${formatDate(today)}.`);
  return lines.join('\n');
}
