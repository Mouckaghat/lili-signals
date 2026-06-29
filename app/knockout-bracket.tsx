import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildRoadToFinal, liliKnockoutRecord, type KnockoutTie, type RoundGroup, type Side, type TeamForm } from '../lib/knockoutModel';
import { buildFullBracket, buildTeamPath, type BracketNode, type PathStep, type SlotSide, type TeamPath } from '../lib/bracketModel';
import type { KnockoutRound } from '../lib/knockoutData';
import { KNOCKOUT_MATCH_STATS } from '../lib/matchStatsData';
import { useLiveResults } from '../lib/useLiveResults';
import { useKnockoutPicks } from '../contexts/KnockoutPicksContext';
import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import { KNOCKOUT_I18N, koT } from '../lib/knockoutI18n';

// Knockout fixtures that have a real match-intelligence model baked. A tie only
// gets a "Relive the match" deep-link once its stats exist (captured while live),
// so the tap always lands on real content, never an empty screen. Lights up
// automatically when the live-stats bot bakes the game into KNOCKOUT_MATCH_STATS.
const FIXTURES_WITH_INTEL = new Set(KNOCKOUT_MATCH_STATS.map((m) => m.fixtureId));

// ─── Design tokens (cinematic dark navy + trophy gold) ─────────────────────────
const D = {
  bg:     '#040A14',
  bgHi:   '#08182C',
  card:   '#0C1C2C',
  cardHi: '#102539',
  border: 'rgba(0,200,255,0.10)',
  text1:  '#EEF2FF',
  text2:  '#8298BE',
  text3:  '#4A6088',
  blue:   '#4A9EFF',
  green:  '#34D399',
  red:    '#FF6B6B',
  gold:   '#F5C451',
  // bleu-blanc-rouge identity, woven into the hero
  fr:     '#4A6BFF',
  white:  '#F4F7FF',
  fred:   '#FF5A6E',
};

