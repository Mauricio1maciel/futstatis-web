import { formatChance } from '@/components/standings/ChancesPanel';
import { followingEndpoint, getFollows } from './follows';

describe('formato das chances', () => {
  it('0, menos de 1%, arredondado e 100%', () => {
    expect(formatChance(0)).toBe('–');
    expect(formatChance(0.4)).toBe('<1%');
    expect(formatChance(61.6)).toBe('62%');
    expect(formatChance(100)).toBe('100%');
  });
});

describe('endereço de Meus jogos', () => {
  it('não segue nada: sem endereço (a rota daria 400)', () => {
    expect(followingEndpoint(getFollows())).toBeNull();
  });

  it('IDs em ordem, para o mesmo endereço reaproveitar o cache', () => {
    const state = { ...getFollows(), teams: ['1783', '1766', '99'], leagues: ['PL', 'BSA'], matches: ['4821'] };
    expect(decodeURIComponent(followingEndpoint(state)!)).toBe('/matches/following?teams=99,1766,1783&leagues=BSA,PL&matches=4821&past=0&days=0');
  });
});
