'use client';

import { ChevronDown, ChevronUp, Search, Star } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getLeagueName } from '@/config/leagues';
import { MatchRow, MatchRowSkeleton } from '@/components/match/MatchRow';
import { Crest } from '@/components/ui/Crest';
import { useApi } from '@/hooks/useApi';
import { useFollows } from '@/hooks/useFollows';
import { useInterval } from '@/hooks/useInterval';
import { useOnSignal } from '@/hooks/useOnSignal';
import { usePushSupport } from '@/hooks/usePushSupport';
import { addDays, formatRelativeDay, getMatchDate, toDateKey, todayKey } from '@/lib/dates';
import { followingEndpoint } from '@/lib/follows';
import { isLiveMatch, matchKey } from '@/lib/matches';
import { matchHref } from '@/lib/routes';
import { asArray, type Match } from '@/lib/types';

const LIVE_REFRESH_MS = 30000;
// Fechada, a seção mostra só os primeiros jogos de hoje em diante (e os ao vivo)
const COLLAPSED_COUNT = 5;

const parse = (raw: unknown) =>
  asArray<Match>(raw).map(m => ({ ...m, status: m.status || m.state, date_event: m.date_event || m.match_date }));

function dayLabel(key: string, date: Date | null) {
  if (key === addDays(todayKey(), -1)) return 'Ontem';
  const label = formatRelativeDay(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type Day = { key: string; label: string; matches: Match[] };

function groupByDay(matches: Match[]): Day[] {
  const days: Day[] = [];
  matches.forEach(m => {
    const date = getMatchDate(m);
    const key = date ? toDateKey(date) : '';
    let day = days.find(d => d.key === key);
    if (!day) {
      day = { key, label: dayLabel(key, date), matches: [] };
      days.push(day);
    }
    day.matches.push(m);
  });
  return days;
}

function Header() {
  return (
    <h2 className="flex items-center gap-2 px-2.5 pb-2 pt-4 text-[13px] font-bold text-ink">
      <Star size={15} className="fill-gold-2 text-gold-2" /> Meus jogos
    </h2>
  );
}

// "Meus jogos" no topo da tela inicial: jogos dos times, ligas e jogos seguidos (/matches/following),
// de ontem até daqui a 7 dias, por dia. Só onde dá para seguir (notificações disponíveis)
export function FollowingMatches({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const support = usePushSupport();
  const follows = useFollows();
  const endpoint = followingEndpoint(follows);
  const { data, loading, refresh } = useApi(support === 'ok' ? endpoint : null, { parse });
  const [expanded, setExpanded] = useState(false);
  const matches = useMemo(() => data ?? [], [data]);
  const hasLive = matches.some(isLiveMatch);

  useOnSignal(refreshSignal, () => {
    if (endpoint) refresh();
  });
  useInterval(() => refresh(), hasLive ? LIVE_REFRESH_MS : null);

  // Fechada: ao vivo + de hoje em diante, até COLLAPSED_COUNT jogos (ontem só aberta)
  const visible = useMemo(() => {
    if (expanded) return matches;
    const today = todayKey();
    const upcoming = matches.filter(m => {
      const date = getMatchDate(m);
      return isLiveMatch(m) || !date || toDateKey(date) >= today;
    });
    return upcoming.slice(0, Math.max(COLLAPSED_COUNT, upcoming.filter(isLiveMatch).length));
  }, [matches, expanded]);
  const days = useMemo(() => groupByDay(visible), [visible]);

  if (support !== 'ok' || !follows.loaded) return null;

  if (!endpoint) {
    return (
      <section className="px-2.5">
        <Header />
        <div className="flex items-center gap-3 rounded-xl bg-card-2 px-4 py-3.5">
          <Star size={22} className="shrink-0 text-gold-2" />
          <p className="min-w-0 flex-1 text-[13px] text-muted">Siga seus times tocando na estrela para ver os jogos deles aqui.</p>
          <Link href="/busca/" className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent px-3 py-1.5 text-xs font-bold text-accent">
            <Search size={13} /> Buscar
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-2.5">
      <Header />
      {loading ? (
        <div className="space-y-1.5" aria-label="Carregando meus jogos">
          <MatchRowSkeleton variant="home" />
          <MatchRowSkeleton variant="home" />
        </div>
      ) : matches.length === 0 ? (
        <p className="rounded-xl bg-card-2 px-4 py-3.5 text-[13px] text-muted">Nenhum jogo de quem você segue entre ontem e os próximos 7 dias.</p>
      ) : (
        <>
          {days.map(day => (
            <div key={day.key} className="mb-2">
              <h3 className="px-1 pb-1.5 pt-1 text-xs font-bold text-muted">{day.label}</h3>
              <div className="space-y-1.5">
                {day.matches.map((match, index) => {
                  const live = isLiveMatch(match);
                  return (
                    <div key={matchKey(match, index)} className={`overflow-hidden rounded-xl bg-card-2 ${live ? 'ring-1 ring-live/70' : ''}`}>
                      <p className="flex items-center gap-1.5 px-3 pt-2 text-[11px] text-muted">
                        <Crest src={match.league_logo} size={14} />
                        <span className="truncate">{getLeagueName(match.league, match.league_name)}</span>
                        {live && <span className="ml-auto shrink-0 font-bold text-live">● AO VIVO</span>}
                      </p>
                      <MatchRow match={match} variant="home" href={matchHref(match, { league: match.league })} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {matches.length > visible.length || expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-[13px] font-bold text-accent"
            >
              {expanded ? (
                <>
                  Mostrar menos <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Ver todos ({matches.length}) <ChevronDown size={14} />
                </>
              )}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
