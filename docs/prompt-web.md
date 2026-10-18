# Prompt: versão web do FutStatis

> Cole tudo abaixo da linha no Claude, dentro da pasta vazia do projeto web.
> Antes, copie para essa pasta o arquivo `docs/API.md` do backend (`App-Futebol_BackEnd/docs/API.md`)
> e, se quiser, a pasta `src/config` e `src/utils` do app (o prompt explica o que são).

---

Você vai criar a **versão web do FutStatis**, um app de futebol que já existe em React Native (Expo). A web precisa ter **as mesmas telas e funcionalidades do app**, com o mesmo visual (tema escuro), funcionando bem no celular (iPhone no Safari é o público principal) e no computador. Leia este documento inteiro antes de começar e siga a ordem de trabalho do final.

## 1. Stack e regras gerais

- **Next.js 14+ (App Router) + TypeScript + Tailwind CSS**, gerando site **estático** (`output: 'export'`) para hospedar em Vercel/Netlify/GitHub Pages. Toda a busca de dados é no navegador (client components), não use API routes nem server actions.
- **Mobile first.** Largura de referência 390px (iPhone). No computador, centralize o conteúdo numa coluna de no máximo 520px, como um app.
- **PWA:** `manifest.json` (nome "FutStatis", tema `#0b1120`, ícones) e meta tags da Apple (`apple-mobile-web-app-capable`, `apple-touch-icon`) para o usuário do iPhone poder "Adicionar à Tela de Início" e abrir como app.
- Textos da interface em **português do Brasil**. Datas e horas no fuso do aparelho, formato pt-BR.
- Código: componentes pequenos, sem lógica duplicada. Tudo que muda de liga para liga vem de um **cadastro único de ligas** (seção 5). Nunca escreva `if (league === 'CLI')` nas telas.
- Rode `npm run build` e `npx tsc --noEmit` ao fim de cada etapa; não avance com erro.

## 2. API

A documentação completa está em `API.md` (copiado para a raiz). Pontos essenciais:

- **URL base:** `https://futapp-r38z.onrender.com`. Coloque em `NEXT_PUBLIC_API_URL` com esse valor padrão. Tela escondida de configuração permite trocar a URL (salva no `localStorage`).
- **Tudo é JSON**, chaves em `snake_case`. Erro: `{ "error": "mensagem" }`. Lista vazia é `[]`.
- **CORS:** o backend já libera chamadas de navegador (preflight `OPTIONS` respondido sem token, `Authorization` e `Content-Type` liberados, header `X-Cache` legível). Se mesmo assim aparecer erro de CORS no console, PARE e avise: provavelmente o deploy do backend com o CORS ainda não foi feito, ou `CORS_ALLOWED_ORIGINS` no servidor não inclui o domínio do site. Não tente contornar com proxy.

### 2.1 Autenticação

- Todas as rotas (menos `/auth/*`) exigem `Authorization: Bearer <token>`.
- **Convidado:** ao abrir o site, se não houver token, `POST /auth/guest` com `{ "device_id": "<uuid>" }`. Gere o `device_id` uma vez (`crypto.randomUUID()`) e guarde no `localStorage`. O token vale 30 dias; guarde no `localStorage` (`jwt_token`).
- Várias requisições ao mesmo tempo sem token devem **compartilhar uma única** chamada a `/auth/guest` (guarde a Promise em andamento).
- Em **401**: gere novo token de convidado e repita a requisição uma vez.
- **Admin:** `POST /auth/login` `{ email, password }` → `{ token, role: "admin" }` (7 dias). Com admin logado, use o token de admin em todas as rotas. Se der 401 com ele: apague, volte ao convidado e avise "Sessão de admin expirada". Logout = apagar o token (não há rota). Nunca guarde a senha.
- As rotas `/push/*` usam sempre o token de convidado (na web não haverá push, ver seção 9).

### 2.2 Cliente HTTP (`lib/api.ts`)

Implemente um `fetchApi(endpoint, options, { onCached })` usado por todas as telas:

