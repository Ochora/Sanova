import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

const HOLD_MS = 2000;

/** Press and hold for 2 seconds to trigger. Releasing early cancels. */
export function SOSButton({ onTrigger, size = 168 }: { onTrigger: () => void; size?: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const [holding, setHolding] = useState(false);

  const start = () => {
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    progress.setValue(0);
    anim.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.current.start(({ finished }) => {
      setHolding(false);
      if (finished) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        progress.setValue(0);
        onTrigger();
      }
    });
  };

  const cancel = () => {
    anim.current?.stop();
    setHolding(false);
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const fillHeight = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.halo, { width: size + 28, height: size + 28, borderRadius: (size + 28) / 2 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Emergency SOS. Press and hold for two seconds."
          onPressIn={start}
          onPressOut={cancel}
          style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Animated.View style={[styles.fill, { height: fillHeight }]} />
          <Text style={styles.sos}>SOS</Text>
          <Text style={styles.hint}>{holding ? 'Keep holding…' : 'Hold 2 seconds'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  button: {
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 6,
  },
  fill: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.dangerDark },
  sos: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: 2 },
  hint: { color: '#FFE3DF', fontSize: 13, fontWeight: '600', marginTop: 2 },
});
