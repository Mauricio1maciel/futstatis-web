import { getEspnMatchId } from './matches';
import type { Match } from './types';

// O que a tela anterior já sabe (nome, escudo, placar...) vai junto ao abrir a próxima: o cabeçalho
// aparece na hora, enquanto a API responde. Só em memória: um link aberto direto busca tudo na API.

export type PreviewKind = 'match' | 'team' | 'player' | 'league';

const MAX_PREVIEWS = 300;
const previews = new Map<string, unknown>();

export function setPreview(kind: PreviewKind, id: unknown, data: unknown) {
  if (id == null || String(id) === '' || String(id) === '0') return;
  const key = `${kind}:${String(id).toUpperCase()}`;
  previews.delete(key);
  previews.set(key, data);
  if (previews.size > MAX_PREVIEWS) {
    const oldest = previews.keys().next().value;
    if (oldest !== undefined) previews.delete(oldest);
  }
}

export function getPreview<T>(kind: PreviewKind, id: unknown): T | undefined {
  if (id == null || String(id) === '') return undefined;
  return previews.get(`${kind}:${String(id).toUpperCase()}`) as T | undefined;
}

// Jogo: pela mesma chave da rota (ID da ESPN ou, sem ele, o match_id)
export const setMatchPreview = (match: Match) => setPreview('match', getEspnMatchId(match) || match.match_id, match);
