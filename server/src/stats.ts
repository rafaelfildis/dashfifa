/**
 * Descriptive stats over a pair's head-to-head history, shaped to the markets
 * bookmakers list for these leagues: 1X2, total goals, Asian handicap (whole,
 * half and quarter lines), and the same at half time where the source reports
 * the interval score.
 *
 * Everything here is observed frequency in the sample - not a forecast. A fair
 * odd is just 1/frequency, so it only means something with enough matches,
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

export interface TotalLine {
  line: number;
  over: MarketLine;
  under: MarketLine;
}

export interface AsianLine {
  line: number;
  label: string;
  wins: number;
  halfWins: number;
  pushes: number;
  halfLosses: number;
  losses: number;
  /** Effective strike rate, counting a half win as half a bet. Pushes excluded. */
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

export interface PlayerBaseline {
  player: string;
  matches: number;
  avgFor: number;
  avgAgainst: number;
  avgTotal: number;
  winPct: number;
  drawPct: number;
}

export interface H2HStats {
  sample: number;
  goalWindows: GoalWindow[];
  result: MarketLine[];
  totals: TotalLine[];
  drawNoBet: MarketLine[];
  asian: AsianLine[];
  bothScore: MarketLine;
  halftime: {
    sample: number;
    avgTotal: number;
    totals: TotalLine[];
    asian: AsianLine[];
  } | null;
  baseline: { a: PlayerBaseline; b: PlayerBaseline } | null;
}

const GOAL_LINES = [2.5, 3.5, 4.5, 5.5, 6.5, 7.5];
const HALFTIME_GOAL_LINES = [0.5, 1.5, 2.5, 3.5];
const ASIAN_LINES = [-1.5, -1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1, 1.5];
const HALFTIME_ASIAN_LINES = [-1, -0.5, -0.25, 0, 0.25, 0.5, 1];
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

function signed(value: number): string {
  if (value === 0) return '0.0';
  return `${value > 0 ? '+' : '-'}${Math.abs(value).toFixed(1)}`;
}

/** Bookmakers write a quarter line as its two halves, e.g. +0.25 as "0.0, +0.5". */
function asianLabel(value: number): string {
  const isQuarter = Math.abs(value * 4) % 2 === 1;
  if (!isQuarter) return signed(value);
  const step = value > 0 ? 0.25 : -0.25;
  return `${signed(value - step)}, ${signed(value + step)}`;
}

function settleAsian(margin: number, handicap: number) {
  // Lines are multiples of 0.25 and margins are integers, so both are exactly
  // representable in binary floating point - equality checks are safe here.
  const diff = margin + handicap;
  if (diff >= 0.5) return 'win' as const;
  if (diff === 0.25) return 'halfWin' as const;
  if (diff === 0) return 'push' as const;
  if (diff === -0.25) return 'halfLoss' as const;
  return 'loss' as const;
}

function asianLine(margins: number[], handicap: number): AsianLine {
  let wins = 0;
  let halfWins = 0;
  let pushes = 0;
  let halfLosses = 0;
  let losses = 0;

  for (const margin of margins) {
    switch (settleAsian(margin, handicap)) {
      case 'win':
        wins += 1;
        break;
      case 'halfWin':
        halfWins += 1;
        break;
      case 'push':
        pushes += 1;
        break;
      case 'halfLoss':
        halfLosses += 1;
        break;
      default:
        losses += 1;
    }
  }

  // Half outcomes stake only half the bet, so they count half on each side.
  const effectiveWin = wins + halfWins / 2;
  const effectiveLoss = losses + halfLosses / 2;
  const staked = effectiveWin + effectiveLoss;
  const pct = staked > 0 ? effectiveWin / staked : 0;

  return {
    line: handicap,
    label: asianLabel(handicap),
    wins,
    halfWins,
    pushes,
    halfLosses,
    losses,
    pct: round(pct * 100, 1),
    fairOdds: pct > 0 ? round(1 / pct) : null,
  };
}

function totalsFor(totals: number[], lines: number[]): TotalLine[] {
  const sample = totals.length;
  return lines.map((goalLine) => {
    const over = totals.filter((t) => t > goalLine).length;
    return {
      line: goalLine,
      over: line(`Mais de ${goalLine.toFixed(1)}`, over, sample),
      under: line(`Menos de ${goalLine.toFixed(1)}`, sample - over, sample),
    };
  });
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

/** A player's record across the whole league, as context when the pair's sample is thin. */
export function buildBaseline(
  player: string,
  games: { for: number; against: number }[],
): PlayerBaseline {
  const n = games.length;
  if (n === 0) {
    return { player, matches: 0, avgFor: 0, avgAgainst: 0, avgTotal: 0, winPct: 0, drawPct: 0 };
  }

  const goalsFor = games.reduce((sum, g) => sum + g.for, 0);
  const goalsAgainst = games.reduce((sum, g) => sum + g.against, 0);

  return {
    player,
    matches: n,
    avgFor: round(goalsFor / n, 2),
    avgAgainst: round(goalsAgainst / n, 2),
    avgTotal: round((goalsFor + goalsAgainst) / n, 2),
    winPct: round((games.filter((g) => g.for > g.against).length / n) * 100, 1),
    drawPct: round((games.filter((g) => g.for === g.against).length / n) * 100, 1),
  };
}

/** `matches` must be sorted newest first, so the windows mean "last N". */
export function buildStats(
  matches: OrientedMatch[],
  playerA: string,
  playerB: string,
  baseline: { a: PlayerBaseline; b: PlayerBaseline } | null = null,
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

  const margins = matches.map((m) => m.scoreA - m.scoreB);
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
          totals: totalsFor(
            withHalftime.map((m) => (m.htA ?? 0) + (m.htB ?? 0)),
            HALFTIME_GOAL_LINES,
          ),
          asian: HALFTIME_ASIAN_LINES.map((h) =>
            asianLine(
              withHalftime.map((m) => (m.htA ?? 0) - (m.htB ?? 0)),
              h,
            ),
          ),
        }
      : null;

  return {
    sample,
    goalWindows,
    result: [
      line(playerA, winsA, sample),
      line('Empate', draws, sample),
      line(playerB, winsB, sample),
    ],
    totals: totalsFor(
      matches.map((m) => m.scoreA + m.scoreB),
      GOAL_LINES,
    ),
    drawNoBet: [line(playerA, winsA, decided), line(playerB, winsB, decided)],
    asian: ASIAN_LINES.map((h) => asianLine(margins, h)),
    bothScore: line(
      'Ambas marcam',
      matches.filter((m) => m.scoreA > 0 && m.scoreB > 0).length,
      sample,
    ),
    halftime,
    baseline,
  };
}
