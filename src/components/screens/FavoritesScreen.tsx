'use client';

import { CheckCircle2, Circle, Share } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LEAGUES } from '@/config/leagues';
import { NotificationsSetting } from '@/components/NotificationsSetting';
import { TopBar } from '@/components/ui/TopBar';
import { freezeScrollMemory, hasInAppHistory } from '@/lib/navigation';
import { getFavoriteLeagues, saveFavoriteLeagues } from '@/lib/preferences';

// Aberto pelo navegador (e não pelo ícone da Tela de Início)?
function isStandalone() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// Escolha das ligas da tela inicial. Quem nunca escolheu vê todas
export function FavoritesScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[] | null>(null);
  const [showInstallTip, setShowInstallTip] = useState(false);

  useEffect(() => {
    setSelected(getFavoriteLeagues());
    setShowInstallTip(!isStandalone());
  }, []);

  const toggle = (code: string) => setSelected(prev => (prev?.includes(code) ? prev.filter(c => c !== code) : [...(prev ?? []), code]));

  const save = () => {
    // Desmarcou tudo: salva vazio (a home mostra o convite para escolher)
    saveFavoriteLeagues(LEAGUES.map(l => l.code).filter(code => selected?.includes(code)));
    freezeScrollMemory();
    if (hasInAppHistory()) router.back();
    else router.push('/');
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title="Minhas Ligas" />
      <p className="px-5 pb-4 text-sm text-muted">Escolha quais campeonatos você quer acompanhar no seu painel principal.</p>

      <ul className="flex-1 space-y-2.5 px-4 pb-6">
        {LEAGUES.map(league => {
          const isSelected = !!selected?.includes(league.code);
          return (
            <li key={league.code}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => toggle(league.code)}
                disabled={selected === null}
                className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                  isSelected ? 'border-accent bg-accent/10' : 'border-line-2 bg-card-2'
                }`}
              >
                <span className="w-7 text-center text-2xl leading-none" aria-hidden>
                  {league.icon}
                </span>
                <span className="flex-1 text-base text-ink">{league.name}</span>
                {isSelected ? <CheckCircle2 size={24} className="text-accent" /> : <Circle size={24} className="text-[#475569]" />}
              </button>
            </li>
          );
        })}

        <li className="pt-4">
          <h2 className="mb-2.5 px-1 text-xs font-bold uppercase tracking-wider text-faint">Notificações</h2>
          <NotificationsSetting />
        </li>

        {showInstallTip && (
          <li className="pt-4">
            <div className="flex gap-3 rounded-xl border border-line-2 bg-card p-4 text-[13px] leading-5 text-muted">
              <Share size={20} className="mt-0.5 shrink-0 text-accent" />
              <p>
                <span className="font-bold text-ink">Use como app no iPhone:</span> no Safari, toque em Compartilhar e depois em
                &ldquo;Adicionar à Tela de Início&rdquo;.
              </p>
            </div>
          </li>
        )}
      </ul>

      <div className="sticky bottom-0 bg-screen/95 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={selected === null}
          className="w-full rounded-xl bg-accent py-4 text-base font-bold text-white active:bg-accent/80"
        >
          Salvar Preferências
        </button>
      </div>
    </div>
  );
}
