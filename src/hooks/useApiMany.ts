import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchApi, getCachedApi, withParams, type QueryParams } from '@/lib/api';

export type ApiManyState<T> = {
  /** Uma posição por endpoint (null = ainda sem dado) */
  data: (T | null)[] | null;
  loading: boolean;
  refreshing: boolean;
  error: boolean;
};

// Vários endpoints em paralelo (fases da liga, colunas do chaveamento), com a cópia local na hora.
// Um endpoint que falhar mantém o que já havia
export function useApiMany<T>(endpoints: string[] | null, parse: (raw: unknown) => T) {
  const key = endpoints ? endpoints.join('|') : '';
  const parseRef = useRef(parse);
  useEffect(() => {
    parseRef.current = parse;
  });
  const [state, setState] = useState<ApiManyState<T>>({ data: null, loading: !!key, refreshing: false, error: false });
  const requestId = useRef(0);

  const run = useCallback(async (list: string[], refresh: boolean, params?: QueryParams) => {
    const id = ++requestId.current;
    const toData = (raw: unknown) => (raw == null ? null : parseRef.current(raw));

    if (refresh) {
      setState(s => ({ ...s, refreshing: true }));
    } else {
      const cached = list.map(endpoint => toData(getCachedApi(endpoint)));
      const hasCache = cached.some(item => item != null);
      setState({ data: hasCache ? cached : null, loading: !hasCache, refreshing: false, error: false });
    }

    const results = await Promise.all(list.map(endpoint => fetchApi<unknown>(params ? withParams(endpoint, params) : endpoint)));
    if (id !== requestId.current) return;
    setState(s => {
      const merged = results.map((raw, i) => toData(raw) ?? s.data?.[i] ?? null);
      const any = merged.some(item => item != null);
      return { data: any ? merged : s.data, loading: false, refreshing: false, error: !any };
    });
  }, []);

  useEffect(() => {
    if (key) run(key.split('|'), false);
  }, [key, run]);

  const refresh = useCallback(
    (params?: QueryParams) => (key ? run(key.split('|'), true, params) : Promise.resolve()),
    [key, run],
  );

  return { ...state, refresh };
}
