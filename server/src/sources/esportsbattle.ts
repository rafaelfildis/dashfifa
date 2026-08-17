import { fetchJson, isoDate, mapLimit } from '../http.js';
import type { LeagueId, Match, MatchStatus } from '../types.js';

const BASE = 'https://football.esportsbattle.com/api';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (dashfifa)', Accept: 'application/json' };

function get<T>(path: string, timeoutMs?: number): Promise<T> {
  return fetchJson<T>(`${BASE}${path}`, { headers: HEADERS, timeoutMs });
}

function mapStatus(statusId: number): MatchStatus | null {
  if (statusId === 1) return 'scheduled';
  if (statusId === 2 || statusId === 5) return 'live';
  if (statusId === 3) return 'finished';
  return null; // canceled / deleted
}

/** ESportsBattle runs Volta (6min street football) alongside its regular 8min leagues. */
function leagueIdForLeagueName(name: string): LeagueId {
  return /volta/i.test(name) ? 'battle-volta' : 'battle';
}

interface RawTeam {
  token_international: string;
}

interface RawParticipant {
  nickname: string;
  score?: number | null;
  team: RawTeam;
  /** Score at the end of each finished period; index 0 is half time. */
  prevPeriodsScores?: string[] | string | null;
}

interface RawMatch {
  id: number;
  status_id: number;
  date: string;
  participant1: RawParticipant;
  participant2: RawParticipant;
}

interface RawStreamingGroup {
  id: number;
  token_international: string;
  matches: (RawMatch & { tournament: { id: number; token_international: string } })[];
}

interface RawLocation {
  id: number;
  matchCount: number;
  tournaments: number[];
}

interface RawTournamentSummary {
  id: number;
  token_international: string;
  start_date: string;
  league: { token_international: string };
}

function halftimeOf(participant: RawParticipant): number | null {
  const periods = participant.prevPeriodsScores;
  if (!Array.isArray(periods) || periods.length === 0) return null;
  const first = Number(periods[0]);
  return Number.isFinite(first) ? first : null;
}

function toMatch(raw: RawMatch, leagueId: LeagueId, status: MatchStatus): Match {
  return {
    id: `eb-${raw.id}`,
    leagueId,
    playedAt: raw.date,
    status,
    home: {
      player: raw.participant1.nickname,
      team: raw.participant1.team.token_international,
      score: raw.participant1.score ?? null,
      halftime: halftimeOf(raw.participant1),
    },
    away: {
      player: raw.participant2.nickname,
      team: raw.participant2.team.token_international,
      score: raw.participant2.score ?? null,
      halftime: halftimeOf(raw.participant2),
    },
  };
}

/** Matches currently on air, across every streaming location. */
export async function fetchEsportsBattleLive(): Promise<Match[]> {
  const locations = await get<RawLocation[]>('/locations/streaming');
  const active = locations.filter((l) => l.matchCount > 0);

  const groups = await mapLimit(active, 4, (loc) =>
    get<RawStreamingGroup[]>(`/locations/${loc.id}/streaming`).catch(() => [] as RawStreamingGroup[]),
  );

  const matches: Match[] = [];
  for (const group of groups.flat()) {
    const leagueId = leagueIdForLeagueName(group.token_international);
    for (const raw of group.matches) {
      const status = mapStatus(raw.status_id);
      if (status) matches.push(toMatch(raw, leagueId, status));
    }
  }
  return matches;
}

export interface TournamentRef {
  id: number;
  leagueId: LeagueId;
  startDate: string;
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Tournaments that ran on one day. Listing per day (rather than over the whole
 * window) lets the backfill cache the listing itself, so later runs only ask
 * about days they have never seen.
 */
export async function listEsportsBattleTournamentsForDay(date: string): Promise<TournamentRef[]> {
  const range = `dateFrom=${date}&dateTo=${nextDay(date)}`;

  const first = await get<{ totalPages: number; tournaments: RawTournamentSummary[] }>(
    `/tournaments?page=1&${range}`,
    20_000,
  );

  const pages = Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => i + 2);
  const rest = await mapLimit(pages, 3, (page) =>
    get<{ tournaments: RawTournamentSummary[] }>(`/tournaments?page=${page}&${range}`, 20_000)
      .then((r) => r.tournaments)
      .catch(() => [] as RawTournamentSummary[]),
  );

  return [...first.tournaments, ...rest.flat()].map((t) => ({
    id: t.id,
    leagueId: leagueIdForLeagueName(t.league.token_international),
    startDate: t.start_date,
  }));
}

export async function fetchEsportsBattleTournament(ref: TournamentRef): Promise<Match[]> {
  const raws = await get<RawMatch[]>(`/tournaments/${ref.id}/matches`, 20_000);
  return raws
    .map((raw) => {
      const status = mapStatus(raw.status_id);
      return status ? toMatch(raw, ref.leagueId, status) : null;
    })
    .filter((m): m is Match => m !== null);
}
