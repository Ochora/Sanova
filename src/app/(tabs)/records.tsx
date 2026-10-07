import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatDate } from '../../lib/dates';
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

      <MemberPicker value={memberId} onChange={setMemberId} allowAll />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        <Chip label="All types" selected={!cat} onPress={() => setCat(undefined)} />
        {RECORD_CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.label} selected={cat === c.id} onPress={() => setCat(c.id)} />
        ))}
      </ScrollView>

      <Button title="Add a record" icon="camera" onPress={() => router.push('/record-form')} style={{ marginBottom: space(4) }} />

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.bg },
});
