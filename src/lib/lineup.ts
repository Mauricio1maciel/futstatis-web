import type { LineupPlayer, MatchEvent } from './types';

// Posição (sigla da ESPN) -> [x%, y%] no campo, com o goleiro embaixo atacando para cima
const POSITION_MAP: Record<string, [number, number]> = {
  G: [50, 88],
  GK: [50, 88],
  LB: [12, 74],
  LWB: [12, 62],
  RB: [88, 74],
  RWB: [88, 62],
  CD: [50, 74],
  CB: [50, 74],
  'CD-L': [32, 74],
  'CD-R': [68, 74],
  DM: [50, 58],
  'DM-L': [32, 58],
  'DM-R': [68, 58],
  CM: [50, 45],
  'CM-L': [32, 45],
  'CM-R': [68, 45],
  LM: [15, 40],
  RM: [85, 40],
  AM: [50, 30],
  'AM-L': [25, 30],
  'AM-R': [75, 30],
  LW: [18, 22],
  RW: [82, 22],
  F: [50, 14],
  ST: [50, 14],
  CF: [50, 14],
  LF: [30, 14],
  RF: [70, 14],
  'CF-L': [35, 14],
  'CF-R': [65, 14],
};

const FALLBACK: Record<string, [number, number]> = { D: [50, 74], M: [50, 45] };

export type PlacedPlayer = LineupPlayer & { x: number; y: number };

// Titulares no campo. Dois jogadores no mesmo ponto da mesma linha: a linha é redistribuída por igual
export function placeStarters(starters: LineupPlayer[]): PlacedPlayer[] {
  const mapped = starters.map(player => {
    const key = String(player.position || '').toUpperCase();
    const [x, y] = POSITION_MAP[key] || FALLBACK[key] || [50, 50];
    return { ...player, x, y };
  });

  const byLine = new Map<number, PlacedPlayer[]>();
  mapped.forEach(player => byLine.set(player.y, [...(byLine.get(player.y) || []), player]));

  const result: PlacedPlayer[] = [];
  byLine.forEach(line => {
    const xs = line.map(p => p.x);
    const collision = new Set(xs).size !== xs.length;
    if (collision && line.length > 1) {
      line
        .sort((a, b) => a.x - b.x)
        .forEach((player, index) => {
          player.x = (100 / (line.length + 1)) * (index + 1);
        });
    }
    result.push(...line);
  });
  return result;
}

// Sobrenome para caber embaixo da foto no campo
export function shortPlayerName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
}

// Eventos técnicos da ESPN que não entram na linha do tempo
const IGNORED_EVENTS = ['Start Delay', 'End Delay', 'Kickoff', 'Halftime', 'End Regular Time', 'End of Half', 'Start 2nd Half'];

// Gols, cartões e substituições, sem os eventos técnicos e os sem minuto (outros técnicos da ESPN,
// como início da prorrogação, vêm sem jogador e também ficam de fora)
export const timelineEvents = (events: MatchEvent[]) =>
  events.filter(
    e =>
      !IGNORED_EVENTS.includes(e.event_type) &&
      String(e.minute || '').trim() !== '' &&
      !(classifyEvent(e.event_type) === 'other' && !String(e.player_name || '').trim()),
  );

export type EventKind = 'goal' | 'own-goal' | 'penalty-miss' | 'yellow' | 'second-yellow' | 'red' | 'substitution' | 'other';

export function classifyEvent(type: string): EventKind {
  const t = type.toLowerCase();
  if (t.includes('own goal')) return 'own-goal';
  if (t.includes('penalty') && (t.includes('miss') || t.includes('saved'))) return 'penalty-miss';
  if (t.includes('goal') || (t.includes('penalty') && t.includes('scored'))) return 'goal';
  if (t.includes('second yellow')) return 'second-yellow';
  if (t.includes('yellow')) return 'yellow';
  if (t.includes('red')) return 'red';
  if (t.includes('substitution')) return 'substitution';
  return 'other';
}

const EVENT_LABELS: Record<EventKind, string> = {
  goal: 'Gol',
  'own-goal': 'Gol contra',
  'penalty-miss': 'Pênalti perdido',
  yellow: 'Cartão amarelo',
  'second-yellow': 'Segundo amarelo',
  red: 'Cartão vermelho',
  substitution: 'Substituição',
  other: '',
};

export function eventLabel(type: string) {
  const kind = classifyEvent(type);
  if (kind === 'goal' && /penalty/i.test(type)) return 'Gol de pênalti';
  return EVENT_LABELS[kind] || type;
}

// ---------------- Marcas de cada jogador na escalação (gols, assistências, cartões, entrou/saiu) ----------------
// Os nomes dos eventos são os mesmos de lineups.player_name do jogo (docs/API.md, "Eventos do jogo").
// A comparação ignora acento e maiúsculas: a ESPN às vezes grafa "Joaquín"/"Joaquin"

export const normalizeName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export type PlayerMarks = {
  goals: number;
  /** Quantos dos gols foram de pênalti */
  penalties: number;
  ownGoals: number;
  assists: number;
  yellow: number;
  red: number;
  /** Minuto em que entrou / saiu */
  subbedIn?: string;
  subbedOut?: string;
};

const isGoal = (type: string) => type === 'Goal' || type.startsWith('Goal - ') || type === 'Penalty - Scored';
// Só nos gols com bola rolando o details é o assistente (na substituição ele é quem saiu)
const isAssistedGoal = (type: string) => type === 'Goal' || type.startsWith('Goal - ');

export function buildPlayerMarks(events: MatchEvent[]) {
  const marks = new Map<string, PlayerMarks>();
  const of = (name: string) => {
    const key = normalizeName(name);
    let entry = marks.get(key);
    if (!entry) {
      entry = { goals: 0, penalties: 0, ownGoals: 0, assists: 0, yellow: 0, red: 0 };
      marks.set(key, entry);
    }
    return entry;
  };

  events.forEach(event => {
    const type = String(event.event_type || '');
    const player = String(event.player_name || '').trim();
    const details = String(event.details || '').trim();
    if (isGoal(type) && player) {
      const m = of(player);
      m.goals += 1;
      if (type === 'Penalty - Scored') m.penalties += 1;
    }
    if (isAssistedGoal(type) && details) of(details).assists += 1;
    if (type === 'Own Goal' && player) of(player).ownGoals += 1;

    const kind = classifyEvent(type);
    if (!player) return;
    if (kind === 'yellow') of(player).yellow += 1;
    if (kind === 'red') of(player).red += 1;
    if (kind === 'second-yellow') {
      of(player).yellow += 1;
      of(player).red += 1;
    }
    if (kind === 'substitution') {
      of(player).subbedIn = event.minute;
      if (details) of(details).subbedOut = event.minute;
    }
  });

  return (name: string): PlayerMarks | undefined => marks.get(normalizeName(name));
}
