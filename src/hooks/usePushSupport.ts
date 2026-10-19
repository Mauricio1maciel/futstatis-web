import { useEffect, useState } from 'react';
import { getPushSupport, type PushSupport } from '@/lib/webPush';

let cached: PushSupport | null = null;
let pending: Promise<PushSupport> | null = null;

// Se dá para ter notificações aqui (uma consulta por sessão). null = ainda verificando
export function usePushSupport(): PushSupport | null {
  const [support, setSupport] = useState<PushSupport | null>(cached);
  useEffect(() => {
    if (cached) return;
    pending ??= getPushSupport().then(result => {
      cached = result;
      if (result === 'server-off') pending = null; // servidor fora: tenta de novo na próxima tela
      return result;
    });
    let alive = true;
    pending.then(result => alive && setSupport(result));
    return () => {
      alive = false;
    };
  }, []);
  return support;
}
