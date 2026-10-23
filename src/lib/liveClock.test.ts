import { getLiveClock } from './liveClock';

const AT = '2026-10-23T23:06:56Z';
const at = Date.parse(AT);
const running = (clock_seconds: number, period: number) => ({ clock: "35'", clock_seconds, clock_at: AT, clock_running: true, period });

describe('relógio ao vivo', () => {
  it('sem clock_seconds/clock_at (backend antigo): o texto da ESPN', () => {
    expect(getLiveClock({ clock: "35'" }, at).text).toBe("35'");
    expect(getLiveClock({ clock: "35'", clock_seconds: 2100 }, at)).toEqual({ text: "35'", nextChangeMs: null });
    expect(getLiveClock({ clock: 'pre' }, at).text).toBe('');
  });

  it('anda sozinho a partir da leitura da ESPN', () => {
    expect(getLiveClock(running(2100, 1), at).text).toBe("35'");
    expect(getLiveClock(running(2100, 1), at + 2 * 60_000 + 5_000).text).toBe("37'");
    // segundo tempo começa em 45 min
    expect(getLiveClock(running(2700, 2), at + 60_000).text).toBe("46'");
  });

  it('acréscimos depois do fim do período', () => {
    expect(getLiveClock(running(2700, 1), at).text).toBe("45'");
    expect(getLiveClock(running(2700, 1), at + 2 * 60_000).text).toBe("45+2'");
    expect(getLiveClock(running(5400, 2), at + 3 * 60_000).text).toBe("90+3'");
    expect(getLiveClock(running(6300, 3), at + 60_000).text).toBe("105+1'");
    expect(getLiveClock(running(7200, 4), at).text).toBe("120'");
  });

  it('nunca menos que a leitura nem mais que 15 min além do período', () => {
    expect(getLiveClock(running(2100, 1), at - 5 * 60_000).text).toBe("35'");
    expect(getLiveClock(running(2100, 1), at + 3 * 3600_000)).toEqual({ text: "45+15'", nextChangeMs: null });
  });

  it('agenda a próxima virada de minuto', () => {
    // 35:00 + 20 s -> faltam 40 s para o 36'
    expect(getLiveClock(running(2100, 1), at + 20_000).nextChangeMs).toBe(40_000);
    expect(getLiveClock(running(2130, 1), at).nextChangeMs).toBe(30_000);
  });

  it('parado: intervalo, pênaltis ou o texto da ESPN', () => {
    const stopped = (period: number) => ({ clock: "45'+3'", clock_seconds: 2700, clock_at: AT, clock_running: false, period });
    expect(getLiveClock(stopped(1), at + 600_000)).toEqual({ text: 'Intervalo', nextChangeMs: null });
    expect(getLiveClock(stopped(5), at).text).toBe('Pênaltis');
    expect(getLiveClock(stopped(2), at).text).toBe("45'+3'");
  });
});
