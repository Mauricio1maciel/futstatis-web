import {
  collapseTwoLeggedTies,
  formatGroupName,
  getAggregateScore,
  getEspnMatchId,
  shortTeamName,
  getLegLabel,
  getPhaseLabel,
  getResultForTeam,
  getTeamMatchPhaseText,
  isFinishedMatch,
  isLiveMatch,
  isPenaltiesPending,
  teamDisplayName,
} from './matches';
import type { Match } from './types';

const leg = (overrides: Partial<Match>): Match => ({
  league: 'CLI',
  stage: 'SEMI_FINALS',
  status: 'FINISHED',
  winner: '',
  ...overrides,
});

// A = 1 (mandante da ida), B = 2
const first = (o: Partial<Match> = {}) =>
  leg({ api_home_team_id: 1, home_team: 'A', api_away_team_id: 2, away_team: 'B', date_event: '2026-10-15 00:30:00', ...o });
const second = (o: Partial<Match> = {}) =>
  leg({ api_home_team_id: 2, home_team: 'B', api_away_team_id: 1, away_team: 'A', date_event: '2026-10-22 00:30:00', ...o });

describe('collapseTwoLeggedTies', () => {
  it('soma o agregado do ponto de vista do mandante da ida e decide pelo agregado', () => {
    const [tie] = collapseTwoLeggedTies([second({ home_score: 1, away_score: 1 }), first({ home_score: 2, away_score: 1 })]);
    expect(tie.home_team).toBe('A');
    expect(tie.home_score).toBe(3);
    expect(tie.away_score).toBe(2);
    expect(tie.winner).toBe('HOME_TEAM');
    expect(tie.status).toBe('FINISHED');
    expect(tie.tie_undecided).toBe(false);
  });

  it('com agregado empatado, decide pelos pênaltis (do lado certo)', () => {
    const [tie] = collapseTwoLeggedTies([
      first({ home_score: 1, away_score: 0 }),
      second({ home_score: 1, away_score: 0, home_penalty: 4, away_penalty: 3 }),
    ]);
    // Na volta B era o mandante: os pênaltis de A são os do visitante
    expect(tie.home_penalty).toBe(3);
    expect(tie.away_penalty).toBe(4);
    expect(tie.winner).toBe('AWAY_TEAM');
  });

  it('sem pênaltis informados, usa o winner do jogo de volta', () => {
    const [tie] = collapseTwoLeggedTies([
      first({ home_score: 0, away_score: 0 }),
      second({ home_score: 1, away_score: 1, winner: 'HOME_TEAM' }), // B avançou
    ]);
    expect(tie.winner).toBe('AWAY_TEAM');
    expect(tie.tie_undecided).toBe(false);
  });

  it('empate sem decisão conhecida fica "a definir"', () => {
    const [tie] = collapseTwoLeggedTies([first({ home_score: 0, away_score: 0 }), second({ home_score: 0, away_score: 0, winner: 'DRAW' })]);
    expect(tie.winner).toBe('');
    expect(tie.tie_undecided).toBe(true);
  });

  it('com a volta por jogar, mostra o jogo pendente e o agregado parcial', () => {
    const [tie] = collapseTwoLeggedTies([first({ home_score: 2, away_score: 0 }), second({ status: 'TIMED', home_score: 0, away_score: 0 })]);
    expect(tie.status).toBe('TIMED');
    expect(tie.date_event).toBe('2026-10-22 00:30:00');
    expect(tie.home_score).toBe(2);
    expect(tie.away_score).toBe(0);
    expect(tie.winner).toBe('');
    expect(tie.tie_undecided).toBe(false);
  });

  it('conta a perna ao vivo no agregado', () => {
    const [tie] = collapseTwoLeggedTies([first({ home_score: 1, away_score: 0 }), second({ status: 'IN_PLAY', home_score: 2, away_score: 0 })]);
    expect(tie.home_score).toBe(1);
    expect(tie.away_score).toBe(2);
    expect(tie.status).toBe('IN_PLAY');
  });

  it('final em jogo único empatada e sem pênaltis fica "a definir"', () => {
    const final = leg({ stage: 'FINAL', api_home_team_id: 1, api_away_team_id: 2, home_score: 1, away_score: 1, winner: 'DRAW' });
    expect(collapseTwoLeggedTies([final])[0].tie_undecided).toBe(true);
    expect(collapseTwoLeggedTies([{ ...final, winner: 'HOME_TEAM' }])[0].tie_undecided).toBeFalsy();
    expect(collapseTwoLeggedTies([{ ...final, home_penalty: 5, away_penalty: 4 }])[0].tie_undecided).toBeFalsy();
  });

  it('não junta jogos com time indefinido (ID 0)', () => {
    const tbd = leg({ stage: 'FINAL', status: 'TIMED', api_home_team_id: 0, api_away_team_id: 0, home_team: '', away_team: '' });
    expect(collapseTwoLeggedTies([tbd, { ...tbd, date_event: '2026-12-13 20:00:00' }])).toHaveLength(2);
  });

  it('separa confrontos diferentes', () => {
    const other = (o: Partial<Match>) => leg({ api_home_team_id: 3, api_away_team_id: 4, ...o });
    const result = collapseTwoLeggedTies([
      first({ home_score: 1, away_score: 0 }),
      other({ home_score: 0, away_score: 0, date_event: '2026-10-16 00:30:00' }),
      second({ home_score: 0, away_score: 0 }),
      other({ api_home_team_id: 4, api_away_team_id: 3, home_score: 2, away_score: 0, date_event: '2026-10-23 00:30:00' }),
    ]);
    expect(result).toHaveLength(2);
  });
});

