import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Global user profile — persisted across app restarts. The single source of
// truth for "who do I follow?" so the Dashboard, Team Rankings (incl. The Wall),
// Lili XI and any future Lili personalization all light up the same team.
// Player-performance views (your team's standout performers) are DERIVED live
// from favTeam via lib/playerImpact — they are not stored here, so they never go
// stale. Your own prediction record (vs Lili) will live here too once a
// prediction-capture flow exists (none does yet — see scorePrediction/scoring.ts).

const STORAGE_KEY = 'profile.favTeam';

interface ProfileContextValue {
  favTeam: string | null;
  setFavTeam: (team: string | null) => void;
  ready: boolean; // true once the persisted value has been loaded
}

const ProfileContext = createContext<ProfileContextValue>({
  favTeam: null,
  setFavTeam: () => {},
  ready: false,
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [favTeam, setFavTeamState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Hydrate from storage once on mount.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (alive) setFavTeamState(v); })
      .catch(() => { /* fall back to no favourite — never block the app */ })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  const setFavTeam = (team: string | null) => {
    setFavTeamState(team);
    // Fire-and-forget persistence; a write failure must not break the UI.
    if (team) AsyncStorage.setItem(STORAGE_KEY, team).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  return (
    <ProfileContext.Provider value={{ favTeam, setFavTeam, ready }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  return useContext(ProfileContext);
}
