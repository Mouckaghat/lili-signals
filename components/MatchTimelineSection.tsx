import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { WC_FIXTURES, WC_TEAMS, type WCFixture } from '../lib/wcData';
import { WC_KNOCKOUT, type KnockoutFixture } from '../lib/knockoutData';
import { MATCH_STATS } from '../lib/matchStatsData';
import type { FixtureResult } from '../lib/fixtureResultsData';
import { useLiveResults } from '../lib/useLiveResults';
import { useLineups } from '../lib/useLineups';
import type { MatchLineup } from '../lib/lineupData';
import { FIXTURE_STADIUM_ID, getStadium } from '../lib/stadiumData';
import { useLanguage } from '../contexts/LanguageContext';
import type { I18n } from '../lib/i18n';

// Fixtures we have territory/pressure stats for — only these get a Heatmap
// button, so a tap never lands on an empty screen.
const FIXTURES_WITH_HEAT = new Set(MATCH_STATS.map((m) => m.fixtureId));

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
  const d        = new Date(iso);
  const year     = d.getFullYear();
  const month    = String(d.getMonth() + 1).padStart(2, '0');
  const day      = String(d.getDate()).padStart(2, '0');
  const datePart = `${year}-${month}-${day}`;
  const time     = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (datePart === localDate())    return `${i18n.tlToday} · ${time}`;
  if (datePart === tomorrowDate()) return `${i18n.tlTomorrow} · ${time}`;
  return `${parseInt(day)} ${i18n.monthsShort[parseInt(month) - 1]}, ${time}`;
}

function fmtAlt(m: number, i18n: I18n): string {
  return m < 100 ? i18n.tlSeaLevel : `⛰ ${m.toLocaleString()} m`;
}

