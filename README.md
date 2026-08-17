# dashfifa

Compara dois jogadores de e-soccer frente a frente, usando o histórico real de
partidas de quatro ligas:

| Liga | Duração | Fonte |
| --- | --- | --- |
| E-Soccer Battle | 8 min | football.esportsbattle.com |
| E-Soccer GT Leagues | 12 min | gtleagues.com |
| E-Soccer H2H GG League | 8 min | h2hggl.com |
| E-Soccer Battle Volta | 6 min | football.esportsbattle.com |

## Como funciona

A tela inicial mostra as quatro ligas. Ao escolher uma, você seleciona dois
jogadores e, opcionalmente, o time de cada um:

- **sem escolher os times** — mostra os últimos 10 confrontos entre os dois, com
  qualquer time;
- **escolhendo os times** — mostra só os confrontos naquela combinação de times.

A lista mostra os últimos 15 confrontos. O agregado sempre considera **todos** os
confrontos encontrados, não apenas os exibidos.

### Estatísticas

Acima da lista ficam a média de gols por confronto (janelas de 5, 10, 15 e todos)
e um painel de mercados, montado a partir dos mesmos mercados que as casas
listam para estas ligas:

| Bloco | O que mostra |
| --- | --- |
| Resultado final | frequência de vitória de cada um e de empate (1X2) |
| Empate anula | vitórias desconsiderando empates (handicap 0.0) |
| Handicap asiático | linhas de -1.5 a +1.5, incluindo quartos |
| Total de gols | "mais de" e "menos de", linhas de 2.5 a 7.5 |
| Gols de cada jogador | "mais de" e "menos de", linhas de 0.5 a 4.5 |
| 1º tempo | handicap e total de gols no intervalo |
| Ambas marcam | frequência de os dois marcarem |

Cada linha traz a frequência observada e a **odd justa** (1 ÷ frequência, sem
margem da casa). São frequências históricas daquele confronto, não previsões —
quando a amostra tem menos de 10 jogos, a interface avisa.

**Handicap asiático.** As linhas quebradas usam a notação da própria casa
(`+0.25` aparece como `0.0, +0.5`) e a liquidação é a real: meia-vitória e
meia-derrota contam metade, e as linhas anuladas saem da conta em vez de
contarem como derrota. O retrospecto completo de cada linha fica no title da
linha.

**Cada um na liga inteira.** Como o confronto direto costuma ter poucos jogos,
o painel também traz o retrospecto de cada jogador na liga toda — normalmente
centenas de partidas — para servir de referência quando a amostra do par é fina.

**Comparar odds da casa.** O botão no cabeçalho revela um campo por linha: ao
digitar a odd ofertada, o painel calcula o valor esperado (`freq × odd − 1`).
Positivo significa que a casa está pagando acima do que o histórico sustenta.

O bloco de 1º tempo só aparece em Battle e Battle Volta: o ESportsBattle publica
o placar do intervalo (`prevPeriodsScores`), GT Leagues e H2H GG não.

## Publicação (GitHub Pages)

O Pages serve só arquivos estáticos, e duas das três fontes bloqueiam CORS — o
backend não pode rodar lá. Por isso o build **embarca um snapshot**: o workflow
`.github/workflows/pages.yml` roda o backfill, exporta um arquivo compacto por
liga em `public/data/` (2,4 MB no total, ~560 KB comprimidos) e publica.

O site publicado calcula tudo no navegador a partir desse snapshot, usando o
mesmo módulo `shared/` do servidor — os números são idênticos aos do modo local.
O cabeçalho mostra a data do snapshot, e o workflow o regenera todo dia às 06:10
UTC, além de a cada push na `main`.

**Para ativar na primeira vez:** em *Settings → Pages*, defina *Source* como
**GitHub Actions**. Sem isso o job de deploy falha.

Modo dos dados: `npm run dev` usa o backend local (ao vivo) e `npm run build`
usa o snapshot. `VITE_DATA_MODE=server|static` força um dos dois.

## Arquitetura

- `src/` — frontend React + TypeScript (Vite)
- `server/` — backend Express que busca, normaliza e mantém em cache o histórico
  das três plataformas
- `shared/` — tipos, cálculo de estatísticas e do head-to-head, usados pelo
  servidor e pelo navegador, para que os dois caminhos não divirjam

O backend existe porque duas das três fontes não liberam CORS para chamadas
diretas do navegador, e porque nenhuma delas oferece um endpoint de confronto
direto entre dois jogadores arbitrários — isso é calculado aqui.

### Histórico

O servidor mantém uma janela de **45 dias** de cada fonte (`HISTORY_DAYS` para
mudar) em `server/data/history.json`, ignorado pelo git. São cerca de 80 mil
partidas, o que dá dezenas a centenas de confrontos por par de jogadores — o
suficiente para as frequências pararem de oscilar.

O backfill é **incremental**: cada dia e cada torneio já baixado por inteiro
fica marcado como concluído e não é buscado de novo. Só as últimas 36 horas são
sempre relidas, porque ainda há partidas terminando. Na prática, a primeira
carga leva alguns minutos e as seguintes, menos de um minuto. As estatísticas
usam todos os confrontos da janela, não uma amostra recente.

Cada fonte tem um caminho próprio para histórico:

- **ESportsBattle** — lista torneios por período (`/api/tournaments?dateFrom=…`) e
  busca as partidas de cada um. Torneios cujo nome começa com "Volta" viram a
  liga Battle Volta.
- **GT Leagues** — `/api/fixtures` com intervalo de datas, paginado de 200 em 200.
  O edge deles responde 451 sem cabeçalhos de navegador, então eles são enviados.
- **H2H GG League** — `/v1/schedule/fifa?date=…`, um dia por requisição.

## Rodando localmente

Backend (porta 3001):

```bash
cd server && npm install && npm run dev
```

Frontend (porta 5173):

```bash
npm install && npm run dev
```

O Vite faz proxy de `/api` para o backend, então basta abrir
`http://localhost:5173`.
