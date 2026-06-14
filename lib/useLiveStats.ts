import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { MATCH_STATS, type MatchStats, type TeamMatchStats } from './matchStatsData';

// Poll cadence for the live heatmap. Stats move slowly; 45s keeps it fresh
// without hammering the rate limit.
const POLL_MS = 45_000;

interface LivePayload {
  status: 'LIVE' | 'FINISHED';
  elapsed: number | null;
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;
}

/**
 * Returns the committed match stats, with any LIVE fixtures overlaid from
 * /api/match-stats (web only). On native / no network it just returns the
 * pre-built data, so the screen always works.
 */
export function useLiveStats(): MatchStats[] {
  const [stats, setStats] = useState<MatchStats[]>(MATCH_STATS);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let active = true;

    async function refresh() {
      try {
        const res = await fetch('/api/match-stats');
        if (!res.ok) return;
        const data = await res.json() as { stats?: Record<string, LivePayload> };
        if (!active || !data.stats) return;

        setStats((prev) => {
          const byKey = new Map(prev.map((m) => [`${m.home}|${m.away}`, m]));
          for (const [key, live] of Object.entries(data.stats!)) {
            const [home, away] = key.split('|');
            const base = byKey.get(key);
            byKey.set(key, {
              fixtureId: base?.fixtureId ?? key,
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
