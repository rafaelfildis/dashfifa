import { insightsOf, sampleLevel } from '../lib/derive';
import { dayMonth } from '../lib/format';
import type { H2HResult } from '../types';

const SEGMENTS = [0, 1, 2, 3, 4];

/**
 * Quanto dado existe por trás das frequências. Contextualiza o volume da
 * amostra — não conclui nada sobre os números em si.
 */
export function SampleCard({ result }: { result: H2HResult }) {
  const { stats } = result;
  const level = sampleLevel(stats.sample);

  return (
    <div className={`gauge gauge--${level.tone}`}>
      <div className="panel__label">Amostra H2H</div>
      <div className="gauge__head">
        <span className="gauge__count num">{stats.sample}</span>
        <span className="gauge__unit">partidas</span>
      </div>
      <div className="gauge__meter" role="img" aria-label={`${level.label}: ${level.filled} de 5`}>
        {SEGMENTS.map((i) => (
          <span key={i} className={`gauge__seg${i < level.filled ? ' gauge__seg--on' : ''}`} />
        ))}
      </div>
      <div className="gauge__verdict">
        <span aria-hidden="true">{level.tone === 'good' ? '✓' : '⚠'}</span> {level.label}
      </div>
      <p className="gauge__note">{level.note}</p>
      {stats.from && stats.to && (
        <div className="gauge__window num">
          Janela: {dayMonth(stats.from)} → {dayMonth(stats.to)}
        </div>
      )}
    </div>
  );
}

/** Seis fatos do confronto, todos derivados dos mesmos placares. */
export function InsightsCard({ result }: { result: H2HResult }) {
  return (
    <div className="panel panel--grow">
      <div className="panel__label">Insights do confronto</div>
      <div className="insights">
        {insightsOf(result).map((row) => (
          <div key={row.label} className="insight">
            <span className="insight__label">{row.label}</span>
            <span className="insight__figures">
              <span className="insight__value num">{row.value}</span>
              <span className="insight__sub num">{row.sub}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
