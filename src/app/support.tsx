import React from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../ui/components';
import { SupportOptions } from '../ui/SupportOptions';
import { colors, radius, space } from '../ui/theme';

export default function Support() {
  return (
    <Screen>
      <View style={{ backgroundColor: colors.mindSoft, borderRadius: radius.lg, padding: space(5), marginBottom: space(2) }}>
        <Text style={{ fontSize: 40 }}>💜</Text>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.mind, marginTop: space(2) }}>It's okay not to be okay</Text>
        <Text style={{ fontSize: 15, color: colors.text, marginTop: space(2), lineHeight: 22 }}>
          You reached out — that takes strength. Choose whatever feels easiest right now. You don't have to explain everything.
        </Text>
      </View>
      <SupportOptions />
    </Screen>
  );
}
