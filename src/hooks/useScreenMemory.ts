import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { hasRememberedValue, isPopNavigation, recallValue, rememberValue } from '@/lib/navigation';

export type ScreenMemory = { scope: string; restore: boolean };

// Uma tela (ex: "time:1783"). restore = veio do botão voltar: os estados voltam como estavam
export function useScreenMemory(scope: string): ScreenMemory {
  const [restore] = useState(isPopNavigation);
  return { scope, restore };
}

// useState que sobrevive ao "voltar": guarda o valor em memória e o recupera só no voltar/avançar
export function useRememberedState<T>(
  memory: ScreenMemory,
  field: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const key = `${memory.scope}::${field}`;
  const [value, setValue] = useState<T>(() => {
    if (memory.restore && hasRememberedValue(key)) return recallValue<T>(key);
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    rememberValue(key, value);
  }, [key, value]);

  return [value, setValue];
}
