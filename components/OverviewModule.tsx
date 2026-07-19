import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { computeOverview, type Overview } from '../lib/matchOverview';
import type { MatchStats } from '../lib/matchStatsData';
import { useLiveResults } from '../lib/useLiveResults';
import { useLiveEvents } from '../lib/useLiveEvents';
import { useLanguage } from '../contexts/LanguageContext';
import { HEATMAP_I18N } from '../lib/heatmapI18n';
import { MomentumPanel } from './MatchDashboard';

const D = {
  panel:  '#0A1322',
  panel2: '#0F1C33',
  hero:   '#0B1730',
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

// ── Cinematic Overview — the premium opening scene of a match report.
// "What happened, why did it happen, and why should I care?" Every value is a
// real api-football aggregate / committed datum (see lib/matchOverview.ts) — no
// fabricated context, attendance, weather or atmosphere.
export default function OverviewModule({ match }: { match: MatchStats }) {
  const results = useLiveResults();
  const events = useLiveEvents();
  const { lang } = useLanguage();
  const voice = lang === 'FR' ? 'FR' : 'EN';
  const o: Overview = useMemo(() => computeOverview(match, results, HEATMAP_I18N[lang] ?? HEATMAP_I18N.EN, events, voice), [match, results, lang, events, voice]);

  const statusColor = o.status === 'LIVE' ? D.red : o.status === 'FINAL' ? D.text2 : D.blue;

  // 1 + 2 + 3 — Cinematic hero: poster-style score, verdict badge, Lili headline.
  const Hero = (
    <View style={s.hero}>
      <View style={s.heroTop}>
        <View style={s.heroTeam}>
          <Text style={s.heroFlag}>{o.homeFlag}</Text>
          <Text style={s.heroName} numberOfLines={2}>{o.home}</Text>
        </View>
        <View style={s.heroScoreWrap}>
          <Text style={s.heroScore}>{o.homeScore ?? '–'}</Text>
          <Text style={s.heroDash}>-</Text>
          <Text style={s.heroScore}>{o.awayScore ?? '–'}</Text>
        </View>
        <View style={s.heroTeam}>
          <Text style={s.heroFlag}>{o.awayFlag}</Text>
          <Text style={s.heroName} numberOfLines={2}>{o.away}</Text>
        </View>
      </View>

      <View style={s.badge}>
        <Text style={s.badgeTxt}>{o.verdict.icon}  {o.verdict.text}</Text>
      </View>

      <View style={s.heroMeta}>
        <View style={[s.statusBadge, { borderColor: statusColor }]}>
          <Text style={[s.statusTxt, { color: statusColor }]}>{o.status}</Text>
        </View>
        <Text style={s.metaTxt}>Group {o.group}</Text>
        {!!o.venue && <Text style={s.metaTxt}>· {o.venue}{o.city ? `, ${o.city}` : ''}</Text>}
        {!!o.dateStr && <Text style={s.metaTxt}>· {o.dateStr}</Text>}
      </View>

      {!!o.headline && <Text style={s.headline}>🦞  {o.headline}</Text>}
    </View>
  );

  // 4 — Match & Stadium Intelligence: venue made visible, plus the match profile.
  const Stadium = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🏟 MATCH & STADIUM INTELLIGENCE</Text>
      <View style={s.factGrid}>
        {!!o.venue && <Fact k="Stadium" v={o.venue} />}
        {!!o.city && <Fact k="City" v={o.city} />}
        {o.capacity > 0 && <Fact k="Capacity" v={o.capacity.toLocaleString()} />}
        {o.tempJune != null && <Fact k="Temp · June avg" v={`${o.tempJune}°C`} />}
        {o.altitude != null && <Fact k="Altitude" v={`${o.altitude.toLocaleString()} m`} />}
      </View>
      <View style={s.profile}>
        <Text style={s.profileTxt}>{o.matchProfile.icon}  {o.matchProfile.text}</Text>
      </View>
    </View>
  );

  // 5 — Control Index as a duel.
  const Control = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🎛 LILI MATCH CONTROL INDEX</Text>
      <ControlRow name={o.home} val={o.controlHome} color={D.blue} />
      <ControlRow name={o.away} val={o.controlAway} color={D.red} />
      <Text style={s.note}>Modelled from possession, territory, shots, dangerous attacks and xG.</Text>
    </View>
  );

  const Stats = (
    <View style={s.card}>
      <Text style={s.cardTitle}>📊 KEY STATISTICS</Text>
      {o.stats.map((st) => (
        <View key={st.label} style={s.statRow}>
          <Text style={[s.statV, { color: D.blue, textAlign: 'left' }]}>{st.home}</Text>
          <View style={s.statMid}>
            <Text style={s.statL}>{st.label}</Text>
            <View style={s.statBar}>
              <View style={{ width: `${Math.round(st.hShare * 100)}%`, backgroundColor: D.blue }} />
              <View style={{ width: `${Math.round((1 - st.hShare) * 100)}%`, backgroundColor: D.red }} />
            </View>
          </View>
          <Text style={[s.statV, { color: D.red, textAlign: 'right' }]}>{st.away}</Text>
        </View>
      ))}
    </View>
  );

  // why it happened — Lili's evolving, multi-beat read (grows live during a
  // game). Each beat is a real signal + a labelled theory; falls back to the
  // one-line summary if no beat fired.
  const beatColor: Record<string, string> = {
    read: D.blue, theory: D.gold, swing: D.green, verdict: D.text1, story: D.purple,
  };
  const Lili = (
    <View style={[s.card, { borderColor: 'rgba(242,194,75,0.3)' }]}>
      <Text style={[s.cardTitle, { color: D.gold }]}>🦞 LILI MATCH INTELLIGENCE</Text>
      {o.beats.length > 0 ? (
        o.beats.map((b, i) => (
          <View key={i} style={[s.beat, { borderLeftColor: beatColor[b.tone] ?? D.gold }]}>
            <Text style={[s.beatTag, { color: beatColor[b.tone] ?? D.gold }]}>{b.tag}</Text>
            <Text style={s.beatTxt}>{b.text}</Text>
          </View>
        ))
      ) : (
        <Text style={s.liliTxt}>{o.lili}</Text>
      )}
    </View>
  );

  // 6 — Three match drivers as "case evidence".
  const Drivers = o.drivers.length > 0 && (
    <View style={s.card}>
      <Text style={s.cardTitle}>🔍 MATCH DRIVERS</Text>
      {o.drivers.slice(0, 3).map((d, i) => (
        <View key={i} style={s.evidence}>
          <Text style={s.evidenceTag}>EVIDENCE {String(i + 1).padStart(2, '0')}</Text>
          <Text style={s.evidenceTxt}>{d}</Text>
        </View>
      ))}
    </View>
  );

  // 7 — Smooth, compact momentum heartbeat (real events, honest tooltips). The
  // slot cancels MomentumPanel's built-in s.solo inset so it shares the exact
  // same width as every other card in the single column.
  const Momentum = <View style={s.momSlot}><MomentumPanel match={match} events={events} /></View>;

  // Single full-width column below the hero & stadium blocks — every card shares
  // the same width for a clean, consistent read. Lili's analysis leads (the
  // "why"), then the control duel, key stats, momentum heartbeat and the
  // evidence drivers.
  return (
    <View style={s.wrap}>
      {Hero}
      {Stadium}
      {Stats}
      {Momentum}
      {Lili}
      {Control}
      {Drivers}
      <Text style={s.foot}>Match intelligence from live stats, events & standings · attendance shown as stadium capacity · temperature is the typical June average · Lili storytelling — modelled, never fabricated.</Text>
    </View>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.fact}>
      <Text style={s.factV} numberOfLines={1}>{v}</Text>
      <Text style={s.factK} numberOfLines={1}>{k}</Text>
    </View>
  );
}

