import { addDays, calculateAge, formatDateRange, parseMatchDate } from './dates';

const iso = (value: unknown) => parseMatchDate(value)?.toISOString() ?? null;

describe('parseMatchDate', () => {
  it('lê o formato do banco com +00', () => {
    expect(iso('2026-10-15 00:30:00+00')).toBe('2026-10-15T00:30:00.000Z');
  });

  it('lê +0000 e fusos com dois pontos', () => {
    expect(iso('2026-10-15T00:30:00+0000')).toBe('2026-10-15T00:30:00.000Z');
    expect(iso('2026-10-15T00:30:00-03:00')).toBe('2026-10-15T03:30:00.000Z');
    expect(iso('2026-10-15T21:30:00-03')).toBe('2026-10-16T00:30:00.000Z');
  });

  it('lê ISO com Z, inclusive sem segundos (ESPN)', () => {
    expect(iso('2026-10-15T00:30:00Z')).toBe('2026-10-15T00:30:00.000Z');
    expect(iso('2026-10-18T13:00Z')).toBe('2026-10-18T13:00:00.000Z');
  });

  it('trata data e hora sem fuso como UTC', () => {
    expect(iso('2026-10-11 21:30:00')).toBe('2026-10-11T21:30:00.000Z');
    expect(iso('2026-10-11T21:30:00')).toBe('2026-10-11T21:30:00.000Z');
  });

  it('não confunde o dia com fuso quando não há horário', () => {
    // Em "2026-10-04" o "-04" é o dia: nada de virar "-04:00"
    expect(iso('2026-10-04')).toBe('2026-10-04T00:00:00.000Z');
  });

  it('devolve null para vazio ou inválido', () => {
    expect(parseMatchDate('')).toBeNull();
    expect(parseMatchDate(null)).toBeNull();
    expect(parseMatchDate(undefined)).toBeNull();
    expect(parseMatchDate('amanhã')).toBeNull();
  });
});

describe('outras datas', () => {
  it('soma dias numa chave de data, virando o mês', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('calcula a idade pela data de nascimento, nos dois formatos da API', () => {
    const now = new Date(2026, 9, 18);
    expect(calculateAge('1997-06-20', now)).toBe(29);
    expect(calculateAge('1991-10-19T08:00Z', now)).toBe(34);
    expect(calculateAge('1991-10-18T08:00Z', now)).toBe(35);
    expect(calculateAge('', now)).toBeNull();
  });

  it('formata o período de uma fase', () => {
    const t = (d: number, m: number) => new Date(2026, m - 1, d, 15).getTime();
    expect(formatDateRange([t(15, 2), t(27, 2), t(20, 2)])).toBe('15/2 - 27/2');
    expect(formatDateRange([t(3, 5)])).toBe('3/5');
    expect(formatDateRange([])).toBe('');
  });
});
