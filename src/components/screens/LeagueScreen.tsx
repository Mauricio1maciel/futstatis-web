'use client';

import { CalendarDays, ChevronDown, RotateCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { getLeague, getLeagueName, isCupLeague } from '@/config/leagues';
import { CalendarSheet } from '@/components/CalendarSheet';
import { CupPanel } from '@/components/cup/CupPanel';
import { FollowStar } from '@/components/FollowStar';
import { LeagueDateMatches } from '@/components/league/LeagueDateMatches';
import { LeaguePhasesMatches } from '@/components/league/LeaguePhasesMatches';
import { LeagueRoundsMatches } from '@/components/league/LeagueRoundsMatches';
import { LeagueStatsPanel } from '@/components/league/LeagueStatsPanel';
import { LeagueStandings } from '@/components/standings/LeagueStandings';
import { BottomSheet, SheetOption } from '@/components/ui/BottomSheet';
import { Crest } from '@/components/ui/Crest';
import { LazyPanel } from '@/components/ui/LazyPanel';
import { Pills } from '@/components/ui/Pills';
import { NotFoundState } from '@/components/ui/ScreenFallback';
import { IconButton, TopBar } from '@/components/ui/TopBar';
import { useApi } from '@/hooks/useApi';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRememberedState, useScreenMemory } from '@/hooks/useScreenMemory';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { buildEndpoint } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import { getPreview } from '@/lib/preview';
import { parseSeasons } from '@/lib/seasons';
import type { Match } from '@/lib/types';

type Tab = 'jogos' | 'tabela' | 'estatisticas';
type LeagueInfo = { name?: string; logo?: string };

export function LeagueRoute() {
  const code = (useSearchParams().get('codigo') || '').trim().toUpperCase();
  if (!code) return <NotFoundState />;
  return <LeagueScreen key={code} code={code} />;
}