describe('getAggregateScore', () => {
  it('mostra o agregado no jogo de volta, do ponto de vista do mandante da volta', () => {
    const ida = first({ home_score: 2, away_score: 1 });
    const volta = second({ home_score: 1, away_score: 0 });
    expect(getAggregateScore(volta, [ida, volta])).toEqual({ home: 2, away: 2 });
    expect(getAggregateScore(ida, [ida, volta])).toBeNull();
  });

  it('marca pênaltis a definir quando o agregado empata sem decisão', () => {
    const ida = first({ home_score: 1, away_score: 0 });
    const volta = second({ home_score: 1, away_score: 0, winner: 'DRAW' });
    const aggregate = getAggregateScore(volta, [ida, volta]);
    expect(isPenaltiesPending(volta, aggregate)).toBe(true);
    expect(isPenaltiesPending({ ...volta, home_penalty: 4, away_penalty: 2 }, aggregate)).toBe(false);
  });
});

describe('outras regras', () => {
  it('trata id_event "0" como vazio', () => {
    expect(getEspnMatchId({ id_event: '0' })).toBe('');
    expect(getEspnMatchId({ id_event: '401841277' })).toBe('401841277');
  });

  it('mostra "A definir" para time sem nome', () => {
    expect(teamDisplayName('')).toBe('A definir');
    expect(teamDisplayName('  ')).toBe('A definir');
    expect(teamDisplayName('Flamengo')).toBe('Flamengo');
  });

  it('reconhece jogo ao vivo e encerrado nos dois formatos', () => {
    expect(isLiveMatch({ state: 'in' })).toBe(true);
    expect(isLiveMatch({ status: 'IN_PLAY' })).toBe(true);
    expect(isLiveMatch({ status: 'PAUSED' })).toBe(true);
    expect(isLiveMatch({ status: 'TIMED' })).toBe(false);
    expect(isFinishedMatch({ status: 'FINISHED' })).toBe(true);
    expect(isFinishedMatch({ state: 'post' })).toBe(true);
    expect(isFinishedMatch({ status: 'SCHEDULED' })).toBe(false);
  });

  it('traduz os nomes de grupo', () => {
    expect(formatGroupName('GROUP_A')).toBe('Grupo A');
    expect(formatGroupName('Group C1')).toBe('Grupo C1');
  });

  it('monta o rótulo de fase da home pelo cadastro', () => {
    expect(getPhaseLabel({ league: 'BSA', stage: 'REGULAR_SEASON', round: 30 })).toBe('Rodada 30');
    expect(getPhaseLabel({ league: 'CLI', stage: 'GROUP_STAGE', round: 3 })).toBe('Fase de Grupos • Rodada 3');
    expect(getPhaseLabel({ league: 'CSU', stage: 'GROUP_STAGE', round: 1 })).toBe('Fase de Grupos');
    expect(getPhaseLabel({ league: 'CLI', stage: 'SEMI_FINALS', round: 0 })).toBe('Semifinal');
    expect(getPhaseLabel({ league: 'WC', stage: 'FINAL', round: 0 })).toBe('Final');
  });

  it('marca ida e volta e a fase na tela do time', () => {
    const ida = first({ home_score: 0, away_score: 0 });
    const volta = second({ status: 'TIMED' });
    expect(getLegLabel(ida, [ida, volta])).toBe('Jogo de ida');
    expect(getLegLabel(volta, [ida, volta])).toBe('Jogo de volta');
    expect(getTeamMatchPhaseText(volta, [ida, volta])).toBe('Semifinal • Jogo de volta');
    expect(getTeamMatchPhaseText({ league: 'CLI', stage: 'GROUP_STAGE', group_name: 'GROUP_A', round: 3 }, [])).toBe('Grupo A • Rodada 3');
    expect(getTeamMatchPhaseText({ league: 'BSA', stage: 'REGULAR_SEASON', round: 30 }, [])).toBe('Rodada 30');
  });

  it('calcula V/E/D do ponto de vista do time', () => {
    const m = first({ home_score: 2, away_score: 1 });
    expect(getResultForTeam(m, 1)).toBe('V');
    expect(getResultForTeam(m, 2)).toBe('D');
    expect(getResultForTeam({ ...m, away_score: 2 }, '2')).toBe('E');
    expect(getResultForTeam({ ...m, status: 'TIMED' }, 1)).toBeNull();
    expect(getResultForTeam(m, 99)).toBeNull();
  });
});

describe('nome curto do time', () => {
  it('tira as siglas do clube', () => {
    expect(shortTeamName('CR Flamengo')).toBe('Flamengo');
    expect(shortTeamName('São Paulo FC')).toBe('São Paulo');
    expect(shortTeamName('RB Bragantino')).toBe('Bragantino');
    expect(shortTeamName('Grêmio FBPA')).toBe('Grêmio');
    expect(shortTeamName('Clube do Remo')).toBe('Clube do Remo');
    expect(shortTeamName('PSV')).toBe('PSV');
  });
});
