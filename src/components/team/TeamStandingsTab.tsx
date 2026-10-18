'use client';

import { useState } from 'react';
import { isCupLeague } from '@/config/leagues';
import { CupPanel } from '@/components/cup/CupPanel';
import { StandingsSection } from '@/components/standings/StandingsSection';
import { InfoCard } from '@/components/ui/States';
import { useRememberedState, type ScreenMemory } from '@/hooks/useScreenMemory';
import { CompetitionSelector, CompetitionSheet, type Competition } from './Competitions';

type Props = {
  teamId: string;
  teamName?: string;
  competitions: Competition[];
  /** Primeira liga de pontos corridos do time (ou a primeira competição) */
  mainLeague: string;
  active: boolean;
  refreshSignal: number;
  memory: ScreenMemory;
};

// Classificação de uma competição do time: liga -> tabela com o time destacado; copa -> grupos/mata-mata
// com o grupo do time aberto; Copa do Brasil -> chaveamento. Com o botão "Ao vivo" da competição escolhida
export function TeamStandingsTab({ teamId, teamName, competitions, mainLeague, active, refreshSignal, memory }: Props) {
  const [chosen, setChosen] = useRememberedState<string | null>(memory, 'tabela:competicao', null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const league = chosen || mainLeague;
  const competition = competitions.find(c => c.code === league);
  const highlight = [{ id: teamId, name: teamName }];

  if (!league) return <InfoCard>Classificação não disponível no momento.</InfoCard>;

  return (
    <div>
      <CompetitionSelector competition={competition} label={competition?.name || league} open={sheetOpen} onOpen={() => setSheetOpen(true)} />
      <CompetitionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        competitions={competitions}
        selected={league}
        onSelect={code => code && setChosen(code)}
      />
      <div className="pt-3" key={league}>
        {isCupLeague(league) ? (
          <CupPanel league={league} highlight={highlight} focusHighlighted active={active} refreshSignal={refreshSignal} memory={memory} />
        ) : (
          <StandingsSection league={league} highlight={highlight} active={active} refreshSignal={refreshSignal} />
        )}
      </div>
    </div>
  );
}
