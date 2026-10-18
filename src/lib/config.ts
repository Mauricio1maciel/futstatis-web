import { storageGet, storageRemove, storageSet } from './storage';

export const DEFAULT_API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://futapp-r38z.onrender.com').replace(/\/+$/, '');

const CUSTOM_URL_KEY = 'custom_api_url';

// URL da API: a da tela escondida /servidor/ (só neste navegador) ou a padrão
export function getBaseUrl() {
  return (storageGet(CUSTOM_URL_KEY) || DEFAULT_API_URL).replace(/\/+$/, '');
}

export function getCustomBaseUrl() {
  return storageGet(CUSTOM_URL_KEY) || '';
}

export function setCustomBaseUrl(url: string) {
  const clean = url.trim().replace(/\/+$/, '');
  if (!clean || clean === DEFAULT_API_URL) storageRemove(CUSTOM_URL_KEY);
  else storageSet(CUSTOM_URL_KEY, clean);
}
