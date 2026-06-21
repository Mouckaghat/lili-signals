// Lili XI — "Team of the Tournament WATCH". Lili's evolving, explicitly
// NON-official best current XI, built from real committed tournament data only:
//   • impact ranking  → lib/playerImpact (goals/assists/clean sheets/saves)
//   • broad role       → real per-match positions in lib/playerStatsData (GK/DF/MF/FW)
//   • formation        → where tournament impact is currently concentrated
// No fabrication: a player needs a real role to be placed; a slot with no honest
// candidate stays `null` ("data pending"). Positions shown are Lili's placement
// in the chosen shape, never a claimed real position beyond the broad role.

import { computePlayerLeaders, type ImpactRow } from './playerImpact';
import { PLAYER_MATCH_STATS } from './playerStatsData';
import { FIXTURE_RESULTS, type FixtureResult } from './fixtureResultsData';
import { HEATMAP_I18N, hmT, type HeatmapI18n } from './heatmapI18n';

export type Role = 'GK' | 'DEF' | 'MID' | 'FWD';
const surname = (n: string) => n.trim().split(/\s+/).pop()!.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const keyOf = (name: string, team: string) => `${surname(name)}|${team}`;
const broad = (pos: string): Role => {
  const p = (pos || '').toUpperCase();
  return p.startsWith('G') ? 'GK' : p.startsWith('D') ? 'DEF' : p.startsWith('M') ? 'MID' : 'FWD';
};

export interface LiliXIPlayer {
  name: string; team: string; flag: string; role: Role; posLabel: string;
  impact: number; goals: number; assists: number; cleanSheets: number; saves: number; reason: string;
}
export interface LiliXIRow { label: string; role: Role; slots: (LiliXIPlayer | null)[] }
export interface LiliXI { formation: string; formationReason: string; rows: LiliXIRow[]; filled: number }

// formation → outfield rows (GK is always row 0). Each segment maps to a broad
// role so we pick honest candidates; the digits match the displayed label.
const LAYOUTS: Record<string, { role: Role; count: number; label: string }[]> = {
  '4-3-3':   [{ role: 'DEF', count: 4, label: 'DEF' }, { role: 'MID', count: 3, label: 'MID' }, { role: 'FWD', count: 3, label: 'FWD' }],
  '4-2-3-1': [{ role: 'DEF', count: 4, label: 'DEF' }, { role: 'MID', count: 2, label: 'DM' }, { role: 'MID', count: 3, label: 'AM' }, { role: 'FWD', count: 1, label: 'ST' }],
  '5-3-2':   [{ role: 'DEF', count: 5, label: 'DEF' }, { role: 'MID', count: 3, label: 'MID' }, { role: 'FWD', count: 2, label: 'FWD' }],
};

// Most-frequent real position per player, from per-match stats only (reliable
// GK/DF/MF/FW). Players with no stats row get no role → not placed (honest).
function buildRoleMap(): Map<string, Role> {
  const tally = new Map<string, Record<Role, number>>();
  for (const r of PLAYER_MATCH_STATS) {
    const k = keyOf(r.name, r.team);
    const t = tally.get(k) ?? { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    t[broad(r.pos)]++; tally.set(k, t);
  }
  const out = new Map<string, Role>();
  for (const [k, t] of tally) {
    const role = (['GK', 'DEF', 'MID', 'FWD'] as Role[]).reduce((a, b) => (t[b] > t[a] ? b : a), 'MID' as Role);
    out.set(k, role);
  }
  return out;
}

export function buildLiliXI(results: Record<string, FixtureResult> = FIXTURE_RESULTS, L: HeatmapI18n = HEATMAP_I18N.EN): LiliXI {
  const leaders = computePlayerLeaders(results, L);
  const roleMap = buildRoleMap();

  // candidates per role, by impact desc (leaders.impact is already sorted)
  const byRole: Record<Role, ImpactRow[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const r of leaders.impact) {
    const role = roleMap.get(keyOf(r.name, r.team));
    if (role) byRole[role].push(r);
  }

  // formation = where the tournament's impact is concentrated
  const sum = (rows: ImpactRow[], n: number) => rows.slice(0, n).reduce((s, r) => s + r.impact, 0);
  const fwdS = sum(byRole.FWD, 3), midS = sum(byRole.MID, 3), defS = sum(byRole.DEF, 4) + sum(byRole.GK, 1);
  let formation: string, formationReason: string;
  if (fwdS >= midS && fwdS >= defS && fwdS > 0) { formation = '4-3-3'; formationReason = 'Chosen because attacking players currently dominate the tournament impact ranking.'; }
  else if (midS > fwdS && midS >= defS) { formation = '4-2-3-1'; formationReason = 'Chosen because midfield and creative players currently lead the tournament impact ranking.'; }
  else if (defS > fwdS && defS > midS) { formation = '5-3-2'; formationReason = 'Chosen because defenders and goalkeepers currently dominate the tournament impact ranking.'; }
  else { formation = '4-3-3'; formationReason = 'Default balanced shape — no single area dominates the tournament impact ranking yet.'; }

  const layout = LAYOUTS[formation];
  const need: Record<Role, number> = { GK: 1, DEF: 0, MID: 0, FWD: 0 };
  for (const seg of layout) need[seg.role] += seg.count;

  const toPlayer = (r: ImpactRow, role: Role, posLabel: string): LiliXIPlayer => {
    const bits: string[] = [];
    if (r.goals) bits.push(hmT(L.plGoals, { n: r.goals }));
    if (r.assists) bits.push(hmT(L.plAssists, { n: r.assists }));
    if (role === 'GK' && r.cleanSheets) bits.push(hmT(L.plCleanSheets, { n: r.cleanSheets }));
    const reason = bits.join(' · ') || L.plConsistent;
    return { name: r.name, team: r.team, flag: r.flag, role, posLabel, impact: r.impact, goals: r.goals, assists: r.assists, cleanSheets: r.cleanSheets, saves: r.saves, reason };
  };

  // assign top-N per role (null pads when there is no honest candidate)
  const picks: Record<Role, (ImpactRow | null)[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  (['GK', 'DEF', 'MID', 'FWD'] as Role[]).forEach((role) => {
    for (let i = 0; i < need[role]; i++) picks[role].push(byRole[role][i] ?? null);
  });

  // build rows (GK first), each layout segment consuming from its role in order
  const cursor: Record<Role, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const take = (role: Role, n: number, label: string): (LiliXIPlayer | null)[] => {
    const out = picks[role].slice(cursor[role], cursor[role] + n).map((r) => (r ? toPlayer(r, role, label) : null));
    cursor[role] += n;
    return out;
  };
  const rows: LiliXIRow[] = [{ label: 'GK', role: 'GK', slots: take('GK', 1, 'GK') }];
  for (const seg of layout) rows.push({ label: seg.label, role: seg.role, slots: take(seg.role, seg.count, seg.label) });

  const filled = rows.flatMap((r) => r.slots).filter(Boolean).length;
  return { formation, formationReason, rows, filled };
}
