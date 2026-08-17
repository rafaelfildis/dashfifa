import { decimal, pct, signedDecimal } from '../lib/format';
import type { PlayerBaseline } from '../types';

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function Profile({ baseline, side }: { baseline: PlayerBaseline; side: 'a' | 'b' }) {
  const diff = baseline.avgFor - baseline.avgAgainst;
  // O que sobra depois de vitórias e empates. Derrotas não vêm do backend.
  const lossPct = round1(Math.max(0, 100 - baseline.winPct - baseline.drawPct));

  return (
    <div className="profile">
      <div className="profile__head">
        <span className={`profile__name profile__name--${side}`}>{baseline.player}</span>
        <span className="profile__games num">
          <b>{baseline.matches}</b> jogos
        </span>
      </div>

      <div className="profile__metrics">
        <div>
          <div className="profile__label">Marca</div>
          <div className="profile__value num">{decimal(baseline.avgFor)}</div>
          <div className="profile__unit">gols/jogo</div>
        </div>
        <div>
          <div className="profile__label">Sofre</div>
          <div className="profile__value num">{decimal(baseline.avgAgainst)}</div>
          <div className="profile__unit">gols/jogo</div>
        </div>
        <div>
          <div className="profile__label">Saldo</div>
          <div className={`profile__value num${diff > 0 ? ' profile__value--good' : ''}`}>
            {signedDecimal(diff)}
          </div>
          <div className="profile__unit">por jogo</div>
        </div>
      </div>

      <div className="profile__record">
        <div
          className={`track track--record track--${side}`}
          role="img"
          aria-label={`${pct(baseline.winPct)} de vitórias, ${pct(baseline.drawPct)} de empates, ${pct(lossPct)} de derrotas`}
        >
          <div className="track__seg track__seg--win" style={{ width: `${baseline.winPct}%` }} />
          <div className="track__seg track__seg--draw" style={{ width: `${baseline.drawPct}%` }} />
          <div className="track__seg track__seg--loss" style={{ width: `${lossPct}%` }} />
        </div>
        <div className="profile__legend num">
          <span className="profile__legend-win">{pct(baseline.winPct)} vitórias</span>
          <span>{pct(baseline.drawPct)} empates</span>
          <span>{pct(lossPct)} derrotas</span>
        </div>
      </div>
    </div>
  );
}

/**
 * O confronto direto costuma ter poucos jogos; a liga inteira traz centenas.
 * Este bloco continua visível mesmo quando o par nunca se enfrentou.
 */
export function LeaguePerformance({ a, b }: { a: PlayerBaseline; b: PlayerBaseline }) {
  return (
    <section className="section" aria-label="Performance geral na liga">
      <div className="sechead">
        <h2 className="sechead__title">Performance geral na liga</h2>
        <span className="sechead__note">amostra muito maior que a do confronto direto</span>
      </div>
      <div className="profiles">
        <Profile baseline={a} side="a" />
        <Profile baseline={b} side="b" />
      </div>
    </section>
  );
}
