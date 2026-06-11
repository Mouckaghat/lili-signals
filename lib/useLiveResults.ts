import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { FIXTURE_RESULTS, type FixtureResult } from './fixtureResultsData';

const REFRESH_INTERVAL_MS = 60_000;

export function useLiveResults(): Record<string, FixtureResult> {
  const [results, setResults] = useState<Record<string, FixtureResult>>(FIXTURE_RESULTS);

  useEffect(() => {
    // Native builds get static data updated by the bot — live fetch is web-only
    if (Platform.OS !== 'web') return;

    let active = true;

    async function refresh() {
      try {
        const res = await fetch('/api/fixture-results');
        if (!res.ok) return;
        const data = await res.json() as { results?: Record<string, FixtureResult> };
        if (active && data.results) setResults(data.results);
      } catch {
        // keep showing last known data on network error
      }
    }

    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return results;
}
