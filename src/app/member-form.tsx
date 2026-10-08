import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { isValidDateKey } from '../lib/dates';
import { splitList } from '../lib/id';
import { cancelIds } from '../lib/notifications';
import { useStore } from '../lib/store';
import type { Sex } from '../lib/types';
import { Button, Chip, ChipRow, Field, Screen } from '../ui/components';
import { SupportFields, type SupportValue } from '../ui/SupportFields';
import { space } from '../ui/theme';

const RELATIONS = ['Child', 'Mother', 'Father', 'Spouse', 'Grandparent', 'Sibling', 'Other'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function MemberForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, saveMember, removeMember } = useStore();
  const existing = data.members.find((m) => m.id === id);
  const isSelf = existing?.relationship === 'self';

  const [name, setName] = useState(existing?.name ?? '');
  const [relationship, setRelationship] = useState(existing?.relationship ?? 'Child');
  const [dob, setDob] = useState(existing?.dob ?? '');
  const [sex, setSex] = useState<Sex | undefined>(existing?.sex);
  const [blood, setBlood] = useState(existing?.bloodGroup);
  const [conditions, setConditions] = useState(existing?.conditions.join(', ') ?? '');
  const [allergies, setAllergies] = useState(existing?.allergies.join(', ') ?? '');
  const [pregnant, setPregnant] = useState(!!existing?.pregnant);
  const [support, setSupport] = useState<SupportValue>({
    disabilities: existing?.disabilities ?? [],
    assistive: existing?.assistive ?? '',
    supportNeeds: existing?.supportNeeds ?? '',
  });
  const [insProvider, setInsProvider] = useState(existing?.insurance?.provider ?? '');
  const [insNumber, setInsNumber] = useState(existing?.insurance?.number ?? '');

  const save = () => {
    if (!name.trim()) return Alert.alert('Name needed', 'Please enter a name.');
    if (dob && !isValidDateKey(dob)) return Alert.alert('Date of birth', 'Use the format YYYY-MM-DD, e.g. 2019-03-14.');
    const saved = saveMember({
      ...(existing ?? {}),
      id: existing?.id,
      name: name.trim(),
      relationship: isSelf ? 'self' : relationship,
      dob: dob || undefined,
      sex,
      bloodGroup: blood,
      conditions: splitList(conditions),
      allergies: splitList(allergies),
      pregnant: sex === 'female' ? pregnant : undefined,
      disabilities: support.disabilities,
      assistive: support.assistive.trim() || undefined,
      supportNeeds: support.supportNeeds.trim() || undefined,
      insurance: insProvider.trim() ? { provider: insProvider.trim(), number: insNumber.trim() || undefined } : undefined,
    });
    const hasJourney = data.pregnancies.some((p) => p.memberId === saved.id && p.status === 'active');
    if (sex === 'female' && pregnant && !hasJourney) {
      router.replace({ pathname: '/pregnancy/setup', params: { memberId: saved.id } });
      return;
    }
    router.back();
  };

  const remove = () =>
    Alert.alert('Remove family member?', `${existing?.name}'s medicines, check-ins and records on this phone will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await cancelIds([
            ...data.medications.filter((m) => m.memberId === existing!.id).flatMap((m) => m.notificationIds),
            ...data.pregnancies.filter((p) => p.memberId === existing!.id).flatMap((p) => p.notificationIds),
            ...data.visits.filter((v) => v.memberId === existing!.id).flatMap((v) => v.notificationIds),
            ...(data.childCare[existing!.id]?.notificationIds ?? []),
          ]);
          removeMember(existing!.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: isSelf ? 'My health profile' : existing ? 'Edit family member' : 'Add family member' }} />
      <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
      {!isSelf && (
        <>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Relationship to you</Text>
          <ChipRow>
            {RELATIONS.map((r) => (
              <Chip key={r} label={r} selected={relationship === r} onPress={() => setRelationship(r)} />
            ))}
          </ChipRow>
          <View style={{ height: space(4) }} />
        </>
      )}
      <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" hint="Important for children — check-in advice changes for under-5s." />
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Sex</Text>
      <ChipRow>
        <Chip label="Female" selected={sex === 'female'} onPress={() => setSex('female')} />
        <Chip label="Male" selected={sex === 'male'} onPress={() => setSex('male')} />
      </ChipRow>
      {sex === 'female' && (
        <>
          <Text style={{ fontSize: 14, fontWeight: '600', marginTop: space(4), marginBottom: 6 }}>Currently pregnant?</Text>
          <Text style={{ fontSize: 13, color: '#5F6B67', marginBottom: 6 }}>Choosing "Yes" lets Sanova guide the pregnancy week by week.</Text>
          <ChipRow>
            <Chip label="No" selected={!pregnant} onPress={() => setPregnant(false)} />
            <Chip label="Yes" selected={pregnant} onPress={() => setPregnant(true)} />
          </ChipRow>
        </>
      )}
      <Text style={{ fontSize: 14, fontWeight: '600', marginTop: space(4), marginBottom: 6 }}>Blood group</Text>
      <ChipRow>
        {BLOOD.map((b) => (
          <Chip key={b} label={b} selected={blood === b} onPress={() => setBlood(blood === b ? undefined : b)} />
        ))}
      </ChipRow>
      <View style={{ height: space(4) }} />
      <Field label="Known conditions" value={conditions} onChangeText={setConditions} placeholder="Separate with commas" />
      <Field label="Allergies" value={allergies} onChangeText={setAllergies} placeholder="e.g. Penicillin" />
      <SupportFields value={support} onChange={setSupport} who={isSelf ? 'you' : name.split(' ')[0] || 'them'} />
      <View style={{ height: space(5) }} />
      <Field label="Health insurance (optional)" value={insProvider} onChangeText={setInsProvider} placeholder="e.g. Jubilee, AAR, CIC, NHIS" />
      {insProvider.trim() ? <Field label="Membership number" value={insNumber} onChangeText={setInsNumber} placeholder="Card number" /> : null}
      <Button title="Save" icon="checkmark" onPress={save} />
      {existing && !isSelf && <Button title="Remove from family" variant="ghost" icon="trash" onPress={remove} style={{ marginTop: space(2) }} />}
    </Screen>
  );
}
