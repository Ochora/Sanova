export const SYSTEM_PROMPT = `You are Sanova, a warm, gentle listening companion inside a Ugandan health app. People come to you when they feel stressed, sad, lonely, anxious or overwhelmed.

How to respond:
- Be kind, calm and human. Keep replies short: 2–4 sentences, plain words, no lists unless asked.
- Listen first. Reflect back what you hear, validate the feeling, then ask ONE gentle open question.
- Offer small, practical coping ideas when it fits (slow breathing, a short walk, water, rest, talking to someone they trust, writing thoughts down, prayer or faith if they bring it up).
- Respect Ugandan context: family and community matter; money, school, work and relationship pressures are common. Never judge.
- Reply in the language the person writes in (English, Luganda, Runyankole, Acholi/Luo, Swahili, etc.) when you can.
- You are not a doctor or therapist. Do not diagnose, and do not give medication doses. Encourage professional help when problems are ongoing or severe.

Safety — this overrides everything:
- If the person mentions suicide, wanting to die, self-harm, harming others, abuse, or being in danger, respond with care and seriousness. Tell them you're glad they told you, that they deserve support right now, and encourage them to:
  • call Mental Health Uganda's free counselling line 0800 21 21 21 (Mon–Fri 8:30am–5pm) or Butabika Hospital 0800 211 306;
  • reach out to someone they trust now and not stay alone;
  • call 999 or 112, or go to the nearest hospital, if they might act on these thoughts or are in danger.
  Children or anyone facing abuse can call Sauti 116 (free, 24 hours). Ask whether they are safe right now.
- Never provide information about methods of self-harm.`;


import { soundsLikeCrisis } from './mind';

const TOPICS: { words: string[]; reply: string }[] = [
  { words: ['money', 'school fees', 'fees', 'debt', 'job', 'work', 'boss', 'salary', 'business'], reply: "Money and work pressure can feel like a weight that follows you everywhere. You're not failing by feeling this way — it's a lot. What part of it is weighing on you most today?" },
  { words: ['exam', 'school', 'study', 'results', 'class'], reply: 'Studies can bring so much pressure, especially when people are counting on you. It makes sense you feel this way. What is the hardest part right now?' },
  { words: ['alone', 'lonely', 'nobody', 'no one', 'no friends'], reply: "Feeling alone is really painful. I'm glad you're talking about it here. Is there one person — even someone you haven't spoken to in a while — you could send a short message to today?" },
  { words: ['husband', 'wife', 'boyfriend', 'girlfriend', 'partner', 'relationship', 'marriage', 'family', 'mother', 'father', 'parents'], reply: "Relationships with the people closest to us can hurt the most. Your feelings are valid. Would you like to tell me a bit more about what's been happening?" },
  { words: ['sleep', 'tired', 'exhausted', "can't sleep", 'insomnia'], reply: 'Being exhausted makes everything feel heavier. Tonight, try putting your phone away 30 minutes before bed and taking a few slow breaths. What usually keeps you awake?' },
  { words: ['anxious', 'anxiety', 'worried', 'worry', 'panic', 'scared', 'fear'], reply: "That anxious feeling is exhausting. Let's slow it down together: breathe in for 4, hold for 4, and out for 6 — try it three times. What's the worry that keeps coming back?" },
  { words: ['sad', 'cry', 'crying', 'down', 'depressed', 'hopeless', 'empty'], reply: "I'm really sorry you're feeling this low. You don't have to have the answers right now. Has this feeling been with you for a while, or did something happen recently?" },
  { words: ['angry', 'annoyed', 'frustrated', 'irritated'], reply: "It sounds like something really frustrated you — anger often shows us something matters. What happened?" },
  { words: ['grief', 'died', 'death', 'passed away', 'funeral', 'lost'], reply: "I'm so sorry for your loss. Grief can come in waves and there is no right way to feel. Would you like to tell me about them?" },
];

const GENERIC = [
  "Thank you for sharing that with me. I'm listening. How is this making you feel right now?",
  "That sounds really hard. You're not alone in this. What would help you feel even a little bit better today?",
  "I hear you. It's okay to feel this way. Is there someone you trust who knows what you're going through?",
  "You're doing something brave by talking about it. What's one small thing you could do for yourself in the next hour?",
];

export const CRISIS_REPLY =
  "I'm really glad you told me, and I'm so sorry you're hurting this much. You deserve support right now. Please call Mental Health Uganda free on 0800 21 21 21 (weekdays 8:30–5) or Butabika on 0800 211 306, and reach out to someone you trust so you are not alone. If you might act on these thoughts or you're in danger, call 999 or 112 or go to the nearest hospital now. Are you safe right now?";

/** Offline listener used when no AI key is set or the network is down. */
export function offlineReply(text: string, turn: number): string {
  if (soundsLikeCrisis(text)) return CRISIS_REPLY;
  const t = text.toLowerCase();
  const topic = TOPICS.find((x) => x.words.some((w) => t.includes(w)));
  if (topic && turn < 3) return topic.reply;
  return GENERIC[turn % GENERIC.length];
}
