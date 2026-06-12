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

  const dateStr = fmtDate(fixture.date, i18n);
  const scored  = homeScore != null && awayScore != null;
  const nameClr = kind === 'PLAYED' ? D.text2 : D.text1;
  const timeClr = kind === 'LIVE' ? D.red : kind === 'NEXT' ? D.gold : D.text2;

  const envParts: string[] = [];
  if (stadium) {
    envParts.push(`🏟 ${stadium.shortName}, ${stadium.city}`);
    envParts.push(`🌡 ${stadium.tempJuneC}°C`);
    envParts.push(fmtAlt(stadium.altitudeM, i18n));
  }

  return (
    <View style={[row.wrap, { borderLeftColor: color, borderLeftWidth: 2 }]}>
      {/* Match line: home · time [· score] · away */}
      <Text style={row.matchLine} numberOfLines={2}>
        <Text style={[row.team, { color: nameClr }]}>{homeTeam?.flag ?? '🏳'} {fixture.home}</Text>
        <Text style={{ color: timeClr }}>{'  ·  '}</Text>
        <Text style={{ color: timeClr }}>{dateStr}</Text>
        {scored && kind === 'LIVE'   && <Text style={{ color: D.red,   fontWeight: '700' }}>{'  ·  🔴 '}{homeScore}{'–'}{awayScore}</Text>}
        {scored && kind === 'PLAYED' && <Text style={{ color: D.text3, fontWeight: '700' }}>{'  ·  '}{homeScore}{'–'}{awayScore}</Text>}
        <Text style={{ color: timeClr }}>{'  ·  '}</Text>
        <Text style={[row.team, { color: nameClr }]}>{fixture.away} {awayTeam?.flag ?? '🏳'}</Text>
      </Text>

      {/* Environment line: stadium · temp · altitude */}
      {envParts.length > 0 && (
        <Text style={row.env} numberOfLines={1}>{envParts.join('  ·  ')}</Text>
      )}
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: D.border,
    gap: 3,
  },
  matchLine: { fontSize: 12, lineHeight: 18 },
  team:      { fontWeight: '700' },
  env:       { fontSize: 10, color: D.text3, lineHeight: 15, paddingLeft: 2 },
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
