import type { Match } from './types';

export type LiveClockData = Pick<Match, 'clock' | 'clock_seconds' | 'clock_at' | 'clock_running' | 'period'>;

// Minuto em que cada período acaba: passou dele, são os acréscimos ("45+2'")
const PERIOD_END: Record<number, number> = { 1: 45, 2: 90, 3: 105, 4: 120 };
// O relógio não passa disso além do fim do período (o site ficou muito tempo sem atualizar)
const MAX_EXTRA_MINUTES = 15;

/** text: o que mostrar; nextChangeMs: quando o minuto vira (null = não muda sozinho) */
export type LiveClockState = { text: string; nextChangeMs: number | null };

// O minuto do jogo agora, contado a partir da última leitura da ESPN (clock_seconds em clock_at).
// Sem esses campos (backend antigo, ou jogo de outra lista), fica o texto da ESPN (clock)
export function getLiveClock(match: LiveClockData, now = Date.now()): LiveClockState {
  const espnText = match.clock && match.clock !== 'pre' ? match.clock : '';
  const fixed = (text: string): LiveClockState => ({ text, nextChangeMs: null });
  const readAt = match.clock_at ? Date.parse(match.clock_at) : NaN;
  if (typeof match.clock_seconds !== 'number' || !Number.isFinite(readAt)) return fixed(espnText);

  if (!match.clock_running) {
    if (match.period === 5) return fixed('Pênaltis');
    if (match.period === 1) return fixed('Intervalo');
    return fixed(espnText);
  }

  const end = PERIOD_END[match.period ?? 0];
  if (!end) return fixed(espnText);

  // Relógio do aparelho atrasado (agora < clock_at): não volta para antes da leitura da ESPN
  const seconds = match.clock_seconds + Math.max(0, now - readAt) / 1000;
  const minute = Math.min(Math.max(Math.floor(seconds / 60), Math.floor(match.clock_seconds / 60)), end + MAX_EXTRA_MINUTES);
  const text = minute > end ? `${end}+${minute - end}'` : `${minute}'`;
  if (minute >= end + MAX_EXTRA_MINUTES) return fixed(text);
  return { text, nextChangeMs: Math.max(0, ((minute + 1) * 60 - seconds) * 1000) };
}

/** Só os campos do relógio de um jogo (para guardar na tela do jogo e passar pela rota) */
export const pickClock = (m: LiveClockData | null | undefined): LiveClockData => ({
  clock: m?.clock && m.clock !== 'pre' ? m.clock : '',
  clock_seconds: m?.clock_seconds,
  clock_at: m?.clock_at,
  clock_running: m?.clock_running,
  period: m?.period,
});
