import type { H2HResult, HistoryStatus, League, LeagueId, NamedCount } from '../types';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Falha na requisição (${res.status})`);
  }
  return res.json();
}

export function fetchLeagues(): Promise<League[]> {
  return get<League[]>('/api/leagues');
}

export function fetchStatus(): Promise<HistoryStatus> {
  return get<HistoryStatus>('/api/status');
}

export function fetchPlayers(league: LeagueId): Promise<NamedCount[]> {
  return get<NamedCount[]>(`/api/players?league=${encodeURIComponent(league)}`);
}

export function fetchTeams(league: LeagueId, player: string): Promise<NamedCount[]> {
  const params = new URLSearchParams({ league, player });
  return get<NamedCount[]>(`/api/teams?${params}`);
}

export function fetchH2H(
  league: LeagueId,
  a: string,
  b: string,
  teamA: string,
  teamB: string,
): Promise<H2HResult> {
  const params = new URLSearchParams({ league, a, b, limit: '10' });
  if (teamA) params.set('teamA', teamA);
  if (teamB) params.set('teamB', teamB);
  return get<H2HResult>(`/api/h2h?${params}`);
}
