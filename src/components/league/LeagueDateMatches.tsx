'use client';

import { CalendarDays } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FollowStar } from '@/components/FollowStar';
import { MatchListSkeleton, MatchRow } from '@/components/match/MatchRow';
import { EndSentinel, PreviousButton, SectionPill } from '@/components/ui/ListParts';
import { RefreshBar } from '@/components/ui/RefreshBar';
import { ErrorState, InfoCard, OutlineButton } from '@/components/ui/States';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useOnSignal } from '@/hooks/useOnSignal';
import { useRememberedState, type ScreenMemory } from '@/hooks/useScreenMemory';
import { buildEndpoint, fetchApi, getCachedApi } from '@/lib/api';
import { formatDayLabel, fromDateKey, getMatchDate, matchTime, todayKey, toDateKey } from '@/lib/dates';
import { getEspnMatchId, getStageLabel, isFinishedMatch, matchKey, sortByDate } from '@/lib/matches';
import { matchHref } from '@/lib/routes';
import { asArray, type CalendarDay, type Match } from '@/lib/types';

type Props = {
  code: string;
  season: string;
  isCurrentSeason: boolean;
  /** Data escolhida no calendário (vazio: hoje, ou o fim da temporada antiga) */
  initialDate: string;
  memory: ScreenMemory;
  refreshSignal: number;
  onInfo: (match: Match) => void;
  onOpenCalendar: () => void;
};

const MONTHS_TO_SEARCH = 12;
const pad = (n: number) => String(n).padStart(2, '0');

// Próximo (ou anterior) dia com jogo, pelo calendário da liga, mês a mês.
// null = não há; undefined = falhou (sem rede)
async function findDateWithGames(code: string, from: string, direction: 'next' | 'prev'): Promise<string | null | undefined> {
  const start = fromDateKey(from);
  for (let i = 0; i < MONTHS_TO_SEARCH; i++) {
    const month = new Date(start.getFullYear(), start.getMonth() + (direction === 'next' ? i : -i), 1);
    const raw = await fetchApi(
      buildEndpoint('/matches/calendar', { leagues: code, month: pad(month.getMonth() + 1), year: month.getFullYear() }),
    );
    if (raw == null) return undefined;
    const days = asArray<CalendarDay>(raw)
      .filter(day => Number(day.count) > 0)
      .map(day => day.date)
      .sort();
    const found = direction === 'next' ? days.find(d => d > from) : [...days].reverse().find(d => d < from);
    if (found) return found;
  }
  return null;
}

const dayMatches = (raw: unknown) => sortByDate(asArray<Match>(raw));

