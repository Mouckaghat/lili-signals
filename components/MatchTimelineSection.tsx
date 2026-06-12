import { StyleSheet, Text, View } from 'react-native';
import { WC_FIXTURES, WC_TEAMS, type WCFixture } from '../lib/wcData';
import { FIXTURE_RESULTS } from '../lib/fixtureResultsData';
import { FIXTURE_STADIUM_ID, getStadium } from '../lib/stadiumData';
import { useLanguage } from '../contexts/LanguageContext';
import type { I18n } from '../lib/i18n';

// ─── Design tokens ────────────────────────────────────────────────────────────

const D = {
  bg:      '#050810',
  card:    '#0E1933',
  surface: '#0B1426',
  border:  'rgba(80,140,255,0.10)',
  blue:    '#4A9EFF',
  green:   '#34C759',
  red:     '#FF3B30',
  gold:    '#D4A520',
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
  text3:   '#374F7A',
};

// ─── Match classification ─────────────────────────────────────────────────────

type MatchKind = 'PLAYED' | 'LIVE' | 'NEXT' | 'UPCOMING';

interface MatchEntry {
  fixture: WCFixture;
  kind: MatchKind;
  homeScore?: number | null;
  awayScore?: number | null;
}

const KIND_COLOR: Record<MatchKind, string> = {
  PLAYED:   D.text3,
  LIVE:     D.red,
  NEXT:     D.gold,
  UPCOMING: D.blue,
};
const KIND_BG: Record<MatchKind, string> = {
  PLAYED:   'rgba(55,79,122,0.10)',
  LIVE:     'rgba(255,59,48,0.10)',
  NEXT:     'rgba(212,165,32,0.12)',
  UPCOMING: 'rgba(74,158,255,0.08)',
};
const KIND_ICON: Record<MatchKind, string> = {
  PLAYED:   '✅',
  LIVE:     '🔴',
  NEXT:     '🎯',
  UPCOMING: '🔜',
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtMatchDate(iso: string, i18n: I18n): string {
  const datePart = iso.slice(0, 10);
  const time     = iso.slice(11, 16);
  if (datePart === localDate())    return `${i18n.tlToday} · ${time}`;
  if (datePart === tomorrowDate()) return `${i18n.tlTomorrow} · ${time}`;
  const [, mm, dd] = datePart.split('-');
  return `${parseInt(dd)} ${i18n.monthsShort[parseInt(mm) - 1]} · ${time}`;
}

// ─── Altitude display ─────────────────────────────────────────────────────────

function fmtAlt(m: number, seaLevel: string): string {
  if (m < 100) return seaLevel;
  return `${m.toLocaleString()} m`;
}

// ─── Build entries ────────────────────────────────────────────────────────────

function buildEntries(group: string | null): MatchEntry[] {
  const fixtures = group
    ? WC_FIXTURES.filter((f) => f.group === group)
    : WC_FIXTURES.slice(0, 48); // group stage only

  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let nextMarked = false;
  return sorted.map((fixture) => {
    const result = FIXTURE_RESULTS[`${fixture.home}|${fixture.away}`];
    const status = result?.status ?? fixture.status;

    if (status === 'FINISHED') {
      return { fixture, kind: 'PLAYED' as MatchKind, homeScore: result?.homeScore, awayScore: result?.awayScore };
    }
    if (status === 'LIVE') {
      return { fixture, kind: 'LIVE' as MatchKind, homeScore: result?.homeScore, awayScore: result?.awayScore };
    }
    if (!nextMarked) { nextMarked = true; return { fixture, kind: 'NEXT' as MatchKind }; }
    return { fixture, kind: 'UPCOMING' as MatchKind };
  });
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({ entry, i18n }: { entry: MatchEntry; i18n: I18n }) {
  const { fixture, kind, homeScore, awayScore } = entry;
  const color = KIND_COLOR[kind];
  const bg    = KIND_BG[kind];

  const homeTeam = WC_TEAMS.find((t) => t.name === fixture.home);
  const awayTeam = WC_TEAMS.find((t) => t.name === fixture.away);

  const stadiumId = FIXTURE_STADIUM_ID[fixture.stadium];
  const stadium   = stadiumId ? getStadium(stadiumId) : undefined;

  const isScored = homeScore != null && awayScore != null;
  const dateStr  = fmtMatchDate(fixture.date, i18n);

  const kindLabels: Record<MatchKind, string> = {
    PLAYED:   i18n.tlPlayed,
    LIVE:     i18n.tlLive,
    NEXT:     i18n.tlNext,
    UPCOMING: i18n.tlUpcoming,
  };

  return (
    <View style={[mc.card, { borderColor: `${color}22` }]}>
      {/* ── Status bar ── */}
      <View style={[mc.statusBar, { backgroundColor: bg }]}>
        <View style={mc.statusLeft}>
          <Text style={mc.statusIcon}>{KIND_ICON[kind]}</Text>
          <Text style={[mc.statusLabel, { color }]}>{kindLabels[kind]}</Text>
        </View>
        <View style={mc.statusRight}>
          <Text style={mc.dateText}>{dateStr}</Text>
          <Text style={mc.groupText}>Group {fixture.group}</Text>
        </View>
      </View>

      {/* ── Score row ── */}
      <View style={mc.scoreRow}>
        <View style={mc.teamHome}>
          <Text style={mc.teamFlag}>{homeTeam?.flag ?? '🏳'}</Text>
          <Text style={mc.teamName} numberOfLines={1}>{fixture.home}</Text>
        </View>
        <View style={mc.centre}>
          {isScored ? (
            <>
              <Text style={[mc.scoreNum, { color: D.text1 }]}>{homeScore}</Text>
              <Text style={mc.dash}>—</Text>
              <Text style={[mc.scoreNum, { color: D.text1 }]}>{awayScore}</Text>
            </>
          ) : (
            <Text style={[mc.vs, { color: D.text3 }]}>vs</Text>
          )}
        </View>
        <View style={mc.teamAway}>
          <Text style={mc.teamName} numberOfLines={1}>{fixture.away}</Text>
          <Text style={mc.teamFlag}>{awayTeam?.flag ?? '🏳'}</Text>
        </View>
      </View>

      {/* ── Venue footer — two columns ── */}
      <View style={mc.venueRow}>
        <View style={mc.venueLeft}>
          <Text style={mc.venueStadium}>🏟 {stadium?.shortName ?? fixture.stadium}</Text>
          <Text style={mc.venueCity}>📍 {fixture.city}</Text>
        </View>
        {stadium && (
          <View style={mc.venueRight}>
            <Text style={mc.venueClimate}>🌡 {stadium.tempJuneC}°C</Text>
            <Text style={mc.venueClimate}>⛰ {fmtAlt(stadium.altitudeM, i18n.tlSeaLevel)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const mc = StyleSheet.create({
  card: {
    backgroundColor: D.card,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(80,140,255,0.07)',
  },
  statusLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusRight: { alignItems: 'flex-end', gap: 1 },
  statusIcon:  { fontSize: 13 },
  statusLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  groupText:   { fontSize: 9, fontWeight: '700', color: D.text3, letterSpacing: 0.5 },
  dateText:    { fontSize: 10, fontWeight: '600', color: D.text2 },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  teamHome:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamAway:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  teamFlag:  { fontSize: 20 },
  teamName:  { fontSize: 11, fontWeight: '700', color: D.text1, flex: 1 },
  centre:    { alignItems: 'center', flexDirection: 'row', gap: 4, minWidth: 70, justifyContent: 'center' },
  scoreNum:  { fontSize: 20, fontWeight: '800' },
  dash:      { fontSize: 14, fontWeight: '700', color: D.text3 },
  vs:        { fontSize: 14, fontWeight: '700' },

  venueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(80,140,255,0.07)',
    backgroundColor: D.surface,
    gap: 8,
  },
  venueLeft:    { flex: 1, gap: 2 },
  venueStadium: { fontSize: 10, fontWeight: '700', color: D.text2 },
  venueCity:    { fontSize: 9, color: D.text3 },
  venueRight:   { alignItems: 'flex-end', gap: 2 },
  venueClimate: { fontSize: 10, fontWeight: '600', color: D.text2 },
});

// ─── Section ──────────────────────────────────────────────────────────────────

export default function MatchTimelineSection({ group }: { group: string | null }) {
  const { i18n } = useLanguage();
  const entries  = buildEntries(group);

  return (
    <View style={tl.section}>
      <View style={tl.header}>
        <Text style={tl.title}>{i18n.tlTitle}</Text>
        <Text style={tl.sub}>{i18n.tlSub}</Text>
      </View>
      {entries.map((entry) => (
        <MatchCard key={entry.fixture.id} entry={entry} i18n={i18n} />
      ))}
    </View>
  );
}

const tl = StyleSheet.create({
  section: { marginBottom: 8 },
  header:  { marginBottom: 12, gap: 2 },
  title:   { fontSize: 9, fontWeight: '800', color: D.text3, letterSpacing: 1.8 },
  sub:     { fontSize: 11, color: D.text2 },
});