// Each round gets its own accent, warming toward gold at the Final — the "road"
// visibly heats up as it nears the trophy.
const ROUND_COLOR: Record<KnockoutRound, string> = {
  R32: '#4A9EFF', R16: '#22D3EE', QF: '#34D399', SF: '#FF9F45', '3RD': '#8298BE', F: '#F5C451',
};
// A short stage badge for the premium stage header.
const ROUND_BADGE: Record<KnockoutRound, string> = {
  R32: 'R32', R16: 'R16', QF: 'QF', SF: 'SF', '3RD': '3rd', F: '🏆',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon} · ${hh}:${mm}`;
}

type T = typeof KNOCKOUT_I18N['EN'];

// ─── One team row inside a tie card ─────────────────────────────────────────────
function TeamRow({
  team, side, tie, picked, isFav, t, accent,
}: {
  team: TeamForm | null;
  side: Side;
  tie: KnockoutTie;
  picked: boolean;
  isFav: boolean;       // user's favourite team
  t: T;
  accent: string;
}) {
  const liliBacks = tie.liliFav === side;
  const goals = tie.result ? tie.result[side] : null;
  const isWinner = tie.winner === side;
  const dim = tie.winner != null && !isWinner;

  return (
    <View style={[bx.teamRow, picked && { backgroundColor: 'rgba(74,158,255,0.10)' }, isWinner && { backgroundColor: accent + '14' }]}>
      {isWinner && <View style={[bx.winBar, { backgroundColor: accent }]} />}
      <Text style={[bx.flag, dim && bx.dim]}>{team?.flag ?? '🏳️'}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[bx.teamName, dim && bx.dim, isFav && { color: D.gold }]} numberOfLines={1}>
          {team?.name ?? t.toBeDecided}
          {liliBacks && <Text style={bx.liliDot}>{'  '}🤖</Text>}
          {isWinner && <Text style={{ color: accent }}>{'  '}✦</Text>}
        </Text>
        {team && (
          <Text style={bx.formLine} numberOfLines={1}>
            {team.pts != null ? koT(t.ptsShort, { n: team.pts }) : '—'}
            {team.liliTotal > 0 && <Text>{'  ·  '}{koT(t.liliCall, { c: team.liliCorrect, t: team.liliTotal })}</Text>}
            <Text style={bx.strength}>{'  ·  '}⚡{team.strength}</Text>
          </Text>
        )}
      </View>
      {goals != null && (
        <Text style={[bx.goals, isWinner ? { color: accent } : bx.dim]}>{goals}</Text>
      )}
    </View>
  );
}

// ─── Drama badge ────────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[bx.badge, { borderColor: color + '66', backgroundColor: color + '1A' }]}>
      <Text style={[bx.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── A single knockout tie card ─────────────────────────────────────────────────
function TieCard({ tie, accent, t }: { tie: KnockoutTie; accent: string; t: T }) {
  const { picks, setPick } = useKnockoutPicks();
  const { favTeam } = useProfile();
  const router = useRouter();
  const myPick = picks[tie.fixture.id];
  const locked = tie.status !== 'SCHEDULED';            // lock at kickoff — picks are predictions
  const finished = tie.status === 'FINISHED' && tie.winner != null;
  const live = tie.status === 'LIVE';
  const bothKnown = !!tie.home && !!tie.away;

  const venue = tie.stadium
    ? `🏟 ${tie.stadium.shortName}${tie.stadium.city ? ', ' + tie.stadium.city : ''}`
    : tie.venueName
      ? `🏟 ${tie.venueName}${tie.city ? ', ' + tie.city : ''}`
      : `🏟 ${t.venueTBC}`;

  const favName = (side: Side) => (side === 'home' ? tie.home?.name : tie.away?.name) ?? '';
  const isFav = (side: Side) => !!favTeam && favName(side) === favTeam;
  const followed = isFav('home') || isFav('away');

  const myRight = finished && myPick ? (myPick === tie.winner) : null;
  const homePct = Math.round(tie.homeProb * 100);
  const liliPct = tie.liliFav === 'home' ? homePct : 100 - homePct;

  // ── Drama indicators (existing data only — never invented) ──
  const highConf = bothKnown && liliPct >= 65;
  const closeCall = bothKnown && liliPct <= 55;
  let upset = false;
  if (finished && tie.home && tie.away && tie.winner) {
    const winS = tie.winner === 'home' ? tie.home.strength : tie.away.strength;
    const loseS = tie.winner === 'home' ? tie.away.strength : tie.home.strength;
    upset = winS < loseS; // the lower-rated side went through
  }

  // Match-intelligence access for completed/live ties that actually have a model.
  const canRelive = (finished || live) && FIXTURES_WITH_INTEL.has(tie.fixture.id);

  const PickBtn = ({ side }: { side: Side }) => {
    const selected = myPick === side;
    return (
      <Pressable
        disabled={locked}
        onPress={() => setPick(tie.fixture.id, side)}
        style={[bx.pickBtn, selected && { borderColor: accent, backgroundColor: 'rgba(74,158,255,0.16)' }, locked && bx.pickBtnLocked]}
      >
        <Text style={[bx.pickBtnText, selected && { color: D.text1 }]} numberOfLines={1}>
          {(side === 'home' ? tie.home?.flag : tie.away?.flag) ?? '🏳️'} {favName(side) || t.toBeDecided}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[bx.card, { borderLeftColor: accent }, followed && bx.cardFollowed]}>
      {/* meta + status / drama chips */}
      <View style={bx.metaRow}>
        <Text style={bx.meta} numberOfLines={1}>{fmtDate(tie.fixture.date)}  ·  {venue}</Text>
        {live && <Text style={[bx.chip, { color: D.red }]}>🔴 {t.live}</Text>}
        {finished && <Text style={[bx.chip, { color: D.text3 }]}>{t.ft}</Text>}
      </View>

      {/* teams */}
      <TeamRow team={tie.home} side="home" tie={tie} picked={myPick === 'home'} isFav={isFav('home')} t={t} accent={accent} />
      <TeamRow team={tie.away} side="away" tie={tie} picked={myPick === 'away'} isFav={isFav('away')} t={t} accent={accent} />

      {/* drama badges */}
      {(highConf || closeCall || upset || followed) && (
        <View style={bx.badgeRow}>
          {upset && <Badge label={`🤯 ${t.upset}`} color={D.red} />}
          {highConf && <Badge label={`🔥 ${t.highConfidence}`} color={D.gold} />}
          {closeCall && <Badge label={`⚖️ ${t.closeCall}`} color={D.blue} />}
          {followed && <Badge label={`⭐ ${t.heroYourTeamLabel}`} color={D.gold} />}
        </View>
      )}

      {/* Lili's read — predicted scoreline + confidence bar */}
      <View style={bx.liliBlock}>
        <Text style={bx.liliText} numberOfLines={1}>
          🤖 {t.liliPredicts} <Text style={bx.liliScore}>{tie.liliScore.home}–{tie.liliScore.away}</Text>
          {finished && (
            <Text style={{ color: tie.liliRight ? D.green : D.red, fontWeight: '900' }}>{'   '}{tie.liliRight ? '✓' : '✗'}</Text>
          )}
        </Text>
        {bothKnown && (
          <>
            <View style={bx.confBar}>
              <View style={{ flex: Math.max(0.001, tie.homeProb), backgroundColor: tie.liliFav === 'home' ? accent : D.cardHi }} />
              <View style={{ flex: Math.max(0.001, 1 - tie.homeProb), backgroundColor: tie.liliFav === 'away' ? accent : D.cardHi }} />
            </View>
            <Text style={bx.confLabel} numberOfLines={1}>
              {koT(t.liliPicks, { team: favName(tie.liliFav) })} <Text style={{ color: accent, fontWeight: '800' }}>{liliPct}%</Text>
              <Text style={{ color: D.text3 }}>{'  ·  '}{t.confidenceLabel}</Text>
            </Text>
          </>
        )}
      </View>

      {/* your pick / the game */}
      {bothKnown ? (
        finished ? (
          <View style={bx.resultRow}>
            <Text style={[bx.resultText, { color: myRight == null ? D.text3 : myRight ? D.green : D.red }]}>
              {myPick ? (myRight ? '✅ ' + t.youGotIt : '❌ ' + t.youMissed) : '— ' + t.yourPick}
            </Text>
            <Text style={bx.advances}>✦ {koT(t.advances, { team: favName(tie.winner!) })}</Text>
          </View>
        ) : (
          <View>
            <Text style={bx.pickPrompt}>{locked ? `${t.yourPick} · ${t.winnerAdvances}` : `${t.pickPrompt} · ${t.winnerAdvances}`}</Text>
            <View style={bx.pickRow}>
              <PickBtn side="home" />
              <PickBtn side="away" />
            </View>
          </View>
        )
      ) : null}

      {/* relive the match — only when a real match-intelligence model exists */}
      {canRelive && (
        <Pressable
          onPress={() => router.push({ pathname: '/match-heatmap', params: { fixtureId: tie.fixture.id } } as any)}
          style={({ pressed }) => [bx.relive, pressed && { backgroundColor: 'rgba(245,196,81,0.18)' }]}
        >
          <Text style={bx.reliveText}>🎬 {t.reliveMatch}  ·  📊 →</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── A round = a premium "stage" ────────────────────────────────────────────────
function StageSection({ group, t, cols }: { group: RoundGroup; t: T; cols: number }) {
  const accent = ROUND_COLOR[group.round];
  const label = t.rounds[group.round];
  const empty = group.ties.length === 0;

  return (
    <View style={bx.stage}>
      {/* stage header */}
      <View style={bx.stageHeader}>
        <View style={[bx.stageBadge, { borderColor: accent }]}>
          <Text style={[bx.stageBadgeText, { color: accent }]}>{ROUND_BADGE[group.round]}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[bx.stageTitle, { color: accent }]} numberOfLines={1}>{label}</Text>
          {!empty && <Text style={bx.stageMeta}>{koT(t.matchesShort, { n: group.ties.length })}</Text>}
        </View>
      </View>
      <View style={[bx.stageRule, { backgroundColor: accent + '40' }]} />

      {/* ties — single column on phone, 2-up grid on wide screens */}
      {empty ? (
        <View style={bx.locked}>
          <Text style={bx.lockedText}>🔒 {t.locked}</Text>
        </View>
      ) : (
        <View style={[bx.grid, cols === 2 && bx.gridWide]}>
          {group.ties.map((tie) => (
            <View key={tie.fixture.id} style={cols === 2 ? bx.cellWide : bx.cell}>
              <TieCard tie={tie} accent={accent} t={t} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Hero (current stage · teams left · Lili's favourite · your team) ────────────
function Hero({ rounds, rec, t }: { rounds: RoundGroup[]; rec: { correct: number; total: number }; t: T }) {
  const { favTeam } = useProfile();

  // Deepest seeded round = the stage currently in play.
  const seeded = rounds.filter((r) => r.ties.length > 0);
  const current = seeded[seeded.length - 1] ?? null;

  // Teams still alive in the current stage (winner advances, others out).
  const alive: TeamForm[] = [];
  if (current) {
    for (const tie of current.ties) {
      if (tie.winner) {
        const w = tie.winner === 'home' ? tie.home : tie.away;
        if (w) alive.push(w);
      } else {
        if (tie.home) alive.push(tie.home);
        if (tie.away) alive.push(tie.away);
      }
    }
  }
  const liliFav = [...alive].sort((a, b) => b.strength - a.strength)[0] ?? null;
  const yourTeam = favTeam ? alive.find((tm) => tm.name === favTeam) ?? null : null;

  // Path-to-the-final rail (skip the 3rd-place play-off — it's a detour).
  const pathRounds = rounds.filter((r) => r.round !== '3RD');

  return (
    <View style={bx.hero}>
      <View style={bx.heroGlow} pointerEvents="none" />
      <Text style={bx.heroKicker}>🏆 {t.title}</Text>
      {/* bleu-blanc-rouge identity, kept as a quiet signature line */}
      <View style={bx.tricolor}>
        <View style={[bx.tricolorSeg, { backgroundColor: D.fr }]} />
        <View style={[bx.tricolorSeg, { backgroundColor: D.white }]} />
        <View style={[bx.tricolorSeg, { backgroundColor: D.fred }]} />
      </View>
      <Text style={bx.heroSub}>{t.intro}</Text>
      {rec.total > 0 && (
        <Text style={bx.record}>🤖 {koT(t.record, { c: rec.correct, t: rec.total })}</Text>
      )}

      {/* stat chips */}
      <View style={bx.heroStats}>
        {current && (
          <View style={bx.statChip}>
            <Text style={bx.statLabel}>{t.heroStageLabel}</Text>
            <Text style={[bx.statValue, { color: ROUND_COLOR[current.round] }]} numberOfLines={1}>{t.rounds[current.round]}</Text>
          </View>
        )}
        {alive.length > 0 && (
          <View style={bx.statChip}>
            <Text style={bx.statLabel}>{t.heroRemainingLabel}</Text>
            <Text style={[bx.statValue, { color: D.text1 }]}>{alive.length}</Text>
          </View>
        )}
        {liliFav && (
          <View style={bx.statChip}>
            <Text style={bx.statLabel}>🤖 {t.heroLiliFavLabel}</Text>
            <Text style={[bx.statValue, { color: D.gold }]} numberOfLines={1}>{liliFav.flag} {liliFav.name}</Text>
          </View>
        )}
        {yourTeam && (
          <View style={[bx.statChip, { borderColor: 'rgba(245,196,81,0.4)' }]}>
            <Text style={bx.statLabel}>⭐ {t.heroYourTeamLabel}</Text>
            <Text style={[bx.statValue, { color: D.gold }]} numberOfLines={1}>{yourTeam.flag} {yourTeam.name}</Text>
          </View>
        )}
      </View>

      {/* path to the final — progression rail */}
      <Text style={bx.pathLabel}>{t.pathToFinal}</Text>
      <View style={bx.pathRail}>
        {pathRounds.map((r, i) => {
          const accent = ROUND_COLOR[r.round];
          const hasTies = r.ties.length > 0;
          const allDone = hasTies && r.ties.every((x) => x.status === 'FINISHED');
          const isCurrent = current ? r.round === current.round : false;
          const state = allDone ? 'done' : isCurrent ? 'current' : 'future';
          return (
            <View key={r.round} style={bx.pathStep}>
              <View
                style={[
                  bx.pathNode,
                  state === 'future'
                    ? { borderColor: D.text3 }
                    : { borderColor: accent, backgroundColor: state === 'done' ? accent : accent + '33' },
                ]}
              >
                <Text style={[bx.pathNodeText, { color: state === 'future' ? D.text3 : state === 'done' ? D.bg : accent }]}>
                  {ROUND_BADGE[r.round]}
                </Text>
              </View>
              {i < pathRounds.length - 1 && <View style={[bx.pathLink, { backgroundColor: allDone ? accent : D.border }]} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── A resolved slot side: a team, an "A or B" pair, or "Winner of Match X" ──────
function SideView({ side, t, favTeam, big }: { side: SlotSide; t: T; favTeam?: string | null; big?: boolean }) {
  if (side.kind === 'team') {
    const fav = favTeam === side.team.name;
    return (
      <View style={bx.sideRow}>
        <Text style={bx.sideFlag}>{side.team.flag}</Text>
        <Text style={[bx.sideName, big && bx.sideNameBig, fav && { color: D.gold }]} numberOfLines={1}>{side.team.name}</Text>
      </View>
    );
  }
  if (side.kind === 'pair') {
    return (
      <View style={bx.sideRow}>
        <Text style={[bx.sideName, bx.sidePending]} numberOfLines={1}>
          {side.a?.flag ?? '🏳️'} {side.a?.name ?? '?'}<Text style={bx.orText}>  {t.orWord}  </Text>{side.b?.flag ?? '🏳️'} {side.b?.name ?? '?'}
        </Text>
      </View>
    );
  }
  return (
    <View style={bx.sideRow}>
      <Text style={[bx.sideName, bx.sidePending]} numberOfLines={1}>🏆 {koT(t.winnerOfMatch, { n: side.fromMatch })}</Text>
    </View>
  );
}

// ─── A future slot card (All Teams mode, R16→Final) ──────────────────────────────
function FutureNodeCard({ node, accent, t, favTeam }: { node: BracketNode; accent: string; t: T; favTeam?: string | null }) {
  const venue = node.stadium ? `🏟 ${node.stadium.shortName}, ${node.stadium.city}` : `🏟 ${t.venueTBC}`;
  const isFav = (s: SlotSide) => s.kind === 'team' && favTeam === s.team.name;
  const followed = isFav(node.sideA) || isFav(node.sideB);
  return (
    <View style={[bx.card, { borderLeftColor: accent }, followed && bx.cardFollowed]}>
      <View style={bx.metaRow}><Text style={bx.meta} numberOfLines={1}>{fmtDate(node.date)}  ·  {venue}</Text></View>
      <SideView side={node.sideA} t={t} favTeam={favTeam} big />
      <Text style={bx.vsText}>vs</Text>
      <SideView side={node.sideB} t={t} favTeam={favTeam} big />
    </View>
  );
}

// ─── All Teams mode — the full progressive bracket ───────────────────────────────
const FUTURE_ORDER: KnockoutRound[] = ['R16', 'QF', 'SF', '3RD', 'F'];

function AllTeamsView({ full, t, cols, favTeam }: { full: ReturnType<typeof buildFullBracket>; t: T; cols: number; favTeam?: string | null }) {
  return (
    <View style={{ marginTop: 6 }}>
      <StageSection group={{ round: 'R32', label: t.rounds.R32, ties: full.r32 }} t={t} cols={cols} />
      {FUTURE_ORDER.map((rd) => {
        const nodes = full.nodes.filter((n) => n.round === rd);
        if (!nodes.length) return null;
        const accent = ROUND_COLOR[rd];
        return (
          <View key={rd} style={bx.stage}>
            <View style={bx.stageHeader}>
              <View style={[bx.stageBadge, { borderColor: accent }]}><Text style={[bx.stageBadgeText, { color: accent }]}>{ROUND_BADGE[rd]}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[bx.stageTitle, { color: accent }]} numberOfLines={1}>{t.rounds[rd]}</Text>
                <Text style={bx.stageMeta}>{koT(t.matchesShort, { n: nodes.length })}</Text>
              </View>
            </View>
            <View style={[bx.stageRule, { backgroundColor: accent + '40' }]} />
            <View style={[bx.grid, cols === 2 && bx.gridWide]}>
              {nodes.map((n) => (
                <View key={n.match} style={cols === 2 ? bx.cellWide : bx.cell}>
                  <FutureNodeCard node={n} accent={accent} t={t} favTeam={favTeam} />
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── My Team mode — the followed team's road to the final ────────────────────────
const STATE_LABEL: Record<PathStep['state'], (t: T) => string> = {
  won: (t) => t.stateThrough, eliminated: (t) => t.stateOut, live: (t) => t.live,
  next: (t) => t.stateNext, potential: (t) => t.statePotential,
};
const STATE_COLOR: Record<PathStep['state'], string> = {
  won: D.green, eliminated: D.red, live: D.red, next: D.gold, potential: D.text3,
};

function PathStepCard({ step, team, t, last }: { step: PathStep; team: TeamForm; t: T; last: boolean }) {
  const router = useRouter();
  const accent = ROUND_COLOR[step.round];
  const dim = step.state === 'potential';
  const venue = step.stadium ? `🏟 ${step.stadium.shortName}, ${step.stadium.city}` : `🏟 ${t.venueTBC}`;
  const myScore = step.tie && step.mySide && step.tie.result ? step.tie.result[step.mySide] : null;
  const oppScore = step.tie && step.mySide && step.tie.result ? step.tie.result[step.mySide === 'home' ? 'away' : 'home'] : null;
  const canRelive = step.tie && (step.tie.status === 'FINISHED' || step.tie.status === 'LIVE') && FIXTURES_WITH_INTEL.has(step.tie.fixture.id);

  return (
    <View style={bx.stepRow}>
      {/* spine */}
      <View style={bx.stepSpineCol}>
        <View style={[bx.stepNode, step.state === 'won' ? { borderColor: accent, backgroundColor: accent }
          : step.state === 'eliminated' ? { borderColor: D.red, backgroundColor: D.red }
          : { borderColor: accent, backgroundColor: D.bg }]}>
          <Text style={[bx.stepNodeText, { color: step.state === 'won' || step.state === 'eliminated' ? D.bg : accent }]}>{ROUND_BADGE[step.round]}</Text>
        </View>
        {!last && <View style={[bx.stepLine, { backgroundColor: step.state === 'won' ? accent : D.border }]} />}
      </View>

      {/* card */}
      <View style={[bx.card, bx.stepCard, { borderLeftColor: accent }, dim && { opacity: 0.72 }, step.state === 'next' && { borderColor: accent + '66' }]}>
        <View style={bx.metaRow}>
          <Text style={[bx.stepRound, { color: accent }]} numberOfLines={1}>{t.rounds[step.round]}</Text>
          <View style={[bx.badge, { borderColor: STATE_COLOR[step.state] + '66', backgroundColor: STATE_COLOR[step.state] + '1A' }]}>
            <Text style={[bx.badgeText, { color: STATE_COLOR[step.state] }]}>{STATE_LABEL[step.state](t)}</Text>
          </View>
        </View>
        <Text style={bx.meta} numberOfLines={1}>{fmtDate(step.date)}  ·  {venue}</Text>

        {/* matchup: my team vs opponent */}
        <View style={bx.stepMatch}>
          <View style={[bx.sideRow, { flex: 1 }]}>
            <Text style={bx.sideFlag}>{team.flag}</Text>
            <Text style={[bx.sideName, { color: D.gold, flex: 1 }]} numberOfLines={1}>{team.name}</Text>
            {myScore != null && <Text style={bx.stepScore}>{myScore}</Text>}
          </View>
          <Text style={bx.vsTextInline}>vs</Text>
          <View style={[bx.sideRow, { flex: 1 }]}>
            <View style={{ flex: 1, minWidth: 0 }}><SideView side={step.opponent} t={t} /></View>
            {oppScore != null && <Text style={bx.stepScore}>{oppScore}</Text>}
          </View>
        </View>

        {/* Lili pre-analysis of a still-undecided opponent */}
        {step.lili && step.lili.length > 0 && (
          <View style={bx.liliBlock}>
            <Text style={bx.liliText}>🤖 {t.oppDeciding}</Text>
            {step.lili.map((o) => (
              <Text key={o.team.name} style={bx.liliOpt} numberOfLines={1}>
                {o.team.flag} {o.team.name}  ·  <Text style={{ color: accent, fontWeight: '800' }}>{koT(t.liliAdvance, { pct: o.advancePct })}</Text>
              </Text>
            ))}
          </View>
        )}

        {canRelive && (
          <Pressable onPress={() => router.push({ pathname: '/match-heatmap', params: { fixtureId: step.tie!.fixture.id } } as any)}
            style={({ pressed }) => [bx.relive, pressed && { backgroundColor: 'rgba(245,196,81,0.18)' }]}>
            <Text style={bx.reliveText}>🎬 {t.reliveMatch}  ·  📊 →</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function MyTeamView({ path, t, teams, favTeam, onPick, pickerOpen, onToggle }: {
  path: TeamPath; t: T; teams: TeamForm[]; favTeam: string | null; onPick: (n: string) => void; pickerOpen: boolean; onToggle: () => void;
}) {
  const reached = [...path.steps].reverse().find((s) => s.state === 'won' || s.state === 'live' || s.state === 'next' || s.state === 'eliminated');
  const statusText = path.status === 'champion' ? `🏆 ${t.champion}`
    : path.status === 'eliminated' ? t.stateOut
    : reached ? `${t.stateThrough} · ${t.rounds[reached.round]}` : t.yourRoad;
  const statusColor = path.status === 'champion' ? D.gold : path.status === 'eliminated' ? D.red : D.green;

  return (
    <View style={{ marginTop: 6 }}>
      {/* tap the team header to change your team */}
      <Pressable onPress={onToggle} style={bx.teamHero}>
        <Text style={bx.teamHeroFlag}>{path.team.flag}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={bx.teamHeroName} numberOfLines={1}>{path.team.name}</Text>
          <Text style={bx.teamHeroSub} numberOfLines={1}>{pickerOpen ? t.chooseTeam : `${t.changeTeam}  ▾`}</Text>
        </View>
        <View style={[bx.badge, { borderColor: statusColor + '66', backgroundColor: statusColor + '1A' }]}>
          <Text style={[bx.badgeText, { color: statusColor }]} numberOfLines={1}>{statusText}</Text>
        </View>
      </Pressable>
      {pickerOpen && <TeamPickerGrid teams={teams} selected={favTeam} onPick={onPick} t={t} />}
      {path.steps.map((s, i) => (
        <PathStepCard key={s.match} step={s} team={path.team} t={t} last={i === path.steps.length - 1} />
      ))}
    </View>
  );
}

function ModeToggle({ mode, choose, favFlag, t }: { mode: 'all' | 'team'; choose: (m: 'all' | 'team') => void; favFlag?: string; t: T }) {
  return (
    <View style={bx.modeRow}>
      <Pressable onPress={() => choose('team')} style={[bx.modeBtn, mode === 'team' && bx.modeBtnOn]}>
        <Text style={[bx.modeText, mode === 'team' && bx.modeTextOn]} numberOfLines={1}>⭐ {t.modeMyTeam}{favFlag ? `  ${favFlag}` : ''}</Text>
      </Pressable>
      <Pressable onPress={() => choose('all')} style={[bx.modeBtn, mode === 'all' && bx.modeBtnOn]}>
        <Text style={[bx.modeText, mode === 'all' && bx.modeTextOn]} numberOfLines={1}>🌍 {t.modeAllTeams}</Text>
      </Pressable>
    </View>
  );
}

// ─── Team picker — pick any team still alive in the bracket to follow its road ───
function TeamPickerGrid({ teams, selected, onPick, t }: { teams: TeamForm[]; selected: string | null; onPick: (n: string) => void; t: T }) {
  return (
    <View style={bx.pickerCard}>
      <Text style={bx.pickerTitle}>{t.chooseTeam}  ·  {teams.length}</Text>
      <View style={bx.pickerGrid}>
        {teams.map((tm) => {
          const on = tm.name === selected;
          return (
            <Pressable key={tm.name} onPress={() => onPick(tm.name)} style={[bx.teamChip, on && bx.teamChipOn]}>
              <Text style={bx.teamChipFlag}>{tm.flag}</Text>
              <Text style={[bx.teamChipName, on && bx.teamChipNameOn]} numberOfLines={1}>{tm.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────
export default function KnockoutBracketScreen() {
  const { lang } = useLanguage();
  const t = KNOCKOUT_I18N[lang] ?? KNOCKOUT_I18N.EN;
  const liveResults = useLiveResults();
  const { favTeam, setFavTeam } = useProfile();
  const { width } = useWindowDimensions();
  const cols = width >= 760 ? 2 : 1;

  const rounds = useMemo(() => buildRoadToFinal(liveResults), [liveResults]);
  const rec = liliKnockoutRecord(rounds);
  const full = useMemo(() => buildFullBracket(liveResults), [liveResults]);
  const teamPath = useMemo(() => (favTeam ? buildTeamPath(favTeam, liveResults) : null), [favTeam, liveResults]);
  const canTeam = !!teamPath;

  // Every team still alive in the bracket (winner advances, others out), strongest
  // first — the pool you pick "your team" from, right here on the page.
  const aliveTeams = useMemo(() => {
    const out: TeamForm[] = [];
    for (const tie of full.r32) {
      if (tie.winner) { const w = tie.winner === 'home' ? tie.home : tie.away; if (w) out.push(w); }
      else { if (tie.home) out.push(tie.home); if (tie.away) out.push(tie.away); }
    }
    return out.sort((a, b) => b.strength - a.strength);
  }, [full]);

  // Default to "My Team" once a followed team is in the bracket — but never
  // override a manual choice. My Team is always reachable (it holds the picker).
  const [mode, setMode] = useState<'all' | 'team'>('all');
  const touched = useRef(false);
  useEffect(() => { if (canTeam && !touched.current) setMode('team'); }, [canTeam]);
  const choose = (m: 'all' | 'team') => { touched.current = true; setMode(m); };

  // The team picker (open by default until a team is chosen).
  const [pickerOpen, setPickerOpen] = useState(false);
  const pick = (name: string) => { setFavTeam(name); setPickerOpen(false); touched.current = true; setMode('team'); };

  return (
    <SafeAreaView style={bx.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: t.title }} />
      <ScrollView contentContainerStyle={[bx.scroll, cols === 2 && bx.scrollWide]} showsVerticalScrollIndicator={false}>
        <Hero rounds={rounds} rec={rec} t={t} />
        <ModeToggle mode={mode} choose={choose} favFlag={teamPath?.team.flag} t={t} />
        {mode === 'team'
          ? (teamPath
              ? <MyTeamView path={teamPath} t={t} teams={aliveTeams} favTeam={favTeam} onPick={pick} pickerOpen={pickerOpen} onToggle={() => setPickerOpen((o) => !o)} />
              : (
                <View style={{ marginTop: 6 }}>
                  <View style={bx.teamHero}>
                    <Text style={bx.teamHeroFlag}>⭐</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={bx.teamHeroName} numberOfLines={1}>{t.chooseTeam}</Text>
                      <Text style={bx.teamHeroSub} numberOfLines={1}>{t.yourRoad}</Text>
                    </View>
                  </View>
                  <TeamPickerGrid teams={aliveTeams} selected={favTeam} onPick={pick} t={t} />
                </View>
              ))
          : <AllTeamsView full={full} t={t} cols={cols} favTeam={favTeam} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const bx = StyleSheet.create({
  screen: { flex: 1, backgroundColor: D.bg },
  scroll: { padding: 14, paddingBottom: 56 },
  scrollWide: { maxWidth: 1100, width: '100%', alignSelf: 'center', paddingHorizontal: 24 },

  // ── Hero ──
  hero: {
    backgroundColor: D.bgHi,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,196,81,0.28)',
    borderTopWidth: 3,
    borderTopColor: D.gold,
    padding: 18,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(245,196,81,0.12)',
  },
  heroKicker: { fontSize: 26, fontWeight: '900', color: D.text1, letterSpacing: 0.3 },
  tricolor: { flexDirection: 'row', gap: 3, marginTop: 8, width: 84 },
  tricolorSeg: { flex: 1, height: 3, borderRadius: 2 },
  heroSub: { fontSize: 13, color: D.text2, marginTop: 8, lineHeight: 19 },
  record: { fontSize: 12, color: D.gold, fontWeight: '800', marginTop: 8 },

  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  statChip: {
    flexGrow: 1,
    minWidth: 130,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: D.border,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  statLabel: { fontSize: 9.5, color: D.text2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  statValue: { fontSize: 16, fontWeight: '900', marginTop: 3 },

  pathLabel: { fontSize: 9.5, color: D.text2, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 18, marginBottom: 8 },
  pathRail: { flexDirection: 'row', alignItems: 'center' },
  pathStep: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  pathNode: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pathNodeText: { fontSize: 11, fontWeight: '900' },
  pathLink: { height: 2, flex: 1, minWidth: 8, marginHorizontal: 3, borderRadius: 1 },

  // ── Stage ──
  stage: { marginTop: 22 },
  stageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageBadge: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stageBadgeText: { fontSize: 13, fontWeight: '900' },
  stageTitle: { fontSize: 19, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
  stageMeta: { fontSize: 11, color: D.text3, fontWeight: '700', marginTop: 1 },
  stageRule: { height: 2, borderRadius: 1, marginTop: 10, marginBottom: 12 },

  grid: { gap: 12 },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '100%' },
  cellWide: { width: '48.6%', flexGrow: 1 },

  locked: { paddingVertical: 16, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: D.border, borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.02)' },
  lockedText: { fontSize: 12, color: D.text3, fontStyle: 'italic' },

  // ── Tie card ──
  card: { backgroundColor: D.card, borderRadius: 16, borderWidth: 1, borderColor: D.border, borderLeftWidth: 4, padding: 13, gap: 9 },
  cardFollowed: { borderColor: 'rgba(245,196,81,0.5)', backgroundColor: '#13202E' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: { flex: 1, fontSize: 10.5, color: D.text3, fontWeight: '600' },
  chip: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },

  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 9, overflow: 'hidden' },
  winBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  flag: { fontSize: 23 },
  teamName: { fontSize: 15.5, fontWeight: '800', color: D.text1 },
  liliDot: { fontSize: 11 },
  formLine: { fontSize: 10.5, color: D.text2, marginTop: 1 },
  strength: { color: D.text3 },
  goals: { fontSize: 21, fontWeight: '900', minWidth: 22, textAlign: 'center' },
  dim: { color: D.text3, opacity: 0.6 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },

  liliBlock: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: D.border, paddingTop: 9, gap: 7 },
  liliText: { fontSize: 11.5, color: D.text2 },
  liliScore: { color: D.text1, fontWeight: '900', fontSize: 13 },
  confBar: { flexDirection: 'row', height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: D.cardHi },
  confLabel: { fontSize: 11, color: D.text2 },

  pickPrompt: { fontSize: 10, color: D.text3, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 7 },
  pickRow: { flexDirection: 'row', gap: 8 },
  pickBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: D.border, backgroundColor: D.cardHi, alignItems: 'center' },
  pickBtnLocked: { opacity: 0.85 },
  pickBtnText: { fontSize: 12.5, fontWeight: '700', color: D.text2 },

  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultText: { fontSize: 12.5, fontWeight: '800' },
  advances: { fontSize: 11, color: D.text2, fontWeight: '700' },

  relive: {
    marginTop: 2,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,196,81,0.4)',
    backgroundColor: 'rgba(245,196,81,0.09)',
  },
  reliveText: { fontSize: 12, fontWeight: '800', color: D.gold, letterSpacing: 0.3 },

  // ── Mode toggle ──
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: D.border, backgroundColor: D.card },
  modeBtnOn: { borderColor: D.gold, backgroundColor: 'rgba(245,196,81,0.12)' },
  modeText: { fontSize: 13, fontWeight: '800', color: D.text2 },
  modeTextOn: { color: D.gold },
  hint: { fontSize: 11.5, color: D.text3, textAlign: 'center', marginTop: 16, fontStyle: 'italic', lineHeight: 17 },

  // ── Slot sides (future nodes) ──
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sideFlag: { fontSize: 20 },
  sideName: { fontSize: 14, fontWeight: '800', color: D.text1 },
  sideNameBig: { fontSize: 15.5 },
  sidePending: { color: D.text2, fontWeight: '700', fontSize: 13, flex: 1 },
  orText: { color: D.text3, fontWeight: '700', fontSize: 11 },
  vsText: { fontSize: 10, fontWeight: '800', color: D.text3, letterSpacing: 1, marginVertical: 3 },
  vsTextInline: { fontSize: 10, fontWeight: '800', color: D.text3, letterSpacing: 1, paddingHorizontal: 8 },

  // ── My Team path ──
  teamHero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.bgHi, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(245,196,81,0.3)',
    borderLeftWidth: 4, borderLeftColor: D.gold, padding: 14, marginBottom: 8,
  },
  teamHeroFlag: { fontSize: 38 },
  teamHeroName: { fontSize: 20, fontWeight: '900', color: D.text1 },
  teamHeroSub: { fontSize: 11.5, color: D.text2, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 },

  stepRow: { flexDirection: 'row', gap: 10 },
  stepSpineCol: { width: 36, alignItems: 'center' },
  stepNode: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepNodeText: { fontSize: 10.5, fontWeight: '900' },
  stepLine: { width: 2, flex: 1, marginVertical: 2, borderRadius: 1, minHeight: 14 },
  stepCard: { flex: 1, marginBottom: 10 },
  stepRound: { flex: 1, fontSize: 14, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },
  stepMatch: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  stepScore: { fontSize: 18, fontWeight: '900', color: D.text1, minWidth: 20, textAlign: 'center' },
  liliOpt: { fontSize: 11.5, color: D.text2, marginTop: 2 },

  // ── Team picker ──
  pickerCard: { backgroundColor: D.card, borderRadius: 14, borderWidth: 1, borderColor: D.border, padding: 12, marginBottom: 10 },
  pickerTitle: { fontSize: 10, fontWeight: '800', color: D.text2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teamChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: D.border, backgroundColor: D.cardHi },
  teamChipOn: { borderColor: D.gold, backgroundColor: 'rgba(245,196,81,0.14)' },
  teamChipFlag: { fontSize: 16 },
  teamChipName: { fontSize: 12, fontWeight: '700', color: D.text2 },
  teamChipNameOn: { color: D.gold },
});
