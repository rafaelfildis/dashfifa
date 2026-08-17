/**
 * Descriptive stats over a pair's head-to-head history, shaped to the markets
 * bookmakers list for these leagues: 1X2, total goals, draw-no-bet, both to
 * score, and the same in the first half where the source reports it.
 *
 * Everything here is observed frequency in the sample - not a forecast. Fair
 * odds are just 1/frequency, so they only mean something with enough matches,
 * which is why `sample` travels with every block.
 */

export interface OrientedMatch {
  id: string;
  playedAt: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  result: 'A' | 'B' | 'D';
  aWasHome: boolean;
  htA: number | null;
  htB: number | null;
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

const GOAL_LINES = [2.5, 3.5, 4.5, 5.5, 6.5, 7.5];
const HALFTIME_LINES = [1.5, 2.5];
const GOAL_WINDOWS = [5, 10, 15];

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function line(label: string, hits: number, sample: number): MarketLine {
  const pct = sample > 0 ? hits / sample : 0;
  return {
    label,
    hits,
    pct: round(pct * 100, 1),
    fairOdds: pct > 0 ? round(1 / pct) : null,
  };
}

function averagesOver(matches: OrientedMatch[], window: number | null): GoalWindow {
  const slice = window === null ? matches : matches.slice(0, window);
  const n = slice.length;
  if (n === 0) return { window, matches: 0, avgTotal: 0, avgA: 0, avgB: 0 };

  const goalsA = slice.reduce((sum, m) => sum + m.scoreA, 0);
  const goalsB = slice.reduce((sum, m) => sum + m.scoreB, 0);

  return {
    window,
    matches: n,
    avgTotal: round((goalsA + goalsB) / n, 2),
    avgA: round(goalsA / n, 2),
    avgB: round(goalsB / n, 2),
  };
}

/** `matches` must be sorted newest first, so the windows mean "last N". */
export function buildStats(
  matches: OrientedMatch[],
  playerA: string,
  playerB: string,
): H2HStats {
  const sample = matches.length;

  const goalWindows = [
    ...GOAL_WINDOWS.filter((w) => w < sample).map((w) => averagesOver(matches, w)),
    averagesOver(matches, null),
  ];

  const winsA = matches.filter((m) => m.result === 'A').length;
  const winsB = matches.filter((m) => m.result === 'B').length;
  const draws = matches.filter((m) => m.result === 'D').length;

  const decided = winsA + winsB;

  const overUnder = GOAL_LINES.map((goalLine) =>
    line(
      `Mais de ${goalLine.toFixed(1)}`,
      matches.filter((m) => m.scoreA + m.scoreB > goalLine).length,
      sample,
    ),
  );

  const withHalftime = matches.filter((m) => m.htA !== null && m.htB !== null);
  const halftime =
    withHalftime.length > 0
      ? {
          sample: withHalftime.length,
          avgTotal: round(
            withHalftime.reduce((sum, m) => sum + (m.htA ?? 0) + (m.htB ?? 0), 0) /
              withHalftime.length,
            2,
          ),
          lines: HALFTIME_LINES.map((goalLine) =>
            line(
              `Mais de ${goalLine.toFixed(1)}`,
              withHalftime.filter((m) => (m.htA ?? 0) + (m.htB ?? 0) > goalLine).length,
              withHalftime.length,
            ),
          ),
        }
      : null;

  return {
    sample,
    goalWindows,
    result: [line(playerA, winsA, sample), line('Empate', draws, sample), line(playerB, winsB, sample)],
    overUnder,
    drawNoBet: [line(playerA, winsA, decided), line(playerB, winsB, decided)],
    bothScore: line('Ambas marcam', matches.filter((m) => m.scoreA > 0 && m.scoreB > 0).length, sample),
    halftime,
  };
}
