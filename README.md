# FutStats Web

Versão web do FutStats: as mesmas telas do app (React Native), com o mesmo tema escuro, feita
para o Safari do iPhone e também para o computador (coluna central de até 520 px).

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS 4**, gerando um **site estático** (`out/`).
- Toda a busca de dados acontece no navegador, direto na API (`docs/API.md`). Não há servidor próprio.
- PWA: dá para instalar na Tela de Início do iPhone e abrir como app.

## Testar localmente

Precisa do Node 20 ou mais novo. O projeto foi feito com o 22 (arquivo `.nvmrc`), que o `nvm use` seleciona.

```bash
cd ~/Documentos/App-Futebol/App-Futebol_FrontEnd_WEB
nvm use            # troca para o Node 22 do .nvmrc
npm install        # só na primeira vez (ou quando o package.json mudar)
npm run dev        # abra http://localhost:3000
```

O `npm run dev` recarrega a página sozinho a cada arquivo salvo. Para parar: `Ctrl+C`.

**Versão de produção** (exatamente o que vai para a Vercel/GitHub Pages):

```bash
npm run build      # gera a pasta out/
npm start          # serve a out/ em http://localhost:3000
```

**No iPhone**, com o celular no mesmo Wi-Fi do computador:

```bash
npm run dev -- -H 0.0.0.0     # ou: npm run build && npm start
hostname -I                   # o primeiro número é o IP do computador (ex: 192.168.1.14)
```

