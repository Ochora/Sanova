import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { fromDateKey } from '../lib/dates';
import type { StreakInfo } from '../lib/streaks';
import { colors, radius, space, type } from './theme';

const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Small pill: "🔥 5". */
export function StreakChip({ streak, light }: { streak: StreakInfo; light?: boolean }) {
  const lit = streak.current > 0;
  return (
    <View style={[styles.chip, { backgroundColor: light ? 'rgba(255,255,255,0.18)' : lit ? colors.accentSoft : colors.bg }]}>
      <Text style={{ fontSize: 16, opacity: lit ? 1 : 0.4 }}>🔥</Text>
      <Text style={[styles.chipText, { color: light ? '#fff' : lit ? colors.warning : colors.faint }]}>{streak.current}</Text>
    </View>
  );
}

/** Seven circles for the last week; today is outlined. */
export function WeekDots({ streak, light }: { streak: StreakInfo; light?: boolean }) {
  return (
    <View style={styles.week}>
      {streak.week.map((w, i) => {
        const isToday = i === 6;
        return (
          <View key={w.date} style={{ alignItems: 'center', gap: 4 }}>
            <View
              style={[
                styles.dot,
                w.done
                  ? { backgroundColor: colors.accent, borderColor: colors.accent }
                  : { backgroundColor: light ? 'rgba(255,255,255,0.12)' : colors.card, borderColor: light ? 'rgba(255,255,255,0.35)' : colors.border },
                isToday && !w.done && { borderStyle: 'dashed', borderColor: light ? '#fff' : colors.accent, borderWidth: 2 },
              ]}
            >
              {w.done ? <Text style={{ fontSize: 15 }}>🔥</Text> : null}
            </View>
            <Text style={{ fontSize: 11, fontWeight: isToday ? '800' : '500', color: light ? '#E6F3EF' : isToday ? colors.text : colors.faint }}>
              {isToday ? 'Today' : DAY[fromDateKey(w.date).getDay()]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const CONFETTI = ['🎉', '✨', '💚', '⭐', '🎊', '💪', '🌟', '🔥'];

/** Falling emoji confetti, plays once on mount. */
export function Confetti({ count = 18 }: { count?: number }) {
  const { width } = Dimensions.get('window');
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: Math.random() * (width - 30),
        delay: Math.random() * 500,
        emoji: CONFETTI[i % CONFETTI.length],
        size: 16 + Math.random() * 14,
        drift: (Math.random() - 0.5) * 80,
        anim: new Animated.Value(0),
      })),
    [count, width],
  );

  useEffect(() => {
    Animated.parallel(
      pieces.map((p) =>
        Animated.timing(p.anim, { toValue: 1, duration: 2200, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ),
    ).start();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: -40,
            fontSize: p.size,
            opacity: p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 520] }) },
              { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.drift * 4}deg`] }) },
            ],
          }}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

/** Big bouncing flame with the streak number. */
export function StreakHero({ days, label }: { days: number; label: string }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
  }, [scale]);
  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={[styles.hero, { transform: [{ scale }] }]}>
        <Text style={{ fontSize: 46, lineHeight: 54 }}>🔥</Text>
        <Text style={styles.heroNum}>{days}</Text>
      </Animated.View>
      <Text style={[type.h2, { marginTop: space(3), textAlign: 'center' }]}>
        {days}-day streak!
      </Text>
      <Text style={[type.small, { textAlign: 'center', marginTop: 4, maxWidth: 280 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  chipText: { fontSize: 16, fontWeight: '800' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNum: { fontSize: 22, fontWeight: '900', color: colors.warning, marginTop: -4 },
});
