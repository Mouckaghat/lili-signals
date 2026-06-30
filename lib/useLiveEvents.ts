import { useEffect, useState } from 'react';
import { MATCH_EVENTS, type MatchEvents, type GoalEvent, type CardEvent } from './matchEventsData';
import { WC_FIXTURES } from './wcData';
import { WC_KNOCKOUT } from './knockoutData';
import { apiUrl, LIVE_API_ENABLED } from './apiBase';

// home|away → real fixture id, so a LIVE game gets its canonical id even before
// it's baked into matchEventsData.ts. Includes knockouts so live KO ties resolve.
const FIXTURE_ID_BY_KEY = new Map([...WC_FIXTURES, ...WC_KNOCKOUT].map((f) => [`${f.home}|${f.away}`, f.id]));

// Poll cadence aligned to the /api/match-events edge cache (s-maxage=15).
const POLL_MS = 15_000;

interface LiveEventsPayload {
  status: 'LIVE' | 'FINISHED';
  elapsed: number | null;
  goals: GoalEvent[];
  yellowCards: CardEvent[];
  redCards: CardEvent[];
}

/**
 * Returns the committed match events (goals + cards), with any LIVE fixtures
 * overlaid from /api/match-events (web + native). Without this overlay the
 * Momentum wave's goal/card markers come only from the deploy-gated baked file
 * and freeze mid-game. On a build with no API origin / no network it just
 * returns the pre-built data, so the screen always works.
 *
 * The live feed's event arrays are cumulative and authoritative for an
 * in-progress game, so a live fixture's entry is replaced wholesale.
 */
export function useLiveEvents(): MatchEvents[] {
  const [events, setEvents] = useState<MatchEvents[]>(MATCH_EVENTS);

  useEffect(() => {
    if (!LIVE_API_ENABLED) return;
    let active = true;

    async function refresh() {
      try {
        const res = await fetch(apiUrl('/api/match-events'));
        if (!res.ok) return;
        const data = await res.json() as { events?: Record<string, LiveEventsPayload> };
        if (!active || !data.events) return;

        setEvents((prev) => {
          const byKey = new Map(prev.map((m) => [`${m.home}|${m.away}`, m]));
          for (const [key, live] of Object.entries(data.events!)) {
            const [home, away] = key.split('|');
            const base = byKey.get(key);
            byKey.set(key, {
              fixtureId: base?.fixtureId ?? FIXTURE_ID_BY_KEY.get(key) ?? key,
              home, away,
              date: base?.date ?? '',
              goals: live.goals ?? [],
              yellowCards: live.yellowCards ?? [],
              redCards: live.redCards ?? [],
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

  return events;
}
