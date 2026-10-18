import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LeagueRoute } from '@/components/screens/LeagueScreen';
import { ScreenFallback } from '@/components/ui/ScreenFallback';

export const metadata: Metadata = { title: 'Liga' };

// /liga/?codigo=BSA
export default function LeaguePage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <LeagueRoute />
    </Suspense>
  );
}
