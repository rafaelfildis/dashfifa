import { useState } from 'react';
import './App.css';
import { LeagueBoard } from './components/LeagueBoard';
import { H2HView } from './components/H2HView';

type Tab = 'live' | 'h2h';

function App() {
  const [tab, setTab] = useState<Tab>('live');

  return (
    <div className="app">
      <header className="app__header">
        <h1>dashfifa</h1>
        <nav className="app__tabs">
          <button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>
            Jogos
          </button>
          <button className={tab === 'h2h' ? 'active' : ''} onClick={() => setTab('h2h')}>
            Head to Head
          </button>
        </nav>
      </header>
      <main className="app__main">
        {tab === 'live' ? <LeagueBoard /> : <H2HView />}
      </main>
    </div>
  );
}

export default App;
