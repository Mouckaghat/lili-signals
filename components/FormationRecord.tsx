// Formation win/loss record — a tournament-wide "who wins with what shape" table.
// Single source of truth: rendered both in the Intel → 🧩 Tactics tab
// (TournamentIntelligenceSection) and on the 📈 Dashboard, so the two never drift.
// Honest model: a formation only books a result once the match is FINISHED;
// baseline formations are real (web-researched) and upgraded by confirmed lineups.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MatchLineup } from '../lib/lineupData';
import { FIXTURE_RESULTS } from '../lib/fixtureResultsData';
import type { I18n } from '../lib/i18n';

const D = {
  surface: '#0B1426',
  border:  'rgba(80,140,255,0.10)',
  blue:    '#4A9EFF',
  green:   '#34D399',
  red:     '#FF5B5B',
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
  text3:   '#374F7A',
};

export interface FormationStats {
  formation: string;
  games:     number;
  wins:      number;
  draws:     number;
  losses:    number;
  gf:        number;
  ga:        number;
  teamFlags: string;
  teamNames: string[];
}

export function buildFormationStats(lineups: MatchLineup[], teamFlagMap: Map<string, string>): FormationStats[] {
  const map: Record<string, FormationStats> = {};
  const teamsByFormation: Record<string, Set<string>> = {};

  for (const lineup of lineups) {
    const result = FIXTURE_RESULTS[lineup.fixtureKey];
    if (!result || result.status !== 'FINISHED') continue;
    // Once a game is FINISHED, baseline formations are valid historical data

    const [home, away] = lineup.fixtureKey.split('|');
    const hScore = result.homeScore ?? 0;
    const aScore = result.awayScore ?? 0;

    const addResult = (formation: string, teamName: string, gf: number, ga: number) => {
      if (!formation || formation === '?') return;
      if (!map[formation]) map[formation] = { formation, games: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, teamFlags: '', teamNames: [] };
      if (!teamsByFormation[formation]) teamsByFormation[formation] = new Set();
      const s = map[formation];
      s.games++;
      s.gf += gf;
      s.ga += ga;
      if (gf > ga) s.wins++;
      else if (gf === ga) s.draws++;
      else s.losses++;
      teamsByFormation[formation].add(teamName);
    };

    addResult(lineup.home.formation, home, hScore, aScore);
    addResult(lineup.away.formation, away, aScore, hScore);
  }

  for (const [formation, names] of Object.entries(teamsByFormation)) {
    if (map[formation]) {
      const namesArr = Array.from(names);
      map[formation].teamFlags = namesArr.map((n) => teamFlagMap.get(n) ?? '🏳').join('');
      map[formation].teamNames = namesArr;
    }
  }

  return Object.values(map)
    .filter((s) => s.games >= 1)
    .sort((a, b) => {
      const rateA = a.wins / a.games;
      const rateB = b.wins / b.games;
      return rateB !== rateA ? rateB - rateA : b.games - a.games;
    });
}

