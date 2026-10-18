import { useEffect, useRef } from 'react';

// setInterval que pausa com a aba em segundo plano e, ao voltar, roda na hora se já passou o tempo.
// delay null = parado
export function useInterval(callback: () => void, delay: number | null) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    if (delay == null) return;
    let lastRun = Date.now();
    const run = () => {
      lastRun = Date.now();
      saved.current();
    };
    const id = setInterval(() => {
      if (!document.hidden) run();
    }, delay);
    const onVisibility = () => {
      if (!document.hidden && Date.now() - lastRun >= delay) run();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [delay]);
}
