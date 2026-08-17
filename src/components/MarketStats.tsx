import { useState } from 'react';
import { decimal, minusSign, odds, pct, tally } from '../lib/format';
import type { AsianLine, H2HResult, MarketLine, TotalLine } from '../types';

const FAIR_ODDS_HINT =
  'Odd calculada a partir da frequência histórica observada. Não representa garantia de ocorrência futura.';

type Tone = 'a' | 'b' | 'neutral';

interface Row {
  key: string;
  label: string;
  pct: number;
  fairOdds: number | null;
  count: string;
  tone: Tone;
}

function toRow(key: string, line: MarketLine, base: number, tone: Tone): Row {
  return {
    key,
    label: line.label,
    pct: line.pct,
    fairOdds: line.fairOdds,
    count: tally(line.hits, base),
    tone,
  };
}

/** Só as linhas de "mais de" por padrão: as de "menos de" são o complemento aritmético. */
function goalRows(prefix: string, lines: TotalLine[], base: number, withUnder: boolean): Row[] {
  const over = lines.map((t) => toRow(`${prefix}-o-${t.line}`, t.over, base, 'neutral'));
  if (!withUnder) return over;
  return [...over, ...lines.map((t) => toRow(`${prefix}-u-${t.line}`, t.under, base, 'neutral'))];
}

interface CardModel {
  key: string;
  title: string;
  note: string;
  rows: Row[];
}

interface GoalBlock extends CardModel {
  tone: Tone;
}

interface OddsProbe {
  comparing: boolean;
  typed: Record<string, string>;
  onOdd: (key: string, value: string) => void;
}

/** Valor esperado da odd ofertada contra a frequência histórica: `freq × odd − 1`. */
function OddCheck({ row, probe }: { row: Row; probe: OddsProbe }) {
  const value = probe.typed[row.key] ?? '';
  const parsed = Number(value.replace(',', '.'));
  const usable = value.trim() !== '' && Number.isFinite(parsed) && parsed > 1;
  const edge = usable ? (row.pct / 100) * parsed - 1 : null;

  return (
    <>
      <input
        className="probe__input num"
        inputMode="decimal"
        placeholder="odd"
        aria-label={`Odd da casa para ${row.label}`}
        value={value}
        onChange={(e) => probe.onOdd(row.key, e.target.value)}
      />
      <span className={`probe__edge num${edge !== null && edge > 0 ? ' probe__edge--up' : ''}`}>
        {edge === null ? '—' : `${edge > 0 ? '+' : '−'}${Math.abs(edge * 100).toFixed(0)}%`}
      </span>
    </>
  );
}

