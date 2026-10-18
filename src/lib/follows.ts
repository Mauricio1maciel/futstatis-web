// Seguir times, ligas e jogos para receber avisos (push). Pronto, mas desligado na web por
// FEATURES.push (veja lib/features.ts). Regras do app (docs/API.md, "Notificações push"):
// - sempre com o token de convidado (é o device_id que identifica o aparelho);
// - a estrela muda na hora e desfaz se a API falhar;
// - 409 = aparelho ainda não registrado: registra e repete;
// - tipos de aviso por inscrição: lista vazia não existe (vira "deixar de seguir").
import { buildEndpoint, requestApi } from './api';
import { FEATURES } from './features';
import { showToast } from './toast';

export type FollowTarget =
  | { type: 'team'; teamId: string | number }
  | { type: 'league'; league: string }
  | { type: 'match'; matchId?: string | number; espnMatchId?: string | number };

export const PUSH_KINDS = ['lineup', 'start', 'goal', 'red_card', 'end'] as const;
export type PushKind = (typeof PUSH_KINDS)[number];

export const KIND_LABELS: Record<string, string> = {
  lineup: 'Escalação',
  start: 'Início',
  goal: 'Gols',
  red_card: 'Cartão vermelho',
  end: 'Fim de jogo',
};

type KindsByTarget = Record<string, string[]>;

export type Follows = {
  matches: string[];
  teams: string[];
  leagues: string[];
  kinds: { matches: KindsByTarget; teams: KindsByTarget; leagues: KindsByTarget };
  availableKinds: string[];
};

const EMPTY: Follows = { matches: [], teams: [], leagues: [], kinds: { matches: {}, teams: {}, leagues: {} }, availableKinds: [...PUSH_KINDS] };

let follows: Follows = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export function subscribeFollows(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getFollows = () => follows;

const strings = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);

function normalize(data: Record<string, unknown>): Follows {
  const kinds = (data.kinds || {}) as Partial<Follows['kinds']>;
  return {
    matches: strings(data.matches),
    teams: strings(data.teams),
    leagues: strings(data.leagues).map(code => code.toUpperCase()),
    kinds: { matches: kinds.matches || {}, teams: kinds.teams || {}, leagues: kinds.leagues || {} },
    availableKinds: strings(data.available_kinds).length ? strings(data.available_kinds) : [...PUSH_KINDS],
  };
}

// Onde o alvo fica na lista de inscrições e o ID que a identifica
function locate(target: FollowTarget): { list: 'matches' | 'teams' | 'leagues'; id: string } | null {
  if (target.type === 'team') return { list: 'teams', id: String(target.teamId) };
  if (target.type === 'league') return { list: 'leagues', id: target.league.toUpperCase() };
  if (target.matchId) return { list: 'matches', id: String(target.matchId) };
  return null; // jogo só com ID da ESPN: o match_id volta na resposta do POST
}

function targetBody(target: FollowTarget): Record<string, unknown> {
  if (target.type === 'team') return { team_id: target.teamId };
  if (target.type === 'league') return { league: target.league };
  return target.matchId ? { match_id: target.matchId } : { espn_match_id: target.espnMatchId };
}

export function isFollowing(state: Follows, target: FollowTarget) {
  const place = locate(target);
  return !!place && state[place.list].includes(place.id);
}

/** Tipos escolhidos para o alvo; null = todos (padrão) */
export function getKinds(state: Follows, target: FollowTarget): string[] | null {
  const place = locate(target);
  return place ? state.kinds[place.list][place.id] ?? null : null;
}

export async function loadFollows() {
  if (!FEATURES.push) return;
  const result = await requestApi<Record<string, unknown>>('/push/subscriptions', {}, { guestOnly: true });
  if (result?.status === 200 && result.data) {
    follows = normalize(result.data);
    emit();
  }
}

// Registro do navegador para Web Push (service worker + PushManager + POST /push/register).
// Ainda não existe: o backend só aceita platform android/ios
export async function registerWebPush(): Promise<boolean> {
  return false;
}

async function send(method: 'POST' | 'DELETE', target: FollowTarget, extra: Record<string, unknown> = {}) {
  const request = () =>
    method === 'POST'
      ? requestApi<Record<string, unknown>>('/push/subscriptions', { method, body: JSON.stringify({ ...targetBody(target), ...extra }) }, { guestOnly: true })
      : requestApi<Record<string, unknown>>(buildEndpoint('/push/subscriptions', targetBody(target) as Record<string, string>), { method }, { guestOnly: true });
  let result = await request();
  if (result?.status === 409 && (await registerWebPush())) result = await request();
  return result;
}

function setFollowing(target: FollowTarget, following: boolean, id?: string) {
  const place = locate(target);
  const list = place?.list ?? 'matches';
  const key = id ?? place?.id;
  if (!key) return;
  const without = follows[list].filter(item => item !== key);
  follows = { ...follows, [list]: following ? [...without, key] : without };
  emit();
}

export async function toggleFollow(target: FollowTarget) {
  if (!FEATURES.push) return;
  const following = isFollowing(follows, target);
  const before = follows;
  setFollowing(target, !following); // muda na hora
  const result = await send(following ? 'DELETE' : 'POST', target);
  if (!result || result.status >= 400) {
    follows = before; // desfaz
    emit();
    showToast('Não foi possível atualizar', 'Tente de novo em instantes.');
    return;
  }
  // Seguiu pelo ID da ESPN: a API devolve o match_id
  if (!following && target.type === 'match' && !target.matchId && result.data?.match_id) {
    setFollowing(target, true, String(result.data.match_id));
  }
}

/** Grava os tipos de aviso. Todos marcados = padrão; nenhum = deixar de seguir */
export async function saveKinds(target: FollowTarget, kinds: string[]) {
  if (!FEATURES.push) return false;
  if (kinds.length === 0) {
    if (isFollowing(follows, target)) await toggleFollow(target);
    return true;
  }
  const result = await send('POST', target, { kinds });
  if (!result || result.status >= 400) {
    showToast('Não foi possível salvar os avisos', 'Tente de novo em instantes.');
    return false;
  }
  const place = locate(target);
  if (place) {
    const all = follows.availableKinds.every(kind => kinds.includes(kind));
    const byTarget = { ...follows.kinds[place.list] };
    if (all) delete byTarget[place.id];
    else byTarget[place.id] = kinds;
    follows = { ...follows, kinds: { ...follows.kinds, [place.list]: byTarget } };
    emit();
  }
  return true;
}
