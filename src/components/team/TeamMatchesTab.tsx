'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FollowStar } from '@/components/FollowStar';
import { MatchListSkeleton, MatchRow, ResultBadge } from '@/components/match/MatchRow';
import { PreviousButton } from '@/components/ui/ListParts';
import { ErrorState, InfoCard } from '@/components/ui/States';
import { useRememberedState, type ScreenMemory } from '@/hooks/useScreenMemory';
import { formatRelativeDay, getMatchDate } from '@/lib/dates';
import { getEspnMatchId, getResultForTeam, getTeamMatchPhaseText, isFinishedMatch, isLiveMatch, matchKey } from '@/lib/matches';
import { setPreview } from '@/lib/preview';
import { leagueHref, matchHref } from '@/lib/routes';
import type { Match } from '@/lib/types';
import { CompetitionIcon, CompetitionSelector, CompetitionSheet, type Competition } from './Competitions';

const PREVIOUS_STEP = 10; // "Ver jogos anteriores" mostra mais 10

type Block = { key: string; league: string; matches: Match[] };

type Props = {
  teamId: string;
  matches: Match[];
  competitions: Competition[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  memory: ScreenMemory;
};

// Jogos da temporada em cards por competição (jogos seguidos da mesma competição ficam juntos).
// Abre no jogo atual: o último resultado e os próximos; os anteriores ficam no botão do topo
export function TeamMatchesTab({ teamId, matches, competitions, loading, error, onRetry, memory }: Props) {
  const [filter, setFilter] = useRememberedState<string | null>(memory, 'jogos:competicao', null);
  const [previousShown, setPreviousShown] = useRememberedState(memory, 'jogos:anteriores', 0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const getCompetition = (code: string) => competitions.find(c => c.code === code);

  const { blocks, hiddenPrevious } = useMemo(() => {
    const filtered = filter ? matches.filter(m => String(m.league || '').toUpperCase() === filter) : matches;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const firstUpcoming = filtered.findIndex(m => isLiveMatch(m) || (getMatchDate(m)?.getTime() || 0) >= startOfToday.getTime());
    const current = firstUpcoming === -1 ? Math.max(0, filtered.length - 5) : Math.max(0, firstUpcoming - 1);
    const start = Math.max(0, current - previousShown);

    const result: Block[] = [];
    filtered.slice(start).forEach(m => {
      const league = String(m.league || '').toUpperCase();
      const last = result[result.length - 1];
      if (last && last.league === league) last.matches.push(m);
      // Chave pela posição: jogos sem ID da ESPN vêm com id_event "0" e repetiriam a chave
      else result.push({ key: `bloco-${result.length}-${league}`, league, matches: [m] });
    });
    return { blocks: result, hiddenPrevious: start };
  }, [matches, filter, previousShown]);

  return (
    <div>
      <CompetitionSelector
        competition={filter ? getCompetition(filter) : undefined}
        label={filter ? getCompetition(filter)?.name || filter : 'Todas as competições'}
        open={sheetOpen}
        onOpen={() => setSheetOpen(true)}
      />
      <CompetitionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        competitions={competitions}
        selected={filter}
        withAll
        onSelect={code => {
          setFilter(code);
          setPreviousShown(0);
        }}
      />

      {loading ? (
        <div className="-mx-2.5">
          <MatchListSkeleton />
        </div>
      ) : error ? (
        <ErrorState onRetry={onRetry} />
      ) : matches.length === 0 ? (
        <InfoCard>Nenhum jogo do time nesta temporada.</InfoCard>
      ) : blocks.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nenhum jogo encontrado nesta competição.</p>
      ) : (
        <div className="pt-1">
          {hiddenPrevious > 0 && <PreviousButton label="Ver jogos anteriores" onClick={() => setPreviousShown(n => n + PREVIOUS_STEP)} />}
          {blocks.map(block => {
            const competition = getCompetition(block.league);
            return (
              <section key={block.key} className="mb-3 mt-2 overflow-hidden rounded-xl border border-line bg-card">
                <Link
                  href={leagueHref(block.league)}
                  onClick={() => setPreview('league', block.league, { name: competition?.name, logo: competition?.logo })}
                  className="flex items-center gap-2.5 border-b border-line px-3.5 py-3 active:bg-white/5"
                >
                  <CompetitionIcon competition={competition} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{competition?.name || block.league}</span>
                </Link>
                {block.matches.map((match, index) => {
                  const result = getResultForTeam(match, teamId);
                  return (
                    <div key={matchKey(match, index)} className={index > 0 ? 'border-t border-line' : ''}>
                      <div className="flex items-center justify-between gap-3 px-3.5 pt-2.5">
                        <span className="truncate text-xs text-muted">{formatRelativeDay(getMatchDate(match))}</span>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-xs text-muted">{getTeamMatchPhaseText(match, matches)}</span>
                          {result && <ResultBadge result={result} />}
                        </span>
                      </div>
                      <MatchRow
                        match={match}
                        variant="embedded"
                        href={matchHref(match)}
                        showGroupBadge={false}
                        aside={
                          !isFinishedMatch(match) && (
                            <FollowStar size={18} target={{ type: 'match', matchId: match.match_id, espnMatchId: getEspnMatchId(match) }} />
                          )
                        }
                      />
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