function ControlRow({ name, val, color }: { name: string; val: number; color: string }) {
  return (
    <View style={s.ctrlRow}>
      <View style={s.ctrlHead}>
        <Text style={s.ctrlName} numberOfLines={1}>{name}</Text>
        <Text style={[s.ctrlVal, { color }]}>{val}</Text>
      </View>
      <View style={s.ctrlTrack}>
        <View style={{ width: `${val}%`, height: '100%', backgroundColor: color, borderRadius: 5 }} />
      </View>
    </View>
  );
}

// 8 — Tournament Impact — standings/qualification effect of this match. Rendered
// as its own panel in the Overview tab (below the module), not inside it.
export function TournamentImpactPanel({ match }: { match: MatchStats }) {
  const results = useLiveResults();
  const { lang } = useLanguage();
  const o: Overview = useMemo(() => computeOverview(match, results, HEATMAP_I18N[lang] ?? HEATMAP_I18N.EN), [match, results, lang]);
  return (
    <View style={s.soloWrap}>
      <View style={[s.card, { borderColor: 'rgba(51,194,107,0.28)' }]}>
        <Text style={[s.cardTitle, { color: D.green }]}>🌍 TOURNAMENT IMPACT</Text>
        <View style={s.impRow}>
          <ImpactCard team={o.home} flag={o.homeFlag} d={o.impactHome} color={D.blue} />
          <ImpactCard team={o.away} flag={o.awayFlag} d={o.impactAway} color={D.red} />
        </View>
      </View>
    </View>
  );
}