// Copas sem fases no cadastro (Copa do Mundo, Liga das Nações): navegação por data, como na home
export function LeagueDateMatches({ code, season, isCurrentSeason, initialDate, memory, refreshSignal, onInfo, onOpenCalendar }: Props) {
  const scope = `datas:${season}:${initialDate}`;
  const [dates, setDates] = useRememberedState<string[]>(memory, `${scope}:dias`, []);
  const [byDate, setByDate] = useRememberedState<Record<string, Match[]>>(memory, `${scope}:jogos`, {});
  const [noMore, setNoMore] = useRememberedState(memory, `${scope}:fim`, { prev: false, next: false });
  const [loading, setLoading] = useState(dates.length === 0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const restored = useRef(memory.restore && dates.length > 0);

  useEffect(() => {
    if (restored.current) return;
    let cancelled = false;
    setFailed(false);
    (async () => {
      let start = initialDate || (isCurrentSeason ? todayKey() : '');
      // Temporada antiga: começa no último jogo dela
      if (!start) {
        const raw = await fetchApi(buildEndpoint('/matches', { league: code, season }));
        const last = asArray<Match>(raw).sort((a, b) => matchTime(b) - matchTime(a))[0];
        const date = getMatchDate(last);
        start = date ? toDateKey(date) : todayKey();
      }
      if (cancelled) return;
      const endpoint = buildEndpoint('/matches', { league: code, date: start, season });
      const cached = getCachedApi(endpoint);
      if (cached != null) {
        setByDate({ [start]: dayMatches(cached) });
        setDates([start]);
        setLoading(false);
      }
      const raw = await fetchApi(endpoint);
      if (cancelled) return;
      if (raw != null) {
        setByDate({ [start]: dayMatches(raw) });
        setDates([start]);
      } else if (cached == null) {
        setFailed(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, season, isCurrentSeason, initialDate, attempt, setByDate, setDates]);

  const firstMatch = dates.map(d => byDate[d]?.[0]).find(Boolean);
  useEffect(() => {
    if (firstMatch) onInfo(firstMatch);
  }, [firstMatch, onInfo]);

  const loadMore = async (direction: 'next' | 'prev') => {
    if (busy.current || dates.length === 0 || noMore[direction]) return;
    busy.current = true;
    if (direction === 'prev') setLoadingPrev(true);
    try {
      const from = direction === 'next' ? dates[dates.length - 1] : dates[0];
      const target = await findDateWithGames(code, from, direction);
      if (target === undefined) return; // sem rede: tenta de novo depois
      if (target === null) {
        setNoMore(prev => ({ ...prev, [direction]: true }));
        return;
      }
      const raw = await fetchApi(buildEndpoint('/matches', { league: code, date: target, season }));
      if (raw == null) return;
      setByDate(prev => ({ ...prev, [target]: dayMatches(raw) }));
      setDates(prev => (prev.includes(target) ? prev : direction === 'next' ? [...prev, target] : [target, ...prev]));
    } finally {
      busy.current = false;
      setLoadingPrev(false);
    }
  };

  const sentinel = useInfiniteScroll(() => loadMore('next'), !loading && dates.length > 0 && !noMore.next);

  useOnSignal(refreshSignal, async () => {
    if (dates.length === 0) return;
    setRefreshing(true);
    const lists = await Promise.all(dates.map(date => fetchApi(buildEndpoint('/matches', { league: code, date, season, nocache: 'true' }))));
    setByDate(prev => {
      const next = { ...prev };
      dates.forEach((date, i) => {
        if (lists[i] != null) next[date] = dayMatches(lists[i]);
      });
      return next;
    });
    setRefreshing(false);
  });

  if (loading) return <MatchListSkeleton />;
  if (failed && dates.length === 0) {
    return (
      <ErrorState
        onRetry={() => {
          setLoading(true);
          setAttempt(n => n + 1);
        }}
      />
    );
  }

  const today = todayKey();
  return (
    <div className="pb-10">
      <RefreshBar active={refreshing} />
      {!noMore.prev && <PreviousButton label="Ver jogos anteriores" onClick={() => loadMore('prev')} loading={loadingPrev} />}
      {dates.map(date => {
        const matches = byDate[date] || [];
        return (
          <section key={date}>
            <SectionPill highlight={date === today}>
              {date === today ? 'Hoje • ' : ''}
              {formatDayLabel(fromDateKey(date))}
            </SectionPill>
            {matches.length === 0 ? (
              <InfoCard
                action={
                  <OutlineButton onClick={onOpenCalendar}>
                    Abrir Calendário <CalendarDays size={14} />
                  </OutlineButton>
                }
              >
                Não há partidas agendadas nesta data.
              </InfoCard>
            ) : (
              matches.map((match, index) => {
                // Linha da fase quando ela muda dentro do dia (ex: "Oitavas de final")
                const phase = getStageLabel(match.stage);
                const showPhase = !!phase && (index === 0 || getStageLabel(matches[index - 1].stage) !== phase);
                return (
                  <div key={matchKey(match, index)}>
                    {showPhase && (
                      <p className="mx-2.5 mb-1.5 mt-1 border-b border-card-2 bg-[#162032] px-3 py-2.5 text-xs font-bold uppercase text-ink">{phase}</p>
                    )}
                    <MatchRow
                      match={match}
                      href={matchHref(match, { league: code })}
                      aside={
                        !isFinishedMatch(match) && (
                          <FollowStar size={18} target={{ type: 'match', matchId: match.match_id, espnMatchId: getEspnMatchId(match) }} />
                        )
                      }
                    />
                  </div>
                );
              })
            )}
          </section>
        );
      })}
      <EndSentinel sentinelRef={sentinel} active={!noMore.next} endText="Não há mais jogos marcados." />
    </div>
  );
}
