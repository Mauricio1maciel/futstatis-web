// fetch com tempo limite: numa rede ruim a tela não fica carregando para sempre

export const REQUEST_TIMEOUT_MS = 15000;

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// As respostas de erro podem vir com Content-Type errado: lê o texto e tenta o JSON
export async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Mensagem legível para o aviso de rede
export function describeNetworkError(error: unknown) {
  const err = error as { name?: string; message?: string } | null;
  if (err?.name === 'AbortError') return `Tempo esgotado (${REQUEST_TIMEOUT_MS / 1000} s)`;
  return err?.message || 'Erro de rede';
}
