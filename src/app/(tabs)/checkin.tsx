import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BodyCheckIn } from '../../features/BodyCheckIn';
import { MindCheckIn } from '../../features/MindCheckIn';
import { haptic } from '../../ui/Choice';
import { colors, radius, space } from '../../ui/theme';

export default function CheckInTab() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'body' | 'mind'>(params.mode === 'mind' ? 'mind' : 'body');

  useEffect(() => {
    if (params.mode === 'mind' || params.mode === 'body') setMode(params.mode);
  }, [params.mode]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.switch}>
        {(['body', 'mind'] as const).map((m) => {
          const on = mode === m;
          const tint = m === 'body' ? colors.primary : colors.mind;
          return (
            <Pressable
              key={m}
              onPress={() => {
                haptic();
                setMode(m);
              }}
              style={[styles.seg, on && { backgroundColor: tint }]}
            >
              <Text style={[styles.segText, on && { color: '#fff' }]}>{m === 'body' ? '🩺 Body' : '🧠 Mind'}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }}>{mode === 'body' ? <BodyCheckIn /> : <MindCheckIn />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    marginHorizontal: space(4),
    marginTop: space(2),
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seg: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  segText: { fontWeight: '800', fontSize: 15, color: colors.muted },
});
