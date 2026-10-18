import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchApi, withParams, type QueryParams } from '@/lib/api';

export type ApiState<T> = {
  data: T | null;
  /** Primeira carga sem nada para mostrar (skeleton) */
  loading: boolean;
  /** "Atualizar" em andamento, com os dados antigos na tela */
  refreshing: boolean;
  /** Falhou e não há nada para mostrar */
  error: boolean;
};

type Options<T> = {
  enabled?: boolean;
  /** Mostra a cópia guardada na hora (padrão: sim) */
  cache?: boolean;
  /** Converte/valida a resposta (ex: asArray) */
  parse?: (raw: unknown) => T;
};

// Busca um endpoint: a cópia local aparece na hora e a rede atualiza depois.
// Trocar o endpoint (ex: outra temporada) limpa os dados e busca de novo; respostas atrasadas são ignoradas
export function useApi<T>(endpoint: string | null, { enabled = true, cache = true, parse }: Options<T> = {}) {
  const active = endpoint && enabled ? endpoint : null;
  const parseRef = useRef(parse);
  useEffect(() => {
    parseRef.current = parse;
  });
  const [state, setState] = useState<ApiState<T>>(() => ({ data: null, loading: !!active, refreshing: false, error: false }));
  const requestId = useRef(0);

  const run = useCallback(
    async (url: string, refresh: boolean) => {
      const id = ++requestId.current;
      const toData = (raw: unknown) => (parseRef.current ? parseRef.current(raw) : (raw as T));
      if (refresh) setState(s => ({ ...s, refreshing: true }));
      else setState({ data: null, loading: true, refreshing: false, error: false });

      const raw = await fetchApi<unknown>(url, {}, {
        onCached:
          !refresh && cache
            ? cached => {
                if (id === requestId.current) setState({ data: toData(cached), loading: false, refreshing: false, error: false });
              }
            : undefined,
      });
      if (id !== requestId.current) return;
      setState(s =>
        raw != null
          ? { data: toData(raw), loading: false, refreshing: false, error: false }
          : { ...s, loading: false, refreshing: false, error: s.data == null },
      );
    },
    [cache],
  );

  useEffect(() => {
    if (active) run(active, false);
  }, [active, run]);

  /** Busca de novo sem apagar a tela. params: ex. refreshParams(isAdmin) */
  const refresh = useCallback(
    (params?: QueryParams) => (active ? run(withParams(active, params), true) : Promise.resolve()),
    [active, run],
  );

  return { ...state, refresh };
}