1. **Tempo limite** de 15 s com `AbortController`.
2. **GET** com erro de rede/tempo esgotado: tenta de novo após 1,5 s. POST/DELETE não repetem.
3. **Cache local** de respostas GET OK (no `localStorage`, chave = caminho + parâmetros, ignorando `nocache`, `update`, `force_update`): máximo 50 respostas (apaga as mais antigas), descarta com mais de 7 dias, não guarda respostas > ~1 MB, nem `/push/*`, `/auth/*`, `/admin/*`, nem pedidos com token de admin. De `/players` guarde só a última liga.
4. **"Mostra o que tem e atualiza por trás":** se `onCached` for passado e houver cópia, chame `onCached(dados)` na hora; a resposta da rede chega depois como retorno normal.
5. **Sem rede:** devolva a cópia guardada e mostre um aviso discreto "Sem conexão: dados das 21:40".
6. **Aviso de erro único**, no rodapé: para o visitante, "Sem conexão. Verifique sua internet." que some em 4 s; para o admin, um cartão com a lista das rotas que falharam (agrupadas por rota, com contador). Nunca use `alert()` por requisição.
7. As respostas de erro podem vir com `Content-Type` errado: leia o texto e faça `JSON.parse` com try/catch.

### 2.3 Datas

As datas vêm como `"2026-10-15 00:30:00+00"`, ISO com `Z`, ou sem fuso (tratar como UTC). Crie `parseMatchDate()` que troca o espaço por `T`, converte `+00`/`+0000` em `+00:00` e acrescenta `Z` quando não houver fuso **só se houver horário** (em `"2026-10-04"` o `-04` é o dia). Use essa função em todo lugar; nunca `new Date(string)` direto.

### 2.4 Campos importantes dos jogos

- `id_event`: ID da ESPN, usado para abrir os detalhes (`/match/history?id=`). Vem `"0"` em jogos futuros sem vínculo: trate `"0"` como vazio.
- `match_id`: ID do banco, estável, usado para seguir jogos.
- Rota da tela do jogo: `/jogo/<id_event ou match_id>?league=&date=&espn_home=&espn_away=&match_id=`.
- Status: encerrado = `FINISHED`/`post`; ao vivo = `in`. `winner`: `HOME_TEAM`, `AWAY_TEAM`, `DRAW` ou vazio.
- Pênaltis (`home_penalty`/`away_penalty`, só quando houve): exiba **"1 (4) - (3) 1"** com os pênaltis em amarelo.
- Time indefinido no mata-mata (ID 0, nome vazio): mostre **"A definir"**.

## 3. Visual

Tema escuro igual ao app:

- Fundo `#0b1120` (telas) / `#060a11`; cards `#111827` e `#1e293b`; bordas `#1f2937`/`#334155`.
- Texto `#f8fafc`; secundário `#94a3b8`; apagado `#64748b`.
- Azul de destaque `#3b82f6`; ao vivo `#ef4444`; amarelo `#eab308`/`#facc15`.
- Resultado V/E/D: verde `#16a34a`, cinza `#64748b`, vermelho `#ef4444`.
- Cores das zonas: classificado `#eab308`, playoff/pré `#f97316`, melhor 3º `#8b5cf6`, secundária (Sul-Americana/Conference) `#06b6d4`, eliminado/rebaixamento `#ef4444`, acesso `#22c55e`.
- Ícones: `lucide-react`. Escudos e logos com `<img loading="lazy">` (sem `next/image`, o export estático não otimiza).
- Carregamento com **skeletons** (blocos cinza pulsando), nunca tela em branco.
- Abas e botões no estilo "pílula"; seletores suspensos que abrem uma **folha de baixo** (bottom sheet) com opções marcáveis (radio).

## 4. Rotas do site

| Rota | Tela |
|---|---|
| `/` | Home (Ao Vivo / Todos Jogos) |
| `/liga/[codigo]` | Liga |
| `/time/[id]` | Time (id = `api_id`) |
| `/jogo/[id]` | Jogo |
| `/jogador/[id]` | Jogador |
| `/busca` | Busca |
| `/minhas-ligas` | Favoritos e configurações |
| `/admin` | Admin (escondida) |
| `/servidor` | Trocar URL da API (escondida) |