function ImpactCard({ team, flag, d, color }: { team: string; flag: string; d: Overview['impactHome']; color: string }) {
  return (
    <View style={s.impCard}>
      <Text style={[s.impTeam, { color }]} numberOfLines={1}>{flag} {team}</Text>
      {d ? (
        <View style={s.impGrid}>
          <Imp k="Position" v={`${d.rank}${d.rank === 1 ? 'st' : d.rank === 2 ? 'nd' : d.rank === 3 ? 'rd' : 'th'}`} />
          <Imp k="Points" v={`${d.points}`} />
          <Imp k="GD" v={`${d.gd > 0 ? '+' : ''}${d.gd}`} />
          <Imp k="Qualify" v={`${d.qualPct}%`} />
        </View>
      ) : <Text style={s.impNone}>No standings yet.</Text>}
    </View>
  );
}
function Imp({ k, v }: { k: string; v: string }) {
  return <View style={s.imp}><Text style={s.impV} numberOfLines={1}>{v}</Text><Text style={s.impK} numberOfLines={1}>{k}</Text></View>;
}

const s = StyleSheet.create({
  wrap:  { padding: 14, gap: 10 },
  soloWrap: { paddingHorizontal: 14 },
  // Cancels MomentumPanel's s.solo inset so it matches the other cards' width.
  momSlot: { marginHorizontal: -12, marginTop: -12 },

  card:      { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  cardTitle: { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },

  // ── Hero ──
  hero: { backgroundColor: D.hero, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(86,140,224,0.22)', paddingVertical: 18, paddingHorizontal: 14, gap: 12,
          shadowColor: D.blue, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
  heroTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  heroTeam:  { flex: 1, alignItems: 'center', gap: 4 },
  heroFlag:  { fontSize: 34 },
  heroName:  { color: D.text1, fontSize: 15, fontWeight: '800', textAlign: 'center', letterSpacing: 0.3 },
  heroScoreWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  heroScore: { color: D.text1, fontSize: 52, fontWeight: '900', letterSpacing: 1, lineHeight: 56 },
  heroDash:  { color: D.text3, fontSize: 34, fontWeight: '700' },

  badge:     { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(242,194,75,0.10)',
               borderWidth: 1, borderColor: 'rgba(242,194,75,0.5)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7,
               shadowColor: D.gold, shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  badgeTxt:  { color: D.gold, fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },

  heroMeta:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, flexWrap: 'wrap' },
  statusBadge:{ borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  metaTxt:   { color: D.text2, fontSize: 11.5 },
  headline:  { color: D.text1, fontSize: 13.5, fontWeight: '700', textAlign: 'center', lineHeight: 19, fontStyle: 'italic', marginTop: 2,
               paddingHorizontal: 6 },

  // ── Stadium ──
  factGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact:      { minWidth: 92, flexGrow: 1, backgroundColor: D.panel2, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10 },
  factV:     { color: D.text1, fontSize: 15, fontWeight: '900' },
  factK:     { color: D.text2, fontSize: 9, marginTop: 2, letterSpacing: 0.3 },
  profile:   { alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(46,124,255,0.10)', borderWidth: 1,
               borderColor: 'rgba(46,124,255,0.4)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  profileTxt:{ color: D.blue, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

  // ── Control duel ──
  ctrlRow:   { marginBottom: 10 },
  ctrlHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  ctrlName:  { color: D.text1, fontSize: 13, fontWeight: '700', flex: 1, minWidth: 0 },
  ctrlVal:   { fontSize: 22, fontWeight: '900', marginLeft: 8 },
  ctrlTrack: { height: 10, borderRadius: 5, backgroundColor: D.panel2, overflow: 'hidden' },
  note:      { color: D.text3, fontSize: 9.5, marginTop: 2, textAlign: 'center' },

  // ── Key stats ──
  statRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  statV:    { width: 50, fontSize: 14, fontWeight: '800' },
  statMid:  { flex: 1 },
  statL:    { color: D.text2, fontSize: 10, textAlign: 'center', marginBottom: 3 },
  statBar:  { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: D.panel2 },

  liliTxt:  { color: D.text1, fontSize: 12, lineHeight: 18 },
  beat:     { backgroundColor: D.panel2, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10, marginTop: 8, borderLeftWidth: 3, borderLeftColor: D.gold },
  beatTag:  { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 3 },
  beatTxt:  { color: D.text1, fontSize: 12.5, lineHeight: 18 },

  // ── Evidence drivers ──
  evidence:   { backgroundColor: D.panel2, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10, marginTop: 8,
                borderLeftWidth: 3, borderLeftColor: D.gold },
  evidenceTag:{ color: D.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 3 },
  evidenceTxt:{ color: D.text1, fontSize: 12, lineHeight: 17 },

  // ── Tournament impact ──
  impRow:   { flexDirection: 'row', gap: 8 },
  impCard:  { flex: 1, backgroundColor: D.panel2, borderRadius: 10, padding: 10 },
  impTeam:  { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  impGrid:  { flexDirection: 'row', gap: 6 },
  imp:      { flex: 1, minWidth: 0 },
  impV:     { color: D.text1, fontSize: 14, fontWeight: '900' },
  impK:     { color: D.text2, fontSize: 8.5 },
  impNone:  { color: D.text3, fontSize: 11 },

  foot:     { color: D.text3, fontSize: 9, textAlign: 'center', fontStyle: 'italic', marginTop: 2 },
});
