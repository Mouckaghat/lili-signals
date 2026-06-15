import { useEffect, useState } from 'react';
import { MATCH_LINEUPS, type MatchLineup } from './lineupData';
import { apiUrl, LIVE_API_ENABLED } from './apiBase';

const REFRESH_INTERVAL_MS = 5 * 60_000; // 5 min — lineup changes are infrequent

export function useLineups(): MatchLineup[] {
  const [lineups, setLineups] = useState<MatchLineup[]>(MATCH_LINEUPS);

  useEffect(() => {
    if (!LIVE_API_ENABLED) return;

    let active = true;

    async function refresh() {
      try {
        const res = await fetch(apiUrl('/api/lineups'));
        if (!res.ok) return;
        const data = await res.json() as { lineups?: MatchLineup[] };
        if (active && data.lineups) setLineups(data.lineups);
      } catch {
        // keep last known data on network error
      }
    }

    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => { active = false; clearInterval(id); };
  }, []);

  return lineups;
}

// Convenience: get lineup for a specific fixture key ("Home|Away")
export function useMatchLineup(fixtureKey: string): MatchLineup | undefined {
  const lineups = useLineups();
  return lineups.find((l) => l.fixtureKey === fixtureKey);
}