Como é export estático, rotas dinâmicas precisam funcionar só no cliente: use páginas com parâmetros de busca (ex: `/jogo?id=...`) **ou** `generateStaticParams` vazio com fallback de cliente. Escolha a opção que funcione em hospedagem estática e documente no README.

## 5. Cadastro único de ligas (`config/leagues.ts`)

Copie exatamente este cadastro. As telas leem daqui: nome, ícone, se é copa, fases, chaveamento, legenda.

```ts
export type LegendItem = { color: string; label: string };
export type PhaseConfig = {
  key: string;          // valor de stage (e de round=<FASE> em /matches)
  label: string;
  rounds?: number;      // fase com rodadas numeradas 1..N: mostra "Rodada N"
  fetchByRound?: boolean; // busca com stage=<FASE>&round=N, uma rodada por vez
};
export type LeagueConfig = {
  code: string; name: string; icon: string;
  isCup?: boolean;             // copa: grupos + mata-mata
  phases?: PhaseConfig[];      // aba Jogos navega por fase em vez de por data/rodada
  bracketRounds?: Partial<Record<'LAST_16'|'QUARTER_FINALS'|'SEMI_FINALS'|'FINAL', string>>;
  twoLeggedTies?: boolean;     // ida e volta viram um card só no chaveamento
  hasLast32?: boolean;         // padrão: sim, para copas
  cupLegend?: LegendItem[];
  hasStandings?: boolean;      // padrão: sim (Copa do Brasil não tem)
  leagueLegend?: LegendItem[]; // legenda própria de pontos corridos
};

export const ZONE_COLORS = { qualified: '#eab308', playoff: '#f97316', bestThird: '#8b5cf6',
  secondary: '#06b6d4', eliminated: '#ef4444', promotion: '#22c55e' };

// Atenção ao acento: "Pré-Libertadores" e "Playoffs (pré-oitavas)" têm "pré"
export const getZoneColor = (zone: unknown) => {
  const z = String(zone || '').toLowerCase();
  if (z.includes('acesso')) return ZONE_COLORS.promotion;
  if (z.includes('playoff') || z.includes('pre') || z.includes('pré') || z.includes('europa')) return ZONE_COLORS.playoff;
  if (z.includes('libertadores') || z.includes('champions') || z.includes('oitavas')) return ZONE_COLORS.qualified;
  if (z.includes('sul') || z.includes('conference')) return ZONE_COLORS.secondary;
  if (z.includes('rebaixamento') || z.includes('reb')) return ZONE_COLORS.eliminated;
  if (z.includes('melhor 3')) return ZONE_COLORS.bestThird;
  if (z.includes('elimin')) return ZONE_COLORS.eliminated;
  return 'transparent';
};

const KO = { qf: { key: 'QUARTER_FINALS', label: 'Quartas de final' }, sf: { key: 'SEMI_FINALS', label: 'Semifinal' }, f: { key: 'FINAL', label: 'Final' } };

export const LEAGUES: LeagueConfig[] = [
  { code: 'BSA', name: 'Brasileirão - Série A', icon: '🇧🇷' },
  { code: 'BSB', name: 'Brasileirão - Série B', icon: '🇧🇷', leagueLegend: [
    { color: ZONE_COLORS.promotion, label: 'Acesso à Série A' }, { color: ZONE_COLORS.eliminated, label: 'Rebaixamento' } ] },
  { code: 'PL', name: 'Premier League', icon: '🏴' },
  { code: 'PD', name: 'La Liga', icon: '🇪🇸' },
  { code: 'BL1', name: 'Bundesliga', icon: '🇩🇪' },
  { code: 'SA', name: 'Serie A (Itália)', icon: '🇮🇹' },
  { code: 'FL1', name: 'Ligue 1', icon: '🇫🇷' },
  { code: 'CL', name: 'Champions League', icon: '⭐', isCup: true, twoLeggedTies: true, hasLast32: false,
    phases: [ { key: 'LEAGUE_STAGE', label: 'Fase de Liga', rounds: 8, fetchByRound: true },
      { key: 'PLAYOFFS', label: 'Playoffs' }, { key: 'LAST_16', label: 'Oitavas de final' }, KO.qf, KO.sf, KO.f ],
    cupLegend: [ { color: ZONE_COLORS.qualified, label: 'Oitavas' }, { color: ZONE_COLORS.playoff, label: 'Playoffs' },
      { color: ZONE_COLORS.eliminated, label: 'Eliminado' } ] },
  { code: 'WC', name: 'Copa do Mundo', icon: '🏆', isCup: true },
  { code: 'UNL', name: 'Liga das Nações UEFA', icon: '🇪🇺', isCup: true },
  { code: 'CLI', name: 'Copa Libertadores', icon: '🌎', isCup: true, twoLeggedTies: true, hasLast32: false,
    bracketRounds: { LAST_16: 'PLAY_OFFS' },
    phases: [ { key: 'ROUND_1', label: 'Primeira Fase' }, { key: 'ROUND_2', label: 'Segunda Fase' },
      { key: 'ROUND_3', label: 'Terceira Fase' }, { key: 'GROUP_STAGE', label: 'Fase de Grupos', rounds: 6 },
      { key: 'PLAY_OFFS', label: 'Oitavas de final' }, KO.qf, KO.sf, KO.f ],
    cupLegend: [ { color: ZONE_COLORS.qualified, label: 'Oitavas' }, { color: ZONE_COLORS.secondary, label: 'Sul-Americana' },
      { color: ZONE_COLORS.eliminated, label: 'Eliminado' } ] },
  { code: 'CSU', name: 'Copa Sul-Americana', icon: '🌎', isCup: true, twoLeggedTies: true, hasLast32: false,
    phases: [ { key: 'ROUND_1', label: 'Primeira Fase' }, { key: 'GROUP_STAGE', label: 'Fase de Grupos' },
      { key: 'PLAYOFFS', label: 'Playoffs' }, { key: 'LAST_16', label: 'Oitavas de final' }, KO.qf, KO.sf, KO.f ],
    cupLegend: [ { color: ZONE_COLORS.qualified, label: 'Oitavas' }, { color: ZONE_COLORS.playoff, label: 'Playoffs' },
      { color: ZONE_COLORS.eliminated, label: 'Eliminado' } ] },
  { code: 'CDB', name: 'Copa do Brasil', icon: '🏆', isCup: true, hasStandings: false, twoLeggedTies: true, hasLast32: false,
    phases: [ { key: 'ROUND_1', label: '1ª Fase' }, { key: 'ROUND_2', label: '2ª Fase' }, { key: 'ROUND_3', label: '3ª Fase' },
      { key: 'ROUND_4', label: '4ª Fase' }, { key: 'ROUND_5', label: '5ª Fase' }, { key: 'LAST_16', label: 'Oitavas de final' },
      KO.qf, KO.sf, KO.f ] },
];
```

