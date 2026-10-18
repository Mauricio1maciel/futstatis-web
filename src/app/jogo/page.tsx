import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MatchRoute } from '@/components/screens/MatchScreen';
import { ScreenFallback } from '@/components/ui/ScreenFallback';

export const metadata: Metadata = { title: 'Jogo' };

// /jogo/?id=<ID da ESPN ou match_id>&league=BSA&date=...&match_id=...
export default function MatchPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <MatchRoute />
    </Suspense>
  );
}
