import { StyleSheet, Text, View } from 'react-native';
import { WC_FIXTURES, WC_TEAMS, type WCFixture } from '../lib/wcData';
import { FIXTURE_RESULTS } from '../lib/fixtureResultsData';
import { FIXTURE_STADIUM_ID, getStadium } from '../lib/stadiumData';
import { useLanguage } from '../contexts/LanguageContext';
import type { I18n } from '../lib/i18n';

// ─── Design tokens ────────────────────────────────────────────────────────────

const D = {
  bg:      '#050810',
  surface: '#0B1426',
  border:  'rgba(80,140,255,0.08)',
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

function fmtDate(iso: string, i18n: I18n): string {
  const datePart = iso.slice(0, 10);
  const time     = iso.slice(11, 16);
  if (datePart === localDate())    return `${i18n.tlToday} · ${time}`;
  if (datePart === tomorrowDate()) return `${i18n.tlTomorrow} · ${time}`;
  const [, mm, dd] = datePart.split('-');
  return `${parseInt(dd)} ${i18n.monthsShort[parseInt(mm) - 1]}, ${time}`;
}

function fmtAlt(m: number, i18n: I18n): string {
  return m < 100 ? i18n.tlSeaLevel : `⛰ ${m.toLocaleString()} m`;
}

// ─── Build entries ────────────────────────────────────────────────────────────

function buildEntries(group: string | null): MatchEntry[] {
  const fixtures = group
    ? WC_FIXTURES.filter((f) => f.group === group)
    : WC_FIXTURES.slice(0, 48);

  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let nextMarked = false;
  return sorted.map((fixture) => {
    const result = FIXTURE_RESULTS[`${fixture.home}|${fixture.away}`];
    const status = result?.status ?? fixture.status;
    if (status === 'FINISHED') return { fixture, kind: 'PLAYED' as MatchKind, homeScore: result?.homeScore, awayScore: result?.awayScore };
    if (status === 'LIVE')     return { fixture, kind: 'LIVE' as MatchKind,   homeScore: result?.homeScore, awayScore: result?.awayScore };
    if (!nextMarked) { nextMarked = true; return { fixture, kind: 'NEXT' as MatchKind }; }
    return { fixture, kind: 'UPCOMING' as MatchKind };
  });
}

// ─── Match row ────────────────────────────────────────────────────────────────

function MatchRow({ entry, i18n }: { entry: MatchEntry; i18n: I18n }) {
  const { fixture, kind, homeScore, awayScore } = entry;
  const color    = KIND_COLOR[kind];
  const homeTeam = WC_TEAMS.find((t) => t.name === fixture.home);
  const awayTeam = WC_TEAMS.find((t) => t.name === fixture.away);
  const stadium  = getStadium(FIXTURE_STADIUM_ID[fixture.stadium] ?? '');

  // ── Centre meta string ──────────────────────────────────────────────────────
  const dateStr = fmtDate(fixture.date, i18n);
  const scored  = homeScore != null && awayScore != null;

  const parts: string[] = [dateStr];
  if (kind === 'PLAYED' && scored) parts.push(`${homeScore} – ${awayScore}`);
  if (kind === 'LIVE'   && scored) parts.push(`🔴 ${homeScore} – ${awayScore}`);
  if (stadium) {
    parts.push(stadium.shortName);
    parts.push(`🌡 ${stadium.tempJuneC}°`);
    parts.push(fmtAlt(stadium.altitudeM, i18n));
  }
  const metaStr = parts.join('  ·  ');

  return (
    <View style={[row.wrap, { borderLeftColor: color, borderLeftWidth: 2 }]}>
      {/* Home */}
      <View style={row.teamLeft}>
        <Text style={row.flag}>{homeTeam?.flag ?? '🏳'}</Text>
        <Text style={row.nameLeft} numberOfLines={1}>{fixture.home}</Text>
      </View>

      {/* Centre */}
      <View style={row.centre}>
        <Text style={[row.meta, { color: kind === 'LIVE' ? D.red : kind === 'NEXT' ? D.gold : D.text2 }]}
              numberOfLines={2}
              textBreakStrategy="balanced"
        >
          {metaStr}
        </Text>
      </View>

      {/* Away */}
      <View style={row.teamRight}>
        <Text style={row.nameRight} numberOfLines={1}>{fixture.away}</Text>
        <Text style={row.flag}>{awayTeam?.flag ?? '🏳'}</Text>
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingRight: 12,
    paddingLeft: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: D.border,
    gap: 8,
  },
  teamLeft:  { flex: 3, flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamRight: { flex: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  flag:      { fontSize: 18 },
  nameLeft:  { fontSize: 12, fontWeight: '700', color: D.text1, flex: 1 },
  nameRight: { fontSize: 12, fontWeight: '700', color: D.text1, flex: 1, textAlign: 'right' },
  centre:    { flex: 4, alignItems: 'center' },
  meta:      { fontSize: 10, textAlign: 'center', lineHeight: 15 },
});

// ─── Section ──────────────────────────────────────────────────────────────────

export default function MatchTimelineSection({ group }: { group: string | null }) {
  const { i18n } = useLanguage();
  const entries  = buildEntries(group);

  return (
    <View style={tl.section}>
      {/* Header */}
      <View style={tl.header}>
        <Text style={tl.title}>{i18n.tlTitle}</Text>
        <Text style={tl.sub}>{i18n.tlSub}</Text>
      </View>

      {/* Row list */}
      <View style={tl.list}>
        {entries.map((entry) => (
          <MatchRow key={entry.fixture.id} entry={entry} i18n={i18n} />
        ))}
      </View>
    </View>
  );
}

const tl = StyleSheet.create({
  section: { marginBottom: 24 },
  header:  { marginBottom: 10, gap: 2 },
  title:   { fontSize: 9, fontWeight: '800', color: D.text3, letterSpacing: 1.8 },
  sub:     { fontSize: 11, color: D.text2 },
  list: {
    backgroundColor: D.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(80,140,255,0.10)',
    overflow: 'hidden',
  },
});
