import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatDate } from '../../lib/dates';
import { admittedDay, isAdmitted, VISIT_EMOJI } from '../../lib/visits';
import { RECORD_CAT, RECORD_CATEGORIES } from '../../lib/records';
import { useStore } from '../../lib/store';
import type { RecordCategory } from '../../lib/types';
import { Button, Card, Chip, Empty, Screen } from '../../ui/components';
import { MemberPicker } from '../../ui/MemberPicker';
import { colors, radius, space, type } from '../../ui/theme';

export default function Records() {
  const { data } = useStore();
  const [memberId, setMemberId] = useState<string | undefined>();
  const [cat, setCat] = useState<RecordCategory | undefined>();
  const [view, setView] = useState<'visits' | 'docs'>('visits');
  const visits = data.visits
    .filter((v) => !memberId || v.memberId === memberId)
    .sort((a, b) => Number(isAdmitted(b)) - Number(isAdmitted(a)) || b.dateIn.localeCompare(a.dateIn));

  const list = data.records
    .filter((r) => (!memberId || r.memberId === memberId) && (!cat || r.category === cat))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)));

  return (
    <Screen>
      <Card onPress={() => router.push('/emergency-card')} style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="qr-code" size={30} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={[type.h3, { color: '#fff' }]}>Emergency health card</Text>
            <Text style={[type.small, { color: '#CFE8E1' }]}>Show a QR code with your allergies, conditions and medicines to any health worker.</Text>
          </View>
        </View>
      </Card>

      <View style={styles.seg}>
        {([
          ['visits', `🏥 Hospital visits${data.visits.length ? ` (${data.visits.length})` : ''}`],
          ['docs', `📄 Documents${data.records.length ? ` (${data.records.length})` : ''}`],
        ] as const).map(([k, label]) => (
          <Pressable key={k} onPress={() => setView(k)} style={[styles.segBtn, view === k && styles.segOn]}>
            <Text style={[styles.segText, view === k && { color: '#fff' }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <MemberPicker value={memberId} onChange={setMemberId} allowAll />

      {view === 'visits' ? (
        <>
          <Button title="Record a hospital or clinic visit" icon="add" onPress={() => router.push({ pathname: '/visit-form', params: memberId ? { memberId } : {} })} style={{ marginBottom: space(4), backgroundColor: colors.hospital, borderColor: colors.hospital }} />
          {visits.length === 0 ? (
            <Empty
              icon="medkit"
              title="No hospital visits yet"
              body="When someone is ill or admitted, record the diagnosis, the doctors' names, tests and treatment — and add daily updates. A caregiver can record it for the patient."
            />
          ) : (
            visits.map((v) => {
              const owner = data.members.find((m) => m.id === v.memberId);
              const admitted = isAdmitted(v);
              return (
                <Pressable key={v.id} onPress={() => router.push({ pathname: '/visit/[id]', params: { id: v.id } })}>
                  <Card style={[{ flexDirection: 'row', gap: 12, alignItems: 'center' }, admitted && { borderColor: colors.hospital, borderWidth: 2 }]}>
                    <View style={[styles.thumb, { backgroundColor: colors.hospitalSoft, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 26 }}>{VISIT_EMOJI[v.kind]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={type.h3} numberOfLines={1}>{v.diagnoses[0] ?? v.reason ?? v.facility}</Text>
                      <Text style={type.small} numberOfLines={1}>
                        {v.facility} · {admitted ? `in hospital, day ${admittedDay(v)}` : formatDate(v.dateIn)}
                      </Text>
                      {owner && owner.relationship !== 'self' ? <Text style={type.small}>{owner.name}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                  </Card>
                </Pressable>
              );
            })
          )}
        </>
      ) : (
      <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        <Chip label="All types" selected={!cat} onPress={() => setCat(undefined)} />
        {RECORD_CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.label} selected={cat === c.id} onPress={() => setCat(c.id)} />
        ))}
      </ScrollView>

      <Button title="Add a document or photo" icon="camera" onPress={() => router.push({ pathname: '/record-form', params: memberId ? { memberId } : {} })} style={{ marginBottom: space(4) }} />

      {list.length === 0 ? (
        <Empty
          icon="folder-open"
          title="No records yet"
          body="Photograph lab results, prescriptions, discharge forms and vaccination cards so they're never lost or left at home."
        />
      ) : (
        list.map((r) => {
          const c = RECORD_CAT[r.category];
          const owner = data.members.find((m) => m.id === r.memberId);
          return (
            <Pressable key={r.id} onPress={() => router.push({ pathname: '/record/[id]', params: { id: r.id } })}>
              <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                {r.imageUri ? (
                  <Image source={{ uri: r.imageUri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: c.color + '1A', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name={c.icon as 'flask'} size={24} color={c.color} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={type.h3} numberOfLines={1}>{r.title}</Text>
                  <Text style={type.small}>
                    {c.label} · {formatDate(r.date)}
                  </Text>
                  {owner && owner.relationship !== 'self' ? <Text style={type.small}>{owner.name}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Card>
            </Pressable>
          );
        })
      )}
      </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.pill, padding: 4, marginBottom: space(3), borderWidth: 1, borderColor: colors.border },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  segOn: { backgroundColor: colors.hospital },
  segText: { fontWeight: '700', color: colors.muted, fontSize: 13 },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.bg },
});
