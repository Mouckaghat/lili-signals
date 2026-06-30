import { useEffect, useState } from 'react';
import { PLAYER_MATCH_STATS, type PlayerMatchStat } from './playerStatsData';
import { WC_FIXTURES } from './wcData';
import { WC_KNOCKOUT } from './knockoutData';
import { apiUrl, LIVE_API_ENABLED } from './apiBase';

// home|away → canonical fixture id (group + knockout) so a LIVE game's per-player
// rows get the right fixtureId even before they're baked into playerStatsData.ts.
const FIXTURE_ID_BY_KEY = new Map([...WC_FIXTURES, ...WC_KNOCKOUT].map((f) => [`${f.home}|${f.away}`, f.id]));

// Poll cadence aligned to the /api/match-players edge cache (s-maxage=15).
const POLL_MS = 15_000;

type LiveRow = Omit<PlayerMatchStat, 'fixtureId'>;
interface LivePlayersPayload { status: 'LIVE' | 'FINISHED'; elapsed: number | null; rows: LiveRow[] }

/**
 * Returns the committed per-player match stats, with any LIVE fixtures overlaid
 * from /api/match-players (web + native). Without this overlay the Pass Map nodes
 * and the Players tab (MOTM, Contributors) come only from the deploy-gated baked
 * file and freeze mid-game. On a build with no API origin / no network it returns
 * the pre-built data, so the screen always works.
 *
 * For a live fixture the feed is authoritative, so that fixture's baked rows are
 * dropped and replaced wholesale with the live rows.
 */
export function useLivePlayers(): PlayerMatchStat[] {
  const [rows, setRows] = useState<PlayerMatchStat[]>(PLAYER_MATCH_STATS);

  useEffect(() => {
    if (!LIVE_API_ENABLED) return;
    let active = true;

    async function refresh() {
      try {
        const res = await fetch(apiUrl('/api/match-players'));
        if (!res.ok) return;
        const data = await res.json() as { players?: Record<string, LivePlayersPayload> };
        if (!active || !data.players) return;

        setRows((prev) => {
          // Resolve each live key to its fixture id, then drop the baked rows for
          // those fixtures and append the live rows.
          const liveByFixture = new Map<string, PlayerMatchStat[]>();
          for (const [key, payload] of Object.entries(data.players!)) {
            const fixtureId = FIXTURE_ID_BY_KEY.get(key);
            if (!fixtureId) continue;
            liveByFixture.set(fixtureId, payload.rows.map((r) => ({ ...r, fixtureId })));
          }
          if (liveByFixture.size === 0) return prev;
          const kept = prev.filter((r) => !liveByFixture.has(r.fixtureId));
          return [...kept, ...[...liveByFixture.values()].flat()];
        });
      } catch { /* keep last known */ }
    }

    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, []);

  return rows;
}
