import { act, renderHook } from '@testing-library/react';
import { fetchApi } from '@/lib/api';
import type { StandingRow } from '@/lib/types';
import { LIVE_STANDINGS_REFRESH_MS, useLiveStandings } from './useLiveStandings';

vi.mock('@/lib/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, fetchApi: vi.fn() };
});

const fetchMock = vi.mocked(fetchApi);

const row = (overrides: Partial<StandingRow> = {}): StandingRow => ({
  position: 1,
  group_name: '',
  team_id: 1783,
  team_name: 'CR Flamengo',
  crest_url: '',
  played: 30,
  wins: 18,
  draws: 6,
  losses: 6,
  goals_for: 50,
  goals_against: 25,
  goal_diff: 25,
  points: 60,
  zone: 'libertadores',
  season: '2026',
  ...overrides,
});

const flush = () => act(async () => {
  await vi.advanceTimersByTimeAsync(0);
});

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useLiveStandings', () => {
  it('sem time jogando, faz uma consulta só e esconde o botão', async () => {
    fetchMock.mockResolvedValue([row(), row({ position: 2, team_id: 1769 })]);
    const { result } = renderHook(() => useLiveStandings({ league: 'BSA', enabled: true }));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/standings?league=BSA&live=true');
    expect(result.current.available).toBe(false);
    expect(result.current.rows).toBeNull();

    // Sem o botão ligado, nada de recarregar sozinho
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_STANDINGS_REFRESH_MS * 3);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('com time jogando mostra o botão; ligado usa os dados ao vivo e recarrega a cada 30 s', async () => {
    fetchMock.mockResolvedValue([row({ live: true, position_change: 2 }), row({ position: 2, team_id: 1769 })]);
    const { result } = renderHook(() => useLiveStandings({ league: 'BSA', season: '2026', enabled: true }));
    await flush();
    expect(fetchMock).toHaveBeenCalledWith('/standings?league=BSA&season=2026&live=true');
    expect(result.current.available).toBe(true);
    expect(result.current.on).toBe(false);
    expect(result.current.rows).toBeNull(); // desligado: a tela usa a tabela normal

    act(() => result.current.toggle());
    await flush();
    expect(result.current.on).toBe(true);
    expect(result.current.rows?.[0]).toMatchObject({ live: true, position_change: 2 });
    const callsAfterOn = fetchMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_STANDINGS_REFRESH_MS);
    });
    expect(fetchMock.mock.calls.length).toBe(callsAfterOn + 1);

    // Desligar para de recarregar e volta para a tabela normal
    act(() => result.current.toggle());
    expect(result.current.on).toBe(false);
    expect(result.current.rows).toBeNull();
    expect(result.current.available).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_STANDINGS_REFRESH_MS * 2);
    });
    expect(fetchMock.mock.calls.length).toBe(callsAfterOn + 1);
  });

  it('quando os jogos acabam, desliga sozinho e esconde o botão', async () => {
    fetchMock.mockResolvedValue([row({ live: true })]);
    const { result } = renderHook(() => useLiveStandings({ league: 'PL', enabled: true }));
    await flush();
    act(() => result.current.toggle());
    await flush();
    expect(result.current.on).toBe(true);

    fetchMock.mockResolvedValue([row()]); // ninguém mais jogando
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_STANDINGS_REFRESH_MS);
    });
    expect(result.current.on).toBe(false);
    expect(result.current.available).toBe(false);
    expect(result.current.rows).toBeNull();
  });

  it('falha de rede não desliga nem esconde', async () => {
    fetchMock.mockResolvedValue([row({ live: true })]);
    const { result } = renderHook(() => useLiveStandings({ league: 'PL', enabled: true }));
    await flush();
    act(() => result.current.toggle());
    await flush();

    fetchMock.mockResolvedValue(null);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_STANDINGS_REFRESH_MS);
    });
    expect(result.current.on).toBe(true);
    expect(result.current.available).toBe(true);
  });

  it('atualizar reavalia: o botão aparece se um jogo começou', async () => {
    fetchMock.mockResolvedValue([row()]);
    const { result } = renderHook(() => useLiveStandings({ league: 'BSA', enabled: true }));
    await flush();
    expect(result.current.available).toBe(false);

    fetchMock.mockResolvedValue([row({ live: true })]);
    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchMock).toHaveBeenLastCalledWith('/standings?league=BSA&live=true&nocache=true');
    expect(result.current.available).toBe(true);
  });

  it('temporada antiga ou liga sem classificação: nenhuma consulta', async () => {
    const { result } = renderHook(() => useLiveStandings({ league: 'BSA', season: '2024', enabled: false }));
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.available).toBe(false);
  });

  it('pausa enquanto a tabela está escondida', async () => {
    fetchMock.mockResolvedValue([row({ live: true })]);
    const { result, rerender } = renderHook(({ active }) => useLiveStandings({ league: 'BSA', enabled: true, active }), {
      initialProps: { active: true },
    });
    await flush();
    act(() => result.current.toggle());
    await flush();
    const calls = fetchMock.mock.calls.length;
    rerender({ active: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_STANDINGS_REFRESH_MS * 2);
    });
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});
