import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EMERGENCY_NUMBERS } from '../../data/emergency';
import { GUIDE_BY_ID } from '../../data/firstAid';
import { call } from '../../lib/emergency';
import { Button, Card, Empty, Screen, SectionTitle } from '../../ui/components';
import { colors, space, type } from '../../ui/theme';

export default function GuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = GUIDE_BY_ID[id ?? ''];
  if (!g) return <Empty icon="help-circle" title="Guide not found" />;

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <Text style={type.h1}>{g.title}</Text>
      <Text style={[type.small, { marginTop: 4, marginBottom: space(4) }]}>{g.summary}</Text>

      {g.callFirst && (
        <Button
          title={`Call ${EMERGENCY_NUMBERS[0].number} now`}
          icon="call"
          variant="danger"
          onPress={() => call(EMERGENCY_NUMBERS[0].number)}
          style={{ marginBottom: space(4) }}
        />
      )}

      {g.steps.map((s, i) => (
        <View key={s.title} style={styles.step}>
          <View style={styles.num}>
            <Text style={styles.numText}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.h3, { fontSize: 17 }]}>{s.title}</Text>
            {s.detail ? <Text style={[type.body, { color: colors.muted, marginTop: 4 }]}>{s.detail}</Text> : null}
          </View>
        </View>
      ))}

      {g.doNot?.length ? (
        <>
          <SectionTitle>Do not</SectionTitle>
          <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
            {g.doNot.map((d) => (
              <View key={d} style={styles.bullet}>
                <Ionicons name="close-circle" size={18} color={colors.danger} />
                <Text style={[type.body, { flex: 1 }]}>{d}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {g.getHelpIf?.length ? (
        <>
          <SectionTitle>Get medical help if</SectionTitle>
          <Card>
            {g.getHelpIf.map((d) => (
              <View key={d} style={styles.bullet}>
                <Ionicons name="medical" size={18} color={colors.primary} />
                <Text style={[type.body, { flex: 1 }]}>{d}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Text style={[type.small, { marginTop: space(4) }]}>
        This guide supports, but does not replace, first-aid training. Uganda Red Cross runs first-aid courses across the country.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: space(3), marginBottom: space(5) },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  bullet: { flexDirection: 'row', gap: 10, marginBottom: 8 },
});
