// Datas da API e formatação em pt-BR, sempre no fuso do aparelho.
// Regra: nunca new Date(string) direto nas telas; use parseMatchDate.

// Lê as datas da API: "2026-10-15 00:30:00+00", "2026-10-15T00:30:00Z", "2026-10-18T13:00Z"
// ou sem fuso (tratada como UTC)
export function parseMatchDate(value: unknown): Date | null {
  let raw = String(value ?? '').trim();
  if (!raw) return null;
  raw = raw.replace(' ', 'T');
  // Só mexe no fuso quando há horário (em "2026-10-04" o "-04" é o dia, não o fuso)
  if (raw.includes('T')) {
    if (/T[\d:.]+[+-]\d{2}$/.test(raw)) raw += ':00'; // +00 -> +00:00
    else if (/T[\d:.]+[+-]\d{4}$/.test(raw)) raw = raw.replace(/(\d{2})(\d{2})$/, '$1:$2'); // +0000 -> +00:00
    else if (!/(Z|[+-]\d{2}:\d{2})$/i.test(raw)) raw += 'Z';
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const getMatchDate = (m: { date_event?: string; match_date?: string } | null | undefined) =>
  parseMatchDate(m?.date_event || m?.match_date);

export const matchTime = (m: { date_event?: string; match_date?: string } | null | undefined) =>
  getMatchDate(m)?.getTime() || 0;

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-18" no fuso do aparelho */
export const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayKey = () => toDateKey(new Date());

/** "2026-10-18" -> Date ao meio-dia local (sem passar string ao Date) */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

export function addDays(key: string, days: number) {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "21:30" */
export const formatTime = (date: Date | null) =>
  date ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

/** "18/10" */
export const formatShortDate = (date: Date | null) => (date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}` : '');

/** "18/10/2026" */
export const formatFullDate = (date: Date | null) => (date ? date.toLocaleDateString('pt-BR') : '');

/** "Domingo, 18 de outubro" */
export const formatDayLabel = (date: Date) =>
  capitalize(date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }));

/** "Hoje", "Amanhã" ou "domingo, 11 de outubro" */
export function formatRelativeDay(date: Date | null) {
  if (!date) return 'Data a definir';
  const key = toDateKey(date);
  if (key === todayKey()) return 'Hoje';
  if (key === addDays(todayKey(), 1)) return 'Amanhã';
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

/** "15/2 - 27/2": período de uma lista de datas */
export function formatDateRange(times: number[]) {
  const valid = times.filter(t => t > 0);
  if (valid.length === 0) return '';
  const fmt = (t: number) => {
    const d = new Date(t);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  const first = fmt(Math.min(...valid));
  const last = fmt(Math.max(...valid));
  return first === last ? first : `${first} - ${last}`;
}

/** "outubro de 2026" */
export const formatMonthYear = (date: Date) => date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

// Idade a partir de "1997-06-20" ou "1997-06-20T07:00Z" (só a parte da data conta)
export function calculateAge(dateOfBirth: unknown, now = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateOfBirth ?? ''));
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (!y || !m || !d) return null;
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

// "21:40" (hoje) ou "09/10 21:40" (outro dia)
export function formatCachedAt(ts: number) {
  const date = new Date(ts);
  const time = formatTime(date);
  return toDateKey(date) === todayKey() ? time : `${formatShortDate(date)} ${time}`;
}
