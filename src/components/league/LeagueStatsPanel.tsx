'use client';

import Link from 'next/link';
import { Crest } from '@/components/ui/Crest';
import { Pills } from '@/components/ui/Pills';
import { RefreshBar } from '@/components/ui/RefreshBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState, InfoCard } from '@/components/ui/States';
import { useApi } from '@/hooks/useApi';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useOnSignal } from '@/hooks/useOnSignal';
import { useRememberedState, type ScreenMemory } from '@/hooks/useScreenMemory';
import { buildEndpoint, refreshParams } from '@/lib/api';
import { setPreview } from '@/lib/preview';
import { playerHref } from '@/lib/routes';
import type { LeagueStats, LeagueStatsPlayer } from '@/lib/types';

type View = 'goals' | 'assists';

function StatRow({ player }: { player: LeagueStatsPlayer }) {
  const content = (
    <>
      <span className="w-7.5 shrink-0 text-center text-base font-bold text-faint">{player.rank}</span>
      <Crest src={player.photo} size={44} person name={player.name} className="mx-2.5" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-ink">{player.name}</span>
        <span className="mt-1 flex items-center gap-1.5">
          {player.team_logo && <Crest src={player.team_logo} size={14} />}
          <span className="truncate text-xs text-muted">{player.team}</span>
        </span>
      </span>
      <span className="ml-2 rounded-lg bg-accent/10 px-4 py-1.5 text-base font-bold text-accent">{player.value}</span>
    </>
  );
  const className = 'mb-2 flex items-center rounded-xl border border-card-2 bg-card-3 p-3';
  if (!player.player_id) return <div className={className}>{content}</div>;
  return (
    <Link
      href={playerHref(player.player_id)}
      onClick={() => setPreview('player', player.player_id, { name: player.name, team_name: player.team, headshot_url: player.photo })}
      className={`${className} active:bg-white/5`}
    >
      {content}
    </Link>
  );
}

// Artilharia e assistências (/league/stats). Com admin logado, o atualizar manda update=true (ESPN)
export function LeagueStatsPanel({
  code,
  season,
  memory,
  refreshSignal,
}: {
  code: string;
  season: string;
  memory: ScreenMemory;
  refreshSignal: number;
}) {
  const isAdmin = useIsAdmin();
  const [view, setView] = useRememberedState<View>(memory, 'estatisticas', 'goals');
  const { data, loading, error, refreshing, refresh } = useApi<LeagueStats>(buildEndpoint('/league/stats', { league: code, season }));
  useOnSignal(refreshSignal, () => refresh(refreshParams(isAdmin)));

  const list = (view === 'goals' ? data?.top_scorers : data?.top_assists) ?? [];

  return (
    <div>
      <Pills
        variant="outline"
        value={view}
        onChange={setView}
        options={[
          { value: 'goals', label: 'Artilharia' },
          { value: 'assists', label: 'Assistências' },
        ]}
        className="-mx-2.5 border-b border-card-2 px-2.5 pb-3"
      />
      <RefreshBar active={refreshing} />
      <div className="pt-4">
        {loading ? (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="mb-2 flex items-center gap-3 rounded-xl border border-card-2 bg-card-3 p-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-6 w-8 rounded-md" />
            </div>
          ))
        ) : error ? (
          <ErrorState onRetry={() => refresh()} />
        ) : list.length === 0 ? (
          <InfoCard>Estatísticas ainda não disponíveis para esta categoria.</InfoCard>
        ) : (
          list.map((player, index) => <StatRow key={`${player.player_id}-${index}`} player={player} />)
        )}
      </div>
    </div>
  );
}
