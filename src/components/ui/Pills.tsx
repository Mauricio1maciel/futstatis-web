'use client';

import type { ReactNode } from 'react';

export type PillOption<T extends string> = { value: T; label: ReactNode };

type Props<T extends string> = {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** "soft": aba ativa com fundo (sub-abas); "outline": borda azul (fases, estatísticas) */
  variant?: 'soft' | 'outline';
  className?: string;
  label?: string;
};

// Abas/botões em pílula, com rolagem horizontal quando não cabem
export function Pills<T extends string>({ options, value, onChange, variant = 'soft', className = '', label }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`}>
      {options.map(option => {
        const active = option.value === value;
        const style =
          variant === 'outline'
            ? active
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-transparent bg-card-2 text-muted'
            : active
              ? 'border-line-2 bg-card-2 font-bold text-white'
              : 'border-transparent text-faint';
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs transition-colors ${variant === 'outline' ? 'py-2 font-bold' : ''} ${style}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type UnderlineProps<T extends string> = {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Ocupar a largura toda (abas da home) ou alinhar à esquerda */
  stretch?: boolean;
  className?: string;
};

// Abas com sublinhado azul (AO VIVO / TODOS JOGOS, TEMPORADA / ELENCO, abas do jogo)
export function UnderlineTabs<T extends string>({ options, value, onChange, stretch = false, className = '' }: UnderlineProps<T>) {
  return (
    <div role="tablist" className={`no-scrollbar flex overflow-x-auto border-b border-line ${className}`}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`relative shrink-0 whitespace-nowrap px-4 py-3 text-[13px] font-semibold transition-colors ${
              stretch ? 'flex-1' : ''
            } ${active ? 'text-white' : 'text-faint'}`}
          >
            {option.label}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
          </button>
        );
      })}
    </div>
  );
}
