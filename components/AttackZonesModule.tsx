import { useMemo } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { dangerProfile, liliSummary, tournamentAttack, nextOpponent, teamAggregate, type DangerProfile } from '../lib/attackZones';
import type { MatchStats } from '../lib/matchStatsData';
import { useLiveResults } from '../lib/useLiveResults';
import { WC_TEAMS } from '../lib/wcData';

const D = {
  panel:  '#0A1322',
  panel2: '#0F1C33',
  border: 'rgba(86,140,224,0.16)',
  blue:   '#2E7CFF',
  red:    '#FF3B47',
  gold:   '#F2C24B',
  green:  '#33C26B',
  pitch:  '#07181E',
  line:   'rgba(255,255,255,0.55)',
  text1:  '#F1F5FF',
  text2:  '#8DA2C8',
  text3:  '#52668C',
};
const flagOf = (t: string) => WC_TEAMS.find((x) => x.name === t)?.flag ?? '🏳';
const rgba = (hex: string, a: number) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
};

// soft glow blob — bigger + brighter with intensity
function Glow({ color, norm, pos }: { color: string; norm: number; pos: any }) {
  if (norm <= 0.02) return null;
  const size = 26 + norm * 30; // % of pitch height-ish via aspect; use % width
  const blur = Platform.OS === 'web' ? ({ filter: `blur(${6 + norm * 8}px)` } as any) : null;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: `${size}%`, aspectRatio: 1, borderRadius: 9999,
      backgroundColor: rgba(color, 0.18 + 0.45 * norm), transform: [{ translateX: -1 }] }, pos, blur]} />
  );
}

export default function AttackZonesModule({ match }: { match: MatchStats }) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const results = useLiveResults();
  const h = useMemo(() => dangerProfile(match.homeStats), [match.homeStats]);
  const a = useMemo(() => dangerProfile(match.awayStats), [match.awayStats]);
  const rank = useMemo(() => tournamentAttack(results), [results]);
  const summary = liliSummary(match.home, match.away, h, a);

  const mx = (x: number, y: number) => Math.max(x, y, 1);
  const nInsideH = h.inside / mx(h.inside, a.inside), nInsideA = a.inside / mx(h.inside, a.inside);
  const nOutH = h.outside / mx(h.outside, a.outside), nOutA = a.outside / mx(h.outside, a.outside);
  const nWideH = h.wide / mx(h.wide, a.wide), nWideA = a.wide / mx(h.wide, a.wide);

  const next = useMemo(() => nextOpponent(match.home, results), [match.home, results]);
  const teamAgg = useMemo(() => teamAggregate(match.home), [match.home]);
  const oppAgg = useMemo(() => (next ? teamAggregate(next.opponent) : null), [next]);

  const Pitch = (
    <View style={s.pitchWrap}>
      <View style={s.attackRow}>
        <Text style={[s.attackLabel, { color: D.blue }]}>{match.home.toUpperCase()} ATTACK →</Text>
        <Text style={[s.attackLabel, { color: D.red }]}>← {match.away.toUpperCase()} ATTACK</Text>
      </View>
      <View style={s.pitch}>
        {/* home (blue) attacks right */}
        <Glow color={D.blue} norm={nOutH}   pos={{ right: '20%', top: '28%' }} />
        <Glow color={D.blue} norm={nInsideH} pos={{ right: '6%',  top: '32%' }} />
        <Glow color={D.blue} norm={nWideH}   pos={{ right: '2%',  top: '2%' }} />
        <Glow color={D.blue} norm={nWideH}   pos={{ right: '2%',  bottom: '2%' }} />
        {/* away (red) attacks left */}
        <Glow color={D.red} norm={nOutA}   pos={{ left: '20%', top: '28%' }} />
        <Glow color={D.red} norm={nInsideA} pos={{ left: '6%',  top: '32%' }} />
        <Glow color={D.red} norm={nWideA}   pos={{ left: '2%',  top: '2%' }} />
        <Glow color={D.red} norm={nWideA}   pos={{ left: '2%',  bottom: '2%' }} />
        {/* markings */}
        <View style={s.halfway} /><View style={s.circle} />
        <View style={[s.box, s.boxL]} /><View style={[s.box, s.boxR]} />
      </View>
      <Text style={s.pitchNote}>Glow = where danger came from: central (box), long-range, and wide (corners). Not left/right tracking.</Text>
    </View>
  );

  const Compare = (
    <View style={s.card}>
      <Text style={s.cardTitle}>⚔️ DANGER · {match.home} v {match.away}</Text>
      <CmpRow label="Dangerous Attacks" h={h.dangerous} a={a.dangerous} bold />
      <CmpRow label="Box Shots" h={h.inside} a={a.inside} />
      <CmpRow label="Long-range" h={h.outside} a={a.outside} />
      <CmpRow label="On Target" h={h.sot} a={a.sot} />
      <CmpRow label="xG" h={h.xg.toFixed(2)} a={a.xg.toFixed(2)} />
      <CmpRow label="Wide (corners)" h={h.wide} a={a.wide} />
      <View style={s.lili}><Text style={s.liliTag}>🦞 LILI</Text><Text style={s.liliText}>{summary}</Text></View>
    </View>
  );

  const Ranking = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🌍 WORLD CUP ATTACK RANKING</Text>
      <View style={s.rankGrid}>
        <RankCard label="Best Attack" sub="most goals" t={rank.bestAttack?.team} v={rank.bestAttack ? `${rank.bestAttack.goals} G` : '—'} color={D.gold} />
        <RankCard label="Most Dangerous" sub="highest xG" t={rank.mostDangerous?.team} v={rank.mostDangerous ? rank.mostDangerous.xg.toFixed(1) : '—'} color={D.red} />
        <RankCard label="Most Box Shots" sub="inside the area" t={rank.mostBoxShots?.team} v={rank.mostBoxShots ? `${rank.mostBoxShots.inside}` : '—'} color={D.blue} />
        <RankCard label="Most Wing Threat" sub="corners" t={rank.mostWingThreat?.team} v={rank.mostWingThreat ? `${rank.mostWingThreat.corners}` : '—'} color={D.green} />
      </View>
    </View>
  );

  const Future = next && (
    <View style={s.card}>
      <Text style={s.cardTitle}>🔮 NEXT MATCH · {match.home} v {next.opponent}</Text>
      <View style={s.futRow}>
        <Text style={s.futTeam}>{flagOf(match.home)} {match.home}</Text>
        <Text style={s.futVal}>{teamAgg.inside} box · {teamAgg.corners} cnr · {teamAgg.xg.toFixed(1)} xG</Text>
      </View>
      <View style={s.futRow}>
        <Text style={s.futTeam}>{next.opponentFlag} {next.opponent}</Text>
        <Text style={s.futVal}>{oppAgg ? `${oppAgg.inside} box · ${oppAgg.corners} cnr · ${oppAgg.xg.toFixed(1)} xG` : 'no data yet'}</Text>
      </View>
      <Text style={s.futLili}>🦞 {teamAgg.inside >= (oppAgg?.inside ?? 0)
        ? `${match.home} have created more central danger so far — expect pressure around ${next.opponent}'s box.`
        : `${next.opponent} have generated more box threat — ${match.home} must defend their area.`}</Text>
    </View>
  );

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>⚔️ ATTACK ZONES</Text>
      <Text style={s.h1sub}>Where does each team create danger?</Text>
      <View style={wide ? s.cols : undefined}>
        <View style={wide ? s.left : undefined}>{Pitch}{Compare}</View>
        <View style={wide ? s.right : undefined}>{Ranking}{Future}</View>
      </View>
      <Text style={s.foot}>Danger modelled from real shot data (inside/outside box, on target, xG) + corners as a wide-threat proxy. No zonal left/right tracking in the feed.</Text>
    </View>
  );
}