Funções auxiliares: `getLeague(code)`, `isCupLeague`, `isTableStage(stage)` (`GROUP_STAGE` ou `LEAGUE_STAGE`), `getTableLabel(code)` ("Fase de Liga" se tiver `LEAGUE_STAGE`, senão "Grupos"), `getCupLegend` (padrão: Classificado / Melhor 3º / Eliminado), `hasLast32`, `hasStandingsTable`, `getBracketRounds` (padrão `LAST_16`, `QUARTER_FINALS`, `SEMI_FINALS`, `FINAL` + o `bracketRounds` da liga).

Liga que não está no cadastro (ex: `FL1` vindo da busca antes de cadastrar) funciona como pontos corridos, com o nome que a API mandar.

## 6. Regras de jogos (`lib/matches.ts`)

- **Ida e volta → um card** (`collapseTwoLeggedTies`): agrupe por par de times (ignorando a ordem; time com ID 0 fica sozinho). Placar = agregado do ponto de vista do mandante da ida. **Quem avança**, só com os dois jogos encerrados: (1) agregado; (2) se empatar, pênaltis; (3) senão, o `winner` do jogo de volta (com pênaltis, o `winner` é quem avançou, mesmo tendo perdido a partida). Sem nada disso (`DRAW`/vazio): "Pênaltis: a definir". Final de jogo único empatada e sem pênaltis: idem.
- **Agregado no jogo de volta** (`getAggregateScore`): na lista de jogos do mata-mata, o jogo de volta mostra "Agregado 2-1".
- **Ida/volta** na tela do time: procure o outro jogo do confronto (times invertidos, mesma fase) e marque "Jogo de ida"/"Jogo de volta".

