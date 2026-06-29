import { useEffect, useState } from 'react';
import { MATCH_STATS, KNOCKOUT_MATCH_STATS, type MatchStats, type TeamMatchStats } from './matchStatsData';
import { WC_FIXTURES } from './wcData';
import { WC_KNOCKOUT } from './knockoutData';
import { apiUrl, LIVE_API_ENABLED } from './apiBase';

// Group stage + knockouts both feed the match-intelligence screen (the only
// consumer of this hook), so its base is both committed arrays. The knockout
// stats stay in their own export (KNOCKOUT_MATCH_STATS) so tournament aggregates
// over MATCH_STATS aren't skewed — they're only united here, at the display layer.
const BASE_STATS = [...MATCH_STATS, ...KNOCKOUT_MATCH_STATS];

// home|away → real fixture id, so a LIVE game that isn't in the pre-baked stats
// still gets its canonical id (group e.g. E1_Germany_v_Cura_ao, or a knockout id
// like 1562344). Without this, deep-links (timeline 🔥 / "Relive the match")
// wouldn't preselect it. Includes knockout ties so live KO games resolve too.
const FIXTURE_ID_BY_KEY = new Map([...WC_FIXTURES, ...WC_KNOCKOUT].map((f) => [`${f.home}|${f.away}`, f.id]));

// Poll cadence for the live heatmap, aligned to the /api/match-stats edge cache
// (s-maxage=15). Polling at the cache TTL picks up each refresh once without
// extra upstream cost — repeat hits inside a window are served from the edge.
const POLL_MS = 15_000;

interface LivePayload {
  status: 'LIVE' | 'FINISHED';
  elapsed: number | null;
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;
}

/**
 * Returns the committed match stats, with any LIVE fixtures overlaid from
 * /api/match-stats (web + native). On a build with no API origin / no network
 * it just returns the pre-built data, so the screen always works.
 */
export function useLiveStats(): MatchStats[] {
  const [stats, setStats] = useState<MatchStats[]>(BASE_STATS);

  useEffect(() => {
    if (!LIVE_API_ENABLED) return;
    let active = true;

    async function refresh() {
      try {
        const res = await fetch(apiUrl('/api/match-stats'));
        if (!res.ok) return;
        const data = await res.json() as { stats?: Record<string, LivePayload> };
        if (!active || !data.stats) return;

        setStats((prev) => {
          const byKey = new Map(prev.map((m) => [`${m.home}|${m.away}`, m]));
          for (const [key, live] of Object.entries(data.stats!)) {
            const [home, away] = key.split('|');
            const base = byKey.get(key);
            byKey.set(key, {
              fixtureId: base?.fixtureId ?? FIXTURE_ID_BY_KEY.get(key) ?? key,
              home, away,
              date: base?.date ?? '',
              status: live.status,
              elapsed: live.elapsed,
              homeStats: live.homeStats,
              awayStats: live.awayStats,
            });
          }
          return [...byKey.values()];
        });
      } catch { /* keep last known */ }
    }

    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, []);

  return stats;
}
