export type LeagueId = 'battle' | 'battle-volta' | 'gt-leagues' | 'h2h-gg';

export interface League {
  id: LeagueId;
  name: string;
  matchMinutes: number;
  source: string;
  players: number;
  matches: number;
}

export interface NamedCount {
  name: string;
  played: number;
}

export interface H2HMatch {
  id: string;
  playedAt: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  result: 'A' | 'B' | 'D';
  aWasHome: boolean;
}

export interface MarketLine {
  label: string;
  hits: number;
  pct: number;
  fairOdds: number | null;
}

export interface GoalWindow {
  window: number | null;
  matches: number;
  avgTotal: number;
  avgA: number;
  avgB: number;
}

export interface H2HStats {
  sample: number;
  goalWindows: GoalWindow[];
  result: MarketLine[];
  overUnder: MarketLine[];
  drawNoBet: MarketLine[];
  bothScore: MarketLine;
  halftime: { sample: number; avgTotal: number; lines: MarketLine[] } | null;
}

export interface H2HResult {
  league: LeagueId;
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
  matches: H2HMatch[];
  stats: H2HStats;
}

export interface HistoryStatus {
  state: 'empty' | 'loading' | 'ready';
  matches: number;
  updatedAt: number;
}
