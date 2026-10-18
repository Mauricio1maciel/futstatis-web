'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getLeague, isTableStage } from '@/config/leagues';
import { FollowStar } from '@/components/FollowStar';
import { MatchListSkeleton, MatchRow } from '@/components/match/MatchRow';
import { BottomSheet, SheetOption } from '@/components/ui/BottomSheet';
import { PreviousButton, SectionPill } from '@/components/ui/ListParts';
import { RefreshBar } from '@/components/ui/RefreshBar';
import { ErrorState, InfoCard } from '@/components/ui/States';
import { useApiMany } from '@/hooks/useApiMany';
import { useOnSignal } from '@/hooks/useOnSignal';
import { useRememberedState, type ScreenMemory } from '@/hooks/useScreenMemory';
import { buildEndpoint } from '@/lib/api';
import { formatDateRange, formatDayLabel, getMatchDate, matchTime, todayKey, toDateKey } from '@/lib/dates';
import { formatGroupName, getAggregateScore, getEspnMatchId, isFinishedMatch, isPenaltiesPending, matchKey } from '@/lib/matches';
import { matchHref } from '@/lib/routes';
import { asArray, type Match } from '@/lib/types';

type Props = {
  code: string;
  season: string;
  memory: ScreenMemory;
  refreshSignal: number;
  onInfo: (match: Match) => void;
};

type Filter = { phase: string | null; round: number | null };
type MenuItem = { key: string; label: string; range: string; indent: boolean; filter: Filter };
type DaySection = { key: string; title: string; isToday: boolean; matches: Match[] };

const PREVIOUS_STEP = 5; // "Ver jogos anteriores" mostra mais 5 dias

// "15/2 - 27/2": período de uma lista de jogos
const range = (list: Match[]) => formatDateRange(list.map(matchTime));

