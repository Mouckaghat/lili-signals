import { useEffect, useRef, useState } from 'react';
import { FIXTURE_RESULTS, type FixtureResult } from './fixtureResultsData';
import { WC_FIXTURES } from './wcData';
import { apiUrl, LIVE_API_ENABLED } from './apiBase';

// Slow baseline: api-football via GitHub Actions + client poll
const BASELINE_INTERVAL_MS = 60_000;

// Fast bot: ESPN scraper, one interval per live game
const BOT_INTERVAL_MS  = 30_000;
const LIVE_WINDOW_MS   = 150 * 60_000; // 2.5 h after kickoff

export function useLiveResults(): Record<string, FixtureResult> {
  const [results, setResults] = useState<Record<string, FixtureResult>>(FIXTURE_RESULTS);
  // ref so bot callbacks always see the latest results without re-creating intervals
  const resultsRef = useRef(results);
  useEffect(() => { resultsRef.current = results; }, [results]);

  // ── Slow baseline poll (api-football via /api/fixture-results) ────────────
  useEffect(() => {
    if (!LIVE_API_ENABLED) return;
    let active = true;

    async function refresh() {
      try {
        const res = await fetch(apiUrl('/api/fixture-results'));
        if (!res.ok) return;
        const data = await res.json() as { results?: Record<string, FixtureResult> };
        if (active && data.results) setResults((prev) => ({ ...prev, ...data.results }));
      } catch { /* keep last known */ }
    }

    refresh();
    const id = setInterval(refresh, BASELINE_INTERVAL_MS);
    return () => { active = false; clearInterval(id); };
  }, []);

  // ── Fast bot manager (ESPN, one bot per live game) ────────────────────────
  useEffect(() => {
    if (!LIVE_API_ENABLED) return;
    let active = true;

    // key → interval id, one per live game
    const bots = new Map<string, ReturnType<typeof setInterval>>();

    function spawnBot(home: string, away: string) {
      const key = `${home}|${away}`;
      if (bots.has(key)) return;

      async function poll() {
        if (!active) return;
        try {
          const res = await fetch(apiUrl('/api/kv-live-scores'));
          if (!res.ok) return;
          const data = await res.json() as { scores?: Record<string, any> };
          const score = data.scores?.[key];
          if (!score || !active) return;

          const next: FixtureResult = {
            status:    score.status,
            homeScore: score.homeScore,
            awayScore: score.awayScore,
            winner:    score.status === 'FINISHED'
              ? (score.homeScore > score.awayScore ? home
                : score.awayScore > score.homeScore ? away : 'Draw')
              : null,
          };

          const prev = resultsRef.current[key];
          const changed =
            prev?.homeScore !== next.homeScore ||
            prev?.awayScore !== next.awayScore ||
            prev?.status    !== next.status;

          if (changed) setResults((r) => ({ ...r, [key]: next }));
        } catch { /* network hiccup, retry next tick */ }
      }

      poll();
      bots.set(key, setInterval(poll, BOT_INTERVAL_MS));
    }

    function killBot(key: string) {
      const id = bots.get(key);
      if (id !== undefined) { clearInterval(id); bots.delete(key); }
    }

    function manage() {
      const now = Date.now();
      for (const f of WC_FIXTURES) {
        const key     = `${f.home}|${f.away}`;
        const kickoff = new Date(f.date).getTime();
        const inWindow = now >= kickoff && now < kickoff + LIVE_WINDOW_MS;
        const finished = resultsRef.current[key]?.status === 'FINISHED';

        if (inWindow && !finished) {
          spawnBot(f.home, f.away);
        } else {
          killBot(key);
        }
      }
    }

    manage();
    const manager = setInterval(manage, 60_000);

    return () => {
      active = false;
      clearInterval(manager);
      bots.forEach((id) => clearInterval(id));
    };
  }, []);

  return results;
}
