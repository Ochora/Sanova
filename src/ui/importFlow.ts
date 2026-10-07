import { Alert } from 'react-native';
import { pickBundleText } from '../lib/files';
import { parseBundle, type SanovaBundle } from '../lib/portable';

/** Pick a .sanova file and ask the user to confirm. Resolves with the bundle, or null. */
export async function pickAndConfirmBundle(purpose: 'self' | 'family'): Promise<SanovaBundle | null> {
  let bundle: SanovaBundle;
  try {
    const text = await pickBundleText();
    if (!text) return null;
    bundle = parseBundle(text);
  } catch (e) {
    Alert.alert('Could not open file', e instanceof Error ? e.message : String(e));
    return null;
  }
  const parts = [
    `${bundle.medications.length} medicine${bundle.medications.length === 1 ? '' : 's'}`,
    `${bundle.checkIns.length + bundle.moodLogs.length} check-ins`,
    `${bundle.records.length} record${bundle.records.length === 1 ? '' : 's'}`,
  ];
  const from = bundle.exportedBy ? `\nShared by ${bundle.exportedBy}.` : '';
  return new Promise((resolve) => {
    Alert.alert(
      purpose === 'self' ? `Is this you, ${bundle.member.name}?` : `Add ${bundle.member.name} to your family?`,
      `This file has ${parts.join(', ')}.${from}`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: purpose === 'self' ? 'Yes, this is me' : 'Add', onPress: () => resolve(bundle) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
