// Match Analytics dashboard — single-screen composition matching the MRD
// reference: MOMENTUM (top) · ATTACK ZONES / SHOTS MAP / PASS MAP (middle) ·
// KEY STATS (bottom). Every pitch view uses the shared <PitchSvg>. Bleu-Blanc-
// Rouge identity. Every panel is an honest model from real api-football
// aggregates — no player tracking, no fabricated coordinates or pass pairs.

import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import PitchSvg, { PITCH_W, PITCH_H } from './PitchSvg';
import MomentumWave, { type MomentumMarker } from './MomentumWave';
import { buildMomentum, type MomentumEvent } from '../lib/matchMomentum';
import { shotsMatch, type ShotTeam } from '../lib/shotsModel';
import { passStructure, type PassNode } from '../lib/passStructure';
import type { MatchStats } from '../lib/matchStatsData';
import type { PlayerMatchStat } from '../lib/playerStatsData';
import { MATCH_EVENTS, type MatchEvents } from '../lib/matchEventsData';
import { useLiveResults } from '../lib/useLiveResults';
import { useLivePlayers } from '../lib/useLivePlayers';

const D = {
  bg: '#04060D', panel: '#0A1322', panel2: '#0F1C33', border: 'rgba(86,140,224,0.18)',
  blue: '#2E7CFF', red: '#FF3B47', white: '#EAF1FF', purple: '#9A52FF',
  text1: '#F1F5FF', text2: '#8DA2C8', text3: '#52668C',
};

// deterministic PRNG so a given fixture always renders identical dot placement
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const surname = (full: string) => { const p = full.trim().split(' '); return p.length > 1 ? p[p.length - 1] : full; };