### 6.1 Classificação ao vivo (`hooks/useLiveStandings.ts` + componentes)

Usada nas três tabelas (liga, time e jogo):

- `GET /standings?league=X&live=true` devolve a tabela **como estaria se os jogos em andamento acabassem agora** (cache de 20 s no servidor), no mesmo formato da `/standings`, com dois campos que **só aparecem quando valem**: `"live": true` (o time está jogando agora) e `"position_change": 2` (posições ganhas; negativo = perdidas, em relação à tabela antes dos jogos em andamento). Sem o campo: `false` / `0`.
- Ao abrir a tabela, faça **uma consulta** com `live=true` só para saber se algum time está jogando. Se nenhum vier com `live`, **esconda o botão** e mostre a tabela normal.
- Com time jogando, mostre o botão **"Ao vivo"** (pílula com borda vermelha e um ponto vermelho). Ligado: a tabela passa a usar os dados `live=true`, recarrega a cada **30 s** e o pull-to-refresh recarrega os dois. Quando a resposta vier sem nenhum `live` (os jogos acabaram), desligue sozinho e esconda o botão.
- Na linha do time, ao lado do nome: **ponto vermelho piscando** se `live`; seta **▲ verde** ou **▼ vermelha** com o número se `position_change` ≠ 0.
- Só na **temporada atual** (temporada antiga não tem jogo ao vivo) e só onde há classificação (a CDB devolve `[]`).
- A `/standings` normal também conta os jogos em andamento, mas só é recalculada a cada ~10 min e não traz as marcações; por isso o botão troca a fonte de dados.

## 7. Telas

### 7.1 Home `/`

- Cabeçalho: logo **"FutStatis"** (tocar 7 vezes abre `/admin`), botões de calendário, Minhas Ligas e busca. Selo **"Modo admin"** quando logado.
- Abas **AO VIVO** e **TODOS JOGOS**.
- Para cada liga favorita: AO VIVO = `GET /matches/live?league=X` (filtra `state === 'in'`); TODOS JOGOS = `GET /matches?league=X&date=YYYY-MM-DD`.
- Lista agrupada por **dia** e, dentro do dia, por **liga** (card com logo, nome e a fase/rodada: "Brasileirão - Série A • Rodada 30"; ligas com fases usam o nome da fase do cadastro, com "• Rodada N" só se a fase tiver `rounds`). **Ordem:** jogos de cada liga por horário; ligas pelo horário do primeiro jogo (empate: alfabético).
- Card do jogo: mandante (nome + escudo), centro (placar com "Encerrado", ou horário, ou placar vermelho + minuto se ao vivo), visitante. Vencedor com `*` amarelo. Selo "Fase de Grupos • Grupo A" quando houver grupo.
- Rolar até o fim carrega o dia seguinte; puxar/botão no topo carrega o anterior. Calendário (`/matches/calendar?leagues=BSA,PL&month=MM&year=YYYY` → contagem por dia) para pular para uma data.
- AO VIVO sem jogos: estado vazio com botão "Ver Todos os Jogos" (e, na primeira abertura, troca sozinho para TODOS JOGOS). Atualiza a cada **30 s** só enquanto houver jogo ao vivo.
- Abre na hora com a cópia guardada (menos a aba AO VIVO, porque um jogo guardado como ao vivo pode já ter acabado).

### 7.2 Liga `/liga/[codigo]`

