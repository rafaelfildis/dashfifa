import { fetchJson } from '../http.js';
import type { Match } from '../../../shared/types.js';

const BASE = 'https://api-h2h.hudstats.com/v1';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (dashfifa)',
  Origin: 'https://h2hggl.com',
  Referer: 'https://h2hggl.com/',
  Accept: 'application/json',
};

function get<T>(path: string, timeoutMs?: number): Promise<T> {
  return fetchJson<T>(`${BASE}${path}`, { headers: HEADERS, timeoutMs });
}

interface RawMatch {
  externalId: string;
  startDate: string;
  teamAName: string;
  teamBName: string;
  participantAName: string;
  participantBName: string;
  teamAScore: number | null;
  teamBScore: number | null;
  status?: string;
  matchStatus?: string | null;
}

function toMatch(raw: RawMatch): Match {
  const ended = raw.matchStatus === 'MATCH_ENDED';
  const live = raw.status === 'live';
  return {
    id: `h2h-${raw.externalId}`,
    leagueId: 'h2h-gg',
    playedAt: raw.startDate,
    status: ended ? 'finished' : live ? 'live' : 'scheduled',
    home: { player: raw.participantAName, team: raw.teamAName, score: raw.teamAScore },
    away: { player: raw.participantBName, team: raw.teamBName, score: raw.teamBScore },
  };
}

export async function fetchH2hgglLive(): Promise<Match[]> {
  const raws = await get<RawMatch[]>('/live/fifa');
  return raws.map(toMatch);
}

/** The site exposes a full day of fixtures per date - the unit of work for the backfill. */
export async function fetchH2hgglDay(date: string): Promise<Match[]> {
  const raws = await get<RawMatch[]>(`/schedule/fifa?date=${date}T00:00:00-03:00`, 25_000);
  return raws.map(toMatch);
}

export function fetchH2hgglParticipantNames(): Promise<string[]> {
  return get<string[]>('/participant/fifa/names');
}
