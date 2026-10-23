import {
  getBracketRounds,
  getLeagueName,
  getStandingsLegend,
  getTableLabel,
  getZoneColor,
  hasLast32,
  hasChances,
  getZoneLabel,
  hasStandingsTable,
  isCupLeague,
  isTableStage,
  ZONE_COLORS,
} from './leagues';

describe('getZoneColor', () => {
  it('pinta as zonas do Brasileirão', () => {
    expect(getZoneColor('libertadores')).toBe(ZONE_COLORS.qualified);
    expect(getZoneColor('pre_libertadores')).toBe(ZONE_COLORS.playoff);
    expect(getZoneColor('Pré-Libertadores')).toBe(ZONE_COLORS.playoff);
    expect(getZoneColor('sul_americana')).toBe(ZONE_COLORS.secondary);
    expect(getZoneColor('rebaixamento')).toBe(ZONE_COLORS.eliminated);
    expect(getZoneColor('neutro')).toBe('transparent');
  });

  it('pinta as zonas europeias', () => {
    expect(getZoneColor('champions_league')).toBe(ZONE_COLORS.qualified);
    expect(getZoneColor('europa_league')).toBe(ZONE_COLORS.playoff);
    expect(getZoneColor('conference_league')).toBe(ZONE_COLORS.secondary);
  });

  it('pinta as zonas das copas (com acento em "pré")', () => {
    expect(getZoneColor('Classificado - Oitavas')).toBe(ZONE_COLORS.qualified);
    expect(getZoneColor('Playoffs (pré-oitavas)')).toBe(ZONE_COLORS.playoff);
    expect(getZoneColor('Sul-Americana')).toBe(ZONE_COLORS.secondary);
    expect(getZoneColor('Eliminado')).toBe(ZONE_COLORS.eliminated);
    expect(getZoneColor('Melhor 3º')).toBe(ZONE_COLORS.bestThird);
  });

  it('pinta o acesso da Série B', () => {
    expect(getZoneColor('acesso')).toBe(ZONE_COLORS.promotion);
  });

  it('sem zona (temporada antiga) fica transparente', () => {
    expect(getZoneColor('')).toBe('transparent');
    expect(getZoneColor(null)).toBe('transparent');
    expect(getZoneColor(undefined)).toBe('transparent');
  });
});

describe('cadastro de ligas', () => {
  it('diferencia copa e pontos corridos', () => {
    expect(isCupLeague('CLI')).toBe(true);
    expect(isCupLeague('cl')).toBe(true);
    expect(isCupLeague('BSA')).toBe(false);
    expect(isCupLeague('XYZ')).toBe(false); // fora do cadastro: pontos corridos
  });

  it('usa o nome do cadastro ou o da API', () => {
    expect(getLeagueName('PL')).toBe('Premier League');
    expect(getLeagueName('XYZ', 'Liga Nova')).toBe('Liga Nova');
    expect(getLeagueName('XYZ')).toBe('XYZ');
  });

  it('sabe o nome da tabela e as fases de tabela', () => {
    expect(getTableLabel('CL')).toBe('Fase de Liga');
    expect(getTableLabel('CLI')).toBe('Grupos');
    expect(isTableStage('GROUP_STAGE')).toBe(true);
    expect(isTableStage('LEAGUE_STAGE')).toBe(true);
    expect(isTableStage('SEMI_FINALS')).toBe(false);
  });

  it('conhece as particularidades das copas', () => {
    expect(hasStandingsTable('CDB')).toBe(false);
    expect(hasStandingsTable('CLI')).toBe(true);
    expect(hasLast32('WC')).toBe(true);
    expect(hasLast32('CLI')).toBe(false);
    expect(getBracketRounds('CLI').LAST_16).toBe('PLAY_OFFS');
    expect(getBracketRounds('CL')).toEqual({ LAST_16: 'LAST_16', QUARTER_FINALS: 'QUARTER_FINALS', SEMI_FINALS: 'SEMI_FINALS', FINAL: 'FINAL' });
  });

  it('escolhe a legenda certa', () => {
    expect(getStandingsLegend('BSB').map(i => i.label)).toEqual(['Acesso à Série A', 'Playoff de acesso', 'Rebaixamento']);
    expect(getStandingsLegend('BSA')[0].label).toBe('Libertadores');
    expect(getStandingsLegend('PL')[0].label).toBe('Champions League');
    expect(getStandingsLegend('CLI').map(i => i.label)).toEqual(['Oitavas', 'Sul-Americana', 'Eliminado']);
    expect(getStandingsLegend('WC').map(i => i.label)).toEqual(['Classificado', 'Melhor 3º', 'Eliminado']);
  });

  it('chances só em pontos corridos e na fase de liga da Champions', () => {
    expect(['BSA', 'BSB', 'PL', 'CL'].every(hasChances)).toBe(true);
    expect(['WC', 'UNL', 'CLI', 'CSU', 'CDB'].some(hasChances)).toBe(false);
    expect(hasChances('XYZ')).toBe(true); // liga fora do cadastro = pontos corridos
  });

  it('nome da zona igual ao da legenda da tabela', () => {
    expect(getZoneLabel('BSA', 'libertadores')).toBe('Libertadores');
    expect(getZoneLabel('BSA', 'pre_libertadores')).toBe('Pré-Libertadores');
    expect(getZoneLabel('BSA', 'sul_americana')).toBe('Sul-Americana');
    expect(getZoneLabel('BSB', 'playoff')).toBe('Playoff de acesso');
    expect(getZoneLabel('PL', 'europa_league')).toBe('Europa League');
    expect(getZoneLabel('PD', 'conference_league')).toBe('Conference League');
    expect(getZoneLabel('CL', 'Playoffs (pré-oitavas)')).toBe('Playoffs');
    expect(getZoneLabel('CL', 'Classificado - Oitavas')).toBe('Oitavas');
  });
});
