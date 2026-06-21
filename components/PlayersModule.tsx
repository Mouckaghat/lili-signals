import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { computePlayerLeaders, matchHero, matchSquads, startingXI, type ImpactRow } from '../lib/playerImpact';
import type { MatchStats } from '../lib/matchStatsData';
import { useLiveResults } from '../lib/useLiveResults';
import { WC_TEAMS } from '../lib/wcData';
import { useLanguage } from '../contexts/LanguageContext';
import { HEATMAP_I18N } from '../lib/heatmapI18n';

const D = {
  panel:  '#0A1322',
  panel2: '#0F1C33',
  border: 'rgba(86,140,224,0.16)',
  blue:   '#2E7CFF',
  red:    '#FF3B47',
  gold:   '#F2C24B',
  green:  '#33C26B',
  purple: '#9A52FF',
  text1:  '#F1F5FF',
  text2:  '#8DA2C8',
  text3:  '#52668C',
};
const flagOf = (t: string) => WC_TEAMS.find((x) => x.name === t)?.flag ?? '🏳';
const ratingColor = (r: number | null) => r == null ? D.text3 : r >= 8 ? D.green : r >= 7 ? D.blue : r >= 6 ? D.text2 : D.red;

interface Sel { name: string; team: string }

export default function PlayersModule({ match }: { match: MatchStats }) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const results = useLiveResults();
  const { lang } = useLanguage();
  const L = useMemo(() => computePlayerLeaders(results, HEATMAP_I18N[lang] ?? HEATMAP_I18N.EN), [results, lang]);
  const hero = useMemo(() => matchHero(match.fixtureId, results), [match.fixtureId, results]);
  const xi = useMemo(() => startingXI(match.fixtureId), [match.fixtureId]);
  // No confirmed XI yet → fall back to the real squad pool (honest names early).
  const squads = useMemo(() => (xi ? null : matchSquads(match.fixtureId)), [match.fixtureId, xi]);

  const [sel, setSel] = useState<Sel | null>(null);
  const selected: Sel | null = sel ?? (L.spotlight ? { name: L.spotlight.row.name, team: L.spotlight.row.team } : null);
  const selRow: ImpactRow | undefined = selected ? L.impact.find((r) => r.name === selected.name && r.team === selected.team) : undefined;

  const LeadersLink = (
    <View style={[s.card, { borderColor: 'rgba(46,124,255,0.3)' }]}>
      <Text style={[s.cardTitle, { color: D.blue }]}>🏆 WORLD CUP LEADERS</Text>
      <Text style={s.linkNote}>Tournament-wide leaders (top scorers, assists, defenders, goalkeepers) now live on the 📈 Dashboard tab.</Text>
    </View>
  );

  const Contributors = xi && (
    <View style={s.card}>
      <Text style={s.cardTitle}>🧩 TEAM CONTRIBUTORS · {match.home} v {match.away}</Text>
      <View style={wide ? s.xiCols : undefined}>
        {([['home', xi.homeTeam, xi.home], ['away', xi.awayTeam, xi.away]] as const).map(([k, team, players]) => (
          <View key={k} style={s.xiCol}>
            <Text style={s.subhead}>{flagOf(team)} {team}</Text>
            {players.map((p) => (
              <Pressable key={p.name + p.number} onPress={() => setSel({ name: p.name, team })} style={s.xiRow}>
                <Text style={s.xiNum}>{p.number}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.xiName} numberOfLines={1}>{p.name}</Text>
                  <View style={s.barTrack}><View style={[s.barFill, { width: `${Math.round(p.influence * 100)}%` }]} /></View>
                </View>
                <Text style={s.xiPos}>{p.pos}</Text>
                <Text style={s.xiGA}>{p.goals ? `⚽${p.goals}` : ''}{p.assists ? ` 🅰${p.assists}` : ''}</Text>
                <Text style={[s.xiRating, { color: ratingColor(p.rating) }]}>{p.rating != null ? p.rating.toFixed(1) : '–'}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );

  // Shown only before a lineup is posted: real squad pool, not a predicted XI.
  const Squad = !xi && squads && (
    <View style={s.card}>
      <Text style={s.cardTitle}>📋 SQUADS · {match.home} v {match.away}</Text>
      <Text style={s.squadNote}>Full squad pool — starting XI confirms ~40 min before kickoff. Ranked by caps.</Text>
      <View style={wide ? s.xiCols : undefined}>
        {([['home', squads.homeTeam, squads.home], ['away', squads.awayTeam, squads.away]] as const).map(([k, team, players]) => (
          <View key={k} style={s.xiCol}>
            <Text style={s.subhead}>{flagOf(team)} {team}</Text>
            {players.map((p) => (
              <Pressable key={p.name} onPress={() => setSel({ name: p.name, team })} style={s.xiRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.xiName} numberOfLines={1}>{p.name}</Text>
                  {p.club ? <Text style={s.squadClub} numberOfLines={1}>{p.club}</Text> : null}
                </View>
                <Text style={s.squadCaps}>{p.caps}<Text style={s.pUnit}> caps</Text></Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );

  // Lili Spotlight + World Cup Impact are tournament-wide → they live on the
  // Dashboard now (recon #50). Players stays match-level: MOTM, contributors,
  // squad, and a Details card for the tapped match player.
  const Hero = (
    <View style={s.card}>
      <Text style={s.cardTitle}>⭐ MAN OF THE MATCH · {match.home} v {match.away}</Text>
      {hero ? (
        <>
          <View style={s.heroHead}>
            <Text style={s.heroName} numberOfLines={1}>{hero.flag} {hero.name}{hero.pos ? <Text style={s.heroPos}> · {hero.pos}</Text> : null}</Text>
            {hero.rating != null && <Text style={[s.heroRating, { color: ratingColor(hero.rating) }]}>{hero.rating.toFixed(1)}</Text>}
          </View>
          <View style={s.heroStats}>
            <HStat label="Goals" value={hero.goals} />
            <HStat label="Assists" value={hero.assists} />
            <HStat label="Shots" value={hero.shots} />
            <HStat label="Pass %" value={hero.passAccPct ? `${hero.passAccPct}` : '—'} />
          </View>
          <Text style={s.heroLili}>🦞 {hero.cleanSheet
            ? `${hero.name} kept a clean sheet and anchored the result — Lili's pick of the match.`
            : `${hero.name} was the key difference between the two teams — Lili's pick of the match.`}</Text>
        </>
      ) : <Text style={s.empty}>No standout yet for this match.</Text>}
    </View>
  );

  const Details = (
    <View style={s.card}>
      <Text style={s.cardTitle}>👤 PLAYER DETAILS</Text>
      {selected ? (
        <>
          <Text style={s.detName}>{flagOf(selected.team)} {selected.name}</Text>
          <Text style={s.detTeam}>{selected.team}{selRow?.club ? ` · ${selRow.club}` : ''}{selRow?.age ? ` · ${selRow.age}y` : ''}</Text>
          <View style={s.detGrid}>
            <DStat label="Goals" value={selRow?.goals ?? 0} color={D.gold} />
            <DStat label="Assists" value={selRow?.assists ?? 0} color={D.blue} />
            <DStat label="Impact" value={selRow?.impact ?? 0} color={D.purple} />
          </View>
          <View style={s.detGrid}>
            <DStat label="Clean Sheets" value={selRow?.cleanSheets ?? 0} color={D.green} />
            <DStat label="Saves" value={selRow?.saves ?? 0} color={D.text2} />
            <DStat label="Cards" value={(selRow?.yellows ?? 0) + (selRow?.reds ?? 0)} color={D.red} />
          </View>
        </>
      ) : <Text style={s.empty}>Tap any player to see details.</Text>}
    </View>
  );

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>👤 PLAYERS</Text>
      <Text style={s.h1sub}>Which players are driving this World Cup?</Text>
      <View style={wide ? s.cols : undefined}>
        <View style={wide ? s.left : undefined}>{LeadersLink}{Contributors}{Squad}</View>
        <View style={wide ? s.right : undefined}>{Hero}{Details}</View>
      </View>
      <Text style={s.foot}>Goals & cards from match events · assists, saves, ratings, tackles from player match stats · clean sheets derived · Impact = goals + assists + clean sheets + saves − discipline.</Text>
    </View>
  );
}

function HStat({ label, value }: { label: string; value: string | number }) {
  return <View style={s.hstat}><Text style={s.hstatVal}>{value}</Text><Text style={s.hstatLabel}>{label}</Text></View>;
}
function DStat({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={s.dstat}><Text style={[s.dstatVal, { color }]}>{value}</Text><Text style={s.dstatLabel}>{label}</Text></View>;
}

const s = StyleSheet.create({
  wrap:   { padding: 14, gap: 10 },
  h1:     { color: D.text1, fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  h1sub:  { color: D.text2, fontSize: 12, marginTop: -4, marginBottom: 4 },
  cols:   { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  left:   { flex: 1.25, minWidth: 0, gap: 10 },
  right:  { width: 320, gap: 10 },

  card:      { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  cardTitle: { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
  subhead:   { color: D.text2, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  linkNote:  { color: D.text2, fontSize: 11, lineHeight: 16 },
  mt:        { marginTop: 10 },
  empty:     { color: D.text3, fontSize: 11, paddingVertical: 4 },

  row:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  rank:   { color: D.text3, fontSize: 11, fontWeight: '800', width: 14 },
  pName:  { color: D.text1, fontSize: 12, fontWeight: '600', flex: 1 },
  pVal:   { color: D.text1, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  pUnit:  { color: D.text3, fontSize: 9, fontWeight: '700' },

  xiCols: { flexDirection: 'row', gap: 12 },
  xiCol:  { flex: 1, minWidth: 0 },
  xiRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  xiNum:  { color: D.text3, fontSize: 10, fontWeight: '800', width: 16, textAlign: 'center' },
  xiName: { color: D.text1, fontSize: 11, fontWeight: '600' },
  xiPos:  { color: D.text3, fontSize: 9, fontWeight: '700', width: 20, textAlign: 'center' },
  xiGA:   { color: D.gold, fontSize: 10, fontWeight: '700', width: 54, textAlign: 'right' },
  xiRating:{ fontSize: 11, fontWeight: '800', width: 28, textAlign: 'right' },
  barTrack:{ height: 3, backgroundColor: D.panel2, borderRadius: 2, marginTop: 2, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: D.blue, borderRadius: 2 },

  squadNote: { color: D.text3, fontSize: 10, marginTop: -4, marginBottom: 8, lineHeight: 14 },
  squadClub: { color: D.text3, fontSize: 9, fontWeight: '600' },
  squadCaps: { color: D.text2, fontSize: 11, fontWeight: '800', textAlign: 'right' },

  spotName:     { color: D.text1, fontSize: 18, fontWeight: '900', marginBottom: 6 },
  spotImpactRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: D.panel2, borderRadius: 8, padding: 8, marginBottom: 8 },
  spotImpactLabel:{ color: D.text2, fontSize: 12, fontWeight: '600' },
  spotImpactVal:{ color: D.purple, fontSize: 22, fontWeight: '900' },
  spotReason:   { color: D.text2, fontSize: 12, lineHeight: 17 },

  impactBarTrack:{ flex: 1, height: 6, backgroundColor: D.panel2, borderRadius: 3, overflow: 'hidden' },
  impactBarFill: { height: 6, backgroundColor: D.purple, borderRadius: 3 },

  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroName: { color: D.text1, fontSize: 15, fontWeight: '900', flex: 1 },
  heroPos:  { color: D.text3, fontSize: 11, fontWeight: '700' },
  heroRating:{ fontSize: 20, fontWeight: '900' },
  heroStats:{ flexDirection: 'row', gap: 6, marginTop: 8 },
  hstat:    { flex: 1, backgroundColor: D.panel2, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  hstatVal: { color: D.text1, fontSize: 15, fontWeight: '900' },
  hstatLabel:{ color: D.text2, fontSize: 9, marginTop: 1 },
  heroLili: { color: D.text2, fontSize: 11, lineHeight: 16, marginTop: 8, fontStyle: 'italic' },

  detName:  { color: D.text1, fontSize: 16, fontWeight: '900' },
  detTeam:  { color: D.text2, fontSize: 11, marginTop: 1, marginBottom: 8 },
  detGrid:  { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dstat:    { flex: 1, backgroundColor: D.panel2, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  dstatVal: { fontSize: 18, fontWeight: '900' },
  dstatLabel:{ color: D.text2, fontSize: 9, marginTop: 2 },

  foot:   { color: D.text3, fontSize: 9, textAlign: 'center', fontStyle: 'italic', marginTop: 2 },
});
