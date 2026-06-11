import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TeamPickerModal, { TeamPickerTrigger } from '../components/TeamPickerModal';
import { FED_BG, FED_COLOR, getTeam, getTeamFixtures, type WCFixture, type WCTeam } from '../lib/wcData';
import { type FixtureResult } from '../lib/fixtureResultsData';
import { useLiveResults } from '../lib/useLiveResults';
import { buildMatchPredictions, type MatchPrediction } from '../lib/wcSimulation';
import FeatureIntro from '../components/FeatureIntro';
import { playerByPath } from '../lib/playerXI';
import { useLanguage } from '../contexts/LanguageContext';

function withResult(fixture: WCFixture, results: Record<string, FixtureResult>): WCFixture {
  const r = results[`${fixture.home}|${fixture.away}`];
  if (!r) return fixture;
  return { ...fixture, status: r.status, homeScore: r.homeScore ?? undefined, awayScore: r.awayScore ?? undefined };
}

const W = Dimensions.get('window').width - 32; // chart width
const CHART_H = 200;
const MAX_PTS = 9;
const QUALIFY_PTS = 6; // threshold line

type MatchOutcome = 'win' | 'draw' | 'loss' | 'projected';

interface PlotPoint {
  x: number;     // 0–1 normalised
  y: number;     // cumulative pts (0–9)
  pts: number;   // pts gained this match
  outcome: MatchOutcome;
  fixture: WCFixture;
  prediction: MatchPrediction;
}

const OUTCOME_COLOR: Record<MatchOutcome, string> = {
  win:       '#34C759',
  draw:      '#FF9F0A',
  loss:      '#FF3B30',
  projected: '#AEAEB2',
};

// Draw a line between two cartesian points using a rotated View
function ChartLine({
  x1, y1, x2, y2, color, dashed = false,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; dashed?: boolean;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: len,
        height: dashed ? 2 : 3,
        left: cx - len / 2,
        top: cy - (dashed ? 1 : 1.5),
        backgroundColor: dashed ? 'transparent' : color,
        borderTopWidth: dashed ? 2 : 0,
        borderTopColor: dashed ? color : 'transparent',
        borderStyle: dashed ? 'dashed' : 'solid',
        transform: [{ rotate: `${angle}deg` }],
        borderRadius: 2,
      }}
    />
  );
}

