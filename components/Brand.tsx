// Canonical Worldcupilou brand layer — the single source of truth for the
// three brand lines. Reuse this everywhere (chrome, footers, About/Credits,
// start screens) instead of hand-writing the brand per screen, so it stays
// consistent. The names are proper nouns and don't translate; if "Built by"
// ever needs localising, wire it through i18n here in ONE place.
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export const BRAND_LINES = ['Worldcupilou', 'Built by Lobster Inc', 'Jura Technology'] as const;

type Tone = 'chrome' | 'dim';
const TONES: Record<Tone, { app: string; line: string }> = {
  // bright-ish, for app chrome / headers / credits
  chrome: { app: '#9A52FF', line: '#8DA2C8' },
  // subtle, for quiet page footers
  dim:    { app: 'rgba(238,242,255,0.32)', line: 'rgba(238,242,255,0.15)' },
};

export default function Brand({
  tone = 'dim',
  align = 'center',
  style,
}: {
  tone?: Tone;
  align?: 'center' | 'flex-start' | 'flex-end';
  style?: StyleProp<ViewStyle>;
}) {
  const c = TONES[tone];
  return (
    <View style={[{ alignItems: align }, style]}>
      <Text style={[s.app, { color: c.app }]}>{BRAND_LINES[0]}</Text>
      <Text style={[s.line, { color: c.line }]}>{BRAND_LINES[1]}</Text>
      <Text style={[s.line, { color: c.line }]}>{BRAND_LINES[2]}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  app:  { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  line: { fontSize: 9, fontWeight: '600', letterSpacing: 0.2, marginTop: 1 },
});
