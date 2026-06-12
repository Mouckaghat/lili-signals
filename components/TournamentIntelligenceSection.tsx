import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTournamentIntelligence, type ScorerEntry, type TeamRankEntry } from '../lib/useTournamentIntelligence';

// ─── Design tokens (matches lili-route-intelligence palette) ─────────────────

const D = {
  bg:      '#050810',
  surface: '#0B1426',
  card:    '#0E1933',
  border:  'rgba(80,140,255,0.10)',
  blue:    '#4A9EFF',
  cyan:    '#00C8FF',
  orange:  '#FF7B35',
  green:   '#34D399',
  signal:  '#00E5A0',
  gold:    '#D4A520',
  red:     '#FF5B5B',
  yellow:  '#FBBF24',
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
  text3:   '#374F7A',
  sep:     'rgba(80,140,255,0.12)',
};

// ─── Tabs config ──────────────────────────────────────────────────────────────

type TabKey = 'scorers' | 'attack' | 'defence' | 'cards' | 'danger' | 'surprise';

const TABS: Array<{ key: TabKey; label: string; icon: string; color: string }> = [
  { key: 'scorers',  label: 'SCORERS',    icon: '⚽',  color: D.blue   },
  { key: 'attack',   label: 'ATTACK',     icon: '🗡️',  color: D.orange },
  { key: 'defence',  label: 'DEFENCE',    icon: '🛡️',  color: D.cyan   },
  { key: 'cards',    label: 'CARDS',      icon: '🟨',  color: D.yellow },
  { key: 'danger',   label: 'DANGER',     icon: '💀',  color: D.red    },
  { key: 'surprise', label: 'LILI 🎯',    icon: '✨',  color: D.signal },
];

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={sh.wrap}>
      <Text style={sh.title}>{title}</Text>
      <Text style={sh.sub}>{sub}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  wrap:  { marginBottom: 12, gap: 2 },
  title: { fontSize: 9, fontWeight: '800', color: D.text3, letterSpacing: 1.8 },
  sub:   { fontSize: 11, color: D.text2 },
});

// ─── Scorer row ───────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDob(dob: string): string {
  const [, mm, dd] = dob.split('-');
  return `${parseInt(dd, 10)} ${MONTHS[parseInt(mm, 10) - 1]} ${dob.slice(0, 4)}`;
}

function wcLabel(count: number): string {
  if (count === 1) return 'WC debut';
  if (count === 2) return '2nd WC';
  if (count === 3) return '3rd WC';
  return '4th WC';
}

function ScorerRow({ entry, rank, color }: { entry: ScorerEntry; rank: number; color: string }) {
  const parts = [
    `${entry.teamFlag} ${entry.team}`,
    entry.dob       && `DOB (${fmtDob(entry.dob)}) · ${entry.age} y/o`,
    entry.club      && [
      `Club: ${entry.club}`,
      entry.leagueFlag ? `${entry.leagueFlag} ${entry.league}` : entry.league,
      entry.clubRank != null && `#${entry.clubRank}`,
    ].filter(Boolean).join(' · '),
    entry.wcCount != null && wcLabel(entry.wcCount),
    entry.caps    != null && `${entry.caps} caps`,
  ].filter(Boolean) as string[];

  return (
    <View style={[rw.row, rank === 1 && rw.rowFirst]}>
      <Text style={[rw.rank, { color: rank <= 3 ? color : D.text3 }]}>
        {rank <= 3 ? ['①', '②', '③'][rank - 1] : `${rank}`}
      </Text>
      <View style={rw.infoBlock}>
        <Text style={rw.name} numberOfLines={1}>{entry.name}</Text>
        <Text style={rw.profile}>{parts.join(' · ')}</Text>
      </View>
      <View style={[rw.badge, { borderColor: `${color}30`, backgroundColor: `${color}10` }]}>
        <Text style={[rw.badgeVal, { color }]}>{entry.goals}</Text>
        <Text style={rw.badgeLbl}>GOALS</Text>
      </View>
    </View>
  );
}

