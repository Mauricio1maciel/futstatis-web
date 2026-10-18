'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useApi } from '@/hooks/useApi';
import { buildEndpoint } from '@/lib/api';
import { formatMonthYear, fromDateKey, todayKey } from '@/lib/dates';
import { asArray, type CalendarDay } from '@/lib/types';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const pad = (n: number) => String(n).padStart(2, '0');

type Props = {
  open: boolean;
  onClose: () => void;
  leagues: string[];
  selectedDate: string;
  onSelect: (dateKey: string) => void;
};

// Calendário para pular para uma data, com quantos jogos cada dia tem (/matches/calendar)
export function CalendarSheet({ open, onClose, leagues, selectedDate, onSelect }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Selecionar data">
      {/* Monta a cada abertura: começa no mês da data escolhida */}
      <CalendarBody
        leagues={leagues}
        selectedDate={selectedDate}
        onPick={key => {
          onSelect(key);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

function CalendarBody({ leagues, selectedDate, onPick }: { leagues: string[]; selectedDate: string; onPick: (key: string) => void }) {
  const [month, setMonth] = useState(() => {
    const d = fromDateKey(selectedDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const endpoint =
    leagues.length > 0 ? buildEndpoint('/matches/calendar', { leagues: leagues.join(','), month: pad(monthIndex + 1), year }) : null;
  const { data } = useApi(endpoint, { parse: asArray<CalendarDay> });
  const counts = new Map((data ?? []).map(day => [day.date, Number(day.count) || 0]));

  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = todayKey();
  const shiftMonth = (delta: number) => setMonth(new Date(year, monthIndex + delta, 1));

  return (
    <div className="px-3">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Mês anterior" onClick={() => shiftMonth(-1)} className="rounded-full p-2 text-ink active:bg-white/10">
          <ChevronLeft size={22} />
        </button>
        <span className="text-sm font-bold uppercase text-accent">{formatMonthYear(month)}</span>
        <button type="button" aria-label="Próximo mês" onClick={() => shiftMonth(1)} className="rounded-full p-2 text-ink active:bg-white/10">
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((day, i) => (
          <span key={i} className="py-1 text-xs font-bold text-faint">
            {day}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`vazio-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
          const selected = key === selectedDate;
          const count = counts.get(key) || 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              aria-label={`${day}${count ? `, ${count} ${count === 1 ? 'jogo' : 'jogos'}` : ''}`}
              aria-pressed={selected}
              className={`relative mx-auto flex aspect-square w-full max-w-12 items-center justify-center rounded-lg text-sm ${
                selected ? 'bg-accent font-bold text-white' : key === today ? 'font-bold text-accent ring-1 ring-accent/50' : 'text-ink'
              }`}
            >
              {day}
              {count > 0 && (
                <span className="absolute bottom-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-live px-0.5 text-[8px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onPick(today)}
        className="mt-5 w-full rounded-lg bg-line-2 py-3 text-sm font-bold text-white active:bg-line-2/70"
      >
        Ir para Hoje
      </button>
    </div>
  );
}
