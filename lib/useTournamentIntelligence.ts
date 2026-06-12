import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface ScorerEntry {
  name: string;
  team: string;
  teamFlag: string;
  goals: number;
  // Optional enrichment from playerProfilesData.ts (Lili-curated)
  age?: number;
  club?: string;
  league?: string;
  clubStanding?: string;
  wcCount?: number;
  caps?: number;
}

export interface TeamRankEntry {
  name: string;
  flag: string;
  value: number;
  yellows?: number;
  reds?: number;
}

export interface TournamentIntelligence {
  topScorers:      ScorerEntry[];
  bestAttack:      TeamRankEntry[];
  bestDefence:     TeamRankEntry[];
  mostYellows:     TeamRankEntry[];
  mostReds:        TeamRankEntry[];
  disciplineRank:  TeamRankEntry[];
  mostDangerous:   TeamRankEntry[];
  liliSurpriseRank: TeamRankEntry[];
  updatedAt:       string;
}

const EMPTY: TournamentIntelligence = {
  topScorers:      [],
  bestAttack:      [],
  bestDefence:     [],
  mostYellows:     [],
  mostReds:        [],
  disciplineRank:  [],
  mostDangerous:   [],
  liliSurpriseRank: [],
  updatedAt:       '',
};

export function useTournamentIntelligence(): { data: TournamentIntelligence; loading: boolean } {
  const [data, setData]       = useState<TournamentIntelligence>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web') { setLoading(false); return; }

    let active = true;

    async function refresh() {
      try {
        const res = await fetch('/api/tournament-intelligence');
        if (!res.ok) { if (active) setLoading(false); return; }
        const json = await res.json() as TournamentIntelligence;
        if (active) { setData(json); setLoading(false); }
      } catch {
        if (active) setLoading(false);
      }
    }

    refresh();
    const id = setInterval(refresh, 5 * 60_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return { data, loading };
}
