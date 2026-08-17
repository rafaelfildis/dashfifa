import { fetchJson } from '../http.js';
import type { Match } from '../types.js';

const BASE = 'https://api.gtleagues.com/api';
const MATCH_MINUTES = 12;
const PAGE_SIZE = 200; // the API caps a single response at 200 fixtures

// GT Leagues' edge returns 451 for requests that don't look like their own site.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0 Safari/537.36',
  Origin: 'https://www.gtleagues.com',
  Referer: 'https://www.gtleagues.com/',
  Accept: 'application/json',
};

interface RawParticipantEntry {
  side: 'home' | 'away';
  participant: {
    player: { nickname: string };
    team: { name: string };
  };
}

interface RawFixture {
  id: string;
  kickoff: string;
  result: { stats: { home_score: number | null; away_score: number | null } } | null;
  participants: RawParticipantEntry[];
}

function sideOf(fixture: RawFixture, side: 'home' | 'away') {
  const entry = fixture.participants.find((p) => p.side === side);
  return {
    player: entry?.participant.player.nickname ?? '?',
    team: entry?.participant.team.name ?? '?',
  };
}

function toMatch(f: RawFixture, now: number): Match {
  const homeScore = f.result?.stats?.home_score ?? null;
  const awayScore = f.result?.stats?.away_score ?? null;
  const kickoff = new Date(f.kickoff).getTime();
  const finished = homeScore != null && awayScore != null;

  // GT Leagues queues matches, so kickoff times are nominal slots that slip when
  // earlier matches run long. Only trust "live" inside one match length.
  const elapsedMs = now - kickoff;
  const plausiblyLive = elapsedMs >= 0 && elapsedMs <= (MATCH_MINUTES + 5) * 60 * 1000;
  const status = finished ? 'finished' : plausiblyLive ? 'live' : 'scheduled';

  const home = sideOf(f, 'home');
  const away = sideOf(f, 'away');

  return {
    id: `gt-${f.id}`,
    leagueId: 'gt-leagues',
    playedAt: f.kickoff,
    status,
    home: { player: home.player, team: home.team, score: homeScore },
    away: { player: away.player, team: away.team, score: awayScore },
  };
}

async function fetchRange(fromIso: string, toIso: string, maxPages: number): Promise<Match[]> {
  const now = Date.now();
  const matches: Match[] = [];

  for (let page = 0; page < maxPages; page++) {
    const url =
      `${BASE}/fixtures?kickoff=between:${fromIso},${toIso}` +
      `&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}&sort=-kickoff,-matchNr&status=in:1,2,3,4,5,6`;

    const fixtures = await fetchJson<RawFixture[]>(url, { headers: HEADERS, timeoutMs: 20_000 });
    matches.push(...fixtures.map((f) => toMatch(f, now)));
    if (fixtures.length < PAGE_SIZE) break;
  }

  return matches;
}

export function fetchGtLeaguesLive(): Promise<Match[]> {
  const now = Date.now();
  const from = new Date(now - 3 * 60 * 60 * 1000).toISOString();
  const to = new Date(now + 3 * 60 * 60 * 1000).toISOString();
  return fetchRange(from, to, 2);
}

export function fetchGtLeaguesHistory(days: number): Promise<Match[]> {
  const to = new Date().toISOString();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return fetchRange(from, to, 30);
}
