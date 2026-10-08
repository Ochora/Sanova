import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ageText, nextVaccine } from '../../lib/childHealth';
import { formatDate, toDateKey } from '../../lib/dates';
import { ageInMonths } from '../../lib/dosing';
import { initials } from '../../lib/id';
import { DISABILITY_BY_ID, supportLine } from '../../lib/inclusion';
import { gestation, inPostnatal, postnatalDay } from '../../lib/pregnancy';
import { useStore } from '../../lib/store';
import { admittedDay, isAdmitted } from '../../lib/visits';
import { Card, Empty, Pill, Screen, SectionTitle, type IconName } from '../../ui/components';
import { colors, radius, space, type } from '../../ui/theme';

function Tile({ icon, emoji, title, sub, color, bg, onPress }: { icon?: IconName; emoji?: string; title: string; sub?: string; color: string; bg: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, { backgroundColor: bg }, pressed && { opacity: 0.85 }]}>
      {emoji ? <Text style={{ fontSize: 26 }}>{emoji}</Text> : <Ionicons name={icon!} size={24} color={color} />}
      <Text style={[styles.tileTitle, { color }]}>{title}</Text>
      {sub ? <Text style={styles.tileSub} numberOfLines={2}>{sub}</Text> : null}
    </Pressable>
  );
}

