import { useEffect, useState } from 'react';
import './App.css';
import { H2HPage } from './components/H2HPage';
import { LeagueSelect } from './components/LeagueSelect';
import { fetchLeagues } from './lib/api';
import type { League } from './types';

export default function App() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selected, setSelected] = useState<League | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetchLeagues()
        .then((list) => !cancelled && setLeagues(list))
        .catch((err) => !cancelled && setError(err.message));
    }

    load();
    // Counts fill in as the backfill lands, so keep the landing page honest.
    const poll = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  return (
    <div className="shell">
      <nav className="brand">
        <button className="brand__mark" onClick={() => setSelected(null)}>
          dashfifa
        </button>
      </nav>

      <main className="shell__main">
        {error && <p className="notice notice--warn">{error}</p>}
        {!error && leagues.length === 0 && <p className="notice">Carregando ligas…</p>}

        {selected ? (
          <H2HPage league={selected} onBack={() => setSelected(null)} />
        ) : (
          leagues.length > 0 && <LeagueSelect leagues={leagues} onPick={setSelected} />
        )}
      </main>
    </div>
  );
}
