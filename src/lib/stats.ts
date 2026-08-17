import { leagues, matches, players, teams } from '../data/seed';
import type { Match } from '../types';

export function getPlayer(id: string) {
  return players.find((p) => p.id === id);
}

export function getTeam(id: string) {
  return teams.find((t) => t.id === id);
}

export function getLeague(id: string) {
  return leagues.find((l) => l.id === id);
}

export function matchesForLeague(leagueId: string): Match[] {
  return matches.filter((m) => m.leagueId === leagueId);
}

export interface H2HSummary {
  playerAId: string;
  playerBId: string;
  playedMatches: Match[];
  winsA: number;
  winsB: number;
  draws: number;
  goalsA: number;
  goalsB: number;
}

export function headToHead(playerAId: string, playerBId: string): H2HSummary {
  const playedMatches = matches.filter((m) => {
    const ids = [m.home.playerId, m.away.playerId];
    return ids.includes(playerAId) && ids.includes(playerBId) && playerAId !== playerBId;
  });

  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let goalsA = 0;
  let goalsB = 0;

  for (const m of playedMatches) {
    const aIsHome = m.home.playerId === playerAId;
    const scoreA = aIsHome ? m.home.score : m.away.score;
    const scoreB = aIsHome ? m.away.score : m.home.score;

    goalsA += scoreA;
    goalsB += scoreB;

    if (m.status === 'finished') {
      if (scoreA > scoreB) winsA += 1;
      else if (scoreB > scoreA) winsB += 1;
      else draws += 1;
    }
  }

  return { playerAId, playerBId, playedMatches, winsA, winsB, draws, goalsA, goalsB };
}
