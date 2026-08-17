import type { League } from './types.js';

export const LEAGUES: League[] = [
  { id: 'battle', name: 'E-Soccer Battle', matchMinutes: 8, source: 'football.esportsbattle.com' },
  { id: 'gt-leagues', name: 'E-Soccer GT Leagues', matchMinutes: 12, source: 'gtleagues.com' },
  { id: 'h2h-gg', name: 'E-Soccer H2H GG League', matchMinutes: 8, source: 'h2hggl.com' },
  {
    id: 'battle-volta',
    name: 'E-Soccer Battle Volta',
    matchMinutes: 6,
    source: 'football.esportsbattle.com',
  },
];
