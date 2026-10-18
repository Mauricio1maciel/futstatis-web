import { LEAGUE_CODES } from '@/config/leagues';
import { storageGetJson, storageSet } from './storage';

const FAVORITES_KEY = 'futebol_favorites';

// Se o usuário nunca escolheu nada, o padrão é mostrar todas
export function getFavoriteLeagues(): string[] {
  const saved = storageGetJson<unknown>(FAVORITES_KEY);
  if (!Array.isArray(saved)) return [...LEAGUE_CODES];
  // Na ordem do cadastro; códigos que saíram do cadastro ficam de fora
  return LEAGUE_CODES.filter(code => saved.includes(code));
}

export function saveFavoriteLeagues(codes: string[]) {
  storageSet(FAVORITES_KEY, JSON.stringify(codes));
}
