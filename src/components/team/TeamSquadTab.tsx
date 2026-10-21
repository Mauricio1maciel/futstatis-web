'use client';

import Link from 'next/link';
import { Crest } from '@/components/ui/Crest';
import { RefreshBar } from '@/components/ui/RefreshBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { useApi } from '@/hooks/useApi';
import { useOnSignal } from '@/hooks/useOnSignal';
import { buildEndpoint } from '@/lib/api';
import { calculateAge } from '@/lib/dates';
import { getPositionGroup, SQUAD_GROUP_ORDER } from '@/lib/positions';
import { setPreview } from '@/lib/preview';
import { playerHref } from '@/lib/routes';
import { asArray, type Player } from '@/lib/types';

// Elenco da liga principal do time, agrupado por posição. Tocar abre o jogador
export function TeamSquadTab({ teamId, league, teamName, refreshSignal }: { teamId: string; league: string; teamName?: string; refreshSignal: number }) {
  const { data, loading, error, refreshing, refresh } = useApi(league ? buildEndpoint('/team/players', { teamID: teamId, league }) : null, {
    parse: asArray<Player>,
  });
  useOnSignal(refreshSignal, () => refresh({ nocache: 'true' }));

  if (!league || loading) {
    return (
      <div className="space-y-2 pt-3" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3.5 rounded-lg bg-card p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (error) return <ErrorState onRetry={() => refresh()} />;
  const players = data ?? [];
  if (players.length === 0) return <p className="py-8 text-center text-sm text-muted">Nenhum jogador encontrado para este time.</p>;

  const groups = SQUAD_GROUP_ORDER.map(name => ({ name, players: players.filter(p => getPositionGroup(p.position) === name) })).filter(
    g => g.players.length > 0,
  );

  return (
    <div>
      <RefreshBar active={refreshing} />
      {groups.map(group => (
        <section key={group.name} className="mb-5 mt-3">
          <h3 className="mb-1.5 border-b border-line px-1 pb-2 text-[13px] font-bold uppercase tracking-wide text-muted">{group.name}</h3>
          <ul>
            {group.players.map((player, index) => {
              const age = calculateAge(player.date_of_birth);
              const info = [player.nationality, age != null ? `${age} anos` : ''].filter(Boolean).join(' • ');
              return (
                <li key={`${player.id}-${index}`}>
                  <Link
                    href={playerHref(player.id)}
                    onClick={() => setPreview('player', player.id, { ...player, team_name: player.team_name || teamName })}
                    className="flex items-center gap-3.5 rounded-lg px-1 py-2.5 active:bg-white/5"
                  >
                    <Crest src={player.headshot_url} size={40} person name={player.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{player.name}</span>
                      {info && <span className="mt-0.5 block truncate text-xs text-muted">{info}</span>}
                    </span>
                    {!!player.jersey_number && Number(player.jersey_number) > 0 && (
                      <span className="text-xs font-bold text-faint">#{player.jersey_number}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