function MarketCard({
  title,
  note,
  rows,
  probe,
}: {
  title: string;
  note: string;
  rows: Row[];
  probe: OddsProbe;
}) {
  return (
    <div className="mcard">
      <div className="mcard__head">
        <span className="mcard__title">{title}</span>
        <span className="mcard__note">{note}</span>
      </div>
      <div className="mcard__rows">
        {rows.map((row) => (
          <div key={row.key} className="mrow">
            <div className="mrow__head">
              <span className={`mrow__label mrow__label--${row.tone}`}>{row.label}</span>
              <span className="mrow__figures">
                <span className="mrow__count num">{row.count}</span>
                <span className="mrow__pct num">{pct(row.pct)}</span>
                <span className="mrow__odd num" title={FAIR_ODDS_HINT}>
                  {odds(row.fairOdds)}
                </span>
              </span>
            </div>
            <div className="track track--thin">
              <div
                className={`track__seg track__seg--${row.tone}`}
                style={{ width: `${row.pct}%` }}
              />
            </div>
            {probe.comparing && (
              <div className="probe">
                <span className="probe__label">Odd da casa</span>
                <OddCheck row={row} probe={probe} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mcard__foot">
        <span>Frequência</span>
        <span className="mcard__foot-odd">Odd justa</span>
      </div>
    </div>
  );
}

function GoalCard({
  title,
  note,
  tone,
  rows,
  probe,
}: {
  title: string;
  note: string;
  tone: Tone;
  rows: Row[];
  probe: OddsProbe;
}) {
  return (
    <div className="gcard">
      <div className="gcard__head">
        <span className={`gcard__title gcard__title--${tone}`}>{title}</span>
        <span className="gcard__note num">{note}</span>
      </div>
      <div className="gcard__rows">
        {rows.map((row) => (
          <div key={row.key} className={`grow${probe.comparing ? ' grow--compare' : ''}`}>
            <span className="grow__label">{row.label}</span>
            <div className="track track--goal">
              <div className={`track__seg track__seg--${tone}`} style={{ width: `${row.pct}%` }} />
            </div>
            <span className={`grow__pct num${row.pct === 0 ? ' grow__pct--zero' : ''}`}>
              {pct(row.pct)}
            </span>
            <span className="grow__count num">{row.count}</span>
            <span className="grow__odd num" title={FAIR_ODDS_HINT}>
              {odds(row.fairOdds)}
            </span>
            {probe.comparing && <OddCheck row={row} probe={probe} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function asianTitle(line: AsianLine): string {
  return `${line.wins} vitórias · ${line.halfWins} meia-vitória · ${line.pushes} anuladas · ${line.halfLosses} meia-derrota · ${line.losses} derrotas`;
}

function HandicapTable({
  lines,
  prefix,
  sample,
  probe,
}: {
  lines: AsianLine[];
  prefix: string;
  sample: number;
  probe: OddsProbe;
}) {
  const wide = probe.comparing ? ' hcap__row--compare' : '';

  return (
    <div className="hcap">
      <div className={`hcap__row hcap__row--head${wide}`}>
        <span>Linha</span>
        <span>Distribuição</span>
        <span className="hcap__right">Frequência</span>
        <span className="hcap__right">Odd justa</span>
        {probe.comparing && <span className="hcap__right">Odd da casa</span>}
        {probe.comparing && <span className="hcap__right">Valor</span>}
      </div>
      {lines.map((line) => {
        const row: Row = {
          key: `${prefix}-${line.line}`,
          label: line.label,
          pct: line.pct,
          fairOdds: line.fairOdds,
          count: '',
          tone: 'a',
        };
        return (
          <div key={row.key} className={`hcap__row${wide}`} title={asianTitle(line)}>
            <span
              className={`hcap__line num${line.pct === 0 ? ' hcap__line--zero' : ''}${
                line.line === 0 ? ' hcap__line--level' : ''
              }`}
            >
              {minusSign(line.label)}
            </span>
            <div className="track track--goal">
              <div className="track__seg track__seg--hcap" style={{ width: `${line.pct}%` }} />
            </div>
            <span className="hcap__pct num">{pct(line.pct)}</span>
            <span className="hcap__odd num" title={FAIR_ODDS_HINT}>
              {odds(line.fairOdds)}
            </span>
            {probe.comparing && <OddCheck row={row} probe={probe} />}
          </div>
        );
      })}
      <p className="hcap__foot">
        Meia-vitória e meia-derrota contam metade; linhas anuladas ficam fora do cálculo. Por isso
        algumas linhas têm base menor que {sample} partidas.
      </p>
    </div>
  );
}

/**
 * Mercados, gols e handicap. Os números vêm prontos de `shared/stats`; aqui só
 * se decide o que aparece e em que ordem.
 */
export function MarketStats({ result }: { result: H2HResult }) {
  const [comparing, setComparing] = useState(false);
  const [showUnder, setShowUnder] = useState(false);
  const [typed, setTyped] = useState<Record<string, string>>({});

  const { stats, playerA, playerB } = result;
  const sample = stats.sample;
  const probe: OddsProbe = {
    comparing,
    typed,
    onOdd: (key, value) => setTyped((prev) => ({ ...prev, [key]: value })),
  };

  const decided = stats.result[0].hits + stats.result[2].hits;
  const all = stats.goalWindows.find((w) => w.window === null) ?? null;
  const over25 = stats.totals.find((t) => t.line === 2.5) ?? null;

  const mainMarkets: CardModel[] = [
    {
      key: 'res',
      title: 'Resultado final',
      note: `${sample} confrontos`,
      rows: [
        toRow('res-a', stats.result[0], sample, 'a'),
        toRow('res-d', stats.result[1], sample, 'neutral'),
        toRow('res-b', stats.result[2], sample, 'b'),
      ],
    },
    {
      key: 'dnb',
      title: 'Empate anula',
      note: 'handicap 0.0',
      rows: [
        toRow('dnb-a', stats.drawNoBet[0], decided, 'a'),
        toRow('dnb-b', stats.drawNoBet[1], decided, 'b'),
      ],
    },
    {
      key: 'btts',
      title: 'Ambas marcam',
      note: `${sample} confrontos`,
      rows: [{ ...toRow('btts', stats.bothScore, sample, 'neutral'), label: 'Sim' }],
    },
  ];

  if (over25) {
    mainMarkets.push({
      key: 'tot',
      title: 'Total de gols',
      note: 'linha principal',
      rows: [toRow('tot-main', over25.over, sample, 'neutral')],
    });
  }

  const goalBlocks: GoalBlock[] = [
    {
      key: 'tot',
      title: 'Total de gols no confronto',
      tone: 'neutral',
      note: all ? `média ${decimal(all.avgTotal)}` : '',
      rows: goalRows('tot', stats.totals, sample, showUnder),
    },
    {
      key: 'pga',
      title: `Gols de ${playerA}`,
      tone: 'a',
      note: stats.baseline ? `${decimal(stats.baseline.a.avgFor)} na liga` : '',
      rows: goalRows('pga', stats.playerGoals.a, sample, showUnder),
    },
    {
      key: 'pgb',
      title: `Gols de ${playerB}`,
      tone: 'b',
      note: stats.baseline ? `${decimal(stats.baseline.b.avgFor)} na liga` : '',
      rows: goalRows('pgb', stats.playerGoals.b, sample, showUnder),
    },
  ];

  if (stats.halftime) {
    goalBlocks.push({
      key: 'ht',
      title: '1º tempo · total de gols',
      tone: 'neutral',
      note: `média ${decimal(stats.halftime.avgTotal)}`,
      rows: goalRows('ht', stats.halftime.totals, stats.halftime.sample, showUnder),
    });
  }

  return (
    <>
      <section className="section" id="mercados" aria-label="Principais mercados">
        <div className="sechead">
          <h2 className="sechead__title">Principais mercados</h2>
          <div className="sechead__tools">
            <span className="sechead__note">frequência observada em {sample} confrontos diretos</span>
            <button
              type="button"
              className={`pill${comparing ? ' pill--on' : ''}`}
              onClick={() => setComparing((v) => !v)}
            >
              {comparing ? 'Ocultar odds da casa' : 'Comparar odds da casa'}
            </button>
          </div>
        </div>
        <div className={`markets${comparing ? ' markets--compare' : ''}`}>
          {mainMarkets.map((card) => (
            <MarketCard
              key={card.key}
              title={card.title}
              note={card.note}
              rows={card.rows}
              probe={probe}
            />
          ))}
        </div>
        {comparing && (
          <p className="section__foot">
            Valor positivo quer dizer que a casa está pagando acima do que o histórico sustenta.
          </p>
        )}
      </section>

      <section className="section" id="gols" aria-label="Gols">
        <div className="sechead">
          <h2 className="sechead__title">Gols</h2>
          <div className="sechead__tools">
            <span className="sechead__note">
              {showUnder ? 'linhas de "mais de" e "menos de"' : 'somente linhas de "mais de"'}
            </span>
            <button
              type="button"
              className={`pill${showUnder ? ' pill--on' : ''}`}
              onClick={() => setShowUnder((v) => !v)}
            >
              {showUnder ? 'Ocultar "menos de"' : 'Mostrar "menos de"'}
            </button>
          </div>
        </div>
        <div className={`goals${comparing ? ' goals--compare' : ''}`}>
          {goalBlocks.map((block) => (
            <GoalCard
              key={block.key}
              title={block.title}
              note={block.note}
              tone={block.tone}
              rows={block.rows}
              probe={probe}
            />
          ))}
        </div>
        {!stats.halftime && (
          <p className="section__foot">
            Esta liga não publica o placar do intervalo, por isso não há dados de 1º tempo.
          </p>
        )}
      </section>

      <section className="section" id="handicap" aria-label="Handicap asiático">
        <div className="sechead">
          <h2 className="sechead__title">Handicap asiático</h2>
          <span className="sechead__note">
            linhas na perspectiva de <b className="sechead__who sechead__who--a">{playerA}</b>
          </span>
        </div>
        <HandicapTable lines={stats.asian} prefix="ah" sample={sample} probe={probe} />

        {stats.halftime && (
          <>
            <div className="sechead sechead--sub">
              <h3 className="sechead__subtitle">1º tempo</h3>
              <span className="sechead__note">{stats.halftime.sample} partidas com placar do intervalo</span>
            </div>
            <HandicapTable
              lines={stats.halftime.asian}
              prefix="hah"
              sample={stats.halftime.sample}
              probe={probe}
            />
          </>
        )}
      </section>
    </>
  );
}
