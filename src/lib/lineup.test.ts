import { buildPlayerMarks, eventLabel, timelineEvents } from './lineup';
import type { MatchEvent } from './types';

const ev = (event_type: string, player_name: string, details = '', minute = "10'"): MatchEvent => ({
  event_type,
  player_name,
  details,
  minute,
  espn_team_id: 819,
});

describe('buildPlayerMarks', () => {
  const marksOf = buildPlayerMarks([
    ev('Goal', 'Pedro', 'Gonzalo Plata', "12'"),
    ev('Goal - Header', 'Pedro', '', "30'"),
    ev('Penalty - Scored', 'Pedro', '', "55'"),
    ev('Goal - Volley', 'Bruno Henrique', 'Gonzalo Plata', "60'"),
    ev('Own Goal', 'Léo Ortiz', '', "70'"),
    ev('Yellow Card', 'Lucas Paquetá', '', "35'"),
    ev('Red Card', 'Léo Ortiz', '', "80'"),
    ev('Substitution', 'Joaquin Freitas', 'Lucas Paquetá', "85'"),
  ]);

  it('conta gols, gols de pênalti e assistências', () => {
    expect(marksOf('Pedro')).toMatchObject({ goals: 3, penalties: 1, assists: 0 });
    expect(marksOf('Gonzalo Plata')).toMatchObject({ goals: 0, assists: 2 });
    expect(marksOf('Bruno Henrique')).toMatchObject({ goals: 1 });
  });

  it('marca gol contra e cartões', () => {
    expect(marksOf('Léo Ortiz')).toMatchObject({ ownGoals: 1, goals: 0, red: 1 });
    expect(marksOf('Lucas Paquetá')).toMatchObject({ yellow: 1 });
  });

  it('na substituição o details é quem saiu, não uma assistência', () => {
    expect(marksOf('Lucas Paquetá')).toMatchObject({ subbedOut: "85'", assists: 0 });
    expect(marksOf('Joaquin Freitas')).toMatchObject({ subbedIn: "85'" });
  });

  it('compara nomes sem acento e sem diferença de maiúsculas', () => {
    expect(marksOf('leo ortiz')?.ownGoals).toBe(1);
    expect(marksOf('Ninguém')).toBeUndefined();
  });
});

describe('linha do tempo', () => {
  it('ignora eventos técnicos e os sem minuto', () => {
    const list = timelineEvents([ev('Kickoff', '', '', ''), ev('Halftime', '', '', "45'"), ev('Goal', 'Pedro'), ev('Start Extra Time', '', '', "90'")]);
    expect(list.map(e => e.player_name)).toEqual(['Pedro']);
  });

  it('traduz os tipos de lance', () => {
    expect(eventLabel('Goal - Header')).toBe('Gol');
    expect(eventLabel('Penalty - Scored')).toBe('Gol de pênalti');
    expect(eventLabel('Own Goal')).toBe('Gol contra');
    expect(eventLabel('Yellow Card')).toBe('Cartão amarelo');
  });
});
