import type { Match, MatchStatus } from '../types.js';

const BASE = 'https://football.esportsbattle.com/api';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (dashfifa)' };

function mapStatus(statusId: number): MatchStatus | null {
  if (statusId === 1) return 'scheduled';
  if (statusId === 2 || statusId === 5) return 'live';
  if (statusId === 3) return 'finished';
  return null; // canceled / deleted
}

interface RawLocation {
  id: number;
  token_international: string;
  matchCount: number;
  tournaments: number[];
}

interface RawTeam {
  token_international: string;
}

interface RawParticipant {
  nickname: string;
  team: RawTeam;
  score?: number;
}

interface RawStreamingMatch {
  id: number;
  status_id: number;
  date: string;
  tournament: { id: number; token_international: string };
  participant1: RawParticipant;
  participant2: RawParticipant;
}

interface RawStreamingGroup {
  id: number;
  token_international: string;
  matches: RawStreamingMatch[];
}

interface RawNearestMatch {
  id: number;
  status_id: number;
  date: string;
  location: { id: number };
  participant1: RawParticipant;
  participant2: RawParticipant;
}

const tournamentNameCache = new Map<number, string>();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`ESportsBattle request failed: ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

async function resolveTournamentName(tournamentId: number): Promise<string> {
  const cached = tournamentNameCache.get(tournamentId);
  if (cached) return cached;
  try {
    const data = await fetchJson<{ token_international: string }>(
      `${BASE}/tournaments/${tournamentId}/results`,
    );
    tournamentNameCache.set(tournamentId, data.token_international);
    return data.token_international;
  } catch {
    return 'ESportsBattle';
  }
}

function leagueIdForTournament(name: string): 'battle' | 'battle-volta' {
  return /volta/i.test(name) ? 'battle-volta' : 'battle';
}

export async function fetchEsportsBattleMatches(): Promise<Match[]> {
  const locations = await fetchJson<RawLocation[]>(`${BASE}/locations/streaming`);
  const activeLocations = locations.filter((l) => l.matchCount > 0);

  const matches: Match[] = [];

  const liveGroups = await Promise.all(
    activeLocations.map((loc) =>
      fetchJson<RawStreamingGroup[]>(`${BASE}/locations/${loc.id}/streaming`).catch(() => []),
    ),
  );

  for (const groups of liveGroups) {
    for (const group of groups) {
      tournamentNameCache.set(group.id, group.token_international);
      const leagueId = leagueIdForTournament(group.token_international);
      for (const m of group.matches) {
        const status = mapStatus(m.status_id);
        if (!status) continue;
        matches.push({
          id: `eb-${m.id}`,
          leagueId,
          playedAt: m.date,
          status,
          home: {
            player: m.participant1.nickname,
            team: m.participant1.team.token_international,
            score: m.participant1.score ?? null,
          },
          away: {
            player: m.participant2.nickname,
            team: m.participant2.team.token_international,
            score: m.participant2.score ?? null,
          },
        });
      }
    }
  }

  const locationTournament = new Map<number, number>();
  for (const loc of locations) {
    if (loc.tournaments[0] != null) locationTournament.set(loc.id, loc.tournaments[0]);
  }

  const nearest = await fetchJson<RawNearestMatch[]>(`${BASE}/tournaments/nearest-matches`);
  for (const m of nearest) {
    const status = mapStatus(m.status_id);
    if (!status || status !== 'scheduled') continue;
    const tournamentId = locationTournament.get(m.location.id);
    const tournamentName = tournamentId ? await resolveTournamentName(tournamentId) : 'ESportsBattle';
    matches.push({
      id: `eb-${m.id}`,
      leagueId: leagueIdForTournament(tournamentName),
      playedAt: m.date,
      status,
      home: { player: m.participant1.nickname, team: m.participant1.team.token_international, score: null },
      away: { player: m.participant2.nickname, team: m.participant2.team.token_international, score: null },
    });
  }

  return matches;
}
