// Notificações no navegador (Web Push). Detalhes em docs/API.md, "Push no navegador".
// 1. service worker (public/sw.js); 2. chave pública do servidor (/push/web-key, sem token);
// 3. permissão + pushManager.subscribe; 4. POST /push/register com platform "web" (token de convidado).
import { requestApi } from './api';
import { getBaseUrl } from './config';
import { fetchWithTimeout } from './http';
import { storageGet, storageRemove, storageSet } from './storage';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const ENABLED_KEY = 'web_push_enabled';

export type PushSupport =
  | 'ok'
  /** iPhone/iPad no Safari sem o site instalado: precisa adicionar à Tela de Início */
  | 'needs-install'
  /** Navegador sem Web Push */
  | 'unsupported'
  /** Servidor sem push no navegador (503) ou fora do ar */
  | 'server-off';

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const hasPushApi = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// A chave base64url do servidor em bytes (função padrão dos exemplos de Web Push)
export function base64UrlToUint8Array(base64Url: string) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

let keyPromise: Promise<string | null> | null = null;

// Chave pública do servidor (uma vez por sessão). null = push no navegador desligado no servidor
function getPublicKey() {
  if (!keyPromise) {
    keyPromise = fetchWithTimeout(`${getBaseUrl()}/push/web-key`)
      .then(async res => (res.ok ? ((await res.json()) as { public_key?: string }).public_key || null : null))
      .catch(() => null)
      .then(key => {
        if (!key) keyPromise = null; // tenta de novo na próxima vez
        return key;
      });
  }
  return keyPromise;
}

export async function getPushSupport(): Promise<PushSupport> {
  if (!hasPushApi()) return isIOS() ? 'needs-install' : 'unsupported';
  return (await getPublicKey()) ? 'ok' : 'server-off';
}

/** O usuário ativou e o navegador ainda dá permissão */
export const isWebPushEnabled = () =>
  hasPushApi() && Notification.permission === 'granted' && storageGet(ENABLED_KEY) === '1';

async function serviceWorker() {
  return navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` });
}

export type EnableResult = { ok: true } | { ok: false; reason: 'denied' | 'unsupported' | 'server-off' | 'error'; detail?: string };

/**
 * Inscreve o navegador e registra no servidor. askPermission: só depois de um toque do usuário.
 * A permissão é pedida ANTES de qualquer espera de rede: no Chrome do celular o pedido feito
 * depois de um await perde o "toque" e é recusado sem aparecer.
 */
export async function enableWebPushDetailed(askPermission = true): Promise<EnableResult> {
  if (!hasPushApi()) return { ok: false, reason: 'unsupported' };
  if (Notification.permission === 'denied') return { ok: false, reason: 'denied' };
  if (Notification.permission !== 'granted') {
    if (!askPermission) return { ok: false, reason: 'denied' };
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };
  }
  const key = await getPublicKey();
  if (!key) return { ok: false, reason: 'server-off' };
  try {
    const registration = await serviceWorker();
    const ready = await navigator.serviceWorker.ready;
    const manager = (ready || registration).pushManager;
    let subscription = await manager.getSubscription();
    // Inscrição antiga feita com outra chave do servidor: refaz
    const current = subscription?.options?.applicationServerKey;
    if (subscription && current && btoa(String.fromCharCode(...new Uint8Array(current))) !== btoa(String.fromCharCode(...base64UrlToUint8Array(key)))) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await manager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(key) });
    const result = await requestApi(
      '/push/register',
      { method: 'POST', body: JSON.stringify({ platform: 'web', subscription: subscription.toJSON() }) },
      { guestOnly: true },
    );
    if (!result || result.status >= 400) {
      const error = (result?.data as { error?: string } | null)?.error;
      return { ok: false, reason: 'error', detail: error || `servidor respondeu ${result?.status ?? 'sem conexão'}` };
    }
    storageSet(ENABLED_KEY, '1');
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'error', detail: (error as Error)?.message || String(error) };
  }
}

export const enableWebPush = async (askPermission = true) => (await enableWebPushDetailed(askPermission)).ok;

/** Mensagem para mostrar quando ativar falha */
export function enableErrorMessage(result: EnableResult): [string, string] {
  if (result.ok) return ['', ''];
  if (result.reason === 'denied')
    return ['Notificações bloqueadas para este site', 'Toque no cadeado ao lado do endereço → Permissões → Notificações → Permitir. Depois tente de novo.'];
  if (result.reason === 'server-off') return ['Servidor sem notificações agora', 'Tente de novo em alguns minutos.'];
  if (result.reason === 'unsupported') return ['Este navegador não aceita notificações', 'Use o Chrome, o Firefox, o Edge ou o Safari atualizados.'];
  return ['Não foi possível ativar', result.detail || 'Erro desconhecido'];
}

// Desligar: apaga o registro do aparelho e tudo o que ele seguia (DELETE /push/register)
export async function disableWebPush() {
  storageRemove(ENABLED_KEY);
  await requestApi('/push/register', { method: 'DELETE' }, { guestOnly: true });
  try {
    const registration = await navigator.serviceWorker.getRegistration(`${BASE_PATH}/`);
    await (await registration?.pushManager.getSubscription())?.unsubscribe();
  } catch {
    // nada a fazer
  }
}

// Ao abrir o site: a inscrição pode ter mudado, então inscreve e registra de novo (sem pedir nada)
export async function refreshWebPush() {
  if (isWebPushEnabled()) await enableWebPush(false);
}
