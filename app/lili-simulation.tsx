import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TeamPickerModal, { TeamPickerTrigger } from '../components/TeamPickerModal';
import { FED_BG, FED_COLOR, type WCTeam } from '../lib/wcData';
import { buildMatchPredictions, runWCSimulation, type WCSimResult } from '../lib/wcSimulation';
import {
  appendLiliPrediction,
  appendSimulationSummary,
  makeLiliPrediction,
  makeSimulationSummary,
} from '../lib/storageJsonl';

const RUN_OPTIONS = [1, 10, 100, 1_000, 10_000] as const;
type RunOption = (typeof RUN_OPTIONS)[number];

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function StatRow({ label, value, bar, color }: {
  label: string;
  value: string;
  bar: number;
  color: string;
}) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${bar * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function MatchProfileCard({ pred, teamFederation }: {
  pred: ReturnType<typeof buildMatchPredictions>[0];
  teamFederation: string;
}) {
  return (
    <View style={s.matchCard}>
      <View style={s.matchCardHeader}>
        <Text style={s.matchMD}>MD{pred.matchday}</Text>
        <Text style={s.matchOpponent}>vs {pred.opponent}</Text>
        <View style={[s.fedPill, { backgroundColor: FED_BG[pred.opponentFederation as keyof typeof FED_BG] }]}>
          <Text style={[s.fedText, { color: FED_COLOR[pred.opponentFederation as keyof typeof FED_COLOR] }]}>
            {pred.opponentFederation}
          </Text>
        </View>
      </View>
      <View style={s.probRow}>
        <View style={[s.probBar, { flex: pred.winProb, backgroundColor: '#34C759' }]} />
        <View style={[s.probBar, { flex: pred.drawProb, backgroundColor: '#FF9F0A' }]} />
        <View style={[s.probBar, { flex: pred.lossProb, backgroundColor: '#FF3B30' }]} />
      </View>
      <View style={s.probLabels}>
        <Text style={[s.probLabel, { color: '#34C759' }]}>W {pct(pred.winProb)}</Text>
        <Text style={[s.probLabel, { color: '#FF9F0A' }]}>D {pct(pred.drawProb)}</Text>
        <Text style={[s.probLabel, { color: '#FF3B30' }]}>L {pct(pred.lossProb)}</Text>
        <Text style={s.expPts}>≈ {pred.expectedPoints.toFixed(1)} pts</Text>
      </View>
    </View>
  );
}

function ResultsView({ result }: { result: WCSimResult }) {
  return (
    <>
      {/* Tournament probabilities */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Tournament Probabilities</Text>
        <StatRow label="Qualify" value={pct(result.qualificationRate)} bar={result.qualificationRate} color="#005F8E" />
        <StatRow label="Quarter-final" value={pct(result.quarterFinalRate)} bar={result.quarterFinalRate} color="#30A0D8" />
        <StatRow label="Semi-final" value={pct(result.semiFinalRate)} bar={result.semiFinalRate} color="#FF9F0A" />
        <StatRow label="Final" value={pct(result.finalRate)} bar={result.finalRate} color="#FF6B00" />
        <StatRow label="Champion" value={pct(result.winnerRate)} bar={result.winnerRate} color="#FFD60A" />
      </View>

      {/* Group match predictions */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Lili's Match Predictions</Text>
        {result.matchPredictions.map((p, i) => (
          <MatchProfileCard key={i} pred={p} teamFederation="" />
        ))}
      </View>

      {/* Danger + elimination */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Key Signals</Text>
        <View style={s.signalRow}>
          <View style={s.signalIcon}>
            <Text style={s.signalEmoji}>⚠️</Text>
          </View>
          <View style={s.signalText}>
            <Text style={s.signalLabel}>Most Common Exit</Text>
            <Text style={s.signalValue}>{result.mostCommonElimination}</Text>
          </View>
        </View>
        <View style={[s.signalRow, { marginTop: 10 }]}>
          <View style={s.signalIcon}>
            <Text style={s.signalEmoji}>🎯</Text>
          </View>
          <View style={s.signalText}>
            <Text style={s.signalLabel}>Most Dangerous Opponent</Text>
            <Text style={s.signalValue}>{result.mostDangerousOpponent}</Text>
          </View>
        </View>
      </View>

      {/* Lili reasoning */}
      <View style={s.reasoningCard}>
        <Text style={s.reasoningLabel}>Lili's Reasoning</Text>
        <Text style={s.reasoningText}>{result.liliReasoning}</Text>
        <Text style={s.runsNote}>{result.runs.toLocaleString()} simulation runs · lili-v1.0</Text>
      </View>
    </>
  );
}

export default function LiliSimulationScreen() {
  const [team, setTeam] = useState<WCTeam | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [runs, setRuns] = useState<RunOption>(1_000);
  const [result, setResult] = useState<WCSimResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    if (!team) return;
    setLoading(true);
    setResult(null);

    // Run synchronously but yield to UI thread first
    await new Promise((r) => setTimeout(r, 50));

    const sim = runWCSimulation(team.name, runs);
    setResult(sim);
    setLoading(false);

    // Persist to JSONL in background
    try {
      // One prediction per group match
      for (const mp of sim.matchPredictions) {
        await appendLiliPrediction(
          makeLiliPrediction({
            match_id: `wc2026_${team.group}_MD${mp.matchday}_vs_${mp.opponent.replace(/ /g, '_')}`,
            team_a: team.name,
            team_b: mp.opponent,
            federation_a: team.federation,
            federation_b: mp.opponentFederation,
            predicted_winner:
              mp.winProb > mp.lossProb
                ? 'team_a'
                : mp.lossProb > mp.winProb
                ? 'team_b'
                : 'draw',
            predicted_score: { a: 0, b: 0 }, // score prediction coming in v2
            confidence: Math.max(mp.winProb, mp.drawProb, mp.lossProb),
            reasoning_short: `Win: ${pct(mp.winProb)}, Draw: ${pct(mp.drawProb)}, Loss: ${pct(mp.lossProb)}`,
            signal_notes: [
              `Expected points: ${mp.expectedPoints.toFixed(2)}`,
              `Opponent federation: ${mp.opponentFederation}`,
            ],
          })
        );
      }
      // Simulation summary
      await appendSimulationSummary(
        makeSimulationSummary({
          team: team.name,
          runs: sim.runs,
          qualification_probability: sim.qualificationRate,
          round_of_16_probability: sim.round16Rate,
          quarter_final_probability: sim.quarterFinalRate,
          semi_final_probability: sim.semiFinalRate,
          final_probability: sim.finalRate,
          winner_probability: sim.winnerRate,
          most_common_elimination: sim.mostCommonElimination,
          most_dangerous_opponent: sim.mostDangerousOpponent,
          lili_reasoning: sim.liliReasoning,
        })
      );
    } catch {}
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <TeamPickerTrigger
        team={team}
        onPress={() => setPickerOpen(true)}
        placeholder="Choose a team to simulate"
      />
      <TeamPickerModal
        visible={pickerOpen}
        selected={team}
        onSelect={(t) => { setTeam(t); setResult(null); }}
        onClose={() => setPickerOpen(false)}
      />

      <ScrollView contentContainerStyle={s.content}>
        {!team ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🤖</Text>
            <Text style={s.emptyTitle}>Play Against Lili</Text>
            <Text style={s.emptySub}>
              Pick a team. Lili generates a prediction profile,{'\n'}
              then runs a Monte Carlo tournament simulation.
            </Text>
          </View>
        ) : (
          <>
            {/* Run count selector */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Simulations</Text>
              <View style={s.runOptions}>
                {RUN_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[s.runOption, runs === n && s.runOptionActive]}
                    onPress={() => setRuns(n)}
                  >
                    <Text style={[s.runOptionText, runs === n && s.runOptionTextActive]}>
                      {n.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Run button */}
            <TouchableOpacity
              style={[s.runBtn, loading && s.runBtnBusy]}
              onPress={handleRun}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.runBtnText}>
                  {result ? 'Run Again' : `▶  Play Against Lili`}
                </Text>
              )}
            </TouchableOpacity>

            {/* Results */}
            {result && <ResultsView result={result} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  content: { padding: 16, paddingBottom: 48 },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1D1D1F', marginBottom: 10 },
  emptySub: { fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 22 },

  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  runOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  runOption: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#E8E8ED',
  },
  runOptionActive: { backgroundColor: '#005F8E' },
  runOptionText: { fontSize: 14, fontWeight: '600', color: '#6E6E73' },
  runOptionTextActive: { color: '#FFFFFF' },

  runBtn: {
    backgroundColor: '#005F8E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#005F8E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  runBtnBusy: { opacity: 0.7 },
  runBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1D1D1F', marginBottom: 14 },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    gap: 10,
  },
  statLabel: { width: 100, fontSize: 13, color: '#6E6E73' },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0F0F5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  statValue: { width: 44, fontSize: 14, fontWeight: '700', textAlign: 'right' },

  matchCard: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  matchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: '#F9F9FB',
  },
  matchMD: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005F8E',
    backgroundColor: '#E8EEF9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  matchOpponent: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1D1D1F' },
  fedPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  fedText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  probRow: { flexDirection: 'row', height: 8 },
  probBar: { height: '100%' },
  probLabels: { flexDirection: 'row', padding: 10, gap: 12 },
  probLabel: { fontSize: 12, fontWeight: '600' },
  expPts: { marginLeft: 'auto', fontSize: 12, color: '#8E8E93', fontWeight: '500' },

  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F9F9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalEmoji: { fontSize: 20 },
  signalText: {},
  signalLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  signalValue: { fontSize: 15, fontWeight: '600', color: '#1D1D1F', marginTop: 2 },

  reasoningCard: {
    backgroundColor: '#EEF4FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#005F8E',
  },
  reasoningLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005F8E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reasoningText: { fontSize: 14, color: '#1D1D1F', lineHeight: 22 },
  runsNote: { fontSize: 11, color: '#8E8E93', marginTop: 10, fontStyle: 'italic' },
});
