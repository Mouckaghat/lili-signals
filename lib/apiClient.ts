const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? '';
const BASE_URL = 'https://v3.football.api-sports.io';

function headers() {
  return { 'x-apisports-key': API_KEY };
}

export type ApiStatus = 'checking' | 'connected' | 'unavailable' | 'unauthorized';

export async function checkApiHealth(): Promise<ApiStatus> {
  if (!API_KEY) return 'unavailable';

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    );
    const request = fetch(`${BASE_URL}/status`, { headers: headers() });
    const response = await Promise.race([request, timeout]);

    if (response.status === 200) return 'connected';
    if (response.status === 401 || response.status === 403) return 'unauthorized';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function getLeagues(options?: { country?: string; season?: number }) {
  const params = new URLSearchParams();
  if (options?.country) params.set('country', options.country);
  if (options?.season) params.set('season', String(options.season));
  const query = params.toString() ? `?${params}` : '';

  const response = await fetch(`${BASE_URL}/leagues${query}`, { headers: headers() });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function getTeamFixtures(options: {
  team: number;
  season: number;
  from?: string;
  to?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  params.set('team', String(options.team));
  params.set('season', String(options.season));
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  if (options.status) params.set('status', options.status);

  const response = await fetch(`${BASE_URL}/fixtures?${params}`, { headers: headers() });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function getStandings(leagueId: number, season: number) {
  const params = new URLSearchParams({ league: String(leagueId), season: String(season) });
  const response = await fetch(`${BASE_URL}/standings?${params}`, { headers: headers() });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function getFixturesByDate(date: string, leagueId?: number) {
  const params = new URLSearchParams({ date });
  if (leagueId) params.set('league', String(leagueId));

  const response = await fetch(`${BASE_URL}/fixtures?${params}`, { headers: headers() });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function getLeagueFixtures(
  leagueId: number,
  season: number,
  options?: { last?: number; next?: number; status?: string }
) {
  const params = new URLSearchParams({
    league: String(leagueId),
    season: String(season),
  });
  if (options?.last) params.set('last', String(options.last));
  if (options?.next) params.set('next', String(options.next));
  if (options?.status) params.set('status', options.status);

  const response = await fetch(`${BASE_URL}/fixtures?${params}`, { headers: headers() });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