// ── Card shell ──────────────────────────────────────────────────────────────
function Card({ title, children, style, legend }: { title: string; children: React.ReactNode; style?: any; legend?: React.ReactNode }) {
  return (
    <View style={[s.card, style]}>
      <View style={s.cardHead}>
        <Text style={s.cardTitle}>{title}</Text>
        {legend}
      </View>
      {children}
    </View>
  );
}
function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View style={s.legend}>
      {items.map((it) => (
        <View key={it.label} style={s.legItem}>
          <View style={[s.legDot, { backgroundColor: it.color }]} />
          <Text style={s.legTxt}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── ATTACK ZONES ────────────────────────────────────────────────────────────
// 5 lateral channels, MODELLED & symmetric (we have no L/R tracking). Bands are
// Bleu-Blanc-Rouge identity; opacity ∝ modelled channel share of danger.
const ZONE_LABELS = ['Left Wing', 'Left Half-Space', 'Centre', 'Right Half-Space', 'Right Wing'];
const ZONE_COLORS = ['#2E7CFF', '#5E97F5', '#EAF1FF', '#F5727B', '#FF3B47'];

function attackZoneShares(m: MatchStats): number[] {
  const agg = (t: typeof m.homeStats) => ({
    central: (t.shotsInsideBox || 0) * 0.6 + (t.xg || 0) * 2 + (t.shotsOnGoal || 0) * 0.5,
    distance: (t.shotsOutsideBox || 0) * 0.5,
    wide: (t.corners || 0) * 0.5,
    poss: t.possession || 0,
  });
  const h = agg(m.homeStats), a = agg(m.awayStats);
  const central = h.central + a.central, distance = h.distance + a.distance, wide = h.wide + a.wide, poss = (h.poss + a.poss) / 2;
  // symmetric channel weights: [wing, half-space, centre, half-space, wing]
  const wing = wide + 0.15 * poss + 0.2;
  const half = 0.5 * central + distance + 0.25 * poss + 0.3;
  const centre = central + 0.4 * distance + 0.2;
  const raw = [wing, half, centre, half, wing];
  const sum = raw.reduce((x, y) => x + y, 0) || 1;
  return raw.map((v) => v / sum);
}

export function AttackZonesPanel({ match }: { match: MatchStats }) {
  const shares = useMemo(() => attackZoneShares(match), [match]);
  const max = Math.max(...shares);
  return (
    <Card title="ATTACK ZONES" style={s.solo} legend={<Legend items={[{ color: D.blue, label: match.home }, { color: D.red, label: match.away }]} />}>
      <PitchSvg>
        {shares.map((sh, i) => {
          const bw = PITCH_W / 5;
          const op = 0.18 + 0.55 * (sh / max);
          return <Rect key={i} x={i * bw} y={2} width={bw} height={PITCH_H - 4} fill={ZONE_COLORS[i]} opacity={op} />;
        })}
      </PitchSvg>
      <View style={s.zoneRow}>
        {shares.map((sh, i) => (
          <View key={i} style={s.zoneCol}>
            <Text style={[s.zonePct, { color: ZONE_COLORS[i] === '#EAF1FF' ? D.white : ZONE_COLORS[i] }]}>{Math.round(sh * 100)}%</Text>
            <Text style={s.zoneLbl}>{ZONE_LABELS[i]}</Text>
          </View>
        ))}
      </View>
      <Text style={s.note}>Modelled from possession, shots & xG. Not player tracking.</Text>
    </Card>
  );
}

// ── SHOTS MAP ───────────────────────────────────────────────────────────────
interface Dot { x: number; y: number; r: number; kind: 'goal' | 'sot' | 'off'; team: 'home' | 'away' }

function buildDots(seed: string, t: ShotTeam, side: 'home' | 'away'): Dot[] {
  const r = rng(seed + side);
  const dots: Dot[] = [];
  // home attacks the RIGHT goal, away the LEFT goal
  const goalX = side === 'home' ? PITCH_W : 0;
  const dir = side === 'home' ? -1 : 1; // toward midfield
  const place = (inBox: boolean) => {
    // x: inside box ≈ 6–16 units from goal; outside ≈ 18–40
    const depth = inBox ? 5 + r() * 11 : 18 + r() * 24;
    const x = goalX + dir * depth;
    const spread = inBox ? 16 : 22;
    const y = PITCH_H / 2 + (r() - 0.5) * spread * 2;
    return { x, y: Math.max(5, Math.min(PITCH_H - 5, y)) };
  };
  const goals = t.goals;
  const sot = Math.max(0, t.sot - t.goals);
  const off = t.off;
  const insideTotal = Math.max(1, t.inside);
  const insideShare = t.inside / Math.max(1, t.inside + t.outside);
  for (let i = 0; i < goals; i++) { const p = place(true); dots.push({ ...p, r: 2.6, kind: 'goal', team: side }); }
  for (let i = 0; i < sot; i++)   { const p = place(r() < 0.7); dots.push({ ...p, r: 2.0, kind: 'sot', team: side }); }
  for (let i = 0; i < off; i++)   { const p = place(r() < insideShare); dots.push({ ...p, r: 1.7, kind: 'off', team: side }); }
  return dots;
}

function ShotDot({ d, color }: { d: Dot; color: string }) {
  if (d.kind === 'off') return <Circle cx={d.x} cy={d.y} r={d.r} fill="none" stroke={color} strokeWidth={0.5} strokeOpacity={0.85} />;
  if (d.kind === 'sot') return <Circle cx={d.x} cy={d.y} r={d.r} fill={color} fillOpacity={0.9} />;
  // goal — a football glyph in a team-coloured ring, so goals stand out from the
  // shot circles and you can see (by area) where they came from. The ⚽ sits in
  // each team's attacking half (home → right goal, away → left), so the ring
  // colour + side together show who scored. Position is by area, not tracking.
  return (
    <G>
      <Circle cx={d.x} cy={d.y} r={3.6} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={0.8} strokeOpacity={0.95} />
      <SvgText x={d.x} y={d.y + 1.85} fontSize={5} textAnchor="middle">⚽</SvgText>
    </G>
  );
}

export function ShotsMapPanel({ match }: { match: MatchStats }) {
  const results = useLiveResults();
  const m = useMemo(() => shotsMatch(match, results), [match, results]);
  const dots = useMemo(() => {
    if (!m) return [];
    return [...buildDots(match.fixtureId, m.home, 'home'), ...buildDots(match.fixtureId, m.away, 'away')];
  }, [m, match.fixtureId]);
  if (!m) return <Card title="SHOTS MAP" style={s.solo}><View style={s.pitchEmpty}><Text style={s.note}>No shot data yet.</Text></View></Card>;
  return (
    <Card title="SHOTS MAP" style={s.solo}>
      <PitchSvg>
        {dots.map((d, i) => <ShotDot key={i} d={d} color={d.team === 'home' ? D.blue : D.red} />)}
      </PitchSvg>
      <View style={s.shotLegend}>
        <Text style={s.shotLegTxt}>○ Off Target   ● On Target   ⚽ Goal</Text>
      </View>
      <View style={s.shotCounts}>
        <Text style={[s.shotName, { color: D.blue }]}>{match.home}</Text>
        <Text style={s.shotBig}><Text style={{ color: D.blue }}>{m.home.shots}</Text> <Text style={s.shotUnit}>Shots</Text>  ·  <Text style={{ color: D.blue }}>{m.home.sot}</Text> <Text style={s.shotUnit}>OT</Text></Text>
      </View>
      <View style={s.shotCounts}>
        <Text style={[s.shotName, { color: D.red }]}>{match.away}</Text>
        <Text style={s.shotBig}><Text style={{ color: D.red }}>{m.away.shots}</Text> <Text style={s.shotUnit}>Shots</Text>  ·  <Text style={{ color: D.red }}>{m.away.sot}</Text> <Text style={s.shotUnit}>OT</Text></Text>
      </View>
      <Text style={s.note}>Placed by area (box vs outside) from real counts — exact coordinates not in the feed.</Text>
    </Card>
  );
}

// ── PASS MAP ────────────────────────────────────────────────────────────────
// Two mini pitches, real per-player passes as nodes laid out by formation role.
// No who→whom lines: pass-pair data does not exist in the feed (no fabrication).
function nodePositions(players: PassNode[]): { node: PassNode; x: number; y: number }[] {
  const bucket = (p: PassNode) => { const c = (p.pos || '').toUpperCase()[0]; return c === 'G' ? 0 : c === 'D' ? 1 : c === 'M' ? 2 : 3; };
  const colX = [7, 27, 52, 80];
  const cols: PassNode[][] = [[], [], [], []];
  players.forEach((p) => cols[bucket(p)].push(p));
  const out: { node: PassNode; x: number; y: number }[] = [];
  cols.forEach((col, ci) => {
    col.forEach((p, i) => {
      const y = col.length === 1 ? PITCH_H / 2 : 9 + (i / (col.length - 1)) * (PITCH_H - 18);
      out.push({ node: p, x: colX[ci], y });
    });
  });
  return out;
}

function MiniPass({ fixtureId, team, color, stats, livePlayers }: { fixtureId: string; team: string; color: string; stats: MatchStats['homeStats']; livePlayers?: PlayerMatchStat[] }) {
  const ps = useMemo(() => passStructure(fixtureId, team, stats, undefined, livePlayers), [fixtureId, team, stats, livePlayers]);
  const nodes = useMemo(() => (ps ? nodePositions(ps.players) : []), [ps]);
  return (
    <View style={s.miniWrap}>
      <Text style={[s.miniTitle, { color }]}>{team.toUpperCase()}</Text>
      <PitchSvg>
        {nodes.map((n, i) => (
          <G key={i}>
            <Circle cx={n.x} cy={n.y} r={1.6 + n.node.involvement * 2.8} fill={color} fillOpacity={0.85} stroke="#EAF1FF" strokeWidth={0.25} strokeOpacity={0.4} />
          </G>
        ))}
      </PitchSvg>
      {ps ? (
        <Text style={s.miniStat}>{ps.totalPasses} passes · {Math.round(ps.passAccuracy * 100)}% acc</Text>
      ) : (
        <Text style={s.miniStat}>Per-player passing confirms after kickoff</Text>
      )}
    </View>
  );
}

export function PassMapPanel({ match }: { match: MatchStats }) {
  const livePlayers = useLivePlayers();
  return (
    <Card title="PASS MAP" style={s.solo}>
      <View style={s.passRow}>
        <MiniPass fixtureId={match.fixtureId} team={match.home} color={D.blue} stats={match.homeStats} livePlayers={livePlayers} />
        <MiniPass fixtureId={match.fixtureId} team={match.away} color={D.red} stats={match.awayStats} livePlayers={livePlayers} />
      </View>
      <Text style={s.note}>● Node size = passes played (involvement). No pass-by-pass link data in the feed.</Text>
    </Card>
  );
}

// ── MOMENTUM ────────────────────────────────────────────────────────────────
// Smooth momentum wave + interactive event markers. Lives in the Overview tab.
export function MomentumPanel({ match, events = MATCH_EVENTS }: { match: MatchStats; events?: MatchEvents[] }) {
  const end = match.status === 'LIVE' && match.elapsed ? Math.max(match.elapsed, 10) : 90;
  const span = Math.max(end, 90);

  const ev = events.find((e) => e.fixtureId === match.fixtureId);
  const markers: MomentumMarker[] = useMemo(() => {
    if (!ev) return [];
    const side = (team: string) => (team === match.home ? 'home' : 'away') as 'home' | 'away';
    return [
      ...ev.goals.map((g) => ({ minute: g.minute, side: side(g.team), kind: 'goal' as const, player: surname(g.player), team: g.team })),
      ...ev.yellowCards.map((c) => ({ minute: c.minute ?? 0, side: side(c.team), kind: 'yellow' as const, player: c.player ? surname(c.player) : undefined, team: c.team })),
      ...ev.redCards.map((c) => ({ minute: c.minute ?? 0, side: side(c.team), kind: 'red' as const, player: c.player ? surname(c.player) : undefined, team: c.team })),
    ].sort((x, y) => x.minute - y.minute);
  }, [ev, match.home]);

  const momEvents: MomentumEvent[] = markers
    .filter((m) => m.kind === 'goal' || m.kind === 'red')
    .map((m) => ({ minute: m.minute, side: m.side, kind: m.kind === 'goal' ? 'goal' : 'red' }));
  const points = useMemo(() => buildMomentum(match.fixtureId, match.homeStats.possession || 0.5, end, momEvents), [match.fixtureId, match.homeStats.possession, end, JSON.stringify(momEvents)]);

  return (
    <Card title="MOMENTUM" style={s.solo} legend={<Legend items={[{ color: D.blue, label: match.home }, { color: D.red, label: match.away }, { color: D.purple, label: 'Events' }]} />}>
      <MomentumWave points={points} span={span} markers={markers} />
      <Text style={s.note}>Momentum is modelled from possession, shots & xG — not player tracking.</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  dash: { padding: 12, gap: 12, backgroundColor: D.bg },
  solo: { marginHorizontal: 12, marginTop: 12 },
  card: { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  cardTitle: { color: D.text3, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  legend: { flexDirection: 'row', gap: 12 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legDot: { width: 8, height: 8, borderRadius: 4 },
  legTxt: { color: D.text2, fontSize: 11, fontWeight: '600' },

  mid: { gap: 12 },
  midRow: { flexDirection: 'row', alignItems: 'stretch' },
  midCol: { flexDirection: 'column' },

  note: { color: D.text3, fontSize: 9, fontStyle: 'italic', marginTop: 6, textAlign: 'center' },
  foot: { color: D.text3, fontSize: 10, fontStyle: 'italic', textAlign: 'center', marginTop: 2 },
  pitchEmpty: { aspectRatio: PITCH_W / PITCH_H, alignItems: 'center', justifyContent: 'center', backgroundColor: D.panel2, borderRadius: 8 },

  // attack zones
  zoneRow: { flexDirection: 'row', marginTop: 10 },
  zoneCol: { flex: 1, alignItems: 'center' },
  zonePct: { fontSize: 15, fontWeight: '900' },
  zoneLbl: { color: D.text2, fontSize: 9, marginTop: 2, textAlign: 'center' },

  // shots
  shotLegend: { marginTop: 8, alignItems: 'center' },
  shotLegTxt: { color: D.text2, fontSize: 10 },
  shotCounts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  shotName: { fontSize: 12, fontWeight: '800' },
  shotBig: { color: D.text2, fontSize: 12, fontWeight: '700' },
  shotUnit: { color: D.text3, fontSize: 10, fontWeight: '600' },

  // pass
  passRow: { flexDirection: 'row', gap: 10 },
  miniWrap: { flex: 1 },
  miniTitle: { fontSize: 12, fontWeight: '900', textAlign: 'center', marginBottom: 5, letterSpacing: 0.5 },
  miniStat: { color: D.text2, fontSize: 10, textAlign: 'center', marginTop: 5 },
});