export default function FormationRecord({ lineups, teamFlagMap, i18n }: { lineups: MatchLineup[]; teamFlagMap: Map<string, string>; i18n: I18n }) {
  const stats = buildFormationStats(lineups, teamFlagMap);
  const [hoveredFormation, setHoveredFormation] = useState<string | null>(null);

  if (stats.length === 0) {
    return (
      <View style={tc.empty}>
        <Text style={tc.emptyIcon}>🧩</Text>
        <Text style={tc.emptyText}>{i18n.tacNoData}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 2 }}>
      {/* Column headers */}
      <View style={tc.headerRow}>
        <Text style={[tc.colRank, tc.colHdr]}>#</Text>
        <Text style={[tc.colFormation, tc.colHdr]}>{i18n.tacFormation}</Text>
        <Text style={[tc.colCountry, tc.colHdr]}>COUNTRY</Text>
        <Text style={[tc.colStat, tc.colHdr]}>G</Text>
        <Text style={[tc.colStat, tc.colHdr, { color: D.green }]}>W</Text>
        <Text style={[tc.colStat, tc.colHdr, { color: D.text2 }]}>D</Text>
        <Text style={[tc.colStat, tc.colHdr, { color: D.red }]}>L</Text>
        <Text style={[tc.colRate, tc.colHdr]}>{i18n.tacWinRate}</Text>
      </View>

      {stats.map((s, i) => {
        const pct = Math.round((s.wins / s.games) * 100);
        const isHovered = hoveredFormation === s.formation;

        return (
          <View key={s.formation} style={tc.row}>
            <Text style={tc.colRankText}>{i + 1}</Text>
            <Text style={tc.formation}>{s.formation}</Text>
            <Pressable
              style={tc.colCountry}
              onHoverIn={() => setHoveredFormation(s.formation)}
              onHoverOut={() => setHoveredFormation(null)}
            >
              <Text style={tc.flags}>{s.teamFlags || '—'}</Text>
              {isHovered && s.teamNames.length > 0 && (
                <View style={tc.tooltip}>
                  <Text style={tc.tooltipText}>{s.teamNames.join(' · ')}</Text>
                </View>
              )}
            </Pressable>
            <Text style={tc.colStat}>{s.games}</Text>
            <Text style={[tc.colStat, { color: D.green, fontWeight: '700' }]}>{s.wins}</Text>
            <Text style={tc.colStat}>{s.draws}</Text>
            <Text style={[tc.colStat, { color: D.red, fontWeight: '700' }]}>{s.losses}</Text>
            <View style={tc.colRate}>
              <View style={tc.barBg}>
                <View style={[tc.barFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={tc.pct}>{pct}%</Text>
            </View>
          </View>
        );
      })}

      {/* Confirmed / Predicted legend */}
      <View style={tc.legend}>
        {lineups.some((l) => l.confirmed) && (
          <Text style={tc.legendItem}>
            <Text style={{ color: D.green }}>● </Text>
            <Text>{i18n.tacConfirmed}</Text>
          </Text>
        )}
        {lineups.some((l) => !l.confirmed) && (
          <Text style={tc.legendItem}>
            <Text style={{ color: D.text3 }}>● </Text>
            <Text>{i18n.tacPredicted}</Text>
          </Text>
        )}
      </View>
    </View>
  );
}

const tc = StyleSheet.create({
  empty:        { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyIcon:    { fontSize: 28 },
  emptyText:    { fontSize: 12, color: D.text3, textAlign: 'center' },
  headerRow:    { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: D.border, marginBottom: 4 },
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(80,140,255,0.04)' },
  colHdr:       { fontSize: 8, fontWeight: '800', color: D.text3, letterSpacing: 0.8 },
  colRank:      { width: 20, textAlign: 'center' },
  colRankText:  { width: 20, textAlign: 'center', fontSize: 12, color: D.text2, fontWeight: '600' },
  colFormation: { flex: 3, paddingRight: 12 },
  colCountry:   { flex: 2, position: 'relative' },
  colStat:      { flex: 1, textAlign: 'center', fontSize: 12, color: D.text2 },
  colRate:      { flex: 3, flexDirection: 'row', alignItems: 'center', gap: 6 },
  formation:    { flex: 3, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: D.text1, paddingRight: 12 },
  flags:        { fontSize: 15 },
  tooltip: {
    position: 'absolute',
    bottom: 26,
    left: 0,
    backgroundColor: D.surface,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: D.border,
    zIndex: 100,
    minWidth: 90,
  },
  tooltipText:  { fontSize: 10, color: D.text1, fontWeight: '600' },
  barBg:        { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(80,140,255,0.10)', overflow: 'hidden' },
  barFill:      { height: 5, borderRadius: 3, backgroundColor: D.blue },
  pct:          { fontSize: 10, fontWeight: '700', width: 30, textAlign: 'right', color: D.text2 },
  legend:       { flexDirection: 'row', gap: 12, paddingTop: 10, justifyContent: 'flex-end' },
  legendItem:   { fontSize: 9, color: D.text3 },
});
