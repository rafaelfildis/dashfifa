import { computeH2H, playersIn, teamsIn } from '../../shared/h2h';
import { LEAGUES } from '../../shared/leagues';
import { decodeSnapshot, type LeagueSnapshot, type SnapshotIndex } from '../../shared/snapshot';
import type { Match } from '../../shared/types';
import type { H2HResult, League, LeagueId, NamedCount } from '../types';

/**
 * Reads the snapshot the build baked in, so the site works on static hosting
 * with no backend. Same computation as the server - both call shared/h2h.
 */
const base = import.meta.env.BASE_URL;

const leagueCache = new Map<LeagueId, Promise<Match[]>>();
let indexCache: Promise<SnapshotIndex> | null = null;

function loadIndex(): Promise<SnapshotIndex> {
  indexCache ??= fetch(`${base}data/index.json`).then((r) => {
    if (!r.ok) throw new Error('Snapshot não encontrado. Rode `npm run export` no server.');
    return r.json();
  });
  return indexCache;
}

function loadLeague(league: LeagueId): Promise<Match[]> {
  let pending = leagueCache.get(league);
  if (!pending) {
    pending = fetch(`${base}data/${league}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Dados da liga ${league} não encontrados`);
        return r.json() as Promise<LeagueSnapshot>;
      })
      .then(decodeSnapshot);
    leagueCache.set(league, pending);
  }
  return pending;
}

export async function fetchLeagues(): Promise<League[]> {
  const index = await loadIndex();
  return LEAGUES.map((league) => {
    const entry = index.leagues.find((l) => l.id === league.id);
    return { ...league, players: entry?.players ?? 0, matches: entry?.matches ?? 0 };
  });
}

export async function fetchPlayers(league: LeagueId): Promise<NamedCount[]> {
  return playersIn(await loadLeague(league));
}

export async function fetchTeams(league: LeagueId, player: string): Promise<NamedCount[]> {
  return teamsIn(await loadLeague(league), player);
}

export async function fetchH2H(
  league: LeagueId,
  a: string,
  b: string,
  teamA: string,
  teamB: string,
): Promise<H2HResult> {
  const matches = await loadLeague(league);
  const result = computeH2H(matches, { a, b, teamA: teamA || null, teamB: teamB || null, limit: 15 });
  return { league, ...result } as H2HResult;
}

export async function snapshotGeneratedAt(): Promise<string | null> {
  try {
    return (await loadIndex()).generatedAt;
  } catch {
    return null;
  }
}
