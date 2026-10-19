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

/**
 * Inscreve o navegador e registra no servidor. askPermission: só depois de um toque do usuário
 * (o navegador exige). Devolve true se ficou registrado.
 */
export async function enableWebPush(askPermission = true): Promise<boolean> {
  if (!hasPushApi()) return false;
  const key = await getPublicKey();
  if (!key) return false;
  if (Notification.permission !== 'granted') {
    if (!askPermission || (await Notification.requestPermission()) !== 'granted') return false;
  }
  try {
    const registration = await serviceWorker();
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(key) }));
    const result = await requestApi(
      '/push/register',
      { method: 'POST', body: JSON.stringify({ platform: 'web', subscription: subscription.toJSON() }) },
      { guestOnly: true },
    );
    if (!result || result.status >= 400) return false;
    storageSet(ENABLED_KEY, '1');
    return true;
  } catch {
    return false;
  }
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