// ─── Team row ─────────────────────────────────────────────────────────────────

function TeamRow({
  entry, rank, color, label, subLabel, ascending = false,
}: {
  entry: TeamRankEntry;
  rank: number;
  color: string;
  label: string;
  subLabel?: string;
  ascending?: boolean;
}) {
  return (
    <View style={[rw.row, rank === 1 && rw.rowFirst]}>
      <Text style={[rw.rank, { color: rank <= 3 ? color : D.text3 }]}>
        {rank <= 3 ? ['①', '②', '③'][rank - 1] : `${rank}`}
      </Text>
      <Text style={rw.flag}>{entry.flag}</Text>
      <Text style={rw.name} numberOfLines={1}>{entry.name}</Text>
      <View style={[rw.badge, { borderColor: `${color}30`, backgroundColor: `${color}10` }]}>
        <Text style={[rw.badgeVal, { color }]}>{entry.value}</Text>
        <Text style={rw.badgeLbl}>{label}</Text>
      </View>
    </View>
  );
}

const rw = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(80,140,255,0.06)',
  },
  rowFirst: { paddingTop: 0 },
  rank:  { fontSize: 14, fontWeight: '800', width: 22, textAlign: 'center' },
  flag:  { fontSize: 18, width: 24 },
  infoBlock: { flex: 1, gap: 1 },
  name:  { fontSize: 12, fontWeight: '700', color: D.text1, flex: 1 },
  detail:{ fontSize: 10, color: D.text3 },
  profile: { fontSize: 10, color: D.text3, lineHeight: 15, marginTop: 2 },
  badge: {
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 54,
    gap: 1,
  },
  badgeVal: { fontSize: 14, fontWeight: '800' },
  badgeLbl: { fontSize: 6, fontWeight: '700', color: D.text3, letterSpacing: 1 },
});

// ─── Cards tab ────────────────────────────────────────────────────────────────

