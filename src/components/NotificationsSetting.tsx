'use client';

import { Bell, Loader2, Share } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePushSupport } from '@/hooks/usePushSupport';
import { clearFollows, loadFollows } from '@/lib/follows';
import { showToast } from '@/lib/toast';
import { disableWebPush, enableErrorMessage, enableWebPushDetailed, isWebPushEnabled } from '@/lib/webPush';

// "Avisos de jogos": liga/desliga as notificações deste navegador.
// No iPhone só funciona com o site instalado na Tela de Início: aí mostra a dica
export function NotificationsSetting() {
  const support = usePushSupport();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEnabled(isWebPushEnabled());
  }, []);

  // Servidor sem push no navegador, ou navegador sem suporte: a opção fica escondida
  if (support === null || support === 'server-off' || support === 'unsupported') return null;

  if (support === 'needs-install') {
    return (
      <div className="flex gap-3 rounded-xl border border-line-2 bg-card p-4 text-[13px] leading-5 text-muted">
        <Bell size={20} className="mt-0.5 shrink-0 text-accent" />
        <p>
          <span className="font-bold text-ink">Avisos de jogos no iPhone:</span> adicione o site à Tela de Início
          (Compartilhar <Share size={13} className="inline -translate-y-px" /> → &ldquo;Adicionar à Tela de Início&rdquo;) e
          abra por lá para ativar as notificações (iOS 16.4 ou mais novo).
        </p>
      </div>
    );
  }

  const toggle = async () => {
    setBusy(true);
    if (enabled) {
      if (window.confirm('Desativar as notificações? As ligas, times e jogos que você segue são apagados.')) {
        await disableWebPush();
        clearFollows();
        setEnabled(false);
      }
    } else {
      const result = await enableWebPushDetailed(true);
      if (result.ok) {
        setEnabled(true);
        loadFollows();
      } else {
        showToast(...enableErrorMessage(result), 9000);
      }
    }
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-line-2 bg-card-2 px-4 py-3.5">
      <Bell size={22} className="shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="text-base text-ink">Avisos de jogos</p>
        <p className="mt-0.5 text-xs leading-4 text-muted">
          Escalação, início, gols, cartão vermelho e fim das ligas, times e jogos que você segue (⭐)
        </p>
      </div>
      {busy ? (
        <Loader2 size={22} className="animate-spin text-accent" />
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Avisos de jogos"
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? 'bg-accent' : 'bg-line-2'}`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-ink transition-all ${enabled ? 'left-5.5' : 'left-0.5'}`} />
        </button>
      )}
    </div>
  );
}
