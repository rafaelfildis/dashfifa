/**
 * Recortes de apresentação derivados do que o backend já calculou. Nada aqui
 * inventa estatística: a forma recente sai dos mesmos placares que a tabela de
 * histórico mostra, e os insights só reempacotam linhas de `H2HStats`.
 */

import { decimal, pct } from './format';
import type { H2HMatch, H2HResult, H2HStats } from '../types';

export type FormKey = 'V' | 'E' | 'D';

/**
 * Antigo → recente, como se lê um guia de forma. Derivado dos placares para não
 * poder divergir do histórico logo abaixo.
 */
export function formOf(matches: H2HMatch[], side: 'a' | 'b'): FormKey[] {
  const own = side === 'a' ? 'A' : 'B';
  return matches
    .map((m): FormKey => (m.result === 'D' ? 'E' : m.result === own ? 'V' : 'D'))
    .reverse();
}

export interface SampleLevel {
  label: string;
  /** Segmentos acesos no medidor de cinco. */
  filled: number;
  tone: 'bad' | 'warn' | 'good';
  note: string;
}

/**
 * Cinco faixas de volume de dados. O componente apenas contextualiza quantas
 * partidas existem — não emite conclusão estatística nem recomendação.
 */
export function sampleLevel(sample: number): SampleLevel {
  if (sample < 5) {
    return {
      label: 'Amostra muito pequena',
      filled: 1,
      tone: 'bad',
      note: `Com ${sample} partidas cada resultado move as frequências inteiras. Leia a base da liga primeiro.`,
    };
  }
  if (sample < 10) {
    return {
      label: 'Amostra pequena',
      filled: 2,
      tone: 'warn',
      note: `Com ${sample} partidas as frequências oscilam muito. Use a base da liga como referência complementar.`,
    };
  }
  if (sample < 20) {
    return {
      label: 'Amostra moderada',
      filled: 3,
      tone: 'warn',
      note: `Com ${sample} partidas as frequências já têm forma, mas ainda se movem entre um confronto e outro.`,
    };
  }
  if (sample < 40) {
    return {
      label: 'Amostra boa',
      filled: 4,
      tone: 'good',
      note: `${sample} partidas dão uma leitura estável do confronto direto.`,
    };
  }
  return {
    label: 'Amostra robusta',
    filled: 5,
    tone: 'good',
    note: `${sample} partidas: a amostra é grande o bastante para as frequências pararem de oscilar.`,
  };
}

export interface Insight {
  label: string;
  value: string;
  sub: string;
}

function overLine(lines: H2HStats['totals'], line: number) {
  return lines.find((t) => t.line === line)?.over ?? null;
}

/** Somente fatos derivados dos dados — sem juízo sobre o que apostar. */
export function insightsOf(result: H2HResult): Insight[] {
  const { stats, goalsA, goalsB, playerA, playerB } = result;
  const sample = stats.sample;
  const all = stats.goalWindows.find((w) => w.window === null);
  const over25 = overLine(stats.totals, 2.5);
  const scoresA = overLine(stats.playerGoals.a, 0.5);
  const scoresB = overLine(stats.playerGoals.b, 0.5);

  const rows: Insight[] = [
    {
      label: 'Média combinada de gols',
      value: all ? decimal(all.avgTotal) : '—',
      sub: `${goalsA + goalsB} em ${sample}`,
    },
    {
      label: 'Empates',
      value: pct(stats.result[1].pct),
      sub: `${stats.result[1].hits} de ${sample}`,
    },
    {
      label: 'Ambas marcam',
      value: pct(stats.bothScore.pct),
      sub: `${stats.bothScore.hits} de ${sample}`,
    },
  ];

  if (over25) {
    rows.push({
      label: 'Mais de 2,5 gols',
      value: pct(over25.pct),
      sub: `${over25.hits} de ${sample}`,
    });
  }
  if (scoresA) {
    rows.push({ label: `${playerA} marca`, value: pct(scoresA.pct), sub: `${scoresA.hits} de ${sample}` });
  }
  if (scoresB) {
    rows.push({ label: `${playerB} marca`, value: pct(scoresB.pct), sub: `${scoresB.hits} de ${sample}` });
  }

  return rows;
}
