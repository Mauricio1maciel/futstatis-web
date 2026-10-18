// Posições em português. A API manda as da football-data (Goalkeeper, Defence...) e as da ESPN
// (Defender, Forward... e as siglas da escalação: G, CD-L, AM-R...)

const GROUP: Record<string, string> = {
  Goalkeeper: 'Goleiros',
  Defence: 'Defensores',
  Defender: 'Defensores',
  Midfield: 'Meio-campistas',
  Midfielder: 'Meio-campistas',
  Offence: 'Atacantes',
  Forward: 'Atacantes',
  Attacker: 'Atacantes',
};

export const SQUAD_GROUP_ORDER = ['Goleiros', 'Defensores', 'Meio-campistas', 'Atacantes', 'Outros'];

/** Grupo do elenco: "Goleiros", "Defensores", "Meio-campistas", "Atacantes" ou "Outros" */
export const getPositionGroup = (position: unknown) => GROUP[String(position || '')] || 'Outros';

const SINGULAR: Record<string, string> = {
  GOALKEEPER: 'Goleiro',
  DEFENCE: 'Defensor',
  DEFENDER: 'Defensor',
  MIDFIELD: 'Meio-campista',
  MIDFIELDER: 'Meio-campista',
  OFFENCE: 'Atacante',
  FORWARD: 'Atacante',
  ATTACKER: 'Atacante',
  G: 'Goleiro',
  GK: 'Goleiro',
  SUB: 'Reserva',
};

const CODE_PREFIX: [RegExp, string][] = [
  [/^(LB|RB|CB|CD|LWB|RWB|D)(-[LR])?$/, 'Defensor'],
  [/^(DM|CM|LM|RM|AM|M)(-[LR])?$/, 'Meio-campista'],
  [/^(LW|RW|F|ST|LF|RF|CF)(-[LR])?$/, 'Atacante'],
];

/** "Forward" -> "Atacante", "CD-L" -> "Defensor" */
export function translatePosition(position: unknown): string {
  const raw = String(position || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (SINGULAR[upper]) return SINGULAR[upper];
  const byCode = CODE_PREFIX.find(([pattern]) => pattern.test(upper));
  return byCode ? byCode[1] : raw;
}
