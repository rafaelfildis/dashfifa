import { buildBaseline, buildStats, type H2HStats, type OrientedMatch } from './stats.js';
import type { Match } from './types.js';

export interface H2HQuery {
  a: string;
  b: string;
  teamA?: string | null;
  teamB?: string | null;
  limit?: number;
}

export interface H2HResult {
  playerA: string;
  playerB: string;
  teamA: string | null;
  teamB: string | null;
  played: number;
  winsA: number;
  winsB: number;
  draws: number;
  goalsA: number;
  goalsB: number;
  matches: OrientedMatch[];
  stats: H2HStats;
}

export function isUsable(m: Match): boolean {
  return m.status === 'finished' && m.home.score != null && m.away.score != null;
}

/** Reorients a match so side A is always the first selected player. */
export function orient(match: Match, a: string): OrientedMatch {
  const aWasHome = match.home.player === a;
  const sideA = aWasHome ? match.home : match.away;
  const sideB = aWasHome ? match.away : match.home;
  const scoreA = sideA.score ?? 0;
  const scoreB = sideB.score ?? 0;

  return {
    id: match.id,
    playedAt: match.playedAt,
    teamA: sideA.team,
    teamB: sideB.team,
    scoreA,
    scoreB,
    result: scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'D',
    aWasHome,
    htA: sideA.halftime ?? null,
    htB: sideB.halftime ?? null,
  };
}

/**
 * The single implementation of a head-to-head, so the hosted backend and the
 * static build can never drift apart. `leagueMatches` must already be the
 * finished matches of one league.
 */
export function computeH2H(leagueMatches: Match[], query: H2HQuery): H2HResult {
  const { a, b, teamA = null, teamB = null, limit = 15 } = query;

  const encounters = leagueMatches
    .filter((m) => {
      const players = [m.home.player, m.away.player];
      return players.includes(a) && players.includes(b);
    })
    .map((m) => orient(m, a))
    .filter((m) => (!teamA || m.teamA === teamA) && (!teamB || m.teamB === teamB))
    .sort((x, y) => new Date(y.playedAt).getTime() - new Date(x.playedAt).getTime());

  const totals = encounters.reduce(
    (acc, m) => {
      if (m.result === 'A') acc.winsA += 1;
      else if (m.result === 'B') acc.winsB += 1;
      else acc.draws += 1;
      acc.goalsA += m.scoreA;
      acc.goalsB += m.scoreB;
      return acc;
    },
    { winsA: 0, winsB: 0, draws: 0, goalsA: 0, goalsB: 0 },
  );

  // Pair samples are often thin, so each player's whole league record travels
  // alongside as the wider reference.
  const gamesOf = (player: string) =>
    leagueMatches
      .filter((m) => m.home.player === player || m.away.player === player)
      .map((m) => {
        const isHome = m.home.player === player;
        return {
          for: (isHome ? m.home.score : m.away.score) ?? 0,
          against: (isHome ? m.away.score : m.home.score) ?? 0,
        };
      });

  const baseline = { a: buildBaseline(a, gamesOf(a)), b: buildBaseline(b, gamesOf(b)) };

  return {
    playerA: a,
    playerB: b,
    teamA,
    teamB,
    played: encounters.length,
    ...totals,
    matches: encounters.slice(0, limit),
    stats: buildStats(encounters, a, b, baseline),
  };
}

export function playersIn(leagueMatches: Match[]): { name: string; played: number }[] {
  const counts = new Map<string, number>();
  for (const m of leagueMatches) {
    counts.set(m.home.player, (counts.get(m.home.player) ?? 0) + 1);
    counts.set(m.away.player, (counts.get(m.away.player) ?? 0) + 1);
  }
  return Array.from(counts, ([name, played]) => ({ name, played })).sort((x, y) =>
    x.name.localeCompare(y.name),
  );
}

export function teamsIn(
  leagueMatches: Match[],
  player: string | null,
): { name: string; played: number }[] {
  const counts = new Map<string, number>();
  for (const m of leagueMatches) {
    for (const side of [m.home, m.away]) {
      if (player && side.player !== player) continue;
      counts.set(side.team, (counts.get(side.team) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([name, played]) => ({ name, played })).sort(
    (x, y) => y.played - x.played || x.name.localeCompare(y.name),
  );
}
