import React from 'react';
import { ScrollView } from 'react-native';
import { useStore } from '../lib/store';
import { Chip } from './components';

/** Horizontal chip row to pick a family member. `allowAll` adds an "Everyone" option (value undefined). */
export function MemberPicker({
  value,
  onChange,
  allowAll,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  allowAll?: boolean;
}) {
  const { data } = useStore();
  if (data.members.length <= 1) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
      {allowAll && <Chip label="Everyone" selected={value === undefined} onPress={() => onChange(undefined)} />}
      {data.members.map((m) => (
        <Chip
          key={m.id}
          label={m.relationship === 'self' ? `${m.name.split(' ')[0]} (me)` : m.name.split(' ')[0]}
          selected={value === m.id}
          onPress={() => onChange(m.id)}
        />
      ))}
    </ScrollView>
  );
}
