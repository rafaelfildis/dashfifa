# dashfifa

Dashboard de e-soccer: jogos ao vivo e comparação Head-to-Head entre jogadores,
agregando dados de três fontes:

- [ESportsBattle](https://football.esportsbattle.com/) — E-Soccer Battle (8min) e Battle Volta (6min)
- [GT Leagues](https://www.gtleagues.com/) (12min)
- [H2H GG League](https://h2hggl.com/) (8min)

## Arquitetura

- `src/` — frontend React + TypeScript (Vite)
- `server/` — backend Express que busca e normaliza os dados das três fontes
  (necessário porque ESportsBattle e H2H GG League não liberam CORS para
  chamadas diretas do navegador)

O frontend consome apenas `/api/*`, que o Vite faz proxy para o backend em
desenvolvimento (`vite.config.ts`).

## Rodando localmente

Backend (porta 3001):

```bash
cd server
npm install
npm run dev
```

Frontend (porta 5173):

```bash
npm install
npm run dev
```

## Head-to-Head

- **H2H GG League**: usa a API nativa de pareamento da própria plataforma —
  estatísticas completas de qualquer par de jogadores.
- **E-Soccer Battle, Battle Volta, GT Leagues**: essas fontes não expõem um
  endpoint de H2H por jogador, então o backend acumula um histórico próprio
  a partir dos jogos observados desde que o servidor está rodando. A precisão
  cresce com o tempo de execução do servidor.
