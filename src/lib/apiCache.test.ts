import { cacheKeyFor, clearApiCache, isCacheableEndpoint, MAX_ENTRIES, readCached, saveCached } from './apiCache';

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('chave do cache', () => {
  it('ignora os parâmetros que só furam o cache do servidor', () => {
    expect(cacheKeyFor('/matches?league=BSA&nocache=true&update=true')).toBe('/matches?league=BSA');
    expect(cacheKeyFor('/match/history?id=1&league=PL&force_update=true&nocache=true')).toBe('/match/history?id=1&league=PL');
    expect(cacheKeyFor('/seasons?update=true')).toBe('/seasons');
  });

  it('não guarda push, auth, admin nem dados ao vivo', () => {
    expect(isCacheableEndpoint('/push/subscriptions')).toBe(false);
    expect(isCacheableEndpoint('/auth/guest')).toBe(false);
    expect(isCacheableEndpoint('/admin/sync-daily')).toBe(false);
    expect(isCacheableEndpoint('/matches/live?league=BSA')).toBe(false);
    expect(isCacheableEndpoint('/standings?league=BSA&live=true')).toBe(false);
    expect(isCacheableEndpoint('/search?q=flamengo')).toBe(false);
    expect(isCacheableEndpoint('/standings?league=BSA')).toBe(true);
    expect(isCacheableEndpoint('/matches?league=BSA&date=2026-10-18')).toBe(true);
  });
});

describe('cópia local', () => {
  it('guarda e devolve a resposta com o horário', () => {
    saveCached('/standings?league=BSA&nocache=true', [{ position: 1 }]);
    const cached = readCached('/standings?league=BSA');
    expect(cached?.data).toEqual([{ position: 1 }]);
    expect(cached?.savedAt).toBe(Date.now());
  });

  it('descarta cópias com mais de 7 dias', () => {
    saveCached('/seasons?league=BSA', ['2026']);
    vi.setSystemTime(Date.now() + 7 * DAY - 1000);
    expect(readCached('/seasons?league=BSA')).not.toBeNull();
    vi.setSystemTime(Date.now() + 2000);
    expect(readCached('/seasons?league=BSA')).toBeNull();
  });

  it(`mantém no máximo ${MAX_ENTRIES} respostas, apagando as mais antigas`, () => {
    for (let i = 0; i < MAX_ENTRIES + 5; i++) {
      vi.setSystemTime(Date.now() + 1000);
      saveCached(`/matches?league=BSA&round=${i}`, [i]);
    }
    for (let i = 0; i < 5; i++) expect(readCached(`/matches?league=BSA&round=${i}`)).toBeNull();
    for (let i = 5; i < MAX_ENTRIES + 5; i++) expect(readCached(`/matches?league=BSA&round=${i}`)?.data).toEqual([i]);
    const stored = Object.keys(localStorage).filter(k => k.startsWith('api_cache:'));
    expect(stored).toHaveLength(MAX_ENTRIES);
  });

  it('não guarda respostas maiores que ~1 MB', () => {
    saveCached('/players?league=BSA', 'x'.repeat(1_100_000));
    expect(readCached('/players?league=BSA')).toBeNull();
  });

  it('de /players guarda só a última liga', () => {
    saveCached('/players?league=BSA', [1]);
    saveCached('/players?league=PL', [2]);
    expect(readCached('/players?league=BSA')).toBeNull();
    expect(readCached('/players?league=PL')?.data).toEqual([2]);
  });

  it('limpa tudo ao trocar de servidor', () => {
    saveCached('/seasons?league=BSA', ['2026']);
    localStorage.setItem('favoritos', 'fica');
    clearApiCache();
    expect(readCached('/seasons?league=BSA')).toBeNull();
    expect(localStorage.getItem('favoritos')).toBe('fica');
  });
});