function CardsTab({ yellows, reds, discipline }: {
  yellows: TeamRankEntry[];
  reds: TeamRankEntry[];
  discipline: TeamRankEntry[];
}) {
  const [sub, setSub] = useState<'yellow' | 'red' | 'discipline'>('yellow');
  return (
    <View style={{ gap: 12 }}>
      {/* Sub-tabs */}
      <View style={ct.subRow}>
        {(['yellow', 'red', 'discipline'] as const).map((k) => (
          <TouchableOpacity
            key={k}
            style={[ct.subTab, sub === k && ct.subTabActive]}
            onPress={() => setSub(k)}
          >
            <Text style={[ct.subLabel, sub === k && ct.subLabelActive]}>
              {k === 'yellow' ? '🟨 YELLOW' : k === 'red' ? '🟥 RED' : '⚖️ FAIR PLAY'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sub === 'yellow' && yellows.map((e, i) => (
        <TeamRow key={e.name} entry={e} rank={i + 1} color={D.yellow} label="YLW" />
      ))}
      {sub === 'red' && (reds.length === 0
        ? <Text style={ct.empty}>No red cards yet</Text>
        : reds.map((e, i) => (
          <TeamRow key={e.name} entry={e} rank={i + 1} color={D.red} label="RED" />
        ))
      )}
      {sub === 'discipline' && discipline.map((e, i) => (
        <TeamRow key={e.name} entry={e} rank={i + 1} color={D.signal} label="SCORE" />
      ))}
    </View>
  );
}

const ct = StyleSheet.create({
  subRow:      { flexDirection: 'row', gap: 6 },
  subTab:      {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: D.border,
    backgroundColor: D.surface,
    alignItems: 'center',
  },
  subTabActive: { borderColor: 'rgba(80,140,255,0.35)', backgroundColor: 'rgba(80,140,255,0.08)' },
  subLabel:     { fontSize: 8, fontWeight: '800', color: D.text3, letterSpacing: 0.8 },
  subLabelActive: { color: D.blue },
  empty: { fontSize: 12, color: D.text3, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function NoData({ color }: { color: string }) {
  return (
    <View style={nd.wrap}>
      <Text style={nd.icon}>📡</Text>
      <Text style={nd.text}>Waiting for match data…</Text>
      <Text style={nd.sub}>Stats update after each game</Text>
    </View>
  );
}

const nd = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  icon: { fontSize: 28 },
  text: { fontSize: 13, fontWeight: '700', color: D.text2 },
  sub:  { fontSize: 10, color: D.text3 },
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function TournamentIntelligenceSection() {
  const { data, loading } = useTournamentIntelligence();
  const [activeTab, setActiveTab] = useState<TabKey>('scorers');

  const activeConfig = TABS.find((t) => t.key === activeTab)!;

  return (
    <View style={ms.section}>
      <SectionHeader
        title="TOURNAMENT INTELLIGENCE"
        sub="Live stats — goals, defence, cards & Lili's picks"
      />

      {/* ── Tab row ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={ms.tabScroll}
        contentContainerStyle={ms.tabContent}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[ms.tab, active && { borderColor: `${tab.color}50`, backgroundColor: `${tab.color}0F` }]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={ms.tabIcon}>{tab.icon}</Text>
              <Text style={[ms.tabLabel, { color: active ? tab.color : D.text3 }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Content card ── */}
      <View style={ms.card}>
        {loading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={D.blue} />
          </View>
        ) : (
          <>
            {activeTab === 'scorers' && (
              data.topScorers.length === 0
                ? <NoData color={activeConfig.color} />
                : data.topScorers.map((e, i) => (
                    <ScorerRow key={e.name + i} entry={e} rank={i + 1} color={activeConfig.color} />
                  ))
            )}

            {activeTab === 'attack' && (
              data.bestAttack.length === 0
                ? <NoData color={activeConfig.color} />
                : data.bestAttack.map((e, i) => (
                    <TeamRow key={e.name} entry={e} rank={i + 1} color={activeConfig.color} label="GOALS" />
                  ))
            )}

            {activeTab === 'defence' && (
              data.bestDefence.length === 0
                ? <NoData color={activeConfig.color} />
                : data.bestDefence.map((e, i) => (
                    <TeamRow key={e.name} entry={e} rank={i + 1} color={activeConfig.color} label="GA/G" />
                  ))
            )}

            {activeTab === 'cards' && (
              <CardsTab
                yellows={data.mostYellows}
                reds={data.mostReds}
                discipline={data.disciplineRank}
              />
            )}

            {activeTab === 'danger' && (
              data.mostDangerous.length === 0
                ? <NoData color={activeConfig.color} />
                : data.mostDangerous.map((e, i) => (
                    <TeamRow key={e.name} entry={e} rank={i + 1} color={activeConfig.color} label="SCORE" />
                  ))
            )}

            {activeTab === 'surprise' && (
              <>
                <View style={ms.surpriseHint}>
                  <Text style={ms.surpriseHintText}>
                    Teams beating expectations based on their pre-tournament strength rating
                  </Text>
                </View>
                {data.liliSurpriseRank.length === 0
                  ? <NoData color={activeConfig.color} />
                  : data.liliSurpriseRank.map((e, i) => (
                      <TeamRow key={e.name} entry={e} rank={i + 1} color={activeConfig.color} label="INDEX" />
                    ))
                }
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ms = StyleSheet.create({
  section: { marginBottom: 24 },

  tabScroll:   { marginBottom: 12 },
  tabContent:  { gap: 7, paddingRight: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(80,140,255,0.14)',
    backgroundColor: '#0E1933',
  },
  tabIcon:  { fontSize: 13 },
  tabLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },

  card: {
    backgroundColor: '#0E1933',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(80,140,255,0.10)',
    padding: 14,
  },

  surpriseHint: {
    backgroundColor: 'rgba(0,229,160,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.14)',
    padding: 10,
    marginBottom: 12,
  },
  surpriseHintText: { fontSize: 10, color: 'rgba(0,229,160,0.7)', lineHeight: 15 },
});
