import { buildEndpoint, fetchApi, requestApi, RETRY_DELAY_MS, withParams } from './api';
import { readCached, saveCached } from './apiCache';
import { getAdminToken } from './auth';
import { dismissNetworkErrors, subscribeNetworkErrors, type NetworkErrorState } from './networkErrors';
import { subscribeToasts, type Toast } from './toast';

const BASE = 'https://futapp-r38z.onrender.com';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Call = { url: string; auth: string | null; method: string };

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, auth: new Headers(init.headers).get('Authorization'), method: init.method || 'GET' });
      return handler(url, init);
    }),
  );
  return calls;
}

let networkState: NetworkErrorState;
let toasts: Toast[];
let unsubscribe: (() => void)[] = [];

beforeEach(() => {
  localStorage.clear();
  dismissNetworkErrors(false);
  unsubscribe = [subscribeNetworkErrors(s => (networkState = s)), subscribeToasts(t => (toasts = t))];
});

afterEach(() => {
  unsubscribe.forEach(fn => fn());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('montagem de endpoints', () => {
  it('deixa de fora valores vazios e codifica', () => {
    expect(buildEndpoint('/matches', { league: 'BSA', season: '', round: 3 })).toBe('/matches?league=BSA&round=3');
    expect(buildEndpoint('/search', { q: 'são paulo' })).toBe('/search?q=s%C3%A3o%20paulo');
    expect(withParams('/standings?league=BSA', { update: 'true', nocache: 'true' })).toBe('/standings?league=BSA&update=true&nocache=true');
    expect(withParams('/seasons', { update: undefined })).toBe('/seasons');
  });
});

describe('autenticação', () => {
  it('várias requisições sem token compartilham uma única chamada a /auth/guest', async () => {
    const calls = mockFetch(url => (url.endsWith('/auth/guest') ? json({ token: 'guest-1' }) : json([])));
    await Promise.all([fetchApi('/seasons?league=BSA'), fetchApi('/seasons?league=PL'), fetchApi('/seasons?league=CL')]);
    expect(calls.filter(c => c.url.endsWith('/auth/guest'))).toHaveLength(1);
    expect(calls.filter(c => c.url.includes('/seasons')).every(c => c.auth === 'Bearer guest-1')).toBe(true);
    expect(localStorage.getItem('jwt_token')).toBe('guest-1');
    expect(localStorage.getItem('device_id')).toBeTruthy();
  });

  it('no 401 gera um novo token de convidado e repete uma vez', async () => {
    localStorage.setItem('jwt_token', 'vencido');
    const calls = mockFetch((url, init) => {
      if (url.endsWith('/auth/guest')) return json({ token: 'novo' });
      return new Headers(init.headers).get('Authorization') === 'Bearer novo' ? json(['2026']) : json({ error: 'token' }, 401);
    });
    expect(await fetchApi('/seasons?league=BSA')).toEqual(['2026']);
    expect(calls.map(c => c.url.replace(BASE, ''))).toEqual(['/seasons?league=BSA', '/auth/guest', '/seasons?league=BSA']);
  });

  it('admin com token vencido volta para convidado e avisa', async () => {
    localStorage.setItem('admin_jwt_token', 'admin-velho');
    localStorage.setItem('jwt_token', 'guest-ok');
    mockFetch((_url, init) =>
      new Headers(init.headers).get('Authorization') === 'Bearer guest-ok' ? json([1]) : json({ error: 'expirado' }, 401),
    );
    expect(await fetchApi('/standings?league=BSA')).toEqual([1]);
    expect(getAdminToken()).toBeNull();
    expect(toasts.map(t => t.title)).toContain('Sessão de admin expirada');
  });

  it('não guarda no cache as respostas pedidas com token de admin', async () => {
    localStorage.setItem('admin_jwt_token', 'admin');
    mockFetch(() => json([1]));
    await fetchApi('/standings?league=BSA&update=true');
    expect(readCached('/standings?league=BSA')).toBeNull();
  });

  it('as rotas /push usam o token de convidado mesmo com admin logado', async () => {
    localStorage.setItem('admin_jwt_token', 'admin');
    localStorage.setItem('jwt_token', 'guest');
    const calls = mockFetch(() => json({ matches: [] }));
    await requestApi('/push/subscriptions', {}, { guestOnly: true });
    expect(calls[0].auth).toBe('Bearer guest');
  });
});

describe('rede ruim', () => {
  it('GET com erro de rede tenta de novo depois de 1,5 s', async () => {
    vi.useFakeTimers();
    localStorage.setItem('jwt_token', 'guest');
    let attempts = 0;
    mockFetch(() => {
      attempts++;
      if (attempts === 1) throw new TypeError('Failed to fetch');
      return json(['ok']);
    });
    const promise = fetchApi('/seasons?league=BSA');
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS - 1);
    expect(attempts).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await promise).toEqual(['ok']);
    expect(attempts).toBe(2);
  });

  it('POST não repete', async () => {
    localStorage.setItem('jwt_token', 'guest');
    let attempts = 0;
    mockFetch(() => {
      attempts++;
      throw new TypeError('Failed to fetch');
    });
    expect(await requestApi('/push/register', { method: 'POST', body: '{}' })).toBeNull();
    expect(attempts).toBe(1);
  });

  it('sem rede devolve a cópia guardada e avisa de quando ela é', async () => {
    vi.useFakeTimers();
    localStorage.setItem('jwt_token', 'guest');
    saveCached('/standings?league=BSA', [{ position: 1 }]);
    const savedAt = readCached('/standings?league=BSA')!.savedAt;
    mockFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    const promise = requestApi('/standings?league=BSA');
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    const result = await promise;
    expect(result).toMatchObject({ status: 200, data: [{ position: 1 }], fromCache: true });
    expect(networkState.visible).toBe(true);
    expect(networkState.cachedAt).toBe(savedAt);
    expect(networkState.requests[0].endpoint).toBe('/standings?league=BSA');
  });

  it('agrupa as falhas por rota, com contador', async () => {
    vi.useFakeTimers();
    localStorage.setItem('jwt_token', 'guest');
    mockFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    const all = Promise.all([fetchApi('/matches?league=BSA&date=2026-10-18'), fetchApi('/matches?league=PL&date=2026-10-18')]);
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    await all;
    expect(networkState.total).toBe(2);
    expect(networkState.requests).toHaveLength(1);
    expect(networkState.requests[0].count).toBe(2);
  });

  it('mostra a cópia guardada na hora e entrega a da rede depois', async () => {
    localStorage.setItem('jwt_token', 'guest');
    saveCached('/seasons?league=BSA', ['2025']);
    mockFetch(() => json(['2026', '2025']));
    const seen: unknown[] = [];
    const data = await fetchApi('/seasons?league=BSA', {}, { onCached: cached => seen.push(cached) });
    expect(seen).toEqual([['2025']]);
    expect(data).toEqual(['2026', '2025']);
    expect(readCached('/seasons?league=BSA')?.data).toEqual(['2026', '2025']);
  });

  it('lê o JSON de erro mesmo com Content-Type errado', async () => {
    localStorage.setItem('jwt_token', 'guest');
    mockFetch(() => new Response('{"error":"Jogo não disponível"}', { status: 404, headers: { 'Content-Type': 'text/plain' } }));
    const result = await requestApi('/match/history?id=1&league=BSA');
    expect(result).toEqual({ status: 404, data: { error: 'Jogo não disponível' } });
    expect(await fetchApi('/match/history?id=1&league=BSA')).toBeNull();
  });
});
