export type MatchStatus = 'live' | 'finished' | 'scheduled';

export interface League {
  id: string;
  name: string;
  matchMinutes: number;
}

export interface Player {
  id: string;
  nickname: string;
}

export interface Team {
  id: string;
  name: string;
  flag?: string;
}

export interface Match {
  id: string;
  leagueId: string;
  playedAt: string;
  clock: string;
  status: MatchStatus;
  home: {
    playerId: string;
    teamId: string;
    score: number;
  };
  away: {
    playerId: string;
    teamId: string;
    score: number;
  };
}
