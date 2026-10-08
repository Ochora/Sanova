import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SEED_FACILITIES } from '../data/facilities';
import { syncVisitReminders } from '../lib/careReminders';
import { isValidDateKey, toDateKey } from '../lib/dates';
import { uid } from '../lib/id';
import { useStore } from '../lib/store';
import type { Doctor, Visit, VisitKind } from '../lib/types';
import { haptic } from '../ui/Choice';
import { Button, Chip, ChipRow, Field, Screen, SectionTitle } from '../ui/components';
import { MemberPicker } from '../ui/MemberPicker';
import { colors, radius, space, type } from '../ui/theme';

const KINDS: { id: VisitKind; label: string; emoji: string }[] = [
  { id: 'admission', label: 'Admitted (inpatient)', emoji: '🛏️' },
  { id: 'outpatient', label: 'Clinic / outpatient', emoji: '🩺' },
  { id: 'emergency', label: 'Emergency', emoji: '🚑' },
  { id: 'other', label: 'Other', emoji: '📋' },
];

export default function VisitForm() {
  const { id, memberId: paramMember } = useLocalSearchParams<{ id?: string; memberId?: string }>();
  const { data, self, saveVisit, removeVisit } = useStore();
  const existing = data.visits.find((v) => v.id === id);
  const [memberId, setMemberId] = useState<string | undefined>(existing?.memberId ?? paramMember ?? self?.id);
  const [kind, setKind] = useState<VisitKind>(existing?.kind ?? 'admission');
  const [facility, setFacility] = useState(existing?.facility ?? '');
  const [ward, setWard] = useState(existing?.ward ?? '');
  const [dateIn, setDateIn] = useState(existing?.dateIn ?? toDateKey());
  const [stillIn, setStillIn] = useState(existing ? !existing.dateOut : true);
  const [dateOut, setDateOut] = useState(existing?.dateOut ?? '');
  const [reason, setReason] = useState(existing?.reason ?? '');
  const [diagnoses, setDiagnoses] = useState<string[]>(existing?.diagnoses ?? []);
  const [diagInput, setDiagInput] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>(existing?.doctors.length ? existing.doctors : [{ name: '' }]);
  const [tests, setTests] = useState(existing?.tests ?? '');
  const [treatment, setTreatment] = useState(existing?.treatment ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [followUp, setFollowUp] = useState(existing?.followUp ?? '');
  const [recordedBy, setRecordedBy] = useState(existing?.recordedBy ?? self?.name ?? '');

  const member = data.members.find((m) => m.id === memberId);
  const facilityHints = facility.trim().length >= 2
    ? [...data.facilities, ...SEED_FACILITIES].filter((f) => f.name.toLowerCase().includes(facility.trim().toLowerCase()) && f.name !== facility).slice(0, 3)
    : [];

  const addDiagnosis = () => {
    const d = diagInput.trim();
    if (!d) return;
    if (!diagnoses.includes(d)) setDiagnoses([...diagnoses, d]);
    setDiagInput('');
  };

  const setDoctor = (i: number, patch: Partial<Doctor>) => setDoctors((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const save = async () => {
    if (!memberId) return;
    if (!facility.trim()) return Alert.alert('Hospital or clinic', 'Enter where the visit was.');
    if (!isValidDateKey(dateIn)) return Alert.alert('Date', 'Use the format YYYY-MM-DD.');
    const isAdmission = kind === 'admission';
    const out = isAdmission ? (stillIn ? undefined : dateOut) : dateOut || dateIn;
    if (out && (!isValidDateKey(out) || out < dateIn)) return Alert.alert('Discharge date', 'Check the discharge date.');
    if (followUp && !isValidDateKey(followUp)) return Alert.alert('Follow-up date', 'Use the format YYYY-MM-DD.');
    const pending = diagInput.trim();
    const v: Visit = {
      id: existing?.id ?? uid('v_'),
      memberId,
      kind,
      facility: facility.trim(),
      ward: ward.trim() || undefined,
      dateIn,
      dateOut: out || undefined,
      reason: reason.trim() || undefined,
      diagnoses: pending && !diagnoses.includes(pending) ? [...diagnoses, pending] : diagnoses,
      doctors: doctors.filter((d) => d.name.trim()).map((d) => ({ name: d.name.trim(), role: d.role?.trim() || undefined, phone: d.phone?.trim() || undefined })),
      tests: tests.trim() || undefined,
      treatment: treatment.trim() || undefined,
      notes: notes.trim() || undefined,
      followUp: followUp || undefined,
      recordedBy: recordedBy.trim() || undefined,
      updates: existing?.updates ?? [],
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      notificationIds: existing?.notificationIds ?? [],
    };
    saveVisit(v);
    const ids = await syncVisitReminders(v, member);
    saveVisit({ ...v, notificationIds: ids });
    if (existing) router.back();
    else router.replace({ pathname: '/visit/[id]', params: { id: v.id } });
  };

  const remove = () =>
    Alert.alert('Delete this visit?', 'Linked photos stay in Records.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeVisit(existing!.id);
          router.replace('/records');
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Edit visit' : 'Record a hospital visit' }} />
      {data.members.length > 1 && <Text style={[type.label, { marginBottom: space(2) }]}>Who is the patient?</Text>}
      <MemberPicker value={memberId} onChange={(v) => v && setMemberId(v)} />

      <View style={styles.kinds}>
        {KINDS.map((k) => (
          <Pressable key={k.id} onPress={() => { haptic(); setKind(k.id); }} style={[styles.kind, kind === k.id && styles.kindOn]}>
            <Text style={{ fontSize: 22 }}>{k.emoji}</Text>
            <Text style={[styles.kindText, kind === k.id && { color: colors.hospital, fontWeight: '800' }]}>{k.label}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="Hospital or clinic" value={facility} onChangeText={setFacility} placeholder="e.g. Mulago National Referral Hospital" />
      {facilityHints.length > 0 && (
        <View style={{ marginTop: -space(3), marginBottom: space(3) }}>
          <ChipRow>
            {facilityHints.map((f) => (
              <Chip key={f.id} label={f.name} icon="business" onPress={() => setFacility(f.name)} />
            ))}
          </ChipRow>
        </View>
      )}
      {kind === 'admission' && <Field label="Ward / bed (optional)" value={ward} onChangeText={setWard} placeholder="e.g. Ward 5B, bed 12" />}
      <Field label={kind === 'admission' ? 'Date admitted' : 'Date of visit'} value={dateIn} onChangeText={setDateIn} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
      {kind === 'admission' && (
        <>
          <ChipRow>
            <Chip label="Still in hospital" selected={stillIn} onPress={() => setStillIn(true)} color={colors.hospital} />
            <Chip label="Discharged" selected={!stillIn} onPress={() => { setStillIn(false); if (!dateOut) setDateOut(toDateKey()); }} color={colors.hospital} />
          </ChipRow>
          <View style={{ height: space(3) }} />
          {!stillIn && <Field label="Date discharged" value={dateOut} onChangeText={setDateOut} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />}
        </>
      )}
      <Field label="Why did they go? (symptoms)" value={reason} onChangeText={setReason} multiline placeholder="e.g. High fever and vomiting for 2 days" />

      <SectionTitle>What the doctors found</SectionTitle>
      <Text style={styles.label}>Diagnosis</Text>
      {diagnoses.length > 0 && (
        <View style={{ marginBottom: space(2) }}>
          <ChipRow>
            {diagnoses.map((d) => (
              <Chip key={d} label={`${d}  ✕`} selected color={colors.hospital} onPress={() => setDiagnoses(diagnoses.filter((x) => x !== d))} />
            ))}
          </ChipRow>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: space(4) }}>
        <TextInput value={diagInput} onChangeText={setDiagInput} onSubmitEditing={addDiagnosis} placeholder="e.g. Severe malaria" placeholderTextColor={colors.faint} style={[styles.input, { flex: 1 }]} />
        <Button small title="Add" onPress={addDiagnosis} style={{ backgroundColor: colors.hospital, borderColor: colors.hospital }} />
      </View>

      <Text style={styles.label}>Doctors / health workers</Text>
      {doctors.map((d, i) => (
        <View key={i} style={styles.doctor}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="person-circle" size={22} color={colors.hospital} />
            <TextInput value={d.name} onChangeText={(t) => setDoctor(i, { name: t })} placeholder="Name, e.g. Dr. Namuli Sarah" placeholderTextColor={colors.faint} style={[styles.input, { flex: 1 }]} />
            {doctors.length > 1 && (
              <Pressable onPress={() => setDoctors(doctors.filter((_, j) => j !== i))} hitSlop={10}>
                <Ionicons name="close-circle" size={22} color={colors.faint} />
              </Pressable>
            )}
          </View>
          <TextInput value={d.role ?? ''} onChangeText={(t) => setDoctor(i, { role: t })} placeholder="Role, e.g. Paediatrician, nurse, surgeon" placeholderTextColor={colors.faint} style={[styles.input, { marginTop: 8 }]} />
          <TextInput value={d.phone ?? ''} onChangeText={(t) => setDoctor(i, { phone: t })} placeholder="Phone number (optional)" keyboardType="phone-pad" placeholderTextColor={colors.faint} style={[styles.input, { marginTop: 8 }]} />
        </View>
      ))}
      <Button small variant="ghost" icon="add" title="Add another doctor / nurse" onPress={() => setDoctors([...doctors, { name: '' }])} style={{ alignSelf: 'flex-start', paddingHorizontal: 0, marginBottom: space(3) }} />

      <Field label="Tests done & results" value={tests} onChangeText={setTests} multiline placeholder="e.g. Malaria RDT positive, Hb 8.2, chest X-ray clear" />
      <Field label="Treatment given" value={treatment} onChangeText={setTreatment} multiline placeholder="e.g. IV artesunate, blood transfusion, oxygen" />
      <Field label="Other notes" value={notes} onChangeText={setNotes} multiline placeholder="Anything the doctor said to remember" />
      <Field label="Follow-up / review date (optional)" value={followUp} onChangeText={setFollowUp} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" hint="Sanova will remind you the day before." />
      <Field label="Recorded by" value={recordedBy} onChangeText={setRecordedBy} placeholder="Your name" hint="Useful when a caregiver records on the patient's behalf." />

      <Button title={existing ? 'Save changes' : 'Save visit'} icon="checkmark" onPress={save} style={{ backgroundColor: colors.hospital, borderColor: colors.hospital }} />
      {existing && <Button title="Delete visit" variant="ghost" icon="trash" onPress={remove} style={{ marginTop: space(2) }} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginBottom: space(4) },
  kind: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: space(3), borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  kindOn: { borderColor: colors.hospital, backgroundColor: colors.hospitalSoft },
  kindText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: 10, fontSize: 15, color: colors.text },
  doctor: { backgroundColor: colors.bg, borderRadius: radius.md, padding: space(3), marginBottom: space(2), borderWidth: 1, borderColor: colors.border },
});
