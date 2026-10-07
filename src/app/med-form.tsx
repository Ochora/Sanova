import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { isActiveOn } from '../lib/adherence';
import { formatTime12, isValidDateKey, isValidTime, normaliseTime, timeToMinutes, toDateKey } from '../lib/dates';
import { allergyWarnings, interactionWarnings, medicationTips } from '../lib/drugs';
import { uid } from '../lib/id';
import { cancelIds, scheduleMedication } from '../lib/notifications';
import { useStore } from '../lib/store';
import type { Medication } from '../lib/types';
import { Button, Chip, ChipRow, Field, Notice, Screen, SectionTitle } from '../ui/components';
import { MemberPicker } from '../ui/MemberPicker';
import { colors, space, type } from '../ui/theme';

const FREQ: { label: string; times: string[] }[] = [
  { label: 'Once a day', times: ['08:00'] },
  { label: 'Twice a day', times: ['08:00', '20:00'] },
  { label: '3 times a day', times: ['07:00', '14:00', '21:00'] },
  { label: '4 times a day', times: ['06:00', '12:00', '18:00', '22:00'] },
];
const DURATIONS: { label: string; days?: number }[] = [
  { label: '3 days', days: 3 },
  { label: '5 days', days: 5 },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '1 month', days: 30 },
  { label: '6 months', days: 182 },
  { label: 'Ongoing', days: undefined },
];

