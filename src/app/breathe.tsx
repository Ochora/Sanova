import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Screen } from '../ui/components';
import { colors, radius, space, type } from '../ui/theme';

const PHASES = [
  { label: 'Breathe in', secs: 4, to: 1 },
  { label: 'Hold', secs: 4, to: 1 },
  { label: 'Breathe out slowly', secs: 6, to: 0 },
];
const GROUNDING = [
  { n: 5, sense: 'things you can SEE', emoji: '👀' },
  { n: 4, sense: 'things you can TOUCH', emoji: '✋' },
  { n: 3, sense: 'things you can HEAR', emoji: '👂' },
  { n: 2, sense: 'things you can SMELL', emoji: '👃' },
  { n: 1, sense: 'thing you can TASTE', emoji: '👅' },
];

function Breathing() {
  const scale = useRef(new Animated.Value(0)).current;
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(PHASES[0].secs);
  const [cycles, setCycles] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    const p = PHASES[phase];
    setCount(p.secs);
    Animated.timing(scale, { toValue: p.to, duration: p.secs * 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    timer.current = setInterval(() => setCount((c) => Math.max(1, c - 1)), 1000);
    const t = setTimeout(() => {
      if (timer.current) clearInterval(timer.current);
      if (phase === PHASES.length - 1) setCycles((c) => c + 1);
      setPhase((x) => (x + 1) % PHASES.length);
    }, p.secs * 1000);
    return () => {
      clearTimeout(t);
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, phase, scale]);

  const s = scale.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.circleWrap}>
        <Animated.View style={[styles.circle, { transform: [{ scale: s }] }]} />
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.center}>
            <Text style={styles.phase}>{running ? PHASES[phase].label : 'Ready?'}</Text>
            {running && <Text style={styles.count}>{count}</Text>}
          </View>
        </View>
      </View>
      <Text style={[type.small, { marginBottom: space(4) }]}>
        {cycles > 0 ? `${cycles} breath${cycles > 1 ? 's' : ''} done — ${cycles >= 4 ? 'beautiful. Notice how your body feels.' : 'keep going.'}` : 'In for 4 · hold for 4 · out for 6'}
      </Text>
      <Button
        title={running ? 'Pause' : cycles ? 'Continue' : 'Start breathing'}
        icon={running ? 'pause' : 'play'}
        onPress={() => setRunning((r) => !r)}
        style={{ alignSelf: 'stretch', backgroundColor: colors.mind, borderColor: colors.mind }}
      />
    </View>
  );
}

function Grounding() {
  const [i, setI] = useState(0);
  const done = i >= GROUNDING.length;
  const g = GROUNDING[Math.min(i, GROUNDING.length - 1)];
  return (
    <View style={{ alignItems: 'center' }}>
      {done ? (
        <>
          <Text style={{ fontSize: 60 }}>🌿</Text>
          <Text style={[type.h2, { textAlign: 'center', marginTop: space(3) }]}>Well done. You're here, right now.</Text>
          <Text style={[type.body, { textAlign: 'center', color: colors.muted, marginTop: space(2) }]}>Take one more slow breath before you carry on.</Text>
          <Button title="Start again" variant="secondary" onPress={() => setI(0)} style={{ alignSelf: 'stretch', marginTop: space(5) }} />
        </>
      ) : (
        <>
          <Text style={{ fontSize: 64 }}>{g.emoji}</Text>
          <Text style={styles.groundNum}>{g.n}</Text>
          <Text style={[type.h2, { textAlign: 'center' }]}>Name {g.n} {g.sense}</Text>
          <Text style={[type.body, { textAlign: 'center', color: colors.muted, marginTop: space(2) }]}>Say them out loud or in your head. Take your time.</Text>
          <Button title="Done — next" icon="arrow-forward" onPress={() => { Haptics.selectionAsync().catch(() => {}); setI(i + 1); }} style={{ alignSelf: 'stretch', marginTop: space(6), backgroundColor: colors.mind, borderColor: colors.mind }} />
        </>
      )}
    </View>
  );
}

export default function Breathe() {
  const [mode, setMode] = useState<'breathe' | 'ground'>('breathe');
  return (
    <Screen>
      <View style={styles.tabs}>
        {(['breathe', 'ground'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.tab, mode === m && styles.tabOn]}>
            <Text style={[styles.tabText, mode === m && { color: '#fff' }]}>{m === 'breathe' ? '🌬️ Breathing' : '🖐️ 5-4-3-2-1 Grounding'}</Text>
          </Pressable>
        ))}
      </View>
      {mode === 'breathe' ? <Breathing /> : <Grounding />}
      <Button title="I need to talk to someone" variant="ghost" icon="chatbubbles" onPress={() => router.push('/support')} style={{ marginTop: space(6) }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.pill, padding: 4, marginBottom: space(6), borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  tabOn: { backgroundColor: colors.mind },
  tabText: { fontWeight: '700', color: colors.muted, fontSize: 13 },
  circleWrap: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center', marginBottom: space(4) },
  circle: { width: 280, height: 280, borderRadius: 140, backgroundColor: colors.mindSoft, borderWidth: 3, borderColor: '#CFC3EE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phase: { fontSize: 22, fontWeight: '800', color: colors.mind },
  count: { fontSize: 48, fontWeight: '900', color: colors.mind },
  groundNum: { fontSize: 72, fontWeight: '900', color: colors.mind, lineHeight: 80 },
});
