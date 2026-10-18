// Regras de jogos que valem para qualquer liga
import { getLeague, getPhaseConfig, isTableStage } from '@/config/leagues';
import { matchTime } from './dates';
import type { Match } from './types';

// ID da ESPN do jogo (abre a tela de detalhes). Vem "0" enquanto o jogo não tem vínculo com a ESPN
export function getEspnMatchId(m: Match | null | undefined): string {
  const value = String(m?.id_event ?? '').trim();
  return value && value !== '0' ? value : '';
}

// Confronto ainda indefinido vem com ID 0 e nome vazio
export const teamDisplayName = (name: unknown): string => String(name ?? '').trim() || 'A definir';

const LIVE_STATUSES = new Set(['in', 'IN_PLAY', 'PAUSED', 'LIVE']);
const FINISHED_STATUSES = new Set(['FINISHED', 'post', 'AWARDED']);

// Ao vivo: "in" da ESPN (/matches/live, /match/history) ou IN_PLAY/PAUSED/LIVE da football-data (/matches)
export const isLiveMatch = (m: Pick<Match, 'status' | 'state'> | null | undefined) =>
  !!m && (m.state === 'in' || LIVE_STATUSES.has(String(m.status || '')));

export const isFinishedMatch = (m: Pick<Match, 'status' | 'state'> | null | undefined) =>
  !!m && !isLiveMatch(m) && (m.state === 'post' || FINISHED_STATUSES.has(String(m.status || '')));

const SPECIAL_STATUS: Record<string, string> = {
  POSTPONED: 'Adiado',
  CANCELLED: 'Cancelado',
  CANCELED: 'Cancelado',
  SUSPENDED: 'Suspenso',
};

/** "Adiado", "Cancelado"... no lugar do horário (vazio para os demais status) */
export const getSpecialStatusLabel = (m: Pick<Match, 'status'> | null | undefined) =>
  SPECIAL_STATUS[String(m?.status || '').toUpperCase()] || '';

const isPlayedOrLive = (m: Match) => isFinishedMatch(m) || isLiveMatch(m);

export const hasPenalties = (m: Pick<Match, 'home_penalty' | 'away_penalty'> | null | undefined) =>
  m?.home_penalty != null && m?.away_penalty != null && m.home_penalty !== '' && m.away_penalty !== '';

// "GROUP_A" (Libertadores) e "Group A1" (ESPN) viram "Grupo A" / "Grupo A1"
export const formatGroupName = (name: unknown) => String(name || '').trim().replace(/^GROUP_|^Group\s+/i, 'Grupo ');

// Nome das fases de mata-mata a partir do stage (para ligas sem fases no cadastro)
export function getStageLabel(stage: unknown): string {
  const s = String(stage || '').toUpperCase().trim();
  if (s.includes('LAST_32') || s.includes('16TH')) return '16 avos de final';
  if (s.includes('LAST_16') || s.includes('8TH')) return 'Oitavas de final';
  if (s.includes('QUARTER')) return 'Quartas de final';
  if (s.includes('SEMI')) return 'Semifinal';
  if (s.includes('THIRD') || s.includes('3RD')) return 'Disputa do 3º Lugar';
  if (s.includes('FINAL')) return 'Final';
  return '';
}

// Fase/rodada para o cabeçalho de liga da home: "Rodada 30", "Fase de Grupos • Rodada 3", "Semifinal"
export function getPhaseLabel(m: Match): string {
  const round = Number(m.round || 0);
  // Ligas com fases no cadastro: o nome da fase, e a rodada só nas fases com rodadas numeradas
  // (no mata-mata o round é ida/volta; nas copas da ESPN vem sempre 1)
  const phase = getPhaseConfig(m.league, m.stage);
  if (phase) return phase.rounds && round > 0 ? `${phase.label} • Rodada ${round}` : phase.label;
  const stageLabel = getStageLabel(m.stage);
  if (stageLabel) return stageLabel;
  return round > 0 ? `Rodada ${round}` : '';
}

// Selo "Fase de Grupos • Grupo A" dos cards (fase de grupos das copas e fase de liga da UNL)
export function getGroupBadge(m: Match): string {
  const stage = String(m.stage || '');
  if (!m.group_name || !(stage === 'GROUP_STAGE' || stage === 'league-phase')) return '';
  return `Fase de Grupos • ${formatGroupName(m.group_name)}`;
}