- Cabeçalho: logo, nome, **seletor de temporada** (`/seasons?league=X`, a mais recente selecionada) e estrela de seguir (na web, esconda ou desabilite; ver seção 9). O `/seasons` lista também as temporadas antigas (ex: Brasileirão, Serie A, Ligue 1 e Libertadores de 2023 a 2026; Premier League, La Liga, Bundesliga e Champions de 2023-24 a 2026-27), então o seletor precisa funcionar de verdade: ao trocar, recarregue jogos, classificação e estatísticas com `&season=`.
- Abas: **Jogos**, **Classificação** (ou **Mata-Mata** em copas) e **Estatísticas**.
- **Jogos – pontos corridos:** `/matches?league=X` traz a rodada atual; carregue rodadas vizinhas com `&round=N` ao rolar (pare quando vier vazio; ignore `round = 0`). Seções "Rodada N".
- **Jogos – ligas com `phases`:** busque todas as fases de uma vez (`round=<FASE>`, ou `stage=<FASE>&round=1..N` se `fetchByRound`). Seletor suspenso: "Todas as partidas", cada fase com o período ("15/2 - 27/2") e, em fases com `rounds`, as rodadas recuadas embaixo. Lista agrupada por dia, abrindo **no dia de hoje ou no próximo com jogo** (botão "Ver jogos anteriores" no topo, 5 dias por toque). Card com cabeçalho da fase ("Fase de Grupos • Grupo A • Rodada 3"), "Agregado X-Y" no jogo de volta, e "• Pênaltis: a definir" se empatado sem decisão.
- **Jogos – copas sem `phases`** (WC, UNL): navegação por data, como na home.
- **Classificação:** `/standings?league=X[&season=]`. Colunas: #, escudo, nome, P, J, V, SG e **Forma** (`form` "VVEDV" → bolinhas V verde/E cinza/D vermelha, a da direita é a mais recente; desenhe só as letras que vierem; esconda a coluna em telas < 360px). Faixa colorida à esquerda pela zona (`getZoneColor`). Agrupe por `group_name` (`GROUP_A` e `Group A` viram "Grupo A"); com `group_name` vazio é tabela única sem cabeçalho. Grupos recolhíveis. Legenda da copa embaixo. **Temporadas antigas vêm sem zonas** (`zone` vazio, porque as regras de vaga só estão cadastradas para a atual): mostre a tabela sem as cores e **sem a legenda**. Botão **"Ao vivo"** da seção 6.1 acima da tabela (só na temporada atual).
- **Mata-Mata (copas):** pílulas `getTableLabel` (se tiver classificação), "16 avos" (se `hasLast32`) e "Mata-Mata". Chaveamento horizontal: Oitavas → Quartas → Semifinal → **Final** no meio → Semifinal → Quartas → Oitavas, buscando `getBracketRounds` e juntando ida e volta (`twoLeggedTies`). Copa sem classificação (CDB) abre direto no chaveamento.
- **Estatísticas:** `/league/stats?league=X` → `top_scorers` e `top_assists`; pílulas Artilharia/Assistências; linha com posição, foto, nome, time e o número.

### 7.3 Time `/time/[id]`

- Cabeçalho: escudo, nome, estádio (`/details?api_id=X&type=team`), estrela de seguir.
- Abas: TEMPORADA (Jogos, Classificação) e ELENCO.
- **Jogos:** `GET /team/matches?id=X&rounds=0,1,2,...,40` (uma chamada só traz a temporada atual inteira; NÃO pagine por rodada: o backend mistura as competições pelo número da rodada). Ordene por data. Seletor **"Todas as competições"** (folha de baixo com as competições do time, com logo/ícone). Lista em **cards por competição** (jogos seguidos da mesma competição juntos, cabeçalho com nome que abre a liga). Acima de cada jogo: data ("Hoje", "Amanhã", "domingo, 11 de outubro") à esquerda; à direita a fase ("Rodada 30", "Grupo A • Rodada 3", "Semifinal • Jogo de ida") e a bolinha **V/E/D** do ponto de vista do time em jogos encerrados. Abre no **jogo atual** (último resultado + próximos); botão "Ver jogos anteriores" mostra mais 10.
- **Classificação:** mesmo seletor de competição (sem "Todas"), começando pela primeira liga de pontos corridos do time. Liga → tabela com o time destacado; copa → pílulas de grupos/mata-mata com o grupo do time aberto e os outros recolhidos; CDB → chaveamento. Botão **"Ao vivo"** (seção 6.1) para a competição escolhida.
- **Elenco:** `/team/players?teamID=X&league=<liga principal>`, agrupado por posição (Goleiros, Defensores, Meio-campistas, Atacantes), com foto, nome, nacionalidade e idade. Toque abre o jogador.