function LeagueScreen({ code }: { code: string }) {
  const config = getLeague(code);
  const isCup = isCupLeague(code);
  // Navegação da aba Jogos: por fase (cadastro), por data (copas sem fases) ou por rodada (pontos corridos)
  const mode = config?.phases?.length ? 'phases' : isCup ? 'dates' : 'rounds';
  const memory = useScreenMemory(`liga:${code}`);

  const [info, setInfo] = useState<LeagueInfo>(() => getPreview<LeagueInfo>('league', code) ?? {});
  const onInfo = useCallback(
    (m: Match) =>
      setInfo(prev => (prev.logo && prev.name ? prev : { logo: prev.logo || m.league_logo, name: prev.name || m.league_name })),
    [],
  );

  const [tab, setTab] = useRememberedState<Tab>(memory, 'aba', 'jogos');
  // '' = temporada atual (a API usa a mais recente quando season vem vazio)
  const [season, setSeason] = useRememberedState(memory, 'temporada', '');
  const [pickedDate, setPickedDate] = useRememberedState(memory, 'data', '');
  const [signals, setSignals] = useState<Record<Tab, number>>({ jogos: 0, tabela: 0, estatisticas: 0 });
  const [seasonSheet, setSeasonSheet] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const seasons = useApi(buildEndpoint('/seasons', { league: code }), { parse: parseSeasons });
  const seasonList = seasons.data ?? [];
  const currentSeason = seasonList[0] ?? '';
  const isCurrentSeason = !season || season === currentSeason;
  const seasonParam = isCurrentSeason ? '' : season;

  const name = getLeagueName(code, info.name);
  useDocumentTitle(name);
  useScrollRestoration(`liga:${code}`, true);

  const tabs: { value: Tab; label: string }[] = [
    { value: 'jogos', label: 'Jogos' },
    { value: 'tabela', label: isCup ? 'Mata-Mata' : 'Classificação' },
    { value: 'estatisticas', label: 'Estatísticas' },
  ];

  return (
    <div>
      <TopBar
        right={
          <>
            {mode === 'dates' && tab === 'jogos' && (
              <IconButton label="Calendário" onClick={() => setCalendarOpen(true)}>
                <CalendarDays size={22} />
              </IconButton>
            )}
            <IconButton label="Atualizar" onClick={() => setSignals(s => ({ ...s, [tab]: s[tab] + 1 }))}>
              <RotateCw size={20} />
            </IconButton>
            <FollowStar target={{ type: 'league', league: code }} name={name} />
          </>
        }
      />

      <div className="flex flex-col items-center px-5 pb-2">
        {info.logo ? (
          <Crest src={info.logo} size={70} alt={name} />
        ) : (
          <span className="flex h-17.5 w-17.5 items-center justify-center rounded-full bg-card-2 text-3xl" aria-hidden>
            {config?.icon ?? '🏆'}
          </span>
        )}
        <h1 className="mt-2 text-center text-lg font-bold text-white">{name}</h1>
        <button
          type="button"
          onClick={() => setSeasonSheet(true)}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-card-3 px-4 py-2 text-xs font-bold text-ink-2"
        >
          {season || currentSeason || 'Temporada'}
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 bg-screen/95 px-2.5 py-3 backdrop-blur">
        <Pills value={tab} onChange={setTab} options={tabs} label="Seções da liga" />
      </div>

      <div className="px-2.5 pb-10">
        <LazyPanel key={`jogos-${seasonParam}-${pickedDate}`} active={tab === 'jogos'}>
          <div className="-mx-2.5">
            {mode === 'phases' ? (
              <LeaguePhasesMatches code={code} season={seasonParam} memory={memory} refreshSignal={signals.jogos} onInfo={onInfo} />
            ) : mode === 'dates' ? (
              <LeagueDateMatches
                code={code}
                season={seasonParam}
                isCurrentSeason={isCurrentSeason}
                initialDate={pickedDate}
                memory={memory}
                refreshSignal={signals.jogos}
                onInfo={onInfo}
                onOpenCalendar={() => setCalendarOpen(true)}
              />
            ) : (
              <LeagueRoundsMatches code={code} season={seasonParam} memory={memory} refreshSignal={signals.jogos} onInfo={onInfo} />
            )}
          </div>
        </LazyPanel>

        <LazyPanel key={`tabela-${seasonParam}`} active={tab === 'tabela'}>
          {isCup ? (
            <CupPanel
              withChances
              league={code}
              season={seasonParam}
              isCurrentSeason={isCurrentSeason}
              memory={memory}
              active={tab === 'tabela'}
              refreshSignal={signals.tabela}
            />
          ) : (
            <LeagueStandings
              league={code}
              season={seasonParam}
              isCurrentSeason={isCurrentSeason}
              active={tab === 'tabela'}
              refreshSignal={signals.tabela}
              memory={memory}
            />
          )}
        </LazyPanel>

        <LazyPanel key={`estatisticas-${seasonParam}`} active={tab === 'estatisticas'}>
          <LeagueStatsPanel code={code} season={seasonParam} memory={memory} refreshSignal={signals.estatisticas} />
        </LazyPanel>
      </div>

      <BottomSheet open={seasonSheet} onClose={() => setSeasonSheet(false)} title="Temporada">
        {seasons.loading ? (
          <p className="py-6 text-center text-sm text-muted">Carregando temporadas...</p>
        ) : seasonList.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nenhuma temporada disponível.</p>
        ) : (
          seasonList.map(item => (
            <SheetOption
              key={item}
              label={item}
              sublabel={item === currentSeason ? 'Temporada atual' : undefined}
              selected={item === (season || currentSeason)}
              onSelect={() => {
                setSeason(item === currentSeason ? '' : item);
                setPickedDate('');
                setSeasonSheet(false);
              }}
            />
          ))
        )}
      </BottomSheet>

      {mode === 'dates' && (
        <CalendarSheet
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          leagues={[code]}
          selectedDate={pickedDate || todayKey()}
          onSelect={setPickedDate}
        />
      )}
    </div>
  );
}
