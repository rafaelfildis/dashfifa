import * as staticSource from './staticSource';
import type { H2HResult, League, LeagueId, NamedCount } from '../types';

/**
 * Dev runs against the local Express backend (live data); a production build
 * reads the snapshot baked in at build time, so it can be hosted statically.
 * Set VITE_DATA_MODE to force either one.
 */
const mode = import.meta.env.VITE_DATA_MODE as 'static' | 'server' | undefined;
export const usingSnapshot = mode ? mode === 'static' : import.meta.env.PROD;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Falha na requisição (${res.status})`);
  }
  return res.json();
}

export function fetchLeagues(): Promise<League[]> {
  return usingSnapshot ? staticSource.fetchLeagues() : get<League[]>('/api/leagues');
}

export function fetchPlayers(league: LeagueId): Promise<NamedCount[]> {
  return usingSnapshot
    ? staticSource.fetchPlayers(league)
    : get<NamedCount[]>(`/api/players?league=${encodeURIComponent(league)}`);
}

export function fetchTeams(league: LeagueId, player: string): Promise<NamedCount[]> {
  if (usingSnapshot) return staticSource.fetchTeams(league, player);
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
  if (usingSnapshot) return staticSource.fetchH2H(league, a, b, teamA, teamB);

  const params = new URLSearchParams({ league, a, b, limit: '15' });
  if (teamA) params.set('teamA', teamA);
  if (teamB) params.set('teamB', teamB);
  return get<H2HResult>(`/api/h2h?${params}`);
}

export function fetchSnapshotDate(): Promise<string | null> {
  return usingSnapshot ? staticSource.snapshotGeneratedAt() : Promise.resolve(null);
}
