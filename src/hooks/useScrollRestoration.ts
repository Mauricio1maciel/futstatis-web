import { useEffect, useRef, useState } from 'react';
import { getScrollPosition, isPopNavigation, saveScrollPosition, unfreezeScrollMemory } from '@/lib/navigation';

// Guarda a rolagem da tela e, ao voltar para ela, devolve a posição assim que o conteúdo estiver
// pronto (ready). A posição alvo é lida na montagem, antes de qualquer rolagem da tela nova
export function useScrollRestoration(key: string, ready: boolean) {
  const [target] = useState<number | undefined>(() => (isPopNavigation() ? getScrollPosition(key) ?? 0 : undefined));
  const restored = useRef(false);

  useEffect(() => {
    unfreezeScrollMemory();
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => saveScrollPosition(key, window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [key]);

  useEffect(() => {
    if (restored.current || !ready) return;
    restored.current = true;
    if (target === undefined) return;
    // O conteúdo pode ainda estar crescendo (imagens, listas): tenta por alguns quadros
    let tries = 0;
    let frame = 0;
    const attempt = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max >= target || tries++ > 40) {
        window.scrollTo(0, target);
        return;
      }
      frame = requestAnimationFrame(attempt);
    };
    frame = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(frame);
  }, [ready, target]);
}