function Chart({ points }: { points: PlotPoint[] }) {
  const toCanvas = (normX: number, pts: number) => ({
    x: normX * W,
    y: CHART_H - (pts / MAX_PTS) * CHART_H,
  });

  const qualifyY = CHART_H - (QUALIFY_PTS / MAX_PTS) * CHART_H;

  const origin = { x: 0, y: CHART_H };

  return (
    <View style={{ width: W, height: CHART_H, position: 'relative' }}>
      {/* Qualification threshold */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: qualifyY,
          width: W,
          height: 1,
          backgroundColor: '#34C759',
          opacity: 0.5,
        }}
      />
      <Text
        style={{
          position: 'absolute',
          top: qualifyY - 14,
          left: 4,
          fontSize: 10,
          color: '#34C759',
          fontWeight: '600',
        }}
      >
        Qualification zone ({QUALIFY_PTS} pts)
      </Text>

      {/* Lines between points */}
      {points.map((p, i) => {
        const prev = i === 0 ? origin : toCanvas(points[i - 1].x, points[i - 1].y);
        const curr = toCanvas(p.x, p.y);
        return (
          <ChartLine
            key={`line-${i}`}
            x1={prev.x}
            y1={prev.y}
            x2={curr.x}
            y2={curr.y}
            color={OUTCOME_COLOR[p.outcome]}
            dashed={p.outcome === 'projected'}
          />
        );
      })}

      {/* Data point dots */}
      {points.map((p, i) => {
        const { x, y } = toCanvas(p.x, p.y);
        const color = OUTCOME_COLOR[p.outcome];
        return (
          <View
            key={`dot-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: color,
              left: x - 6,
              top: y - 6,
              borderWidth: 2,
              borderColor: '#0E1933',
            }}
          />
        );
      })}
    </View>
  );
}

function MatchDetail({ point }: { point: PlotPoint }) {
  const { fixture, prediction, outcome, pts, y: cumul } = point;
  const opponent = getTeam(prediction.opponent);
  return (
    <View style={s.detailCard}>
      <View style={[s.detailAccent, { backgroundColor: OUTCOME_COLOR[outcome] }]} />
      <View style={s.detailBody}>
        <View style={s.detailHeader}>
          <View style={s.detailMatchday}>
            <Text style={s.detailMDText}>Match {fixture.matchday}</Text>
          </View>
          <Text style={s.detailOpponent}>vs {prediction.opponent}</Text>
          <View style={[s.fedPill, { backgroundColor: FED_BG[prediction.opponentFederation as keyof typeof FED_BG] ?? '#F0F0F5' }]}>
            <Text style={[s.fedText, { color: FED_COLOR[prediction.opponentFederation as keyof typeof FED_COLOR] ?? '#8E8E93' }]}>
              {prediction.opponentFederation}
            </Text>
          </View>
        </View>

        <Text style={s.detailDate}>
          {new Date(fixture.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        <Text style={s.detailVenue}>{fixture.stadium} · {fixture.city}</Text>

        <View style={s.detailStats}>
          <View style={s.detailStat}>
            <Text style={s.detailStatLabel}>Result</Text>
            <Text style={[s.detailStatValue, { color: OUTCOME_COLOR[outcome] }]}>
              {outcome === 'projected' ? 'TBD' : outcome.toUpperCase()}
            </Text>
          </View>
          <View style={s.detailStat}>
            <Text style={s.detailStatLabel}>Points</Text>
            <Text style={[s.detailStatValue, { color: OUTCOME_COLOR[outcome] }]}>
              {outcome === 'projected' ? `~${pts.toFixed(1)}` : `+${pts}`}
            </Text>
          </View>
          <View style={s.detailStat}>
            <Text style={s.detailStatLabel}>Cumulative</Text>
            <Text style={s.detailStatValue}>{outcome === 'projected' ? `~${cumul.toFixed(1)}` : cumul}</Text>
          </View>
        </View>

        <View style={s.detailProbs}>
          <Text style={s.detailProbsLabel}>Lili's win / draw / loss odds</Text>
          <View style={s.detailProbBar}>
            <View style={[s.detailProbFill, { flex: prediction.winProb, backgroundColor: '#34C759' }]} />
            <View style={[s.detailProbFill, { flex: prediction.drawProb, backgroundColor: '#FF9F0A' }]} />
            <View style={[s.detailProbFill, { flex: prediction.lossProb, backgroundColor: '#FF3B30' }]} />
          </View>
          <View style={s.detailProbNums}>
            <Text style={{ color: '#34C759', fontSize: 11, fontWeight: '600' }}>{Math.round(prediction.winProb * 100)}%</Text>
            <Text style={{ color: '#FF9F0A', fontSize: 11, fontWeight: '600' }}>{Math.round(prediction.drawProb * 100)}%</Text>
            <Text style={{ color: '#FF3B30', fontSize: 11, fontWeight: '600' }}>{Math.round(prediction.lossProb * 100)}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CumulativeGraphScreen() {
  const [launched, setLaunched] = useState(false);
  const { i18n } = useLanguage();
  const [team, setTeam] = useState<WCTeam | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const liveResults = useLiveResults();

  const preds = team ? buildMatchPredictions(team.name) : [];
  const fixtures = team ? getTeamFixtures(team.name).map((f) => withResult(f, liveResults)) : [];

  // Build plot points — running accumulator avoids self-reference in const initializer
  let runningCumul = 0;
  const plotPoints: PlotPoint[] = preds.map((pred, i) => {
    const fixture = fixtures[i];
    const f = fixture ?? null;

    let outcome: MatchOutcome = 'projected';
    let pts = pred.expectedPoints;

    if (f?.status === 'FINISHED' && f.homeScore !== undefined) {
      const myScore = f.home === team!.name ? f.homeScore : f.awayScore!;
      const oppScore = f.home === team!.name ? f.awayScore! : f.homeScore!;
      if (myScore > oppScore) { outcome = 'win'; pts = 3; }
      else if (myScore < oppScore) { outcome = 'loss'; pts = 0; }
      else { outcome = 'draw'; pts = 1; }
    }

    runningCumul += pts;

    return {
      x: (i + 1) / (preds.length + 0.5),
      y: runningCumul,
      pts,
      outcome,
      fixture: f!,
      prediction: pred,
    };
  });

  const finalPts = plotPoints.at(-1)?.y ?? 0;
  const willQualify = finalPts >= QUALIFY_PTS;

  if (!launched) return (
    <>
      <Stack.Screen options={{ title: i18n.titleCumulativeGraph, headerShown: false }} />
      <FeatureIntro player={playerByPath('/cumulative-graph')!} onLaunch={() => setLaunched(true)} />
    </>
  );

  return (
    <>
      <Stack.Screen options={{ title: i18n.titleCumulativeGraph, headerShown: true }} />
      <SafeAreaView style={s.safe} edges={['bottom']}>
      <TeamPickerTrigger
        team={team}
        onPress={() => setPickerOpen(true)}
        placeholder={i18n.selectTeam}
      />
      <TeamPickerModal
        visible={pickerOpen}
        selected={team}
        onSelect={(t) => { setTeam(t); setSelected(null); }}
        onClose={() => setPickerOpen(false)}
      />

      {!team ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📊</Text>
          <Text style={s.emptyTitle}>Journey Graph</Text>
          <Text style={s.emptySub}>
            Pick a team to see Lili's projected{'\n'}
            cumulative points journey.
          </Text>
        </View>
      ) : preds.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>⚠️</Text>
          <Text style={s.emptyTitle}>No Fixture Data</Text>
          <Text style={s.emptySub}>No group stage fixtures found for {team.name}.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          {/* Legend */}
          <View style={s.legend}>
            {(['win', 'draw', 'loss', 'projected'] as MatchOutcome[]).map((o) => (
              <View key={o} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: OUTCOME_COLOR[o] }]} />
                <Text style={s.legendText}>{o}</Text>
              </View>
            ))}
          </View>

          {/* Chart */}
          <View style={s.chartWrap}>
            {/* Y axis labels */}
            <View style={s.yAxis}>
              {[9, 6, 3, 0].map((v) => (
                <Text key={v} style={[s.yLabel, { bottom: (v / MAX_PTS) * CHART_H - 7 }]}>{v}</Text>
              ))}
            </View>

            <View style={{ flex: 1 }}>
              <Chart points={plotPoints} />

              {/* X axis tap targets */}
              <View style={s.xAxis}>
                {plotPoints.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.xTap}
                    onPress={() => setSelected(selected === i ? null : i)}
                  >
                    <Text style={[s.xLabel, selected === i && s.xLabelActive]}>
                      M{i + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Qualification indicator */}
          <View style={[s.qualBanner, { backgroundColor: willQualify ? 'rgba(52,199,89,0.12)' : 'rgba(255,107,0,0.12)' }]}>
            <Text style={[s.qualText, { color: willQualify ? '#34C759' : '#FF6B00' }]}>
              {willQualify
                ? `Lili projects ~${finalPts.toFixed(1)} pts — likely to qualify`
                : `Lili projects ~${finalPts.toFixed(1)} pts — qualification at risk`}
            </Text>
          </View>

          {/* Selected match detail */}
          {selected !== null && (
            <MatchDetail point={plotPoints[selected]} />
          )}

          {/* Tap hint */}
          {selected === null && (
            <Text style={s.hint}>{i18n.tapMatchHint}</Text>
          )}

          <Text style={s.footNote}>{i18n.graphFootnote}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050810' },
  content: { padding: 16, paddingBottom: 48 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#EEF2FF', marginBottom: 10 },
  emptySub: { fontSize: 15, color: '#7A90B8', textAlign: 'center', lineHeight: 22 },

  legend: { flexDirection: 'row', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#7A90B8', textTransform: 'capitalize' },

  chartWrap: {
    flexDirection: 'row',
    height: CHART_H + 32,
    backgroundColor: '#0E1933',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  yAxis: { width: 24, position: 'relative', marginRight: 4 },
  yLabel: {
    position: 'absolute',
    right: 0,
    fontSize: 10,
    color: '#374F7A',
    fontWeight: '500',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  xTap: { paddingHorizontal: 8, paddingVertical: 4 },
  xLabel: { fontSize: 12, color: '#7A90B8', fontWeight: '500' },
  xLabelActive: { color: '#4A9EFF', fontWeight: '700' },

  qualBanner: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  qualText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  hint: {
    fontSize: 12,
    color: '#374F7A',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 14,
  },

  detailCard: {
    backgroundColor: '#0E1933',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  detailAccent: { width: 4 },
  detailBody: { flex: 1, padding: 14 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailMatchday: {
    backgroundColor: 'rgba(74,158,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailMDText: { fontSize: 11, fontWeight: '700', color: '#4A9EFF' },
  detailOpponent: { flex: 1, fontSize: 14, fontWeight: '600', color: '#EEF2FF' },
  fedPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  fedText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  detailDate: { fontSize: 12, color: '#7A90B8', marginBottom: 2 },
  detailVenue: { fontSize: 12, color: '#7A90B8', marginBottom: 12 },

  detailStats: { flexDirection: 'row', gap: 0, marginBottom: 12 },
  detailStat: { flex: 1, alignItems: 'center' },
  detailStatLabel: { fontSize: 10, color: '#7A90B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
  detailStatValue: { fontSize: 16, fontWeight: '700', color: '#EEF2FF' },

  detailProbs: {},
  detailProbsLabel: { fontSize: 10, color: '#7A90B8', marginBottom: 5, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.3 },
  detailProbBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  detailProbFill: { height: '100%' },
  detailProbNums: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },

  footNote: {
    fontSize: 11,
    color: '#374F7A',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
