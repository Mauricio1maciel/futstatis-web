// localStorage com proteção: no Safari em janela privada, com o armazenamento cheio ou fora do
// navegador (build estático), o acesso lança erro. Aqui ele vira "sem valor" em vez de quebrar a tela.

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

export function storageGet(key: string): string | null {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Devolve false se não deu para gravar (cota cheia, modo privado) */
export function storageSet(key: string, value: string): boolean {
  if (!hasStorage()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function storageRemove(key: string) {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // nada a fazer
  }
}

export function storageKeys(): string[] {
  if (!hasStorage()) return [];
  try {
    return Object.keys(window.localStorage);
  } catch {
    return [];
  }
}

export function storageGetJson<T>(key: string): T | null {
  const raw = storageGet(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
