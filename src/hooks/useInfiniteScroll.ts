import { useEffect, useRef } from 'react';

const MAX_CHAINED_LOADS = 6;

// Chama onReachEnd quando o marcador do fim da lista aparece. Se depois de carregar ele continua
// visível (dia sem jogos, rodada curta), carrega de novo, até um limite, sem depender de rolar
export function useInfiniteScroll(onReachEnd: () => Promise<unknown> | void, enabled: boolean, rootMargin = '600px') {
  const ref = useRef<HTMLDivElement | null>(null);
  const callback = useRef(onReachEnd);
  useEffect(() => {
    callback.current = onReachEnd;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let visible = false;
    let busy = false;
    let chain = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const trigger = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        await callback.current();
      } finally {
        busy = false;
      }
      // Dá tempo para a lista nova aparecer e o observador reavaliar antes de decidir
      timer = setTimeout(() => {
        if (!stopped && visible && ++chain < MAX_CHAINED_LOADS) trigger();
      }, 250);
    };

    const observer = new IntersectionObserver(
      entries => {
        visible = entries.some(entry => entry.isIntersecting);
        if (visible) {
          chain = 0;
          trigger();
        }
      },
      { rootMargin: `0px 0px ${rootMargin} 0px` },
    );
    observer.observe(element);
    return () => {
      stopped = true;
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [enabled, rootMargin]);

  return ref;
}