// Short label for the viewer's own timezone (e.g. "CEST", "GMT-5"), so the
// kickoff times below are self-documenting. Derived from the device clock —
// never hardcoded — and falls back gracefully if Intl is unavailable.
function localTzLabel(): string {
  try {
    const part = new Intl.DateTimeFormat('en-GB', { timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? '';
  } catch {
    return '';
  }
}

// ─── Heatmap teaser countdown ─────────────────────────────────────────────────
// As kickoff nears, an upcoming match's row shows a "Heatmap in …" teaser that
// builds anticipation for the forecast → live heatmap. Tapping it opens the
// forecast straight away. Outside this window, upcoming rows show nothing extra.
const HEAT_WARMUP_MS = 3 * 60 * 60 * 1000; // ≤3h out → "live at kickoff"
const HEAT_COUNT_MS  = 60 * 60 * 1000;     // ≤1h out → minutes countdown
const HEAT_TICK_MS   = 10 * 60 * 1000;     // ≤10m out → ticking m:ss (urgent)

function fmtCountdown(diffMs: number): string {
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (diffMs > HEAT_TICK_MS) return `${m}m`;      // ≥10 min → whole minutes
  return `${m}:${String(s).padStart(2, '0')}`;    // <10 min → ticking m:ss
}

// ─── Build entries ────────────────────────────────────────────────────────────

// Adapt a knockout fixture into the WCFixture shape the timeline already renders.
// The bracket is its own array (so it never skews group-stage models); here we
// only borrow the display fields. `group` carries the round label ("Round of 32")
// so the existing non-letter-group path renders it as a section + tag. `stadium`
// is the full venue name (resolved via FIXTURE_STADIUM_ID, '' → no venue line, so
// a TBC tie shows none rather than a fake one). `matchday`/`country` are unused
// for knockout rows (the section label branches on `group`) — set to safe
// defaults purely to satisfy the type.
function koToFixture(ko: KnockoutFixture): WCFixture {
  return {
    id: ko.id,
    group: ko.roundLabel,
    matchday: 3,
    home: ko.home,
    away: ko.away,
    date: ko.date,
    stadium: ko.venueName ?? '',
    city: ko.city ?? '',
    country: 'USA',
    status: ko.status,
    homeScore: ko.homeScore ?? undefined,
    awayScore: ko.awayScore ?? undefined,
  };
}

function buildEntries(group: string | null, liveResults: Record<string, FixtureResult>, includeKnockouts: boolean): MatchEntry[] {
  // General list shows the WHOLE tournament (sorted by date below), so matchday-3
  // and the knockout bracket always appear — never a frozen first-N cap that
  // strands later games (the old `.slice(0, 48)` cut the list off at ~24 Jun).
  // Knockout ties aren't group-scoped, so they only join the "All" view; a
  // specific group still shows just that group's six games. Section headers (see
  // render) keep the longer list scannable. `includeKnockouts=false` (the Pool
  // Games / group-stage view) keeps the bracket out — those live in Road to the
  // Final — so the list stays "everything BEFORE the knockouts".
  const fixtures = group
    ? WC_FIXTURES.filter((f) => f.group === group)
    : includeKnockouts
      ? [...WC_FIXTURES, ...WC_KNOCKOUT.map(koToFixture)]
      : [...WC_FIXTURES];

  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let nextMarked = false;
  return sorted.map((fixture) => {
    const result = liveResults[`${fixture.home}|${fixture.away}`];
    const status = result?.status ?? fixture.status;
    // Score from the live overlay first, then the fixture's own baked score
    // (group fixtures carry none → undefined; knockout fixtures bake the result
    // so a finished tie shows immediately, even before the overlay loads).
    const hs = result?.homeScore ?? fixture.homeScore;
    const as = result?.awayScore ?? fixture.awayScore;
    if (status === 'FINISHED') return { fixture, kind: 'PLAYED' as MatchKind, homeScore: hs, awayScore: as };
    if (status === 'LIVE')     return { fixture, kind: 'LIVE' as MatchKind,   homeScore: hs, awayScore: as };
    if (!nextMarked) { nextMarked = true; return { fixture, kind: 'NEXT' as MatchKind }; }
    return { fixture, kind: 'UPCOMING' as MatchKind };
  });
}

// Section label for the round dividers. Group stage → "Matchday N" (reusing the
// existing i18n.matchday key, all 11 langs); knockout fixtures carry their round
// name in `group` (e.g. "Round of 16") so we show it verbatim — they slot into
// the same timeline automatically once the sync pipeline adds them.
function sectionLabel(f: WCFixture, i18n: I18n): string {
  return /^[A-L]$/.test(f.group) ? `${i18n.matchday} ${f.matchday}` : f.group;
}

// ─── Match row ────────────────────────────────────────────────────────────────

function MatchRow({ entry, lineup, i18n, now }: { entry: MatchEntry; lineup?: MatchLineup; i18n: I18n; now: number }) {
  const { fixture, kind, homeScore, awayScore } = entry;
  const color    = KIND_COLOR[kind];
  const homeTeam = WC_TEAMS.find((t) => t.name === fixture.home);
  const awayTeam = WC_TEAMS.find((t) => t.name === fixture.away);
  const stadium  = getStadium(FIXTURE_STADIUM_ID[fixture.stadium] ?? '');

  const dateStr = fmtDate(fixture.date, i18n);
  const scored  = homeScore != null && awayScore != null;
  const nameClr = kind === 'PLAYED' ? D.text2 : D.text1;
  const timeClr = kind === 'LIVE' ? D.red : kind === 'NEXT' ? D.gold : D.text2;

  // Group tag — so a reader who scrolls straight here knows which group each
  // side is in. Single letter → "Group A"; anything else (knockout) shown as-is.
  const groupLabel = /^[A-L]$/.test(fixture.group) ? `${i18n.group} ${fixture.group}` : fixture.group;

  const envParts: string[] = [];
  if (stadium) {
    envParts.push(`🏟 ${stadium.shortName}, ${stadium.city}`);
    envParts.push(`🌡 ${stadium.tempJuneC}°C`);
    envParts.push(fmtAlt(stadium.altitudeM, i18n));
  }

  // Heatmap entry point: live/finished games with stats get the model; an
  // upcoming game inside the warm-up window gets the countdown teaser → forecast.
  // Knockout rows have no heatmap model yet (not in MATCH_STATS, not in the
  // match-heatmap screen's data), so they show no heat pill — a tap would land
  // on an empty screen. Their own pick-the-winner affordance comes separately.
  const isKnockout   = !/^[A-L]$/.test(fixture.group);
  const toKO         = new Date(fixture.date).getTime() - now;
  const kickedOff    = toKO <= 0;                                              // scheduled KO time reached
  const showLivePill = !isKnockout && (FIXTURES_WITH_HEAT.has(fixture.id) || kind === 'LIVE');  // a real model exists now
  // The whistle has gone but the model isn't ready yet — the LIVE status (~20s
  // results poll) and the stats feed both lag kickoff by a minute or two. Keep a
  // tappable "warming up" pill across that gap so the countdown always DELIVERS
  // into a live state instead of leaving a blank row (it opens the screen's own
  // "warming up — appears within a few minutes" message).
  const showWarming  = !isKnockout && !showLivePill && kickedOff && kind !== 'PLAYED';
  const showTeaser   = !isKnockout && !showLivePill && !showWarming && kind !== 'PLAYED' && toKO > 0 && toKO <= HEAT_WARMUP_MS;
  const urgent       = toKO <= HEAT_TICK_MS;
  const openHeatmap  = () => router.push({ pathname: '/match-heatmap', params: { fixtureId: fixture.id } } as any);

  return (
    <View style={[row.wrap, { borderLeftColor: color, borderLeftWidth: 2 }]}>
      {/* Match line: time · home [4-3-3] vs [3-5-2] away [· score] */}
      <Text style={row.matchLine} numberOfLines={2}>
        <Text style={{ color: timeClr }}>{dateStr}</Text>
        <Text style={{ color: timeClr }}>{'  ·  '}</Text>
        <Text style={[row.team, { color: nameClr }]}>{homeTeam?.flag ?? '🏳'} {fixture.home}</Text>
        {lineup?.home.formation && lineup.home.formation !== '?' && (
          <Text style={row.formation}>{' ['}{lineup.home.formation}{']'}</Text>
        )}
        <Text style={{ color: D.text3 }}>{' vs '}</Text>
        {lineup?.away.formation && lineup.away.formation !== '?' && (
          <Text style={row.formation}>{' ['}{lineup.away.formation}{'] '}</Text>
        )}
        <Text style={[row.team, { color: nameClr }]}>{awayTeam?.flag ?? '🏳'} {fixture.away}</Text>
        {scored && kind === 'LIVE'   && <Text style={{ color: D.red,   fontWeight: '700' }}>{'  ·  🔴 '}{homeScore}{'–'}{awayScore}</Text>}
        {scored && kind === 'PLAYED' && <Text style={{ color: D.text3, fontWeight: '700' }}>{'  ·  '}{homeScore}{'–'}{awayScore}</Text>}
      </Text>

      {/* Environment line: group · stadium · temp · altitude */}
      <Text style={row.env} numberOfLines={1}>
        <Text style={row.group}>{groupLabel}</Text>
        {envParts.length > 0 && <Text>{'  ·  '}{envParts.join('  ·  ')}</Text>}
      </Text>

      {/* Heatmap shortcut — for matches with pre-baked stats AND any LIVE game
          (live games get their heatmap from /api/match-stats at runtime, so the
          flame must show even though the fixture isn't in the static set). */}
      {showLivePill ? (
        <Pressable
          onPress={openHeatmap}
          hitSlop={6}
          style={({ pressed }) => [row.heatBtn, pressed && row.heatBtnPressed]}
        >
          <Text style={row.heatBtnText}>🔥 {i18n.tlHeatmap} →</Text>
        </Pressable>
      ) : showWarming ? (
        <Pressable
          onPress={openHeatmap}
          hitSlop={6}
          style={({ pressed }) => [row.heatBtn, row.heatBtnUrgent, pressed && row.heatBtnPressed]}
        >
          <Text style={[row.heatBtnText, row.heatBtnUrgentText]}>🔴 {i18n.tlHeatmap} →</Text>
        </Pressable>
      ) : showTeaser ? (
        <Pressable
          onPress={openHeatmap}
          hitSlop={6}
          style={({ pressed }) => [row.heatBtn, row.heatBtnTeaser, urgent && row.heatBtnUrgent, pressed && row.heatBtnPressed]}
        >
          <Text style={[row.heatBtnText, row.heatBtnTeaserText, urgent && row.heatBtnUrgentText]}>
            🔥 {toKO <= HEAT_COUNT_MS ? `${i18n.tlHeatmapSoon} ${fmtCountdown(toKO)}` : i18n.tlHeatmapAtKO}
          </Text>
        </Pressable>
      ) : null}
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
  formation: { fontSize: 10, color: D.text3, fontWeight: '400' },
  env:       { fontSize: 10, color: D.text3, lineHeight: 15, paddingLeft: 2 },
  group:     { fontSize: 10, color: D.blue, fontWeight: '700' },
  heatBtn:   { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 4, paddingHorizontal: 10,
               borderRadius: 999, borderWidth: 1, borderColor: 'rgba(74,158,255,0.35)',
               backgroundColor: 'rgba(74,158,255,0.10)' },
  heatBtnPressed: { backgroundColor: 'rgba(74,158,255,0.22)' },
  heatBtnText: { fontSize: 11, fontWeight: '700', color: D.blue },
  // Teaser (gold = anticipation), escalating to red in the final 10 minutes.
  heatBtnTeaser:     { borderColor: 'rgba(212,165,32,0.45)', backgroundColor: 'rgba(212,165,32,0.10)' },
  heatBtnTeaserText: { color: D.gold },
  heatBtnUrgent:     { borderColor: 'rgba(255,59,48,0.55)', backgroundColor: 'rgba(255,59,48,0.12)' },
  heatBtnUrgentText: { color: D.red },
});

// ─── Section ──────────────────────────────────────────────────────────────────

export default function MatchTimelineSection({ group, includeKnockouts = true }: { group: string | null; includeKnockouts?: boolean }) {
  const { i18n }    = useLanguage();
  const liveResults = useLiveResults();
  const allLineups  = useLineups();
  const entries     = buildEntries(group, liveResults, includeKnockouts);
  const tzLabel     = localTzLabel();

  // Tick every second so the heatmap teaser countdowns stay live.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const lineupByKey = new Map(allLineups.map((l) => [l.fixtureKey, l]));

  // Bucket the (date-sorted) entries into round sections — Matchday 1/2/3, then
  // any knockout rounds — preserving the date order inside each section and the
  // first-seen order of the sections themselves. Headers keep the full-tournament
  // list scannable without dropping any row (so every 🔥 Heatmap button stays).
  const sections: { label: string; rows: MatchEntry[] }[] = [];
  const byLabel = new Map<string, MatchEntry[]>();
  for (const entry of entries) {
    const label = sectionLabel(entry.fixture, i18n);
    let bucket = byLabel.get(label);
    if (!bucket) { bucket = []; byLabel.set(label, bucket); sections.push({ label, rows: bucket }); }
    bucket.push(entry);
  }

  return (
    <View style={tl.section}>
      {/* Header */}
      <View style={tl.header}>
        <Text style={tl.title}>{i18n.tlTitle}</Text>
        <Text style={tl.sub}>
          {i18n.tlSub}
          {tzLabel ? <Text style={tl.tz}>{'  ·  🕑 '}{tzLabel}</Text> : null}
        </Text>
      </View>

      {/* Row list, grouped by round */}
      <View style={tl.list}>
        {sections.map((sec) => (
          <View key={sec.label}>
            <View style={tl.sectionHeader}>
              <Text style={tl.sectionHeaderText}>{sec.label}</Text>
            </View>
            {sec.rows.map((entry) => (
              <MatchRow
                key={entry.fixture.id}
                entry={entry}
                lineup={lineupByKey.get(`${entry.fixture.home}|${entry.fixture.away}`)}
                i18n={i18n}
                now={now}
              />
            ))}
          </View>
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
  tz:      { fontSize: 11, color: D.blue, fontWeight: '700' },
  list: {
    backgroundColor: D.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(80,140,255,0.10)',
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(74,158,255,0.06)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: D.border,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: D.blue,
    textTransform: 'uppercase',
  },
});