function CmpRow({ label, h, a, bold }: { label: string; h: string | number; a: string | number; bold?: boolean }) {
  return (
    <View style={s.cmp}>
      <Text style={[s.cmpV, { color: D.blue, textAlign: 'left' }, bold && s.cmpBold]}>{h}</Text>
      <Text style={s.cmpL}>{label}</Text>
      <Text style={[s.cmpV, { color: D.red, textAlign: 'right' }, bold && s.cmpBold]}>{a}</Text>
    </View>
  );
}
function RankCard({ label, sub, t, v, color }: { label: string; sub: string; t?: string; v: string; color: string }) {
  return (
    <View style={s.rankCard}>
      <Text style={s.rankLabel}>{label}</Text>
      <Text style={[s.rankTeam, { color }]} numberOfLines={1}>{t ? `${flagOf(t)} ${t}` : '—'}</Text>
      <Text style={s.rankVal}>{v} · {sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { padding: 14, gap: 10 },
  h1:    { color: D.text1, fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  h1sub: { color: D.text2, fontSize: 12, marginTop: -4, marginBottom: 4 },
  cols:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  left:  { flex: 1.3, minWidth: 0, gap: 10 },
  right: { width: 320, gap: 10 },

  pitchWrap: { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  attackRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  attackLabel:{ fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  pitch:     { width: '100%', aspectRatio: 16 / 9, backgroundColor: D.pitch, borderRadius: 8, borderWidth: 1.5,
               borderColor: 'rgba(120,180,255,0.4)', overflow: 'hidden' },
  halfway:   { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1.5, marginLeft: -0.75, backgroundColor: D.line },
  circle:    { position: 'absolute', left: '50%', top: '50%', width: '15%', aspectRatio: 1, marginLeft: '-7.5%', marginTop: '-13%', borderRadius: 999, borderWidth: 1.5, borderColor: D.line },
  box:       { position: 'absolute', top: '22%', bottom: '22%', width: '15%', borderWidth: 1.5, borderColor: D.line },
  boxL:      { left: 0, borderLeftWidth: 0 },
  boxR:      { right: 0, borderRightWidth: 0 },
  pitchNote: { color: D.text3, fontSize: 9, marginTop: 6, fontStyle: 'italic' },

  card:      { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  cardTitle: { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },

  cmp:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  cmpV:   { flex: 1, fontSize: 14, fontWeight: '700' },
  cmpBold:{ fontSize: 17, fontWeight: '900' },
  cmpL:   { flex: 1.6, color: D.text2, fontSize: 11, textAlign: 'center' },

  lili:    { marginTop: 10, backgroundColor: D.panel2, borderRadius: 10, padding: 10 },
  liliTag: { color: D.gold, fontSize: 10, fontWeight: '800', marginBottom: 3 },
  liliText:{ color: D.text1, fontSize: 12, lineHeight: 17 },

  rankGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rankCard:{ width: '47.5%', flexGrow: 1, backgroundColor: D.panel2, borderRadius: 10, padding: 10 },
  rankLabel:{ color: D.text3, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  rankTeam:{ fontSize: 13, fontWeight: '800', marginTop: 3 },
  rankVal: { color: D.text2, fontSize: 10, marginTop: 2 },

  futRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  futTeam: { color: D.text1, fontSize: 13, fontWeight: '700' },
  futVal:  { color: D.text2, fontSize: 11 },
  futLili: { color: D.text2, fontSize: 11, lineHeight: 16, marginTop: 8, fontStyle: 'italic' },

  foot:   { color: D.text3, fontSize: 9, textAlign: 'center', fontStyle: 'italic', marginTop: 2 },
});
