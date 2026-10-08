import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dosesForDay } from '../../lib/adherence';
import { addDays, formatDate, formatTime12, greeting, toDateKey } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { kindForNow } from '../../lib/mind';
import { isUnderFive, nextVaccine } from '../../lib/childHealth';
import { gestation, inPostnatal, nextAnc, postnatalDay, weekInfo } from '../../lib/pregnancy';
import { admittedDay, isAdmitted } from '../../lib/visits';
import { checkInStreak, medicineStreak, streakMessage } from '../../lib/streaks';
import { Button, Card, Notice, Screen, SectionTitle, type IconName } from '../../ui/components';
import { SOSButton } from '../../ui/SOSButton';
import { StreakChip, WeekDots } from '../../ui/Streak';

const MOOD_EMOJI: Record<number, string> = { 1: '😣', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄' };
import { colors, radius, space, type } from '../../ui/theme';

function seasonalTip(month: number): { title: string; body: string } {
  // Uganda's main rainy seasons are roughly March–May and September–November.
  if ([2, 3, 4, 8, 9, 10].includes(month))
    return {
      title: 'Rainy season — malaria risk is higher',
      body: 'Sleep under a treated mosquito net every night, clear standing water around the home, and test any fever for malaria within 24 hours.',
    };
  return {
    title: 'Dry season — stay hydrated',
    body: 'Drink plenty of clean, boiled water, and keep using your mosquito net — malaria is present all year round.',
  };
}

export default function Home() {
  const { data, self, logDose } = useStore();
  const today = toDateKey();
  const now = new Date();
  const firstName = self?.name.split(' ')[0] ?? '';

  const doses = useMemo(() => dosesForDay(data.medications, data.doseLogs, today, now), [data.medications, data.doseLogs, today]);
  const pending = doses.filter((d) => d.state === 'due' || d.state === 'missed' || d.state === 'upcoming');
  const missed = doses.filter((d) => d.state === 'missed');
  const memberName = (id: string) => data.members.find((m) => m.id === id);

  const myCheckIn = [...data.checkIns].reverse().find((c) => c.memberId === self?.id && c.date === today);
  const streak = checkInStreak(data.checkIns, self?.id, data.moodLogs);
  const mindKind = kindForNow(now);
  const mindDone = data.moodLogs.some((l) => l.memberId === self?.id && l.date === today && l.kind === mindKind);
  const medStreak = medicineStreak(data.medications.filter((m) => m.memberId === self?.id), data.doseLogs, now);
  const tip = seasonalTip(now.getMonth());

  // ---- Care plans: pregnancy, postnatal, children, hospital ----
  type Plan = { key: string; emoji: string; title: string; sub: string; color: string; bg: string; go: () => void };
  const plans: Plan[] = [];
  for (const m of data.members) {
    const first = m.relationship === 'self' ? 'You' : m.name.split(' ')[0];
    const adm = data.visits.find((v) => v.memberId === m.id && isAdmitted(v));
    if (adm) plans.push({ key: `adm-${adm.id}`, emoji: '🛏️', title: `${first === 'You' ? 'You are' : `${first} is`} in hospital · day ${admittedDay(adm)}`, sub: `${adm.facility} — add today's update`, color: colors.hospital, bg: colors.hospitalSoft, go: () => router.push({ pathname: '/visit/[id]', params: { id: adm.id } }) });
    const preg = data.pregnancies.find((p) => p.memberId === m.id && p.status === 'active');
    if (preg) {
      const g = gestation(preg.edd, today);
      const wi = weekInfo(g.weeks);
      const na = nextAnc(preg, today);
      plans.push({ key: `preg-${preg.id}`, emoji: wi.emoji, title: `${first === 'You' ? 'Week' : `${first} · week`} ${g.weeks} of pregnancy`, sub: `Baby is the size of ${wi.size}${na ? ` · next clinic ${na.due <= today ? 'due now' : formatDate(na.due)}` : ''}`, color: colors.mama, bg: colors.mamaSoft, go: () => router.push({ pathname: '/pregnancy/[id]', params: { id: preg.id } }) });
    } else if (m.sex === 'female' && m.pregnant) {
      plans.push({ key: `pregset-${m.id}`, emoji: '🤰', title: `Start ${first === 'You' ? 'your' : `${first}'s`} pregnancy guide`, sub: 'Week-by-week calendar, clinic reminders and a birth plan', color: colors.mama, bg: colors.mamaSoft, go: () => router.push({ pathname: '/pregnancy/setup', params: { memberId: m.id } }) });
    }
    const post = data.pregnancies.find((p) => p.memberId === m.id && inPostnatal(p, today));
    if (post) plans.push({ key: `post-${post.id}`, emoji: '🤱', title: `Postnatal day ${postnatalDay(post.delivery!.date, today)} of 42`, sub: `${first === 'You' ? 'Your' : `${first}'s`} recovery and baby's first weeks`, color: colors.child, bg: colors.childSoft, go: () => router.push({ pathname: '/pregnancy/[id]', params: { id: post.id } }) });
    if (m.dob && isUnderFive(m.dob, today)) {
      const nv = nextVaccine(m.dob, data.childCare[m.id], today);
      if (nv && (nv.state !== 'upcoming' || nv.due <= addDays(today, 14)))
        plans.push({ key: `vac-${m.id}`, emoji: '💉', title: `${first}'s ${nv.visit.label} vaccines ${nv.state === 'overdue' ? 'are overdue' : nv.state === 'due' ? 'are due' : `on ${formatDate(nv.due)}`}`, sub: nv.visit.vaccines.slice(0, 3).join(', '), color: nv.state === 'overdue' ? colors.danger : colors.child, bg: nv.state === 'overdue' ? colors.dangerSoft : colors.childSoft, go: () => router.push({ pathname: '/child/[id]', params: { id: m.id } }) });
    }
  }
  const RANK: Record<string, number> = { adm: 0, vac: 1, preg: 2, post: 3, pregset: 4 };
  plans.sort((a, b) => (RANK[a.key.split('-')[0]] ?? 9) - (RANK[b.key.split('-')[0]] ?? 9));

  const quick: { icon: IconName; label: string; href: string; color: string }[] = [
    { icon: 'bandage', label: 'First aid', href: '/first-aid', color: colors.danger },
    { icon: 'location', label: 'Facilities', href: '/facilities', color: colors.primary },
    { icon: 'qr-code', label: 'Emergency card', href: '/emergency-card', color: '#6B4EAD' },
    { icon: 'wallet', label: 'Health costs', href: '/expenses', color: colors.warning },
    { icon: 'medkit', label: 'Hospital visit', href: '/visit-form', color: colors.hospital },
    { icon: 'people', label: 'Family', href: '/family', color: colors.child },
  ];

  return (
    <Screen topInset>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={type.small}>{greeting(now)}</Text>
          <Text style={type.h1}>{firstName || 'Sanova'}</Text>
        </View>
        <Pressable onPress={() => router.push('/achievements')} style={{ marginRight: space(2) }}>
          <StreakChip streak={streak} />
        </Pressable>
        <Pressable onPress={() => router.push('/profile')} style={styles.avatar}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push(streak.doneToday ? '/achievements' : '/checkin')} style={({ pressed }) => [styles.streakCard, pressed && { opacity: 0.9 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), marginBottom: space(4) }}>
          <Text style={{ fontSize: 34 }}>{streak.doneToday ? (myCheckIn ? MOOD_EMOJI[myCheckIn.feeling] : '✅') : '👋'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>
              {streak.doneToday ? 'Checked in today!' : 'How are you feeling today?'}
            </Text>
            <Text style={styles.streakSub}>
              {streak.doneToday
                ? `🔥 ${streak.current}-day streak · ${streakMessage(streak.current)}`
                : streak.atRisk
                  ? `🔥 ${streak.current}-day streak — check in to keep it alive!`
                  : '30 seconds a day builds your health streak 🔥'}
            </Text>
          </View>
          {!streak.doneToday && <Ionicons name="chevron-forward" size={22} color="#fff" />}
        </View>
        <WeekDots streak={streak} light />
      </Pressable>

      {plans.length > 0 && (
        <>
          {plans.map((p) => (
            <Pressable key={p.key} onPress={p.go} style={({ pressed }) => [styles.plan, { backgroundColor: p.bg }, pressed && { opacity: 0.9 }]}>
              <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planTitle, { color: p.color }]}>{p.title}</Text>
                <Text style={styles.planSub} numberOfLines={2}>{p.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={p.color} />
            </Pressable>
          ))}
        </>
      )}

      <Pressable
        onPress={() => router.push({ pathname: '/checkin', params: { mode: 'mind' } })}
        style={({ pressed }) => [styles.mindCard, pressed && { opacity: 0.9 }]}
      >
        <Text style={{ fontSize: 30 }}>{mindKind === 'morning' ? '☀️' : '🌙'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.mindTitle}>
            {mindDone ? (mindKind === 'morning' ? 'Mind check done ✓' : 'Day reviewed ✓') : mindKind === 'morning' ? 'Start your day with a mind check' : 'Review your day'}
          </Text>
          <Text style={styles.mindSub}>
            {mindDone ? 'Come back this evening to look back on your day.' : mindKind === 'morning' ? 'How is your mind this morning? 1 minute.' : 'What went well? What weighed on you?'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.mind} />
      </Pressable>

      <Card style={{ alignItems: 'center', paddingVertical: space(6) }}>
        <SOSButton onTrigger={() => router.push('/emergency')} />
        <Text style={[type.small, { textAlign: 'center', marginTop: space(4) }]}>
          Hold to alert {data.contacts.length ? `${data.contacts.length} emergency contact${data.contacts.length > 1 ? 's' : ''}` : 'help'} with your location and get emergency numbers.
        </Text>
        {!data.contacts.length && (
          <Button title="Add an emergency contact" variant="ghost" small icon="person-add" onPress={() => router.push('/profile')} />
        )}
        <Pressable onPress={() => router.push('/support')} style={styles.notOkay}>
          <Text style={{ fontSize: 16 }}>💜</Text>
          <Text style={{ color: colors.mind, fontWeight: '700' }}>Not okay emotionally? Talk to someone</Text>
        </Pressable>
      </Card>

      {missed.length > 0 && (
        <Notice tone="warn" icon="alarm">
          {missed.length} dose{missed.length > 1 ? 's' : ''} missed today
          {missed.some((d) => memberName(d.med.memberId)?.relationship !== 'self')
            ? ` (including ${[...new Set(missed.map((d) => memberName(d.med.memberId)?.name.split(' ')[0]).filter(Boolean))].join(', ')})`
            : ''}
          . Open Medicines to log or catch up.
        </Notice>
      )}

      <SectionTitle action={<Text style={styles.link} onPress={() => router.push('/meds')}>All</Text>}>
        {medStreak.hasMeds && medStreak.current > 0 ? `Today's medicines · 💊 ${medStreak.current}-day streak` : "Today's medicines"}
      </SectionTitle>
      {doses.length === 0 ? (
        <Card onPress={() => router.push('/med-form')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="add-circle" size={26} color={colors.primary} />
            <Text style={[type.body, { flex: 1 }]}>Add a medicine to get reminders and track doses.</Text>
          </View>
        </Card>
      ) : pending.length === 0 ? (
        <Notice tone="success">All of today's doses are logged. Well done!</Notice>
      ) : (
        <Card style={{ padding: 0 }}>
          {pending.slice(0, 4).map((d, i) => {
            const m = memberName(d.med.memberId);
            return (
              <View key={`${d.med.id}-${d.time}`} style={[styles.doseRow, i > 0 && styles.doseBorder]}>
                <View style={{ width: 70 }}>
                  <Text style={[type.h3, d.state === 'missed' && { color: colors.danger }]}>{formatTime12(d.time).replace(' ', '\n')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: '600' }]}>{d.med.name}</Text>
                  <Text style={type.small}>
                    {d.med.dose}
                    {m && m.relationship !== 'self' ? ` · ${m.name.split(' ')[0]}` : ''}
                    {d.state === 'missed' ? ' · missed' : d.state === 'due' ? ' · due now' : ''}
                  </Text>
                </View>
                <Button small title="Taken" icon="checkmark" onPress={() => logDose(d.med.id, d.date, d.time, 'taken')} />
              </View>
            );
          })}
        </Card>
      )}

      <SectionTitle>Quick access</SectionTitle>
      <View style={styles.grid}>
        {quick.map((q) => (
          <Pressable key={q.label} onPress={() => router.push(q.href as never)} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
            <View style={[styles.tileIcon, { backgroundColor: q.color + '1A' }]}>
              <Ionicons name={q.icon} size={22} color={q.color} />
            </View>
            <Text style={[type.body, { fontWeight: '600' }]}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle>Health tip</SectionTitle>
      <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Ionicons name="rainy" size={22} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>{tip.title}</Text>
            <Text style={[type.small, { color: colors.text, marginTop: 4 }]}>{tip.body}</Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space(4) },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: space(4) },
  doseBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space(3), borderRadius: radius.lg, padding: space(4), marginBottom: space(2) },
  planTitle: { fontSize: 15, fontWeight: '800' },
  planSub: { fontSize: 13, color: colors.text, marginTop: 2 },
  mindCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.mindSoft,
    borderRadius: radius.lg,
    padding: space(4),
    marginBottom: space(3),
  },
  mindTitle: { fontSize: 16, fontWeight: '800', color: colors.mind },
  mindSub: { fontSize: 13, color: colors.text, marginTop: 2 },
  notOkay: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space(4), paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.mindSoft },
  streakCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: space(4), marginBottom: space(3) },
  streakTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  streakSub: { color: '#CFE8E1', fontSize: 13, marginTop: 2, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  tile: {
    width: '47.8%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space(4),
    gap: space(3),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