// Ligas com fases no cadastro: busca todas as fases de uma vez e o seletor filtra na tela
export function LeaguePhasesMatches({ code, season, memory, refreshSignal, onInfo }: Props) {
  const league = getLeague(code);
  const phases = useMemo(() => league?.phases ?? [], [league]);

  // Fase de liga da Champions: stage=<FASE>&round=N, uma rodada por vez (round=N sozinho traria também
  // a ida/volta do mata-mata). As demais fases: round=<FASE>
  const requests = useMemo(
    () =>
      phases.flatMap(phase =>
        phase.fetchByRound && phase.rounds
          ? Array.from({ length: phase.rounds }, (_, n) => ({
              phase: phase.key,
              endpoint: buildEndpoint('/matches', { league: code, stage: phase.key, round: n + 1, season }),
            }))
          : [{ phase: phase.key, endpoint: buildEndpoint('/matches', { league: code, round: phase.key, season }) }],
      ),
    [phases, code, season],
  );
  const endpoints = useMemo(() => requests.map(r => r.endpoint), [requests]);
  const { data, loading, error, refreshing, refresh } = useApiMany(endpoints, raw => asArray<Match>(raw));
  useOnSignal(refreshSignal, () => refresh({ nocache: 'true' }));

  const byPhase = useMemo(() => {
    const result: Record<string, Match[]> = {};
    phases.forEach(phase => (result[phase.key] = []));
    requests.forEach((request, i) => (data?.[i] ?? []).forEach(m => result[request.phase].push({ ...m, _phase: request.phase })));
    return result;
  }, [data, requests, phases]);

  const firstMatch = useMemo(() => Object.values(byPhase).find(list => list.length > 0)?.[0], [byPhase]);
  useEffect(() => {
    if (firstMatch) onInfo(firstMatch);
  }, [firstMatch, onInfo]);

  // Rodadas distintas por fase (nas copas da ESPN o round vem sempre 1: aí não vira "Rodada")
  const phaseRounds = useMemo(() => {
    const result: Record<string, number[]> = {};
    Object.entries(byPhase).forEach(([key, list]) => {
      result[key] = Array.from(new Set(list.map(m => Number(m.round)).filter(r => r > 0))).sort((a, b) => a - b);
    });
    return result;
  }, [byPhase]);

  const getPhaseName = (key: string | null) => phases.find(p => p.key === key)?.label || key || '';

  // Itens do seletor: só as fases com jogos; fases com rodadas numeradas abrem as rodadas embaixo
  const menuItems = useMemo(() => {
    const items: MenuItem[] = [{ key: 'ALL', label: 'Todas as partidas', range: '', indent: false, filter: { phase: null, round: null } }];
    phases.forEach(phase => {
      const list = byPhase[phase.key] || [];
      if (list.length === 0) return;
      const rounds = phase.rounds ? phaseRounds[phase.key] || [] : [];
      if (rounds.length <= 1) {
        items.push({ key: phase.key, label: phase.label, range: range(list), indent: false, filter: { phase: phase.key, round: null } });
        return;
      }
      items.push({ key: phase.key, label: phase.label, range: '', indent: false, filter: { phase: phase.key, round: null } });
      rounds.forEach(round =>
        items.push({
          key: `${phase.key}-${round}`,
          label: `Rodada ${round}`,
          range: range(list.filter(m => Number(m.round) === round)),
          indent: true,
          filter: { phase: phase.key, round },
        }),
      );
    });
    return items;
  }, [phases, byPhase, phaseRounds]);

  const [filter, setFilter] = useRememberedState<Filter>(memory, `fases:${season}:filtro`, { phase: null, round: null });
  const [extraBefore, setExtraBefore] = useRememberedState(memory, `fases:${season}:anteriores`, 0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filterLabel = !filter.phase
    ? 'Todas as partidas'
    : filter.round != null
      ? `${getPhaseName(filter.phase)} • Rodada ${filter.round}`
      : getPhaseName(filter.phase);

  // Jogos filtrados, agrupados por dia (no fuso do aparelho)
  const sections = useMemo(() => {
    const today = todayKey();
    const list = phases
      .flatMap(p => (!filter.phase || filter.phase === p.key ? byPhase[p.key] || [] : []))
      .filter(m => filter.round == null || Number(m.round) === filter.round)
      .sort((a, b) => matchTime(a) - matchTime(b));
    const result: DaySection[] = [];
    list.forEach(match => {
      const date = getMatchDate(match);
      const key = date ? toDateKey(date) : 'sem-data';
      let section = result.find(s => s.key === key);
      if (!section) {
        const title = date ? `${key === today ? 'Hoje • ' : ''}${formatDayLabel(date)}` : 'Data a definir';
        section = { key, title, isToday: key === today, matches: [] };
        result.push(section);
      }
      section.matches.push(match);
    });
    return result;
  }, [phases, byPhase, filter]);

  // "Todas as partidas" abre no dia de hoje ou no próximo com jogo (fase encerrada: o último dia)
  const startIndex = useMemo(() => {
    if (filter.phase) return 0;
    const today = todayKey();
    const upcoming = sections.findIndex(s => s.key !== 'sem-data' && s.key >= today);
    const base = upcoming >= 0 ? upcoming : Math.max(0, sections.length - 1);
    return Math.max(0, base - extraBefore);
  }, [sections, filter.phase, extraBefore]);

  const renderMatch = (match: Match, index: number) => {
    const phase = match._phase || '';
    const isGroup = isTableStage(phase); // grupos ou fase de liga: sem agregado
    const group = match.group_name ? formatGroupName(match.group_name) : '';
    const showRound = !!phases.find(p => p.key === phase)?.rounds && Number(match.round) > 0 && (phaseRounds[phase] || []).length > 1;
    const header = isGroup ? [getPhaseName(phase), group, showRound ? `Rodada ${match.round}` : ''].filter(Boolean).join(' • ') : getPhaseName(phase);
    const aggregate = league?.twoLeggedTies && !isGroup ? getAggregateScore(match, byPhase[phase] || []) : null;
    const footer = aggregate
      ? `Agregado ${aggregate.home}-${aggregate.away}${isPenaltiesPending(match, aggregate) ? ' • Pênaltis: a definir' : ''}`
      : undefined;
    return (
      <MatchRow
        key={matchKey(match, index)}
        match={match}
        href={matchHref(match, { league: code })}
        header={header}
        footer={footer}
        showGroupBadge={false}
        aside={!isFinishedMatch(match) && <FollowStar size={18} target={{ type: 'match', matchId: match.match_id, espnMatchId: getEspnMatchId(match) }} />}
      />
    );
  };

  return (
    <div>
      <div className="px-2.5 pt-1">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-[10px] bg-card-2 px-4 py-3.5 text-left active:bg-card-2/70"
        >
          <span className="truncate text-[15px] text-ink">{filterLabel}</span>
          <ChevronDown size={18} className="shrink-0 text-muted" />
        </button>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Fase">
        {menuItems.map(item => (
          <SheetOption
            key={item.key}
            label={item.label}
            sublabel={item.range || undefined}
            indent={item.indent}
            selected={item.filter.phase === filter.phase && item.filter.round === filter.round}
            onSelect={() => {
              setFilter(item.filter);
              setExtraBefore(0);
              setSheetOpen(false);
            }}
          />
        ))}
      </BottomSheet>

      <RefreshBar active={refreshing} />
      {loading ? (
        <MatchListSkeleton />
      ) : error ? (
        <ErrorState onRetry={() => refresh()} />
      ) : sections.length === 0 ? (
        <InfoCard>Nenhum jogo encontrado.</InfoCard>
      ) : (
        <div className="pb-10">
          {startIndex > 0 && <PreviousButton label="Ver jogos anteriores" onClick={() => setExtraBefore(n => n + PREVIOUS_STEP)} />}
          {sections.slice(startIndex).map(section => (
            <section key={section.key}>
              <SectionPill highlight={section.isToday}>{section.title}</SectionPill>
              {section.matches.map(renderMatch)}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
