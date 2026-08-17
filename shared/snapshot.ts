import type { LeagueId, Match } from './types.js';

/**
 * Wire format for the static build. Names repeat constantly across tens of
 * thousands of matches, so they are interned once and rows carry indexes -
 * roughly a tenth of the size of the plain objects, and it gzips well.
 */
export interface LeagueSnapshot {
  league: LeagueId;
  generatedAt: string;
  players: string[];
  teams: string[];
  /** [minutesSinceEpoch, playerA, teamA, scoreA, htA, playerB, teamB, scoreB, htB] */
  rows: number[][];
}

export interface SnapshotIndex {
  generatedAt: string;
  windowDays: number;
  leagues: { id: LeagueId; matches: number; players: number; from: string; to: string }[];
}

const NO_HALFTIME = -1;

export function encodeSnapshot(
  league: LeagueId,
  matches: Match[],
  generatedAt: string,
): LeagueSnapshot {
  const players: string[] = [];
  const teams: string[] = [];
  const playerIndex = new Map<string, number>();
  const teamIndex = new Map<string, number>();

  const intern = (value: string, list: string[], index: Map<string, number>) => {
    const known = index.get(value);
    if (known !== undefined) return known;
    index.set(value, list.length);
    list.push(value);
    return list.length - 1;
  };

  const rows = matches.map((m) => [
    Math.floor(new Date(m.playedAt).getTime() / 60_000),
    intern(m.home.player, players, playerIndex),
    intern(m.home.team, teams, teamIndex),
    m.home.score ?? 0,
    m.home.halftime ?? NO_HALFTIME,
    intern(m.away.player, players, playerIndex),
    intern(m.away.team, teams, teamIndex),
    m.away.score ?? 0,
    m.away.halftime ?? NO_HALFTIME,
  ]);

  return { league, generatedAt, players, teams, rows };
}

export function decodeSnapshot(snapshot: LeagueSnapshot): Match[] {
  const { league, players, teams, rows } = snapshot;

  return rows.map((r, i) => ({
    id: `${league}-${i}`,
    leagueId: league,
    playedAt: new Date(r[0] * 60_000).toISOString(),
    status: 'finished' as const,
    home: {
      player: players[r[1]],
      team: teams[r[2]],
      score: r[3],
      halftime: r[4] === NO_HALFTIME ? null : r[4],
    },
    away: {
      player: players[r[5]],
      team: teams[r[6]],
      score: r[7],
      halftime: r[8] === NO_HALFTIME ? null : r[8],
    },
  }));
}
