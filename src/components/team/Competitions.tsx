'use client';

import { ChevronDown } from 'lucide-react';
import { getLeague, getLeagueName, leagueOrder } from '@/config/leagues';
import { BottomSheet, SheetOption } from '@/components/ui/BottomSheet';
import { Crest } from '@/components/ui/Crest';
import type { Match } from '@/lib/types';

export type Competition = { code: string; name: string; logo: string; icon: string };

// Competições que aparecem nos jogos do time, na ordem do cadastro (desconhecidas no fim)
export function getCompetitions(matches: Match[]): Competition[] {
  const byCode = new Map<string, Competition>();
  matches.forEach(m => {
    const code = String(m.league || '').toUpperCase();
    if (!code) return;
    const existing = byCode.get(code);
    if (existing) {
      if (!existing.logo && m.league_logo) existing.logo = m.league_logo;
      return;
    }
    byCode.set(code, { code, name: getLeagueName(code, m.league_name), logo: m.league_logo || '', icon: getLeague(code)?.icon || '🏆' });
  });
  return Array.from(byCode.values()).sort((a, b) => leagueOrder(a.code) - leagueOrder(b.code));
}

export function CompetitionIcon({ competition, size = 22 }: { competition?: Competition; size?: number }) {
  if (competition?.logo) return <Crest src={competition.logo} size={size} />;
  return (
    <span style={{ fontSize: size - 4, width: size }} className="inline-flex justify-center leading-none" aria-hidden>
      {competition?.icon || '🏆'}
    </span>
  );
}

// Botão do seletor (abre a folha de baixo)
export function CompetitionSelector({ competition, label, open, onOpen }: { competition?: Competition; label: string; open: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={open}
      className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-card px-4 py-3 text-left active:bg-white/5"
    >
      {competition && <CompetitionIcon competition={competition} size={20} />}
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{label}</span>
      <ChevronDown size={20} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

type SheetProps = {
  open: boolean;
  onClose: () => void;
  competitions: Competition[];
  selected: string | null;
  onSelect: (code: string | null) => void;
  /** Mostra "Todas as competições" (aba Jogos) */
  withAll?: boolean;
};

export function CompetitionSheet({ open, onClose, competitions, selected, onSelect, withAll = false }: SheetProps) {
  const pick = (code: string | null) => {
    onSelect(code);
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Competição">
      {withAll && <SheetOption label="Todas as competições" selected={selected === null} onSelect={() => pick(null)} />}
      {competitions.map(c => (
        <SheetOption
          key={c.code}
          label={c.name}
          icon={<CompetitionIcon competition={c} size={24} />}
          selected={selected === c.code}
          onSelect={() => pick(c.code)}
        />
      ))}
    </BottomSheet>
  );
}
