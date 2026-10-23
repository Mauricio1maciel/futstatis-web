'use client';

import { useCallback, useState } from 'react';
import { hasChances } from '@/config/leagues';
import { LazyPanel } from '@/components/ui/LazyPanel';
import { Pills } from '@/components/ui/Pills';
import { useRememberedState, type ScreenMemory } from '@/hooks/useScreenMemory';
import { ChancesPanel } from './ChancesPanel';
import { StandingsSection } from './StandingsSection';

type View = 'table' | 'chances';

type Props = {
  league: string;
  season?: string;
  isCurrentSeason?: boolean;
  active?: boolean;
  refreshSignal?: number;
  memory: ScreenMemory;
};

// Classificação da tela da liga com o seletor "Tabela | Chances" (só em pontos corridos)
export function LeagueStandings({ league, season = '', isCurrentSeason = true, active = true, refreshSignal = 0, memory }: Props) {
  const [view, setView] = useRememberedState<View>(memory, `standings-view:${league}`, 'table');
  // A API respondeu 404 nas chances: a opção some
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => {
    setUnavailable(true);
    setView('table');
  }, [setView]);
  const withChances = hasChances(league) && !unavailable;
  const current = withChances ? view : 'table';

  return (
    <div>
      {withChances && (
        <Pills
          variant="outline"
          value={current}
          onChange={setView}
          options={[
            { value: 'table', label: 'Tabela' },
            { value: 'chances', label: 'Chances' },
          ]}
          className="-mx-2.5 mb-3 border-b border-card-2 px-2.5 pb-3"
          label="Classificação"
        />
      )}
      <LazyPanel active={current === 'table'}>
        <StandingsSection league={league} season={season} isCurrentSeason={isCurrentSeason} active={active && current === 'table'} refreshSignal={refreshSignal} />
      </LazyPanel>
      {withChances && (
        <LazyPanel active={current === 'chances'}>
          <ChancesPanel league={league} season={season} refreshSignal={refreshSignal} onUnavailable={onUnavailable} />
        </LazyPanel>
      )}
    </div>
  );
}
