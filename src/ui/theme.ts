export const colors = {
  primary: '#0E6E5C',
  primaryDark: '#0A4F43',
  primarySoft: '#DDEFE9',
  accent: '#F2A541',
  accentSoft: '#FDF0DC',
  danger: '#D93A2B',
  dangerDark: '#A9281C',
  dangerSoft: '#FBE0DC',
  bg: '#F6F4EF',
  card: '#FFFFFF',
  text: '#1D2422',
  muted: '#5F6B67',
  faint: '#8E9894',
  border: '#E3E0D8',
  success: '#1F7A45',
  successSoft: '#E3F3E9',
  warning: '#B4520B',
  warningSoft: '#FCE6D3',
  mind: '#6B4EAD',
  mindSoft: '#EEE8FA',
};

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
export const space = (n: number) => n * 4;

export const type = {
  h1: { fontSize: 28, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700' as const, color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' as const },
};
