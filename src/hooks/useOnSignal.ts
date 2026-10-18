import { useEffect, useRef } from 'react';

// Roda o callback quando o "sinal" muda (ex: o botão atualizar do cabeçalho soma 1).
// O valor que já existia na montagem não dispara nada
export function useOnSignal(signal: number, callback: () => void) {
  const saved = useRef(callback);
  const initial = useRef(signal);
  useEffect(() => {
    saved.current = callback;
  });
  useEffect(() => {
    if (signal !== initial.current) saved.current();
  }, [signal]);
}
