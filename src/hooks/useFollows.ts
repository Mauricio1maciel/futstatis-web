import { useEffect, useSyncExternalStore } from 'react';
import { getFollows, loadFollows, subscribeFollows } from '@/lib/follows';

let loadedOnce = false;

// O que a pessoa segue (times, ligas e jogos). Busca na API uma vez por sessão
export function useFollows() {
  const state = useSyncExternalStore(subscribeFollows, getFollows, getFollows);
  useEffect(() => {
    if (!loadedOnce) {
      loadedOnce = true;
      loadFollows();
    }
  }, []);
  return state;
}
