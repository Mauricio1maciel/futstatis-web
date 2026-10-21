'use client';

import { CalendarDays, Flag, PersonStanding } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { PlayerStatsSection } from '@/components/player/PlayerStatsSection';
import { Crest } from '@/components/ui/Crest';
import { NotFoundState } from '@/components/ui/ScreenFallback';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { TopBar } from '@/components/ui/TopBar';
import { useApi } from '@/hooks/useApi';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { buildEndpoint } from '@/lib/api';
import { calculateAge } from '@/lib/dates';
import { translatePosition } from '@/lib/positions';
import { getPreview } from '@/lib/preview';
import { teamHref } from '@/lib/routes';
import type { Player } from '@/lib/types';

export function PlayerRoute() {
  const id = (useSearchParams().get('id') || '').trim();
  if (!id) return <NotFoundState />;
  return <PlayerScreen key={id} id={id} />;
}

function InfoCard({ icon, label, value, loading }: { icon: ReactNode; label: string; value: string; loading: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-xl border border-card-2 bg-card-3 px-2 py-4 text-center">
      <span className="text-accent">{icon}</span>
      <span className="mb-1 mt-2 text-xs text-muted">{label}</span>
      {loading ? <Skeleton className="h-3.5 w-14" /> : <span className="w-full truncate text-sm font-bold text-ink">{value || '--'}</span>}
    </div>
  );
}

// Jogador (/details?api_id=X&type=player): foto, nome, time, posição, idade, nacionalidade e número
function PlayerScreen({ id }: { id: string }) {
  const [preview] = useState(() => getPreview<Partial<Player> & { jersey?: string }>('player', id));
  const { data, loading, error, refresh } = useApi<Player>(buildEndpoint('/details', { api_id: id, type: 'player' }));
  const player: Partial<Player> = { ...preview, ...Object.fromEntries(Object.entries(data ?? {}).filter(([, v]) => v !== '' && v != null)) };

  const waiting = loading && !player.name;
  const age = calculateAge(player.date_of_birth);
  const jersey = String(player.jersey_number || preview?.jersey || '');
  // O time da resposta do /details vem com o api_id (o da escalação é o da ESPN): só ele vira link
  const teamId = data?.team_id && Number(data.team_id) > 0 ? data.team_id : null;

  useDocumentTitle(player.name);
  useScrollRestoration(`jogador:${id}`, !loading);

  if (error && !player.name) {
    return (
      <div>
        <TopBar title="Detalhes do Jogador" />
        <ErrorState text="Não foi possível carregar o jogador" onRetry={() => refresh()} />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <TopBar title="Detalhes do Jogador" />
      <div className="flex flex-col items-center px-5 pb-6 pt-4">
        <div className="relative mb-4">
          {waiting ? (
            <Skeleton className="h-30 w-30 rounded-full" />
          ) : (
            <Crest src={player.headshot_url} size={120} person name={player.name} alt={player.name} className="border-4 border-card-2" />
          )}
          {!waiting && jersey && jersey !== '0' && (
            <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-screen bg-accent text-sm font-bold text-white">
              {jersey}
            </span>
          )}
        </div>
        {waiting ? (
          <>
            <Skeleton className="mb-2 h-7 w-44" />
            <Skeleton className="h-4 w-28" />
          </>
        ) : (
          <>
            <h1 className="text-center text-2xl font-bold text-white">{player.name}</h1>
            {player.team_name &&
              (teamId ? (
                <Link href={teamHref(teamId)} className="mt-1 text-base text-accent">
                  {player.team_name}
                </Link>
              ) : (
                <p className="mt-1 text-base text-muted">{player.team_name}</p>
              ))}
          </>
        )}
      </div>

      <div className="flex gap-2.5 px-4">
        <InfoCard icon={<PersonStanding size={20} />} label="Posição" value={translatePosition(player.position)} loading={waiting} />
        <InfoCard icon={<CalendarDays size={20} />} label="Idade" value={age != null ? `${age} anos` : ''} loading={waiting} />
        <InfoCard icon={<Flag size={20} />} label="Nac." value={player.nationality || ''} loading={waiting} />
      </div>

      <PlayerStatsSection playerId={id} />
    </div>
  );
}
