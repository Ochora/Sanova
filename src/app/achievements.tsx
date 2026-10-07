import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { CHECKIN_BADGES, checkInStreak, medicineStreak, nextBadge, streakMessage } from '../lib/streaks';
import { Button, Card, Screen, SectionTitle } from '../ui/components';
import { WeekDots } from '../ui/Streak';
import { colors, radius, space, type } from '../ui/theme';

export default function Achievements() {
  const { data, self } = useStore();
  const streak = checkInStreak(data.checkIns, self?.id);
  const meds = medicineStreak(data.medications.filter((m) => m.memberId === self?.id), data.doseLogs);
  const total = data.checkIns.filter((c) => c.memberId === self?.id).length;
  const next = nextBadge(streak.current);
  const progress = next ? Math.min(1, streak.current / next.days) : 1;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={{ fontSize: 56 }}>🔥</Text>
        <Text style={styles.heroNum}>{streak.current}</Text>
        <Text style={styles.heroLabel}>day check-in streak</Text>
        <Text style={styles.heroMsg}>{streak.current ? streakMessage(streak.current) : 'Check in today to light your flame!'}</Text>
        <View style={{ alignSelf: 'stretch', marginTop: space(5) }}>
          <WeekDots streak={streak} light />
        </View>
      </View>

      {!streak.doneToday && <Button title="Check in now" icon="chatbubble-ellipses" onPress={() => router.push('/checkin')} style={{ marginBottom: space(3) }} />}

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statNum}>{streak.best}</Text>
          <Text style={type.small}>Best streak</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statNum}>{total}</Text>
          <Text style={type.small}>Check-ins</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statNum}>{meds.hasMeds ? meds.current : '—'}</Text>
          <Text style={type.small}>💊 Med streak</Text>
        </Card>
      </View>

      {next && (
        <Card>
          <Text style={type.h3}>
            Next: {next.emoji} {next.title}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={type.small}>
            {streak.current} / {next.days} days · {next.days - streak.current} to go
          </Text>
        </Card>
      )}

      <SectionTitle>Badges</SectionTitle>
      <View style={styles.grid}>
        {CHECKIN_BADGES.map((b) => {
          const got = streak.best >= b.days;
          return (
            <View key={b.id} style={[styles.badge, !got && { opacity: 0.45 }]}>
              <View style={[styles.badgeIcon, got ? { backgroundColor: colors.accentSoft } : { backgroundColor: colors.bg }]}>
                <Text style={{ fontSize: 30 }}>{got ? b.emoji : '🔒'}</Text>
              </View>
              <Text style={[type.body, { fontWeight: '700', textAlign: 'center' }]}>{b.title}</Text>
              <Text style={[type.small, { textAlign: 'center', fontSize: 12 }]}>{b.blurb}</Text>
            </View>
          );
        })}
      </View>

      <Text style={[type.small, { textAlign: 'center', marginTop: space(4) }]}>
        Missed a day? No stress — your best streak and badges stay with you. Just start again.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: space(5), alignItems: 'center', marginBottom: space(3) },
  heroNum: { color: '#fff', fontSize: 56, fontWeight: '900', lineHeight: 60 },
  heroLabel: { color: '#CFE8E1', fontSize: 15, fontWeight: '600' },
  heroMsg: { color: '#fff', fontSize: 14, textAlign: 'center', marginTop: space(2) },
  stats: { flexDirection: 'row', gap: space(3) },
  stat: { flex: 1, alignItems: 'center', paddingVertical: space(4) },
  statNum: { fontSize: 26, fontWeight: '900', color: colors.text },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.bg, marginVertical: space(2), overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  badge: {
    width: '30.5%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space(3),
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  badgeIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
