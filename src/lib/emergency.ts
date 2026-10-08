import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { Linking } from 'react-native';
import { mapsLink, type LatLng } from './geo';
import type { EmergencyContact } from './types';

export interface Fix extends LatLng {
  accuracy?: number | null;
  at: number;
  approximate?: boolean;
}

/** Best-effort current location: fresh GPS with a timeout, falling back to last known. */
export async function getLocation(timeoutMs = 12000): Promise<Fix | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const fresh = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then((p) => ({
      lat: p.coords.latitude,
      lng: p.coords.longitude,
      accuracy: p.coords.accuracy,
      at: p.timestamp,
    }));
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
    const got = await Promise.race([fresh, timeout]);
    if (got) return got;
    const last = await Location.getLastKnownPositionAsync();
    return last
      ? { lat: last.coords.latitude, lng: last.coords.longitude, accuracy: last.coords.accuracy, at: last.timestamp, approximate: true }
      : null;
  } catch {
    return null;
  }
}

export function sosMessage(name: string, fix: Fix | null, support?: string): string {
  const who = name || 'I';
  const loc = fix
    ? `Location: ${mapsLink(fix)}${fix.accuracy ? ` (±${Math.round(fix.accuracy)} m)` : ''}${fix.approximate ? ' — last known' : ''}`
    : 'Location unavailable — please call me.';
  return `EMERGENCY: ${who} need${name ? 's' : ''} urgent help. ${loc}.${support ? ` Note: ${support}` : ''} Sent from the Sanova health app.`;
}

/** Opens the SMS composer pre-filled for all contacts. Returns 'sent' | 'cancelled' | 'unavailable'. */
export async function sendSos(contacts: EmergencyContact[], message: string): Promise<string> {
  const phones = contacts.map((c) => c.phone).filter(Boolean);
  if (!phones.length) return 'no-contacts';
  try {
    if (await SMS.isAvailableAsync()) {
      const { result } = await SMS.sendSMSAsync(phones, message);
      return result;
    }
  } catch {
    // fall through to the sms: URL
  }
  const url = `sms:${phones.join(',')}?body=${encodeURIComponent(message)}`;
  await Linking.openURL(url).catch(() => {});
  return 'unknown';
}

export function call(number: string) {
  return Linking.openURL(`tel:${number.replace(/[^\d+]/g, '')}`).catch(() => {});
}

export function whatsapp(phone: string, text: string) {
  const digits = phone.replace(/[^\d]/g, '').replace(/^0/, '256');
  return Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`).catch(() => {});
}