// Placar agregado de um confronto de ida e volta, do ponto de vista do mandante deste jogo.
// null se o jogo não tiver outra perna na lista (ou se for a ida)
export function getAggregateScore(match: Match, phaseMatches: Match[]): { home: number; away: number } | null {
  const home = String(match.api_home_team_id || 0);
  const away = String(match.api_away_team_id || 0);
  if (home === '0' || away === '0') return null;
  const legs = phaseMatches
    .filter(m => {
      const h = String(m.api_home_team_id);
      const a = String(m.api_away_team_id);
      return (h === home && a === away) || (h === away && a === home);
    })
    .sort((a, b) => matchTime(a) - matchTime(b));
  if (legs.length < 2 || legs[0] === match || matchTime(legs[0]) === matchTime(match)) return null;

  let h = 0;
  let a = 0;
  legs.forEach(leg => {
    if (!isPlayedOrLive(leg)) return;
    const sameSide = String(leg.api_home_team_id) === home;
    const hs = Number(leg.home_score) || 0;
    const as = Number(leg.away_score) || 0;
    h += sameSide ? hs : as;
    a += sameSide ? as : hs;
  });
  return { home: h, away: a };
}

// Nome do time que passou, a partir do campo winner (HOME_TEAM/AWAY_TEAM ou o próprio nome)
function winnerName(m: Match) {
  if (!m.winner) return '';
  if (m.winner === 'HOME_TEAM') return m.home_team || '';
  if (m.winner === 'AWAY_TEAM') return m.away_team || '';
  return String(m.winner);
}

// Junta ida e volta num único card para o chaveamento: placar agregado, do ponto de vista do mandante da ida
export function collapseTwoLeggedTies(matches: Match[]): Match[] {
  const ties = new Map<string, Match[]>();
  [...matches]
    .sort((a, b) => matchTime(a) - matchTime(b))
    .forEach((m, i) => {
      const home = String(m.api_home_team_id || 0);
      const away = String(m.api_away_team_id || 0);
      // Time indefinido (ID 0) não dá para parear: cada jogo vira um card
      const key = home === '0' || away === '0' ? `solo-${m.match_id || m.id_event || ''}-${i}` : [home, away].sort().join('-');
      ties.set(key, [...(ties.get(key) || []), m]);
    });

  return Array.from(ties.values()).map(legs => {
    if (legs.length === 1) {
      // Final em jogo único empatada e sem pênaltis informados: ninguém venceu ainda
      const m = legs[0];
      const isFinal = String(m.stage || '').toUpperCase() === 'FINAL';
      const decided = m.winner === 'HOME_TEAM' || m.winner === 'AWAY_TEAM';
      const undecided =
        isFinal && isFinishedMatch(m) && !decided && !hasPenalties(m) && Number(m.home_score) === Number(m.away_score);
      return undecided ? { ...m, tie_undecided: true } : m;
    }

    const first = legs[0];
    const last = legs[legs.length - 1];
    const sameSide = (leg: Match) => String(leg.api_home_team_id) === String(first.api_home_team_id);

    let homeAgg = 0;
    let awayAgg = 0;
    let anyPlayed = false;
    legs.forEach(leg => {
      if (!isPlayedOrLive(leg)) return;
      anyPlayed = true;
      const h = Number(leg.home_score) || 0;
      const a = Number(leg.away_score) || 0;
      if (sameSide(leg)) {
        homeAgg += h;
        awayAgg += a;
      } else {
        homeAgg += a;
        awayAgg += h;
      }
    });

    const pending = legs.find(leg => !isFinishedMatch(leg));
    const shown = pending || last;
    const penaltyLeg = legs.find(leg => hasPenalties(leg));
    const homePen = penaltyLeg ? (sameSide(penaltyLeg) ? penaltyLeg.home_penalty : penaltyLeg.away_penalty) : undefined;
    const awayPen = penaltyLeg ? (sameSide(penaltyLeg) ? penaltyLeg.away_penalty : penaltyLeg.home_penalty) : undefined;

    // Quem avança (lado do mandante da ida), só com o confronto encerrado:
    // 1) agregado; 2) se empatar, os pênaltis; 3) senão, o winner do jogo de volta (com disputa de
    //    pênaltis, winner é quem avançou, mesmo tendo perdido a partida).
    // Sem nada disso (winner vazio ou DRAW), fica indefinido: a tela mostra "Pênaltis: a definir"
    let winner = '';
    let undecided = false;
    if (!pending) {
      if (homeAgg !== awayAgg) {
        winner = homeAgg > awayAgg ? 'HOME_TEAM' : 'AWAY_TEAM';
      } else if (homePen != null && awayPen != null && Number(homePen) !== Number(awayPen)) {
        winner = Number(homePen) > Number(awayPen) ? 'HOME_TEAM' : 'AWAY_TEAM';
      } else {
        const named = winnerName(last);
        winner = named && named === first.home_team ? 'HOME_TEAM' : named && named === first.away_team ? 'AWAY_TEAM' : '';
        undecided = !winner;
      }
    }

    return {
      ...shown,
      home_team: first.home_team,
      home_logo: first.home_logo,
      api_home_team_id: first.api_home_team_id,
      away_team: first.away_team,
      away_logo: first.away_logo,
      api_away_team_id: first.api_away_team_id,
      espn_home_team_id: first.espn_home_team_id,
      espn_away_team_id: first.espn_away_team_id,
      home_score: anyPlayed ? homeAgg : shown.home_score,
      away_score: anyPlayed ? awayAgg : shown.away_score,
      home_penalty: homePen,
      away_penalty: awayPen,
      winner,
      tie_undecided: undecided,
      // Ainda tem jogo por vir? Mostra a data dele. Se não, o card fica como encerrado
      status: pending ? pending.status : 'FINISHED',
      state: pending ? pending.state : 'post',
    };
  });
}

