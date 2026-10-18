import { useCallback, useEffect, useRef, useState } from 'react';
import { buildEndpoint, fetchApi } from '@/lib/api';
import { hasLiveTeams } from '@/lib/standings';
import { asArray, type StandingRow } from '@/lib/types';
import { useInterval } from './useInterval';

export const LIVE_STANDINGS_REFRESH_MS = 30000;

type Options = {
  league: string;
  season?: string;
  /** Só na temporada atual e em competição com classificação */
  enabled: boolean;
  /** Tabela visível? Escondida, para de recarregar */
  active?: boolean;
};

export type LiveStandings = {
  /** Mostrar o botão "Ao vivo" (algum time jogando agora) */
  available: boolean;
  /** Botão ligado: a tabela usa os dados ao vivo */
  on: boolean;
  /** Linhas ao vivo (só com o botão ligado) */
  rows: StandingRow[] | null;
  toggle: () => void;
  /** Recarrega a classificação ao vivo (e reavalia se ainda há jogo rolando) */
  refresh: () => Promise<void>;
};

// Classificação ao vivo (/standings?live=true): a tabela como estaria se os jogos em andamento
// acabassem agora. Ao abrir, uma consulta só para saber se algum time está jogando; sem ninguém
// jogando o botão fica escondido. Ligado, recarrega a cada 30 s; quando os jogos acabam, desliga sozinho.
export function useLiveStandings({ league, season, enabled, active = true }: Options): LiveStandings {
  const endpoint = enabled && league ? buildEndpoint('/standings', { league, season, live: 'true' }) : null;
  const [available, setAvailable] = useState(false);
  const [on, setOn] = useState(false);
  const [rows, setRows] = useState<StandingRow[] | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (fresh: boolean) => {
      if (!endpoint) return;
      const id = ++requestId.current;
      const data = await fetchApi<unknown>(fresh ? `${endpoint}&nocache=true` : endpoint);
      // Falha de rede: mantém como está (o aviso de conexão já aparece)
      if (id !== requestId.current || data == null) return;
      const list = asArray<StandingRow>(data);
      const live = hasLiveTeams(list);
      setRows(list);
      setAvailable(live);
      // Os jogos acabaram: desliga e esconde o botão
      if (!live) setOn(false);
    },
    [endpoint],
  );

  // Consulta inicial (e de novo se a liga/temporada mudar). Desligado (temporada antiga), uma
  // resposta ainda a caminho é descartada
  useEffect(() => {
    setAvailable(false);
    setOn(false);
    setRows(null);
    if (endpoint) load(false);
    else requestId.current++;
  }, [endpoint, load]);

  useInterval(() => load(false), on && active && endpoint ? LIVE_STANDINGS_REFRESH_MS : null);

  const toggle = useCallback(() => {
    if (on) {
      setOn(false);
      return;
    }
    setOn(true);
    load(true);
  }, [on, load]);

  const refresh = useCallback(() => load(true), [load]);

  return { available, on, rows: on ? rows : null, toggle, refresh };
}