### 7.4 Jogo `/jogo/[id]`

- `GET /match/history?id=<id_event>&league=X` → `{ match, lineups, events, statistics }`. Se vier sem escalação, tente `/match_history_old?league=&date=YYYY-MM-DD&espn_home_team_id=&espn_away_team_id=`.
- Placar no topo: escudos e nomes (tocar abre o time), status ("Ao Vivo" em vermelho + **minuto**, "Encerrado", "Agendado"), placar com pênaltis "1 (4) - (3) 1". O minuto vem do parâmetro `clock` da lista e do `/matches/live` (o history não traz); não apague o minuto quando o history responder sem ele.
- Ao vivo: logo ao abrir e a cada **30 s**, busque em paralelo `/matches/live?league=X` (placar, minuto, status; ache o jogo pelo `match_id`, que lá é o ID da ESPN) e `/match/history` (estatísticas, eventos, pênaltis; não apague escalação/eventos se vierem vazios).
- Abas:
  - **Detalhes:** linha do tempo de eventos (gols, cartões, substituições), ignorando os eventos técnicos (`Start Delay`, `End Delay`, `Kickoff`, `Halftime`, `End Regular Time`, `End of Half`) e os sem minuto.
  - **Estatísticas:** uma linha por item de `statistics` (já vem na ordem e em português): número do mandante | rótulo | número do visitante, e barra dividida home/(home+away) (azul `#3b82f6` mandante, laranja `#f97316` visitante; os dois 0 → meio a meio). `unit: "%"` → "50,2%". Vírgula decimal. Lista vazia: "Estatísticas disponíveis quando o jogo começar".
  - **Escalação:** seletor do time; campo verde com os titulares posicionados pela formação e a lista de reservas.
  - **Confronto:** `/h2h?team1=<api_home_team_id>&team2=<api_away_team_id>&limit=10` (traz jogos de até 4 temporadas; funciona também para jogos futuros). Resumo "Flamengo 3 vitórias · 2 empates · 2 vitórias Palmeiras" com barra de três partes e "7 jogos · Gols 9 - 8"; lista dos jogos (data, competição, placar, vencedor em destaque). `played: 0` → "Primeiro confronto registrado". Falha de rede → "Não foi possível carregar" com "Tentar de novo".
  - **Classificação** (não aparece em liga sem classificação, como a CDB): tabela da liga com os dois times destacados e o grupo deles aberto, com o botão **"Ao vivo"** (seção 6.1): durante a partida é aqui que ele é mais útil.

### 7.5 Jogador `/jogador/[id]`

`/details?api_id=X&type=player`: foto, nome, time, posição em português (Goalkeeper → Goleiro etc.), nacionalidade, idade (de `date_of_birth`) e número.

### 7.6 Busca `/busca`

Campo com debounce de 500 ms, a partir de 2 letras. `GET /search?q=` → `{ leagues, teams, players }`. Seções **Ligas** (logo, nome do cadastro ou da API, "Temporada X"; abre a liga), **Times** (escudo, "Liga • Estádio"; abre o time) e **Jogadores** (foto, "Posição • Time"; abre o jogador). Estados: dica inicial, skeleton, "Nenhum resultado".

### 7.7 Minhas Ligas `/minhas-ligas`

Lista de todas as ligas do cadastro com marcação; salva no `localStorage`. Padrão para quem nunca escolheu: todas. Define as ligas da home.

### 7.8 Admin `/admin` (escondida)

- Login (e-mail, senha com botão de olho, botão desabilitado durante o envio, mensagem do campo `error` em 401/429).
- Logado: selo "Modo admin", botões com loading e o resultado de cada ação: `/admin/sync-daily`, `/admin/sync-teams`, `/admin/run-image-bot`; por liga (pílulas do cadastro): `/matches?update=true`, `/standings?update=true`, `/league/stats?update=true`, `/teams?update=true`, `/players?force_update=true`, `/admin/force-sync`; elenco ESPN `/team/players_espn?teamID=&league=`. Botão Sair.
- Com admin logado, o "puxar para atualizar"/botão de atualizar das telas de jogo, classificação e estatísticas envia o parâmetro de atualização (`update=true` / `force_update=true`). Convidado não envia.

