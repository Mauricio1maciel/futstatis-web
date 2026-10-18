import { useSyncExternalStore } from 'react';
import { isAdminLoggedIn, subscribeAdmin } from '@/lib/auth';

// Admin logado? Re-renderiza quando ele entra, sai ou o token expira
export function useIsAdmin() {
  return useSyncExternalStore(subscribeAdmin, isAdminLoggedIn, () => false);
}
