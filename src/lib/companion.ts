import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { SYSTEM_PROMPT } from './companionText';
export { CRISIS_REPLY, offlineReply, SYSTEM_PROMPT } from './companionText';

export const AI_MODEL = 'claude-haiku-5-5';
const KEY_NAME = 'sanova_ai_key';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_NAME);
  } catch {
    return AsyncStorage.getItem(KEY_NAME).catch(() => null);
  }
}

export async function setApiKey(key: string | null): Promise<void> {
  try {
    if (key) await SecureStore.setItemAsync(KEY_NAME, key);
    else await SecureStore.deleteItemAsync(KEY_NAME);
  } catch {
    if (key) await AsyncStorage.setItem(KEY_NAME, key);
    else await AsyncStorage.removeItem(KEY_NAME);
  }
}

export async function askClaude(apiKey: string, history: ChatMessage[], userName?: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT + (userName ? `\n\nThe person's first name is ${userName}.` : ''),
      messages: history.slice(-20),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AI service error ${res.status}${body ? `: ${body.slice(0, 160)}` : ''}`);
  }
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = json.content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
  if (!text) throw new Error('Empty reply');
  return text;
}

