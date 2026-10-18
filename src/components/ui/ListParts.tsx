'use client';

import { ChevronUp, Loader2 } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';

// Rótulo de seção das listas ("Rodada 30", "Hoje • Domingo, 18 de outubro")
export function SectionPill({ children, highlight = false }: { children: ReactNode; highlight?: boolean }) {
  return (
    <h3
      className={`mx-2.5 my-3 inline-block rounded-md px-3 py-1.5 text-xs font-bold ${
        highlight ? 'bg-accent/15 text-accent' : 'bg-card-2 text-ink'
      }`}
    >
      {children}
    </h3>
  );
}

// Botão do topo da lista: "Ver jogos anteriores", "Ver rodada anterior"
export function PreviousButton({ label, onClick, loading = false }: { label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-1.5 py-3 text-[13px] font-bold text-accent"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronUp size={14} />}
      {label}
    </button>
  );
}

// Marcador do fim da lista (carrega mais ao aparecer) com o indicador de carregando
export function EndSentinel({ sentinelRef, active, endText }: { sentinelRef: RefObject<HTMLDivElement | null>; active: boolean; endText?: string }) {
  return (
    <div ref={sentinelRef} className="flex min-h-16 items-center justify-center px-6 text-center">
      {active ? (
        <Loader2 size={20} className="animate-spin text-accent" aria-label="Carregando mais" />
      ) : (
        endText && <p className="text-xs text-faint">{endText}</p>
      )}
    </div>
  );
}
