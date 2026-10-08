import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { syncVisitReminders } from '../../lib/careReminders';
import { daysBetween, formatDate, toDateKey } from '../../lib/dates';
import { call } from '../../lib/emergency';
import { uid } from '../../lib/id';
import { useStore } from '../../lib/store';
import { visitText } from '../../lib/visits';
import { Button, Card, Chip, ChipRow, Empty, Screen, SectionTitle } from '../../ui/components';
import { colors, radius, space, type } from '../../ui/theme';

export default function VisitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, self, saveVisit } = useStore();
  const v = data.visits.find((x) => x.id === id);
  const [note, setNote] = useState('');
  if (!v) return <Empty icon="medkit" title="Visit not found" />;
  const patient = data.members.find((m) => m.id === v.memberId);
  const inHospital = v.kind === 'admission' && !v.dateOut;
  const day = daysBetween(v.dateIn, toDateKey()) + 1;
  const photos = data.records.filter((r) => r.visitId === v.id);

  const addUpdate = () => {
    const t = note.trim();
    if (!t) return;
    saveVisit({ ...v, updates: [...v.updates, { id: uid('u_'), at: new Date().toISOString(), date: toDateKey(), text: t, by: self?.name.split(' ')[0] }] });
    setNote('');
  };

  const discharge = () =>
    Alert.alert('Discharged today?', `Mark ${patient?.name.split(' ')[0] ?? 'the patient'} as discharged on ${formatDate(toDateKey())}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, discharged',
        onPress: async () => {
          const next = { ...v, dateOut: toDateKey(), updates: [...v.updates, { id: uid('u_'), at: new Date().toISOString(), date: toDateKey(), text: 'Discharged home 🏠', by: self?.name.split(' ')[0] }] };
          saveVisit(next);
          const ids = await syncVisitReminders(next, patient);
          saveVisit({ ...next, notificationIds: ids });
          Alert.alert('Glad they are home 🏠', 'Add the discharge medicines and a follow-up date so Sanova can remind you.', [
            { text: 'Later' },
            { text: 'Add follow-up', onPress: () => router.push({ pathname: '/visit-form', params: { id: v.id } }) },
          ]);
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: patient?.name.split(' ')[0] ? `${patient.name.split(' ')[0]}'s visit` : 'Hospital visit' }} />
      <View style={[styles.hero, inHospital && { backgroundColor: colors.hospital }]}>
        <Text style={{ fontSize: 36 }}>{inHospital ? '🛏️' : v.kind === 'emergency' ? '🚑' : '🏥'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, inHospital && { color: '#fff' }]}>{v.facility}</Text>
          <Text style={[styles.heroSub, inHospital && { color: '#DDF0F6' }]}>
            {inHospital
              ? `In hospital · day ${day}${v.ward ? ` · ${v.ward}` : ''}`
              : v.dateOut && v.dateOut !== v.dateIn
                ? `${formatDate(v.dateIn)} – ${formatDate(v.dateOut)}`
                : formatDate(v.dateIn)}
          </Text>
          {patient && <Text style={[styles.heroSub, inHospital && { color: '#DDF0F6' }]}>Patient: {patient.name}</Text>}
        </View>
      </View>

      {v.diagnoses.length > 0 && (
        <Card>
          <Text style={[type.label, { color: colors.hospital, marginBottom: space(2) }]}>Diagnosis</Text>
          <ChipRow>
            {v.diagnoses.map((d) => (
              <Chip key={d} label={d} selected color={colors.hospital} />
            ))}
          </ChipRow>
        </Card>
      )}

      {v.doctors.length > 0 && (
        <Card style={{ padding: 0 }}>
          {v.doctors.map((d, i) => (
            <View key={i} style={[styles.docRow, i > 0 && styles.border]}>
              <Ionicons name="person-circle" size={30} color={colors.hospital} />
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { fontWeight: '700' }]}>{d.name}</Text>
                {d.role ? <Text style={type.small}>{d.role}</Text> : null}
              </View>
              {d.phone ? <Button small variant="secondary" icon="call" title="Call" onPress={() => call(d.phone!)} /> : null}
            </View>
          ))}
        </Card>
      )}

      {(v.reason || v.tests || v.treatment || v.notes) && (
        <Card>
          {[
            ['Why they went', v.reason],
            ['Tests & results', v.tests],
            ['Treatment', v.treatment],
            ['Notes', v.notes],
          ]
            .filter(([, t]) => t)
            .map(([label, t]) => (
              <View key={label} style={{ marginBottom: space(3) }}>
                <Text style={[type.label, { color: colors.hospital }]}>{label}</Text>
                <Text style={[type.body, { marginTop: 4 }]}>{t}</Text>
              </View>
            ))}
          {v.followUp ? <Text style={[type.body, { fontWeight: '700', color: colors.hospital }]}>📅 Follow-up: {formatDate(v.followUp)}</Text> : null}
          {v.recordedBy ? <Text style={[type.small, { marginTop: space(2) }]}>Recorded by {v.recordedBy}</Text> : null}
        </Card>
      )}

      <SectionTitle>{inHospital ? 'Daily updates' : 'Updates'}</SectionTitle>
      <Card>
        {v.updates.length === 0 && <Text style={type.small}>Write down what the doctors say each day — on ward rounds, new tests, changes in treatment.</Text>}
        {v.updates.map((u) => (
          <View key={u.id} style={styles.update}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={type.small}>
                {formatDate(u.date)}
                {u.by ? ` · ${u.by}` : ''}
              </Text>
              <Text style={type.body}>{u.text}</Text>
            </View>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: space(3) }}>
          <TextInput value={note} onChangeText={setNote} placeholder="e.g. Doctor said fever is down, start eating" placeholderTextColor={colors.faint} multiline style={styles.input} />
          <Button small icon="add" title="Add" onPress={addUpdate} style={{ backgroundColor: colors.hospital, borderColor: colors.hospital, alignSelf: 'flex-end' }} />
        </View>
      </Card>

      {photos.length > 0 && (
        <>
          <SectionTitle>Photos & documents</SectionTitle>
          <View style={styles.photos}>
            {photos.map((r) => (
              <Pressable key={r.id} onPress={() => router.push({ pathname: '/record/[id]', params: { id: r.id } })}>
                {r.imageUri ? <Image source={{ uri: r.imageUri }} style={styles.photo} /> : <View style={[styles.photo, { alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="document" size={28} color={colors.hospital} /></View>}
                <Text style={[type.small, { width: 96 }]} numberOfLines={1}>{r.title}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <View style={{ gap: space(2), marginTop: space(3) }}>
        {inHospital && <Button title="Discharged — going home" icon="home" onPress={discharge} style={{ backgroundColor: colors.success, borderColor: colors.success }} />}
        <Button title="Add photo (results, prescription, discharge form)" variant="secondary" icon="camera" onPress={() => router.push({ pathname: '/record-form', params: { visitId: v.id, memberId: v.memberId } })} />
        <Button title="Add a prescribed medicine" variant="secondary" icon="medkit" onPress={() => router.push({ pathname: '/med-form', params: { memberId: v.memberId, prescriber: [v.doctors[0]?.name, v.facility].filter(Boolean).join(', '), reason: v.diagnoses[0] ?? '' } })} />
        <Button title="Share with family or another doctor" variant="secondary" icon="share-social" onPress={() => Share.share({ message: visitText(v, patient?.name ?? 'Patient') })} />
        <Button title="Edit details" variant="ghost" icon="create" onPress={() => router.push({ pathname: '/visit-form', params: { id: v.id } })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: space(3), alignItems: 'center', backgroundColor: colors.hospitalSoft, borderRadius: radius.lg, padding: space(5), marginBottom: space(3) },
  heroTitle: { fontSize: 20, fontWeight: '900', color: colors.hospital },
  heroSub: { fontSize: 14, color: colors.text, marginTop: 2 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), padding: space(4) },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  update: { flexDirection: 'row', gap: space(3), marginBottom: space(3) },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.hospital, marginTop: 6 },
  input: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: 10, fontSize: 15, color: colors.text, minHeight: 44, borderWidth: 1, borderColor: colors.border },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  photo: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.hospitalSoft },
});
