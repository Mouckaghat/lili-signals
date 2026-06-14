import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { buildHeatGrid, type HeatGrid } from '../lib/heatmap';
import type { MatchStats, TeamMatchStats } from '../lib/matchStatsData';

// ─── Design tokens (shared with the rest of the app) ────────────────────────────
const D = {
  surface: '#0B1426',
  border:  'rgba(80,140,255,0.10)',
  pitch:   '#0A2A18',
  line:    'rgba(255,255,255,0.14)',
  blue:    '#4A9EFF',
  red:     '#FF5A4D',
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
};

function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

// ─── One team's heat layer over a pitch ─────────────────────────────────────────

function HeatLayer({ grid, color }: { grid: HeatGrid; color: string }) {
  const rows = [];
  for (let cy = 0; cy < grid.rows; cy++) {
    const cells = [];
    for (let cx = 0; cx < grid.cols; cx++) {
      const v = grid.cells[cy * grid.cols + cx];
      // gentle gamma so mid-range stays visible; scale by cross-team share
      const alpha = Math.pow(v, 0.85) * (0.35 + 0.65 * grid.share);
      cells.push(
        <View key={cx} style={[styles.cell, alpha > 0.02 ? { backgroundColor: rgba(color, alpha) } : null]} />,
      );
    }
    rows.push(<View key={cy} style={styles.row}>{cells}</View>);
  }
  return <View style={StyleSheet.absoluteFill}>{rows}</View>;
}

// Both teams composited on a single pitch: home (blue) attacks left→right,
// away (red) right→left. Where they overlap (contested midfield) the colours
// blend toward purple.
function CombinedPitch({ home, away, homeFormation, awayFormation }: {
  home: TeamMatchStats; away: TeamMatchStats; homeFormation?: string; awayFormation?: string;
}) {
  const homeGrid = useMemo(() => buildHeatGrid(home, 'ltr', undefined, undefined, homeFormation), [home, homeFormation]);
  const awayGrid = useMemo(() => buildHeatGrid(away, 'rtl', undefined, undefined, awayFormation), [away, awayFormation]);
  return (
    <View style={styles.pitch}>
      <HeatLayer grid={homeGrid} color={D.blue} />
      <HeatLayer grid={awayGrid} color={D.red} />
      {/* pitch markings on top */}
      <View style={styles.halfway} />
      <View style={[styles.box, styles.boxLeft]} />
      <View style={[styles.box, styles.boxRight]} />
    </View>
  );
}

// ─── Team stat header ───────────────────────────────────────────────────────────

function StatHeader({ s, color, dir, formation }: { s: TeamMatchStats; color: string; dir: '→' | '←'; formation?: string }) {
  return (
    <View style={styles.header}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.team}>{s.team} {dir}{formation ? `  ·  ${formation}` : ''}</Text>
      <Text style={styles.stat}>{Math.round(s.possession * 100)}% poss</Text>
      <Text style={styles.stat}>{s.totalShots} shots</Text>
      <Text style={styles.stat}>xG {s.xg.toFixed(2)}</Text>
    </View>
  );
}

// ─── Public component ────────────────────────────────────────────────────────────

export default function MatchHeatmap({ match, homeFormation, awayFormation }: { match: MatchStats; homeFormation?: string; awayFormation?: string }) {
  const fmtNote = homeFormation || awayFormation ? ' Starting formation shapes the territory.' : '';
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Territory heatmap{match.status === 'LIVE' ? `  ·  LIVE ${match.elapsed ?? ''}'` : ''}
      </Text>
      <Text style={styles.caption}>Both teams on one pitch — blue attacks →, red ←; purple = contested.{fmtNote} Modelled from possession, shots, xG — not player tracking.</Text>

      <StatHeader s={match.homeStats} color={D.blue} dir="→" formation={homeFormation} />
      <StatHeader s={match.awayStats} color={D.red} dir="←" formation={awayFormation} />

      <View style={{ height: 8 }} />

      <CombinedPitch
        home={match.homeStats}
        away={match.awayStats}
        homeFormation={homeFormation}
        awayFormation={awayFormation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card:    { backgroundColor: D.surface, borderRadius: 16, borderWidth: 1, borderColor: D.border, padding: 16, gap: 6 },
  title:   { color: D.text1, fontSize: 16, fontWeight: '700' },
  caption: { color: D.text2, fontSize: 11, marginBottom: 6 },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 },
  dot:     { width: 8, height: 8, borderRadius: 4 },
  team:    { color: D.text1, fontSize: 13, fontWeight: '600', flex: 1 },
  stat:    { color: D.text2, fontSize: 11 },
  pitch:   { width: '100%', aspectRatio: 18 / 11, backgroundColor: D.pitch, borderRadius: 8,
             borderWidth: 1, borderColor: D.line, overflow: 'hidden' },
  row:     { flex: 1, flexDirection: 'row' },
  cell:    { flex: 1 },
  halfway: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: D.line },
  box:     { position: 'absolute', top: '28%', bottom: '28%', width: '14%', borderWidth: 1, borderColor: D.line },
  boxLeft: { left: 0, borderLeftWidth: 0 },
  boxRight:{ right: 0, borderRightWidth: 0 },
});