No Safari do iPhone, abra `http://<IP do computador>:3000`. Se não abrir, confira se o firewall libera
a porta 3000 (`sudo ufw status`). No modo `dev`, o aviso "Cross origin request detected" no terminal
é esperado e não atrapalha.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera o site estático em `out/` |
| `npm start` | Serve a pasta `out/` (depois do build) em http://localhost:3000 |
| `npm test` | Testes unitários (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (inclui as dependências dos efeitos do React) |

## Variáveis de ambiente

Copie `.env.example` para `.env.local` se precisar mudar algo.

| Variável | Padrão | Para que serve |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://futapp-r38z.onrender.com` | URL da API |
| `NEXT_PUBLIC_BASE_PATH` | vazio | Só para hospedar numa subpasta (ex: GitHub Pages em `usuario.github.io/futstatis-web` → `/futstatis-web`; o workflow do Pages já preenche) |

São lidas **no build** (o site é estático): mudou, gere de novo.

A tela escondida **`/servidor/`** troca a URL da API só naquele navegador (fica no `localStorage`),
para testar outro servidor sem novo build. Ao trocar, a cópia local dos dados e os tokens são apagados.

## Rotas

O site é estático, então as telas com ID usam **parâmetros na URL** em vez de caminhos dinâmicos
(`/jogo/?id=...` em vez de `/jogo/123`). Assim cada tela é um único `index.html` que funciona em
qualquer hospedagem estática, sem regra de reescrita, e um link copiado abre direto na tela certa.

| Tela | Endereço |
|---|---|
| Home (Ao Vivo / Todos Jogos) | `/` |
| Liga | `/liga/?codigo=BSA` |
| Time | `/time/?id=1783` (o `api_id` do time) |
| Jogo | `/jogo/?id=<ID da ESPN ou match_id>&league=BSA&date=...&espn_home=...&espn_away=...&match_id=...` |
| Jogador | `/jogador/?id=235017` |
| Busca | `/busca/?q=flamengo` |
| Minhas Ligas | `/minhas-ligas/` |
| Admin (escondida: 7 toques no logo) | `/admin/` |
| Servidor da API (escondida, pelo admin) | `/servidor/` |

## Publicar na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel: **Add New → Project**, escolha o repositório. O preset **Next.js** é detectado sozinho
   (o `output: 'export'` do `next.config.mjs` faz a Vercel servir os arquivos estáticos).
3. Se for usar outra API, cadastre `NEXT_PUBLIC_API_URL` em **Settings → Environment Variables**.
4. Deploy. O endereço fica algo como `https://futstatis-web.vercel.app`.

Outras hospedagens: o comando de build é `npm run build` e a pasta publicada é `out/`
(Netlify, Cloudflare Pages, um servidor nginx...).

## Publicar no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` já faz tudo: roda os testes, gera o site e publica.

1. Crie um repositório no GitHub (ex: `futstatis-web`). No plano grátis ele precisa ser **público**.
2. Suba o projeto (esta pasta ainda não é um repositório git):

   ```bash
   git init -b main
   git add .
   git commit -m "Versão web do FutStats"
   git remote add origin https://github.com/<seu-usuario>/futstatis-web.git
   git push -u origin main
   ```

3. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Na aba **Actions**, rode de novo o workflow "Publicar no GitHub Pages" (o primeiro, disparado
   pelo push, falha se o Pages ainda não estava ativado). Depois disso, cada push na `main` publica sozinho.
5. O site fica em `https://<seu-usuario>.github.io/futstatis-web/`.

O site fica numa subpasta (`/futstatis-web/`), e o workflow já gera o build com o caminho certo
(`NEXT_PUBLIC_BASE_PATH`). Num repositório `<seu-usuario>.github.io` ou com domínio próprio, o site
fica na raiz, e o workflow também percebe isso sozinho.

Dá para usar Vercel e GitHub Pages ao mesmo tempo: o build da Vercel não usa subpasta.

## CORS no backend

A API já libera chamadas de navegador de **qualquer origem** (`CORS_ALLOWED_ORIGINS` vazio no Render).
Se um dia o backend passar a restringir, cadastre lá o domínio do site e o de desenvolvimento,
separados por vírgula:

```
CORS_ALLOWED_ORIGINS=https://futstatis-web.vercel.app,https://<seu-usuario>.github.io,http://localhost:3000
```

(Troque pelos domínios reais; domínio próprio também entra na lista.) No GitHub Pages a origem é só
`https://<seu-usuario>.github.io`, sem o nome do repositório. Para testar no iPhone pela rede, inclua
também `http://<IP do computador>:3000`. Sem isso, o navegador bloqueia as chamadas e o site não
carrega nada.

## Instalar no iPhone

1. Abra o site no **Safari**.
2. Toque em **Compartilhar** (o quadrado com a seta para cima).
3. Toque em **Adicionar à Tela de Início** e confirme.

O FutStats abre como app, em tela cheia, com o ícone próprio. A tela Minhas Ligas mostra essa dica
para quem ainda está usando pelo navegador.

## Como o código está organizado

```
src/
  app/                 páginas (cada uma só lê o endereço e chama a tela)
  components/screens/  as telas: Home, Liga, Time, Jogo, Jogador, Busca, Minhas Ligas, Admin, Servidor
  components/          peças reaproveitadas: linha de jogo, classificação, chaveamento, folha de baixo...
  config/leagues.ts    cadastro único das ligas: nome, ícone, fases, chaveamento, legendas
  lib/api.ts           cliente HTTP: token de convidado/admin, tempo limite, nova tentativa, cópia local
  lib/apiCache.ts      cópia local das respostas (localStorage)
  lib/dates.ts         parseMatchDate e formatação de datas (fuso do aparelho, pt-BR)
  lib/matches.ts       regras de jogos: ida e volta, agregado, pênaltis, fases, V/E/D
  hooks/useLiveStandings.ts  classificação ao vivo (botão "Ao vivo")
```

Tudo o que muda de liga para liga vem de `config/leagues.ts`: para cadastrar uma liga nova basta uma
entrada lá. Liga fora do cadastro (ex: vinda da busca) funciona como pontos corridos.

Comportamentos importantes:

- **Abre na hora com a cópia guardada** e atualiza pela rede (menos o que é ao vivo: um jogo guardado
  como "ao vivo" pode já ter acabado). Sem internet, mostra a cópia e o aviso "Sem conexão: dados das HH:MM".
- **Voltar devolve a tela como estava**: aba, filtros, dias/rodadas carregados e a rolagem.
- **Admin logado**: o botão de atualizar (⟳) do jogo, da classificação e das estatísticas manda
  `force_update=true`/`update=true`. Se o token de admin vencer, o site volta para convidado e avisa.

## Notificações (Web Push)

Os avisos de jogos chegam também no navegador (docs/API.md, "Push no navegador"):

- `public/sw.js`: service worker que mostra o aviso e, no toque, abre o jogo (ou a liga).
- `src/lib/webPush.ts`: chave do servidor (`/push/web-key`), permissão, inscrição e `POST /push/register` com `platform: "web"`.
- Ativar: **Minhas Ligas → Avisos de jogos**, ou tocar numa estrela (⭐) de jogo, time ou liga.
- Ao abrir o site com os avisos ativados, a inscrição é renovada sozinha.
- Se o servidor não oferece push no navegador (`/push/web-key` com erro), estrelas e opção ficam escondidas.
- No iPhone só funciona com o site instalado na Tela de Início (iOS 16.4+); fora disso, Minhas Ligas mostra a dica.

## Ícones

Os ícones de `public/icons/` vêm do ícone do app (`AppFutebolApp/assets/images/icon.png`), redimensionado para 32, 180, 192 e 512 px.