export default function MedForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, self, saveMedication, removeMedication } = useStore();
  const existing = data.medications.find((m) => m.id === id);

  const [memberId, setMemberId] = useState<string | undefined>(existing?.memberId ?? self?.id);
  const [name, setName] = useState(existing?.name ?? '');
  const [dose, setDose] = useState(existing?.dose ?? '');
  const [times, setTimes] = useState<string[]>(existing?.times ?? ['08:00']);
  const [newTime, setNewTime] = useState('');
  const [startDate, setStartDate] = useState(existing?.startDate ?? toDateKey());
  const [durationDays, setDurationDays] = useState<number | undefined>(existing ? existing.durationDays : 7);
  const [customDays, setCustomDays] = useState('');
  const [reason, setReason] = useState(existing?.reason ?? '');
  const [prescriber, setPrescriber] = useState(existing?.prescriber ?? '');
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  const [reminders, setReminders] = useState(existing ? existing.notificationIds.length > 0 || !isActiveOn(existing, toDateKey()) : data.settings.remindersEnabled);
  const [saving, setSaving] = useState(false);

  const member = data.members.find((m) => m.id === memberId);
  const others = data.medications.filter((m) => m.memberId === memberId && m.id !== id && (isActiveOn(m, toDateKey()) || m.startDate > toDateKey()));

  const warnings = useMemo(() => {
    if (name.trim().length < 3) return [];
    return [...allergyWarnings(name, member?.allergies ?? []), ...interactionWarnings(name, others.map((o) => o.name))];
  }, [name, member, others]);
  const tips = useMemo(() => (name.trim().length >= 3 ? medicationTips(name) : []), [name]);

  const addTime = () => {
    if (!isValidTime(newTime)) return Alert.alert('Time format', 'Use 24-hour time, e.g. 07:30 or 19:00.');
    const t = normaliseTime(newTime);
    if (!times.includes(t)) setTimes([...times, t].sort((a, b) => timeToMinutes(a) - timeToMinutes(b)));
    setNewTime('');
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Medicine name', 'Please enter the medicine name.');
    if (!dose.trim()) return Alert.alert('Dose', 'Please enter the dose, e.g. "1 tablet" or "500 mg".');
    if (!times.length) return Alert.alert('Times', 'Add at least one time.');
    if (!isValidDateKey(startDate)) return Alert.alert('Start date', 'Use the format YYYY-MM-DD.');
    if (!memberId) return;

    const doSave = async () => {
      setSaving(true);
      const med: Medication = {
        id: existing?.id ?? uid('med_'),
        memberId,
        name: name.trim(),
        dose: dose.trim(),
        times,
        startDate,
        durationDays,
        reason: reason.trim() || undefined,
        prescriber: prescriber.trim() || undefined,
        instructions: instructions.trim() || undefined,
        notificationIds: [],
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      if (existing?.notificationIds.length) await cancelIds(existing.notificationIds);
      const stillRunning = isActiveOn(med, toDateKey()) || med.startDate > toDateKey();
      if (reminders && stillRunning) med.notificationIds = await scheduleMedication(med, member);
      saveMedication(med);
      setSaving(false);
      if (reminders && stillRunning && med.notificationIds.length === 0) {
        Alert.alert('Reminders are off', 'Notifications are blocked for Sanova. Turn them on in your phone settings to get medicine reminders.');
      }
      router.back();
    };

    if (warnings.some((w) => w.severity === 'serious')) {
      Alert.alert('Safety warning', warnings.map((w) => `• ${w.message}`).join('\n\n'), [
        { text: 'Go back', style: 'cancel' },
        { text: 'Save anyway', onPress: doSave },
      ]);
    } else {
      await doSave();
    }
  };

  const remove = () =>
    Alert.alert('Delete medicine?', `${existing?.name} and its dose history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (existing?.notificationIds.length) await cancelIds(existing.notificationIds);
          removeMedication(existing!.id);
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Stack.Screen options={{ title: existing ? 'Edit medicine' : 'Add medicine' }} />
        {data.members.length > 1 && <Text style={[type.label, { marginBottom: space(2) }]}>For</Text>}
        <MemberPicker value={memberId} onChange={(v) => v && setMemberId(v)} />

        <Field label="Medicine name" value={name} onChangeText={setName} placeholder="e.g. Coartem, Amoxicillin, TLD" autoCapitalize="words" />
        {warnings.map((w) => (
          <Notice key={w.message} tone={w.severity === 'serious' ? 'danger' : 'warn'}>
            {w.message}
          </Notice>
        ))}
        {tips.map((t) => (
          <Notice key={t} tone="info" icon="bulb">
            {t}
          </Notice>
        ))}
        <Field label="Dose" value={dose} onChangeText={setDose} placeholder="e.g. 1 tablet, 500 mg, 5 ml" />

        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>How often</Text>
        <ChipRow>
          {FREQ.map((f) => (
            <Chip key={f.label} label={f.label} selected={JSON.stringify(times) === JSON.stringify(f.times)} onPress={() => setTimes(f.times)} />
          ))}
        </ChipRow>
        <Text style={{ fontSize: 14, fontWeight: '600', marginTop: space(4), marginBottom: 6 }}>Reminder times</Text>
        <ChipRow>
          {times.map((t) => (
            <Chip key={t} label={`${formatTime12(t)}  ✕`} selected onPress={() => setTimes(times.filter((x) => x !== t))} />
          ))}
        </ChipRow>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: space(3) }}>
          <View style={{ flex: 1 }}>
            <Field label="Add a time (24-hour)" value={newTime} onChangeText={setNewTime} placeholder="e.g. 13:30" keyboardType="numbers-and-punctuation" onSubmitEditing={addTime} />
          </View>
          <Button small title="Add" onPress={addTime} style={{ marginTop: 26 }} />
        </View>

        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>For how long</Text>
        <ChipRow>
          {DURATIONS.map((d) => (
            <Chip key={d.label} label={d.label} selected={durationDays === d.days} onPress={() => setDurationDays(d.days)} />
          ))}
        </ChipRow>
        <View style={{ height: space(3) }} />
        <Field
          label="Or number of days"
          value={customDays}
          onChangeText={(t) => {
            setCustomDays(t);
            const n = parseInt(t, 10);
            if (n > 0) setDurationDays(n);
          }}
          keyboardType="number-pad"
          placeholder={durationDays ? String(durationDays) : 'Ongoing'}
        />
        <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />

        <SectionTitle>Details (optional)</SectionTitle>
        <Field label="What is it for?" value={reason} onChangeText={setReason} placeholder="e.g. Malaria, blood pressure" />
        <Field label="Prescribed by" value={prescriber} onChangeText={setPrescriber} placeholder="e.g. Dr. Namuli, Mengo Hospital" />
        <Field label="Special instructions" value={instructions} onChangeText={setInstructions} placeholder="e.g. Take with food" />

        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Reminders</Text>
        <ChipRow>
          <Chip label="On" icon="notifications" selected={reminders} onPress={() => setReminders(true)} />
          <Chip label="Off" icon="notifications-off" selected={!reminders} onPress={() => setReminders(false)} color={colors.muted} />
        </ChipRow>

        <Button title={existing ? 'Save changes' : 'Add medicine'} icon="checkmark" onPress={save} loading={saving} style={{ marginTop: space(6) }} />
        {existing && <Button title="Delete medicine" variant="ghost" icon="trash" onPress={remove} style={{ marginTop: space(2) }} />}
        <Text style={[type.small, { marginTop: space(4) }]}>
          Safety checks cover common interactions only. Always tell your pharmacist and clinician about every medicine you take, including herbal remedies.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