// Volta encerrada com agregado empatado e sem decisão conhecida: não dá para dizer quem passou
export function isPenaltiesPending(match: Match, aggregate: { home: number; away: number } | null) {
  return (
    !!aggregate &&
    aggregate.home === aggregate.away &&
    isFinishedMatch(match) &&
    !hasPenalties(match) &&
    match.winner !== 'HOME_TEAM' &&
    match.winner !== 'AWAY_TEAM'
  );
}

// "Jogo de ida"/"Jogo de volta": procura o outro jogo do confronto (times invertidos, mesma fase)
export function getLegLabel(match: Match, allMatches: Match[]): string {
  const stage = String(match.stage || '').toUpperCase();
  if (!getLeague(match.league)?.twoLeggedTies || isTableStage(stage)) return '';
  const other = allMatches.find(
    o =>
      o !== match &&
      o.league === match.league &&
      String(o.stage || '').toUpperCase() === stage &&
      String(o.api_home_team_id) === String(match.api_away_team_id) &&
      String(o.api_away_team_id) === String(match.api_home_team_id),
  );
  if (!other) return '';
  return matchTime(match) <= matchTime(other) ? 'Jogo de ida' : 'Jogo de volta';
}

// Lado direito da linha na tela do time: "Rodada 30", "Grupo A • Rodada 3", "Semifinal • Jogo de ida"
export function getTeamMatchPhaseText(match: Match, allMatches: Match[]): string {
  const stage = String(match.stage || '').toUpperCase();
  const round = Number(match.round || 0);
  const group = match.group_name ? formatGroupName(match.group_name) : '';
  const leg = getLegLabel(match, allMatches);
  const phase = getPhaseConfig(match.league, stage);
  if (phase) {
    const roundText = phase.rounds && round > 0 ? `Rodada ${round}` : '';
    const main = isTableStage(stage) && group ? group : phase.label;
    return [main, roundText, leg].filter(Boolean).join(' • ');
  }
  let main = getStageLabel(stage);
  if (!main && round > 0) main = group ? `${group} • Rodada ${round}` : `Rodada ${round}`;
  if (!main) main = group || (stage === 'GROUP_STAGE' ? 'Fase de Grupos' : '');
  return [main, leg].filter(Boolean).join(' • ');
}

export type MatchResult = 'V' | 'E' | 'D';

// V / E / D do ponto de vista de um time (só jogos encerrados)
export function getResultForTeam(match: Match, teamId: unknown): MatchResult | null {
  if (!isFinishedMatch(match)) return null;
  const isHome = String(match.api_home_team_id) === String(teamId);
  const isAway = String(match.api_away_team_id) === String(teamId);
  if (!isHome && !isAway) return null;
  const own = Number(isHome ? match.home_score : match.away_score);
  const rival = Number(isHome ? match.away_score : match.home_score);
  if (Number.isNaN(own) || Number.isNaN(rival)) return null;
  if (own > rival) return 'V';
  if (own < rival) return 'D';
  return 'E';
}

export const sortByDate = <T extends Match>(matches: T[]) => [...matches].sort((a, b) => matchTime(a) - matchTime(b));

// Chave única de lista: jogos sem ESPN vêm com id_event "0", então o ID sozinho repetiria
export const matchKey = (m: Match, index: number) =>
  `${m.match_id ?? ''}-${getEspnMatchId(m)}-${m.api_home_team_id ?? m.home_team ?? ''}-${m.api_away_team_id ?? m.away_team ?? ''}-${index}`;
