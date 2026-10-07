import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from './theme';

export const haptic = () => Haptics.selectionAsync().catch(() => {});

/** Big tappable option with a little press bounce. */
export function BounceCard({ onPress, selected, style, children }: { onPress: () => void; selected?: boolean; style?: object; children: React.ReactNode }) {
  const s = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(s, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start()}
      onPressOut={() => Animated.spring(s, { toValue: 1, useNativeDriver: true, friction: 3 }).start()}
      onPress={() => {
        haptic();
        onPress();
      }}
    >
      <Animated.View style={[styles.option, selected && styles.optionOn, style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Check({ on, danger }: { on: boolean; danger?: boolean }) {
  const c = danger ? colors.danger : colors.primary;
  return (
    <View style={[styles.check, on ? { backgroundColor: c, borderColor: c } : null]}>
      {on ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
    </View>
  );
}


const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: space(3),
    paddingHorizontal: space(4),
    marginBottom: space(3),
    minHeight: 64,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
