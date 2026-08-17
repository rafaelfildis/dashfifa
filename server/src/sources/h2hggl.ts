import type { Match } from '../types.js';

const API_BASE = 'https://api-h2h.hudstats.com/v1';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (dashfifa)',
  Origin: 'https://h2hggl.com',
  Referer: 'https://h2hggl.com/',
  Accept: 'application/json',
};

interface RawLiveMatch {
  externalId: string;
  startDate: string;
  teamAName: string;
  teamBName: string;
  participantAName: string;
  participantBName: string;
  status: 'live' | 'not_started' | 'scheduled' | string;
  teamAScore: number | null;
  teamBScore: number | null;
}

interface RawPastMatch {
  externalId: string;
  startDate: string;
  teamAName: string;
  teamBName: string;
  participantAName: string;
  participantBName: string;
  matchStatus: string | null;
  teamAScore: number | null;
  teamBScore: number | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`H2H GG League request failed: ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

export async function fetchH2hgglMatches(): Promise<Match[]> {
  const live = await fetchJson<RawLiveMatch[]>(`${API_BASE}/live/fifa`);

  return live.map((m): Match => ({
    id: `h2h-${m.externalId}`,
    leagueId: 'h2h-gg',
    playedAt: m.startDate,
    status: m.status === 'live' ? 'live' : 'scheduled',
    home: { player: m.participantAName, team: m.teamAName, score: m.teamAScore },
    away: { player: m.participantBName, team: m.teamBName, score: m.teamBScore },
  }));
}

export async function fetchH2hgglParticipantNames(): Promise<string[]> {
  return fetchJson<string[]>(`${API_BASE}/participant/fifa/names`);
}

export interface H2hgglPairwise {
  h2H: string[];
  participantAStats: Record<string, unknown> & { participantName: string };
  participantBStats: Record<string, unknown> & { participantName: string };
}

export async function fetchH2hgglPairwise(a: string, b: string): Promise<H2hgglPairwise> {
  const url = `${API_BASE}/h2h/fifa/participants?participant_a=${encodeURIComponent(a)}&participant_b=${encodeURIComponent(b)}`;
  return fetchJson<H2hgglPairwise>(url);
}

export async function fetchH2hgglPastMatches(participant: string): Promise<RawPastMatch[]> {
  const url = `${API_BASE}/schedule/past/fifa?participant=${encodeURIComponent(participant)}`;
  return fetchJson<RawPastMatch[]>(url);
}
