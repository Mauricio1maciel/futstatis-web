'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { clearPopNavigation, markInAppNavigation } from '@/lib/navigation';

// Fica depois das telas no layout: o efeito de "URL mudou" roda depois que a tela nova montou
// (e leu se veio do botão voltar). Os ouvintes de popstate e de clique ficam em lib/navigation.ts
export function NavigationTracker() {
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? '';
  const first = useRef(true);

  useEffect(() => {
    clearPopNavigation();
    if (first.current) first.current = false;
    else markInAppNavigation();
  }, [pathname, search]);

  return null;
}
