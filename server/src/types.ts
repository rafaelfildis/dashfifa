export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type LeagueId = 'battle' | 'battle-volta' | 'gt-leagues' | 'h2h-gg';

export interface League {
  id: LeagueId;
  name: string;
  matchMinutes: number;
  source: string;
}

export interface MatchSide {
  player: string;
  team: string;
  score: number | null;
}

export interface Match {
  id: string;
  leagueId: LeagueId;
  playedAt: string;
  status: MatchStatus;
  home: MatchSide;
  away: MatchSide;
}
