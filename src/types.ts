import type { H2HResult as SharedH2HResult } from '../shared/h2h';
import type { League as BaseLeague, LeagueId } from '../shared/types';

export type { LeagueId } from '../shared/types';
export type {
  AsianLine,
  GoalWindow,
  H2HStats,
  MarketLine,
  PlayerBaseline,
  TotalLine,
} from '../shared/stats';
export type { OrientedMatch as H2HMatch } from '../shared/stats';

/** The league list the UI shows, with the counts the data source adds. */
export interface League extends BaseLeague {
  players: number;
  matches: number;
}

export interface NamedCount {
  name: string;
  played: number;
}

export interface H2HResult extends SharedH2HResult {
  league: LeagueId;
}
