import { Combo } from './Combo';
import type { NamedCount } from '../types';

interface Props {
  players: NamedCount[];
  teamsA: NamedCount[];
  teamsB: NamedCount[];
  playerA: string;
  playerB: string;
  teamA: string;
  teamB: string;
  onPlayer: (side: 'a' | 'b', name: string) => void;
  onTeam: (side: 'a' | 'b', name: string) => void;
  onSwap: () => void;
}

/** As duas colunas são espelhadas: o nome de cada jogador fica na borda externa. */
export function MatchupPicker({
  players,
  teamsA,
  teamsB,
  playerA,
  playerB,
  teamA,
  teamB,
  onPlayer,
  onTeam,
  onSwap,
}: Props) {
  return (
    <section className="picker" aria-label="Seleção de jogadores">
      <div className="picker__side picker__side--a">
        <span className="picker__label picker__label--a">Jogador A</span>
        <Combo
          side="a"
          variant="player"
          label="Jogador A"
          value={playerA}
          options={players}
          emptyLabel="Escolher jogador"
          onChange={(name) => onPlayer('a', name)}
        />
        <Combo
          side="a"
          variant="team"
          label="Time do jogador A"
          value={teamA}
          options={teamsA}
          emptyLabel="Qualquer time"
          clearable
          onChange={(name) => onTeam('a', name)}
        />
      </div>

      <div className="picker__mid">
        <span className="picker__vs num">VS</span>
        <button
          type="button"
          className="picker__swap"
          aria-label="Trocar jogadores de lado"
          onClick={onSwap}
        >
          <span aria-hidden="true">⇄</span>
        </button>
        <span className="picker__swap-caption">trocar</span>
      </div>

      <div className="picker__side picker__side--b">
        <span className="picker__label picker__label--b">Jogador B</span>
        <Combo
          side="b"
          variant="player"
          label="Jogador B"
          value={playerB}
          options={players}
          emptyLabel="Escolher jogador"
          onChange={(name) => onPlayer('b', name)}
        />
        <Combo
          side="b"
          variant="team"
          label="Time do jogador B"
          value={teamB}
          options={teamsB}
          emptyLabel="Qualquer time"
          clearable
          onChange={(name) => onTeam('b', name)}
        />
      </div>
    </section>
  );
}
