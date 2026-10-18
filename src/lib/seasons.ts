import { asArray } from './types';

function normalizeSeason(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return String(v.season || v.name || v.value || v.id || '');
  }
  return '';
}

// /seasons: ["2026", "2025"...] ou ["2026-2027", "2025-2026"...], da mais recente para a mais antiga
export function parseSeasons(raw: unknown): string[] {
  const seasons = Array.from(new Set(asArray<unknown>(raw).map(normalizeSeason).filter(Boolean)));
  return seasons.sort((a, b) => {
    const an = Number(a.replace(/\D/g, ''));
    const bn = Number(b.replace(/\D/g, ''));
    if (an && bn) return bn - an;
    return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
  });
}
