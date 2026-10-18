'use client';

import { getTableLabel, hasLast32, hasStandingsTable } from '@/config/leagues';
import { StandingsSection } from '@/components/standings/StandingsSection';
import { LazyPanel } from '@/components/ui/LazyPanel';
import { Pills, type PillOption } from '@/components/ui/Pills';
import { useRememberedState, type ScreenMemory } from '@/hooks/useScreenMemory';
import type { TeamRef } from '@/lib/standings';
import { KnockoutBracket } from './KnockoutBracket';
import { RoundMatchesList } from './RoundMatchesList';

type CupView = 'table' | 'last32' | 'tree';

type Props = {
  league: string;
  season?: string;
  isCurrentSeason?: boolean;
  highlight?: TeamRef[];
  focusHighlighted?: boolean;
  active?: boolean;
  refreshSignal?: number;
  memory: ScreenMemory;
};

// Copa: pílulas Grupos/Fase de Liga (se tiver classificação), 16 avos (se tiver) e Mata-Mata.
// Copa sem classificação (Copa do Brasil) abre direto no chaveamento
export function CupPanel({ league, season = '', isCurrentSeason = true, highlight, focusHighlighted, active = true, refreshSignal = 0, memory }: Props) {
  const withTable = hasStandingsTable(league);
  const options: PillOption<CupView>[] = [
    ...(withTable ? [{ value: 'table' as const, label: getTableLabel(league) }] : []),
    ...(hasLast32(league) ? [{ value: 'last32' as const, label: '16 avos de final' }] : []),
    { value: 'tree', label: 'Mata-Mata' },
  ];
  const [view, setView] = useRememberedState<CupView>(memory, `cup-view:${league}:${season}`, withTable ? 'table' : 'tree');

  return (
    <div>
      <Pills options={options} value={view} onChange={setView} variant="outline" className="-mx-2.5 border-b border-card-2 px-2.5 pb-3" label="Fase" />
      <div className="pt-3">
        {withTable && (
          <LazyPanel active={view === 'table'}>
            <StandingsSection
              league={league}
              season={season}
              isCurrentSeason={isCurrentSeason}
              highlight={highlight}
              focusHighlighted={focusHighlighted}
              active={active && view === 'table'}
              refreshSignal={refreshSignal}
            />
          </LazyPanel>
        )}
        <LazyPanel active={view === 'last32'}>
          <RoundMatchesList
            league={league}
            round="LAST_32"
            season={season}
            emptyText="Nenhum confronto dos 16 avos encontrado."
            refreshSignal={refreshSignal}
          />
        </LazyPanel>
        <LazyPanel active={view === 'tree'}>
          <KnockoutBracket league={league} season={season} refreshSignal={refreshSignal} />
        </LazyPanel>
      </div>
    </div>
  );
}
