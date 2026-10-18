// Junta as falhas de rede num único aviso (rodapé), em vez de um alerta por requisição

export type FailedRequest = { endpoint: string; message: string; count: number; lastAt: number };

export type NetworkErrorState = {
  visible: boolean;
  baseUrl: string;
  total: number;
  /** Uma entrada por rota (sem a query), a mais recente primeiro */
  requests: FailedRequest[];
  /** A tela está mostrando a cópia local salva neste horário (a mais antiga) */
  cachedAt?: number;
};

const MUTE_AFTER_DISMISS_MS = 30000; // depois de fechar, fica 30 s sem reaparecer

const EMPTY: NetworkErrorState = { visible: false, baseUrl: '', total: 0, requests: [] };

let state: NetworkErrorState = EMPTY;
let mutedUntil = 0;
const listeners = new Set<(s: NetworkErrorState) => void>();

const emit = () => listeners.forEach(listener => listener(state));

export function subscribeNetworkErrors(listener: (s: NetworkErrorState) => void) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function reportNetworkError(baseUrl: string, endpoint: string, message: string, cachedAt?: number) {
  if (Date.now() < mutedUntil) return;

  // /matches/live?league=BSA e ?league=PL viram uma linha só
  const route = endpoint.split('?')[0];
  const existing = state.requests.find(r => r.endpoint.split('?')[0] === route);
  const updated: FailedRequest = { endpoint, message, count: (existing?.count || 0) + 1, lastAt: Date.now() };

  state = {
    visible: true,
    baseUrl,
    total: state.total + 1,
    requests: [updated, ...state.requests.filter(r => r !== existing)],
    cachedAt: cachedAt && state.cachedAt ? Math.min(cachedAt, state.cachedAt) : cachedAt || state.cachedAt,
  };
  emit();
}

export function dismissNetworkErrors(mute = true) {
  if (mute) mutedUntil = Date.now() + MUTE_AFTER_DISMISS_MS;
  state = EMPTY;
  emit();
}
