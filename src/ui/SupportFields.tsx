import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ASSISTIVE_OPTIONS, DISABILITIES } from '../lib/inclusion';
import { haptic } from './Choice';
import { Chip, ChipRow } from './components';
import { colors, radius, space, type } from './theme';

export interface SupportValue {
  disabilities: string[];
  assistive: string;
  supportNeeds: string;
}

/** Disability, assistive devices and support needs — all optional. */
export function SupportFields({ value, onChange, who = 'you' }: { value: SupportValue; onChange: (v: SupportValue) => void; who?: string }) {
  const toggle = (id: string) => {
    haptic();
    const has = value.disabilities.includes(id);
    onChange({ ...value, disabilities: has ? value.disabilities.filter((x) => x !== id) : [...value.disabilities, id] });
  };
  const assistiveList = value.assistive.split(',').map((s) => s.trim()).filter(Boolean);
  const toggleAssistive = (a: string) => {
    const next = assistiveList.includes(a) ? assistiveList.filter((x) => x !== a) : [...assistiveList, a];
    onChange({ ...value, assistive: next.join(', ') });
  };

  return (
    <View>
      <Text style={styles.label}>Disability or extra support needs (optional)</Text>
      <Text style={[type.small, { marginBottom: space(3) }]}>
        Helps Sanova and health workers support {who} better. Tick any that apply — or none.
      </Text>
      <View style={styles.grid}>
        {DISABILITIES.map((d) => {
          const on = value.disabilities.includes(d.id);
          return (
            <Pressable key={d.id} onPress={() => toggle(d.id)} style={[styles.tile, on && styles.tileOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <Text style={{ fontSize: 22 }}>{d.emoji}</Text>
              <Text style={[styles.tileText, on && { color: colors.primary, fontWeight: '800' }]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {value.disabilities.length > 0 && (
        <>
          <Text style={[styles.label, { marginTop: space(4) }]}>Uses (optional)</Text>
          <ChipRow>
            {ASSISTIVE_OPTIONS.map((a) => (
              <Chip key={a} label={a} selected={assistiveList.includes(a)} onPress={() => toggleAssistive(a)} />
            ))}
          </ChipRow>
          <Text style={[styles.label, { marginTop: space(4) }]}>How should people help or communicate in an emergency?</Text>
          <TextInput
            value={value.supportNeeds}
            onChangeText={(t) => onChange({ ...value, supportNeeds: t })}
            placeholder="e.g. I am Deaf — please write things down or text me"
            placeholderTextColor={colors.faint}
            multiline
            style={styles.input}
          />
          <Text style={[type.small, { marginTop: 4 }]}>Shown on the emergency card and added to SOS messages.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  tile: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: space(3),
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tileText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space(3),
    minHeight: 70,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
