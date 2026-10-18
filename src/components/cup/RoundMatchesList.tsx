'use client';

import { MatchListSkeleton, MatchRow } from '@/components/match/MatchRow';
import { RefreshBar } from '@/components/ui/RefreshBar';
import { ErrorState, InfoCard } from '@/components/ui/States';
import { useApi } from '@/hooks/useApi';
import { useOnSignal } from '@/hooks/useOnSignal';
import { buildEndpoint } from '@/lib/api';
import { matchKey, sortByDate } from '@/lib/matches';
import { matchHref } from '@/lib/routes';
import { asArray, type Match } from '@/lib/types';

// Lista de uma fase inteira (ex: 16 avos de final), com a data em cada jogo
export function RoundMatchesList({
  league,
  round,
  season = '',
  emptyText,
  refreshSignal = 0,
}: {
  league: string;
  round: string;
  season?: string;
  emptyText: string;
  refreshSignal?: number;
}) {
  const { data, loading, error, refreshing, refresh } = useApi(buildEndpoint('/matches', { league, round, season }), {
    parse: raw => sortByDate(asArray<Match>(raw)),
  });
  useOnSignal(refreshSignal, () => refresh({ nocache: 'true' }));

  if (loading) return <MatchListSkeleton count={4} />;
  if (error) return <ErrorState onRetry={() => refresh()} />;
  if (!data?.length) return <InfoCard>{emptyText}</InfoCard>;
  return (
    <div className="-mx-2.5 pt-2.5">
      <RefreshBar active={refreshing} />
      {data.map((match, index) => (
        <MatchRow key={matchKey(match, index)} match={match} href={matchHref(match, { league })} showDate />
      ))}
    </div>
  );
}
