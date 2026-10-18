'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FollowStar } from '@/components/FollowStar';
import { MatchListSkeleton, MatchRow } from '@/components/match/MatchRow';
import { EndSentinel, PreviousButton, SectionPill } from '@/components/ui/ListParts';
import { RefreshBar } from '@/components/ui/RefreshBar';
import { ErrorState, InfoCard } from '@/components/ui/States';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useOnSignal } from '@/hooks/useOnSignal';
import { useRememberedState, type ScreenMemory } from '@/hooks/useScreenMemory';
import { buildEndpoint, fetchApi } from '@/lib/api';
import { getMatchDate, todayKey, toDateKey } from '@/lib/dates';
import { getEspnMatchId, isFinishedMatch, matchKey, sortByDate } from '@/lib/matches';
import { matchHref } from '@/lib/routes';
import { asArray, type Match } from '@/lib/types';

type Props = {
  code: string;
  season: string;
  memory: ScreenMemory;
  refreshSignal: number;
  onInfo: (match: Match) => void;
};

const MAX_ROUND = 60;
// round 0 = jogo sem times definidos: fica fora das rodadas
const validRound = (m: Match) => Number(m.round) > 0;
const uniqueKey = (m: Match) => `${m.match_id || m.id_event || '0'}-${m.home_team}-${m.away_team}`;

function merge(current: Match[], incoming: Match[]) {
  const map = new Map<string, Match>();
  [...current, ...incoming].forEach(m => map.set(uniqueKey(m), m));
  return Array.from(map.values());
}

const isToday = (m: Match) => {
  const date = getMatchDate(m);
  return !!date && toDateKey(date) === todayKey();
};

// Pontos corridos: abre na rodada atual; rolar até o fim carrega a próxima, o botão do topo a anterior
export function LeagueRoundsMatches({ code, season, memory, refreshSignal, onInfo }: Props) {
  const scope = `rodadas:${season}`;
  const [matches, setMatches] = useRememberedState<Match[]>(memory, `${scope}:jogos`, []);
  const [hasMoreNext, setHasMoreNext] = useRememberedState(memory, `${scope}:mais`, true);
  const [loading, setLoading] = useState(matches.length === 0);
  const [failed, setFailed] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const restored = useRef(memory.restore && matches.length > 0);

  const rounds = useMemo(() => Array.from(new Set(matches.map(m => Number(m.round)))).sort((a, b) => a - b), [matches]);

  // Rodada atual: a cópia local aparece na hora e a rede atualiza
  useEffect(() => {
    if (restored.current) return;
    let cancelled = false;
    const apply = (raw: unknown) => {
      const list = asArray<Match>(raw).filter(validRound);
      if (list.length) setMatches(list);
    };
    fetchApi(buildEndpoint('/matches', { league: code, season }), {}, {
      onCached: raw => {
        if (cancelled) return;
        apply(raw);
        setLoading(false);
      },
    }).then(raw => {
      if (cancelled) return;
      if (raw != null) apply(raw);
      setFailed(raw == null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [code, season, setMatches]);

  useEffect(() => {
    if (matches[0]) onInfo(matches[0]);
  }, [matches, onInfo]);

  const loadRound = async (direction: 'next' | 'prev') => {
    if (busy.current || rounds.length === 0 || (direction === 'next' && !hasMoreNext)) return;
    const target = direction === 'next' ? rounds[rounds.length - 1] + 1 : rounds[0] - 1;
    if (target < 1 || target > MAX_ROUND) {
      if (direction === 'next') setHasMoreNext(false);
      return;
    }
    busy.current = true;
    if (direction === 'prev') setLoadingPrev(true);
    try {
      const raw = await fetchApi(buildEndpoint('/matches', { league: code, round: target, season }));
      if (raw == null) return; // falhou: tenta de novo no próximo rolar/toque
      const list = asArray<Match>(raw).filter(validRound);
      // Veio vazio: acabaram as rodadas
      if (list.length === 0) {
        if (direction === 'next') setHasMoreNext(false);
        return;
      }
      setMatches(prev => merge(prev, list));
    } finally {
      busy.current = false;
      setLoadingPrev(false);
    }
  };

  const sentinel = useInfiniteScroll(() => loadRound('next'), !loading && hasMoreNext && rounds.length > 0);

  // Atualizar: busca de novo as rodadas que estão na tela
  useOnSignal(refreshSignal, async () => {
    if (rounds.length === 0) return;
    setRefreshing(true);
    const lists = await Promise.all(
      rounds.map(round => fetchApi(buildEndpoint('/matches', { league: code, round, season, nocache: 'true' }))),
    );
    const fresh = lists.flatMap(raw => asArray<Match>(raw).filter(validRound));
    if (fresh.length) setMatches(prev => merge(prev, fresh));
    setRefreshing(false);
  });

  if (loading) return <MatchListSkeleton />;
  if (matches.length === 0) {
    return failed ? <ErrorState /> : <InfoCard>Nenhum jogo encontrado nesta temporada.</InfoCard>;
  }

  return (
    <div>
      <RefreshBar active={refreshing} />
      {rounds[0] > 1 && <PreviousButton label="Ver rodada anterior" onClick={() => loadRound('prev')} loading={loadingPrev} />}
      {rounds.map(round => (
        <section key={round}>
          <SectionPill>Rodada {round}</SectionPill>
          {sortByDate(matches.filter(m => Number(m.round) === round)).map((match, index) => (
            <MatchRow
              key={matchKey(match, index)}
              match={match}
              href={matchHref(match, { league: code })}
              showDate={!isToday(match)}
              aside={
                !isFinishedMatch(match) && (
                  <FollowStar size={18} target={{ type: 'match', matchId: match.match_id, espnMatchId: getEspnMatchId(match) }} />
                )
              }
            />
          ))}
        </section>
      ))}
      <EndSentinel sentinelRef={sentinel} active={hasMoreNext} endText="Fim da temporada" />
    </div>
  );
}
