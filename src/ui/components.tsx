import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space, type } from './theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  scroll = true,
  padded = true,
  topInset = false,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  topInset?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const pad = { paddingHorizontal: padded ? space(4) : 0, paddingTop: (topInset ? insets.top : 0) + space(3) };
  if (!scroll)
    return <View style={[styles.screen, pad, { paddingBottom: insets.bottom + space(3) }, style]}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[pad, { paddingBottom: insets.bottom + space(10) }, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const v = {
    primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
    secondary: { bg: colors.card, fg: colors.primary, border: colors.border },
    danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 19} color={v.fg} />}
          <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  style,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={{ marginBottom: space(4) }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.faint}
        style={[styles.input, props.multiline && { minHeight: 84, textAlignVertical: 'top' }, error && { borderColor: colors.danger }, style]}
        {...props}
      />
      {error ? <Text style={[type.small, { color: colors.danger, marginTop: 4 }]}>{error}</Text> : null}
      {hint && !error ? <Text style={[type.small, { marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = colors.primary,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected ? { backgroundColor: color, borderColor: color } : { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {icon && <Ionicons name={icon} size={14} color={selected ? '#fff' : colors.muted} />}
      <Text style={{ color: selected ? '#fff' : colors.text, fontSize: 14, fontWeight: selected ? '700' : '500' }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={type.label}>{children}</Text>
      {action}
    </View>
  );
}

export function Empty({ icon, title, body, children }: { icon: IconName; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[type.h3, { textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[type.small, { textAlign: 'center', marginTop: 6 }]}>{body}</Text> : null}
      {children ? <View style={{ marginTop: space(4), alignSelf: 'stretch' }}>{children}</View> : null}
    </View>
  );
}

export function Row({
  icon,
  iconColor = colors.primary,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      {icon && (
        <View style={[styles.rowIcon, { backgroundColor: iconColor + '1A' }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { fontWeight: '600' }]}>{title}</Text>
        {subtitle ? <Text style={type.small}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null)}
    </>
  );
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg }]}>
        {content}
      </Pressable>
    );
  return <View style={styles.row}>{content}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: space(4) }} />;
}

export function Notice({ tone = 'info', children, icon }: { tone?: 'info' | 'warn' | 'danger' | 'success'; children: React.ReactNode; icon?: IconName }) {
  const t = {
    info: { bg: colors.primarySoft, fg: colors.primaryDark, i: 'information-circle' as IconName },
    warn: { bg: colors.warningSoft, fg: colors.warning, i: 'warning' as IconName },
    danger: { bg: colors.dangerSoft, fg: colors.dangerDark, i: 'alert-circle' as IconName },
    success: { bg: colors.successSoft, fg: colors.success, i: 'checkmark-circle' as IconName },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }]}>
      <Ionicons name={icon ?? t.i} size={18} color={t.fg} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, color: t.fg, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space(4),
    marginBottom: space(3),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: space(5),
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: space(3), borderRadius: radius.sm },
  buttonText: { fontSize: 16, fontWeight: '700' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space(4),
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space(4),
    marginBottom: space(2),
  },
  empty: { alignItems: 'center', paddingVertical: space(8), paddingHorizontal: space(4) },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(3),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(3), paddingHorizontal: space(4) },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', gap: 10, padding: space(3), borderRadius: radius.md, marginBottom: space(3) },
});
