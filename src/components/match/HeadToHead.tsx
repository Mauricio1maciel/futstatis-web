'use client';

import { GitCompareArrows, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getLeagueName } from '@/config/leagues';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { useApi } from '@/hooks/useApi';
import { buildEndpoint } from '@/lib/api';
import { formatFullDate, getMatchDate } from '@/lib/dates';
import { matchKey, teamDisplayName } from '@/lib/matches';
import { setMatchPreview } from '@/lib/preview';
import { matchHref } from '@/lib/routes';
import type { H2H } from '@/lib/types';
import { Score } from './Score';

const wins = (n: number) => `${n} ${n === 1 ? 'vitória' : 'vitórias'}`;

// Confronto direto (/h2h): resumo com barra de três partes e a lista dos últimos jogos.
// team1 = mandante deste jogo, team2 = visitante (funciona também para jogos futuros)
export function HeadToHead({ homeId, awayId, homeName, awayName }: { homeId?: unknown; awayId?: unknown; homeName?: string; awayName?: string }) {
  const valid = (id: unknown) => id != null && Number(id) > 0;
  const endpoint = valid(homeId) && valid(awayId) ? buildEndpoint('/h2h', { team1: String(homeId), team2: String(awayId), limit: 10 }) : null;
  const { data, loading, error, refresh } = useApi<H2H>(endpoint);

  if (!endpoint) return <EmptyState compact icon={GitCompareArrows} text="Confronto direto disponível quando os dois times estiverem definidos." />;
  if (loading) return <Loader2 className="mx-auto mt-8 animate-spin text-accent" size={26} aria-label="Carregando" />;
  // Falha de rede não pode virar "primeiro confronto": oferece nova tentativa
  if (error || !data?.summary) return <ErrorState onRetry={() => refresh()} />;
  if (!data.summary.played) return <EmptyState compact icon={GitCompareArrows} text="Primeiro confronto registrado" />;

  const { played, team1_wins = 0, draws = 0, team2_wins = 0, team1_goals = 0, team2_goals = 0 } = data.summary;
  return (
    <div className="p-4">
      <div className="mb-5 rounded-xl bg-card p-4">
        {/* Decisão por pênaltis conta como empate no resumo (regra do backend) */}
        <p className="text-center text-sm leading-5 text-ink-2">
          <span className="font-bold text-accent">
            {teamDisplayName(homeName)} {wins(team1_wins)}
          </span>
          {` · ${draws} ${draws === 1 ? 'empate' : 'empates'} · `}
          <span className="font-bold text-away">
            {wins(team2_wins)} {teamDisplayName(awayName)}
          </span>
        </p>
        <div className="mt-3 flex h-2 gap-0.75 overflow-hidden rounded-full">
          {team1_wins > 0 && <span className="h-full bg-accent" style={{ flexGrow: team1_wins }} />}
          {draws > 0 && <span className="h-full bg-faint" style={{ flexGrow: draws }} />}
          {team2_wins > 0 && <span className="h-full bg-away" style={{ flexGrow: team2_wins }} />}
        </div>
        <p className="mt-2.5 text-center text-xs text-muted">
          {played} {played === 1 ? 'jogo' : 'jogos'} · Gols {team1_goals} - {team2_goals}
        </p>
      </div>

      <h3 className="mb-2.5 text-xs font-bold uppercase text-muted">Últimos jogos</h3>
      <ul className="space-y-2">
        {(data.matches || []).map((match, index) => (
          <li key={matchKey(match, index)}>
            <Link
              href={matchHref(match)}
              onClick={() => setMatchPreview(match)}
              className="block rounded-[10px] bg-card px-3 py-2.5 active:bg-white/5"
            >
              <span className="mb-1.5 flex justify-between gap-3 text-[11px] text-gray-500">
                <span>{formatFullDate(getMatchDate(match))}</span>
                <span className="truncate">{getLeagueName(match.league, match.league_name)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className={`min-w-0 flex-1 truncate text-right text-[13px] ${match.winner === 'HOME_TEAM' ? 'font-bold text-white' : 'text-ink-2'}`}>
                  {teamDisplayName(match.home_team)}
                </span>
                <Score match={match} className="text-sm" penaltyClassName="text-[11px]" />
                <span className={`min-w-0 flex-1 truncate text-[13px] ${match.winner === 'AWAY_TEAM' ? 'font-bold text-white' : 'text-ink-2'}`}>
                  {teamDisplayName(match.away_team)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
