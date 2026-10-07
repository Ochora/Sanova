import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askClaude, CRISIS_REPLY, getApiKey, offlineReply, type ChatMessage } from '../lib/companion';
import { soundsLikeCrisis } from '../lib/mind';
import { useStore } from '../lib/store';
import { colors, radius, space, type } from '../ui/theme';

const STARTERS = ["I'm feeling stressed", "I can't sleep", 'I feel lonely', 'Something happened today', "I'm worried about money"];

export default function Companion() {
  const insets = useSafeAreaInsets();
  const { self } = useStore();
  const firstName = self?.name.split(' ')[0];
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi${firstName ? ` ${firstName}` : ''} 💜 I'm Sanova. This is a safe space — you can tell me what's on your mind, in your own words and your own language. What's going on?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [offlineNote, setOfflineNote] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    getApiKey().then(setKey);
  }, []);

  useEffect(() => {
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  }, [messages, busy]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput('');
    const history: ChatMessage[] = [...messages, { role: 'user', content: t }];
    setMessages(history);
    const isCrisis = soundsLikeCrisis(t);
    if (isCrisis) setCrisis(true);
    setBusy(true);
    let reply: string;
    if (key) {
      try {
        // The first assistant greeting is local; the API needs the conversation to start with the user.
        reply = await askClaude(key, history.slice(1), firstName);
        setOfflineNote(null);
      } catch (e) {
        reply = isCrisis ? CRISIS_REPLY : offlineReply(t, history.filter((m) => m.role === 'user').length - 1);
        setOfflineNote("Couldn't reach Sanova AI (no internet?) — replying in offline mode.");
      }
    } else {
      await new Promise((r) => setTimeout(r, 700));
      reply = offlineReply(t, history.filter((m) => m.role === 'user').length - 1);
    }
    setMessages([...history, { role: 'assistant', content: reply }]);
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {crisis && (
        <Pressable onPress={() => router.push('/support')} style={styles.crisis}>
          <Ionicons name="heart" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', flex: 1 }}>Talk to a real person now — free counsellors and your contacts</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </Pressable>
      )}
      <ScrollView ref={scroll} contentContainerStyle={{ padding: space(4), paddingBottom: space(4) }}>
        {key === null && (
          <View style={styles.note}>
            <Text style={[type.small, { color: colors.mind }]}>
              Offline listener mode. To use the full Sanova AI, add your AI key in Settings → AI companion.
            </Text>
          </View>
        )}
        {key ? (
          <View style={styles.note}>
            <Text style={[type.small, { color: colors.mind }]}>
              Messages are sent to Sanova AI (Anthropic Claude) to reply, and are not saved on this phone. Sanova is a listener, not a therapist.
            </Text>
          </View>
        ) : null}
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.me : styles.ai]}>
            <Text style={[styles.text, m.role === 'user' && { color: '#fff' }]}>{m.content}</Text>
          </View>
        ))}
        {busy && (
          <View style={[styles.bubble, styles.ai, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
            <ActivityIndicator color={colors.mind} size="small" />
            <Text style={type.small}>Sanova is typing…</Text>
          </View>
        )}
        {offlineNote && <Text style={[type.small, { textAlign: 'center', marginTop: space(2) }]}>{offlineNote}</Text>}
        {messages.length === 1 && (
          <View style={styles.starters}>
            {STARTERS.map((s) => (
              <Pressable key={s} onPress={() => send(s)} style={styles.starter}>
                <Text style={{ color: colors.mind, fontWeight: '600' }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: insets.bottom + space(2) }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type what's on your mind…"
          placeholderTextColor={colors.faint}
          multiline
          style={styles.input}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={() => send(input)} disabled={!input.trim() || busy} style={[styles.send, (!input.trim() || busy) && { opacity: 0.4 }]}>
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  crisis: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.mind, padding: space(3), paddingHorizontal: space(4) },
  note: { backgroundColor: colors.mindSoft, borderRadius: radius.md, padding: space(3), marginBottom: space(3) },
  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: space(4), paddingVertical: space(3), marginBottom: space(2) },
  ai: { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  me: { backgroundColor: colors.mind, alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  text: { fontSize: 16, lineHeight: 22, color: colors.text },
  starters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space(2) },
  starter: { borderWidth: 1.5, borderColor: colors.mindSoft, backgroundColor: '#FBF9FF', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: space(2), paddingHorizontal: space(3), paddingTop: space(2), backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: colors.bg, borderRadius: 22, paddingHorizontal: space(4), paddingVertical: 10, fontSize: 16, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.mind, alignItems: 'center', justifyContent: 'center' },
});