## 8. Comportamentos que não podem faltar

- Chaves únicas nas listas (jogos sem ESPN vêm com `id_event "0"`: não use só isso como chave).
- Toda tela com estado de carregamento (skeleton), vazio e erro.
- Nada de requisição repetida em loop: efeitos com dependências corretas.
- Rolagem preservada ao voltar de uma tela (use links do Next e evite recarregar tudo ao voltar).
- Funcionar com internet ruim (cache + aviso) e no Safari do iPhone (teste `100dvh`, áreas seguras com `env(safe-area-inset-*)`, sem `hover` como única forma de interação).

## 9. Fora do escopo da web (por enquanto)

- **Notificações push** (estrelas de seguir): no app usam Expo. Na web, deixe as estrelas **escondidas** e crie o código de forma que dê para ligar depois (Web Push no iPhone só funciona com o site instalado na Tela de Início, iOS 16.4+). Quando for ligar, o comportamento do app é este (detalhes em `API.md`, "Notificações push"):
  - Seguir/deixar de seguir: `POST`/`DELETE /push/subscriptions` com `team_id`, `league`, `match_id` ou `espn_match_id`, sempre com o **token de convidado**; estrela muda na hora e desfaz se falhar; `409` = aparelho não registrado (registre e repita).
  - **Escolha de avisos por time/liga seguidos:** tipos `lineup` (Escalação), `start` (Início), `goal` (Gols), `red_card` (Cartão vermelho) e `end` (Fim de jogo); a lista oficial vem em `available_kinds` do `GET /push/subscriptions`, e `kinds` traz só as inscrições com escolha (`{"teams": {"1783": ["goal","end"]}, "leagues": {}, "matches": {}}`; quem não aparece recebe todos). Gravar: `POST /push/subscriptions` com o alvo e `"kinds": [...]`; a resposta devolve os `kinds` gravados. Todos marcados = padrão (mande a lista completa). Lista vazia dá 400: se o usuário desmarcar tudo, o botão vira **"Deixar de seguir"** (`DELETE`). Seguir de novo sem `kinds` mantém a escolha.
  - Na interface do app: um **sino** ao lado da estrela, que só aparece para o que já é seguido (preenchido em amarelo quando há escolha personalizada), abre uma folha de baixo "Avisos · Nome" com as 5 caixas de seleção, todas marcadas por padrão, e o botão "Salvar".
  - Tocar no aviso abre o jogo com os campos do `data` (`espn_match_id`, `league`, `date`, `espn_home`, `espn_away`, `match_id`); sem `espn_match_id`, abre a liga; `type: "test"` não abre nada. O tipo `red_card` (*"🟥 Cartão vermelho · Palmeiras"*) segue a mesma regra.
- Anúncios.

## 10. Ordem de trabalho

1. Projeto Next + Tailwind + PWA, tema e layout base (coluna central, cabeçalho).
2. `lib/api.ts` (auth, timeout, retry, cache, aviso de erro), `lib/dates.ts`, `config/leagues.ts`, `lib/matches.ts` e `hooks/useLiveStandings.ts`. Testes unitários (Vitest) para `parseMatchDate`, `getZoneColor`, `collapseTwoLeggedTies`, o cache e o liga/desliga da classificação ao vivo.
3. Home → Liga → Jogo → Time → Busca → Jogador → Minhas Ligas → Admin.
4. Ao fim de cada tela: `npm run build`, `npx tsc --noEmit`, e teste no navegador em largura de celular.
5. README com: como rodar, variáveis de ambiente, como publicar (Vercel), o domínio do site a colocar em `CORS_ALLOWED_ORIGINS` (se o backend for restringir origens) e como instalar no iPhone ("Compartilhar → Adicionar à Tela de Início").

Se algo no `API.md` contradizer este documento, siga o `API.md` e me avise da diferença.
