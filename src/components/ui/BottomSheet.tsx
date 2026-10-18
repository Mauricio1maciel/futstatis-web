'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

const subscribeNothing = () => () => {};

// Folha que sobe de baixo, por cima da tela (seletores de fase, competição, temporada, calendário)
export function BottomSheet({ open, onClose, title, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  // O portal só existe no navegador (o HTML estático é gerado sem document)
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      root.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[82dvh] w-full max-w-130 animate-sheet-in flex-col rounded-t-2xl border border-b-0 border-line-2 bg-card-2 pb-safe outline-none"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-2" />
        {title && (
          <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
            <h2 className="text-base font-bold text-white">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 p-2 text-muted">
              <X size={22} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto overscroll-contain px-2 pb-4 pt-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

type OptionProps = {
  label: ReactNode;
  sublabel?: ReactNode;
  icon?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  indent?: boolean;
};

// Opção marcável (radio) dentro da folha
export function SheetOption({ label, sublabel, icon, selected, onSelect, indent = false }: OptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left active:bg-white/5 ${indent ? 'pl-9' : ''} ${
        selected ? 'bg-accent/10' : ''
      }`}
    >
      {icon && <span className="flex w-7 shrink-0 items-center justify-center">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15px] ${selected ? 'font-bold text-accent' : 'text-ink'}`}>{label}</span>
        {sublabel && <span className="mt-0.5 block text-xs text-muted">{sublabel}</span>}
      </span>
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-accent' : 'border-faint'}`}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
      </span>
    </button>
  );
}
