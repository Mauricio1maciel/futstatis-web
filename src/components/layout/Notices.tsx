'use client';

import { ChevronDown, ChevronUp, CloudOff, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { formatCachedAt } from '@/lib/dates';
import { dismissNetworkErrors, subscribeNetworkErrors, type NetworkErrorState } from '@/lib/networkErrors';
import { dismissToast, subscribeToasts, type Toast } from '@/lib/toast';

const GUEST_AUTO_HIDE_MS = 4000;

// Aviso único de falhas de rede no rodapé (visitante: discreto e some sozinho; admin: lista das
// rotas que falharam) e os avisos curtos (ex: sessão de admin expirada)
export function Notices() {
  const isAdmin = useIsAdmin();
  const [errors, setErrors] = useState<NetworkErrorState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => subscribeNetworkErrors(setErrors), []);
  useEffect(() => subscribeToasts(setToasts), []);

  // Visitante: o aviso some sozinho. Novas falhas com ele na tela só reiniciam o tempo.
  // Sumir sozinho não silencia os próximos avisos (só fechar no X silencia por 30 s)
  useEffect(() => {
    if (isAdmin || !errors?.visible) return;
    const timer = setTimeout(() => dismissNetworkErrors(false), GUEST_AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [isAdmin, errors]);

  const visible = !!errors?.visible;
  if (!visible && toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-130 flex-col gap-2 px-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex animate-fade-in items-start gap-3 rounded-xl border border-line-2 bg-card-2 px-4 py-3 shadow-2xl"
        >
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-gold-2" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">{toast.title}</p>
            {toast.message && <p className="mt-0.5 text-xs text-muted">{toast.message}</p>}
          </div>
          <button type="button" aria-label="Fechar" onClick={() => dismissToast(toast.id)} className="-m-1 p-1 text-muted">
            <X size={18} />
          </button>
        </div>
      ))}

      {visible && errors && !isAdmin && (
        <div role="status" className="flex animate-fade-in items-center justify-center gap-2 rounded-xl border border-line-2 bg-card-2 px-4 py-3 shadow-2xl">
          <CloudOff size={18} className="shrink-0 text-ink" />
          <span className="text-sm text-ink">
            {errors.cachedAt ? `Sem conexão: dados das ${formatCachedAt(errors.cachedAt)}` : 'Sem conexão. Verifique sua internet.'}
          </span>
        </div>
      )}

      {visible && errors && isAdmin && (
        <div className="pointer-events-auto animate-fade-in overflow-hidden rounded-xl border border-red-900 bg-card-2 shadow-2xl">
          <div className="flex items-center gap-2 p-3">
            <button type="button" onClick={() => setExpanded(v => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <TriangleAlert size={18} className="shrink-0 text-red-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">
                  {errors.total} {errors.total === 1 ? 'requisição falhou' : 'requisições falharam'}
                </span>
                <span className="block truncate text-xs text-muted">
                  {errors.requests[0]?.message} • {errors.baseUrl}
                </span>
                {!!errors.cachedAt && (
                  <span className="block text-xs text-muted">Mostrando cópia local das {formatCachedAt(errors.cachedAt)}</span>
                )}
              </span>
              {expanded ? <ChevronDown size={18} className="text-muted" /> : <ChevronUp size={18} className="text-muted" />}
            </button>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => {
                setExpanded(false);
                dismissNetworkErrors();
              }}
              className="p-1 text-muted"
            >
              <X size={20} />
            </button>
          </div>
          {expanded && (
            <div className="max-h-56 overflow-y-auto border-t border-line-2 px-3">
              {errors.requests.map(request => (
                <div key={request.endpoint.split('?')[0]} className="border-b border-card-3 py-2">
                  <p className="break-all font-mono text-xs text-ink">
                    {request.endpoint}
                    {request.count > 1 ? `  ×${request.count}` : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] text-red-400">
                    {request.message} • {new Date(request.lastAt).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              ))}
              <p className="py-2 text-center text-[11px] text-faint">Ao fechar, novos erros ficam ocultos por 30 s.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