export default function MemberHub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const m = data.members.find((x) => x.id === id);
  if (!m) return <Empty icon="person" title="Person not found" />;
  const first = m.name.split(' ')[0];
  const isSelf = m.relationship === 'self';
  const preg = data.pregnancies.filter((p) => p.memberId === m.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const activePreg = preg?.status === 'active' ? preg : undefined;
  const postnatal = preg && inPostnatal(preg) ? preg : undefined;
  const isChild = m.dob ? ageInMonths(m.dob) < 18 * 12 : m.relationship === 'Child';
  const next = m.dob ? nextVaccine(m.dob, data.childCare[m.id]) : undefined;
  const visits = data.visits.filter((v) => v.memberId === m.id);
  const admitted = visits.find(isAdmitted);
  const meds = data.medications.filter((x) => x.memberId === m.id);
  const records = data.records.filter((x) => x.memberId === m.id);
  const today = toDateKey();
  const mother = data.pregnancies.find((p) => p.delivery?.babyIds.includes(m.id));

  return (
    <Screen>
      <Stack.Screen options={{ title: isSelf ? 'My health' : first }} />
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(m.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.h2}>{m.name}</Text>
          <Text style={type.small}>
            {[isSelf ? 'You' : m.relationship, m.dob ? `${ageText(m.dob)} old` : null, m.sex, m.bloodGroup].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Pressable onPress={() => router.push({ pathname: '/member-form', params: { id: m.id } })} hitSlop={10} style={styles.edit}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.tags}>
        {(m.disabilities ?? []).map((d) => (
          <Pill key={d} label={`${DISABILITY_BY_ID[d]?.emoji ?? ''} ${DISABILITY_BY_ID[d]?.label ?? d}`} color={colors.primary} bg={colors.primarySoft} />
        ))}
        {m.allergies.length > 0 && <Pill label={`⚠️ Allergic: ${m.allergies.join(', ')}`} color={colors.warning} bg={colors.warningSoft} />}
        {m.conditions.map((c) => (
          <Pill key={c} label={c} color={colors.muted} bg={colors.card} />
        ))}
        {m.insurance?.provider && <Pill label={`🛡️ ${m.insurance.provider}`} color={colors.success} bg={colors.successSoft} />}
      </View>
      {supportLine(m) ? (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
          <Text style={[type.label, { color: colors.primaryDark }]}>♿ How to help {isSelf ? 'me' : first}</Text>
          <Text style={[type.body, { marginTop: 4 }]}>{supportLine(m)}</Text>
          {m.assistive ? <Text style={[type.small, { marginTop: 4 }]}>Uses: {m.assistive}</Text> : null}
        </Card>
      ) : null}

      {admitted && (
        <Pressable onPress={() => router.push({ pathname: '/visit/[id]', params: { id: admitted.id } })} style={[styles.banner, { backgroundColor: colors.hospital }]}>
          <Text style={{ fontSize: 26 }}>🛏️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>In hospital · day {admittedDay(admitted)}</Text>
            <Text style={styles.bannerSub}>{admitted.facility} — tap to add today's update</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Pressable>
      )}

      <SectionTitle>Care</SectionTitle>
      <View style={styles.grid}>
        {m.sex === 'female' && (activePreg || m.pregnant) && (
          <Tile
            emoji="🤰"
            title="Pregnancy"
            sub={activePreg ? `Week ${gestation(activePreg.edd).weeks} · due ${formatDate(activePreg.edd)}` : 'Start the week-by-week guide'}
            color={colors.mama}
            bg={colors.mamaSoft}
            onPress={() => (activePreg ? router.push({ pathname: '/pregnancy/[id]', params: { id: activePreg.id } }) : router.push({ pathname: '/pregnancy/setup', params: { memberId: m.id } }))}
          />
        )}
        {postnatal && (
          <Tile emoji="🤱" title="After the birth" sub={`Postnatal day ${postnatalDay(postnatal.delivery!.date, today)} of 42`} color={colors.child} bg={colors.childSoft} onPress={() => router.push({ pathname: '/pregnancy/[id]', params: { id: postnatal.id } })} />
        )}
        {isChild && (
          <Tile
            emoji="🧒"
            title="Child health"
            sub={next ? `${next.visit.label} vaccines ${next.state === 'overdue' ? 'overdue' : next.state === 'due' ? 'due now' : formatDate(next.due)}` : 'Vaccines, growth, milestones'}
            color={colors.child}
            bg={colors.childSoft}
            onPress={() => router.push({ pathname: '/child/[id]', params: { id: m.id } })}
          />
        )}
        <Tile emoji="🏥" title="Hospital visits" sub={visits.length ? `${visits.length} recorded · add new` : 'Record a diagnosis & doctors'} color={colors.hospital} bg={colors.hospitalSoft} onPress={() => router.push({ pathname: '/visit-form', params: { memberId: m.id } })} />
        <Tile emoji="💊" title="Medicines" sub={meds.length ? `${meds.length} medicine${meds.length > 1 ? 's' : ''}` : 'Add with reminders'} color={colors.primary} bg={colors.primarySoft} onPress={() => router.push({ pathname: '/med-form', params: { memberId: m.id } })} />
        <Tile emoji="📄" title="Documents" sub={records.length ? `${records.length} saved` : 'Photograph results'} color={colors.muted} bg={colors.card} onPress={() => router.push({ pathname: '/record-form', params: { memberId: m.id } })} />
        <Tile emoji="🪪" title="Emergency card" sub="QR for health workers" color={colors.mind} bg={colors.mindSoft} onPress={() => router.push('/emergency-card')} />
        <Tile emoji="🔁" title="Share / transfer" sub="Summary or full profile" color={colors.text} bg={colors.card} onPress={() => router.push({ pathname: '/share', params: { memberId: m.id } })} />
      </View>

      {visits.length > 0 && (
        <>
          <SectionTitle>Hospital & clinic history</SectionTitle>
          {[...visits].sort((a, b) => b.dateIn.localeCompare(a.dateIn)).slice(0, 5).map((v) => (
            <Card key={v.id} onPress={() => router.push({ pathname: '/visit/[id]', params: { id: v.id } })}>
              <Text style={type.h3}>{v.diagnoses.join(', ') || v.reason || 'Visit'}</Text>
              <Text style={type.small}>
                {v.facility} · {formatDate(v.dateIn)}
                {v.doctors[0] ? ` · ${v.doctors[0].name}` : ''}
              </Text>
            </Card>
          ))}
        </>
      )}
      {mother && <Text style={[type.small, { marginTop: space(3) }]}>Born {formatDate(mother.delivery!.date)}{mother.delivery!.place ? ` at ${mother.delivery!.place}` : ''}.</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space(3), marginBottom: space(3) },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '900', fontSize: 20 },
  edit: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: space(3) },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space(3), borderRadius: radius.lg, padding: space(4), marginBottom: space(3) },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  bannerSub: { color: '#DDF0F6', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  tile: { width: '47.8%', borderRadius: radius.lg, padding: space(4), gap: 4, minHeight: 110, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  tileTitle: { fontSize: 15, fontWeight: '800' },
  tileSub: { fontSize: 12, color: colors.muted },
});
