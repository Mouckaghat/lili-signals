import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your knockout picks — "who goes through?" for each tie — persisted across
// restarts so you can play the bracket against Lili over the whole tournament.
// Keyed by fixture id → the side you backed. Mirrors ProfileContext's shape:
// fire-and-forget writes, a `ready` flag, and graceful degradation (a storage
// failure just means no saved picks, never a broken screen). This is the
// prediction-capture flow ProfileContext's comment anticipated.

export type PickSide = 'home' | 'away';

const STORAGE_KEY = 'knockout.picks';

interface KnockoutPicksValue {
  picks: Record<string, PickSide>;
  setPick: (fixtureId: string, side: PickSide) => void;
  ready: boolean;
}

const KnockoutPicksContext = createContext<KnockoutPicksValue>({
  picks: {},
  setPick: () => {},
  ready: false,
});

export function KnockoutPicksProvider({ children }: { children: React.ReactNode }) {
  const [picks, setPicks] = useState<Record<string, PickSide>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try { setPicks(JSON.parse(raw)); } catch { /* ignore corrupt blob */ }
      })
      .catch(() => { /* no saved picks — never block the app */ })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  const setPick = (fixtureId: string, side: PickSide) => {
    setPicks((prev) => {
      const next = { ...prev, [fixtureId]: side };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return (
    <KnockoutPicksContext.Provider value={{ picks, setPick, ready }}>
      {children}
    </KnockoutPicksContext.Provider>
  );
}

export function useKnockoutPicks(): KnockoutPicksValue {
  return useContext(KnockoutPicksContext);
}
