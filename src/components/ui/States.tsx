import { CloudOff, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// Tela/aba sem conteúdo: ícone, título, texto e uma ação opcional
export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  compact = false,
}: {
  icon?: LucideIcon;
  title?: string;
  text?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center px-8 text-center ${compact ? 'py-8' : 'py-14'}`}>
      {Icon && (
        <div className={`mb-4 flex items-center justify-center rounded-full bg-card-2 ${compact ? 'h-16 w-16' : 'h-24 w-24'}`}>
          <Icon size={compact ? 30 : 46} className="text-faint" />
        </div>
      )}
      {title && <p className="mb-2 text-lg font-bold text-white">{title}</p>}
      {text && <p className="text-sm leading-5 text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Falha sem nada guardado para mostrar
export function ErrorState({ onRetry, text = 'Não foi possível carregar' }: { onRetry?: () => void; text?: string }) {
  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <CloudOff size={40} className="text-line-2" />
      <p className="mt-3 text-sm font-medium text-muted">{text}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-bold text-accent">
          Tentar de novo
        </button>
      )}
    </div>
  );
}

// Botão com borda azul em pílula ("Ver Todos os Jogos", "Abrir Calendário")
export function OutlineButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-accent px-5 py-2.5 text-[13px] font-bold text-accent active:bg-accent/10"
    >
      {children}
    </button>
  );
}

// Card cinza de aviso dentro de listas ("Não há partidas agendadas nesta data.")
export function InfoCard({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-2.5 my-2.5 flex flex-col items-center rounded-xl bg-card-3 px-5 py-7 text-center">
      <p className="text-[13px] text-muted">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
