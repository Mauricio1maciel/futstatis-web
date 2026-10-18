import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlayerRoute } from '@/components/screens/PlayerScreen';
import { ScreenFallback } from '@/components/ui/ScreenFallback';

export const metadata: Metadata = { title: 'Jogador' };

// /jogador/?id=<ID do jogador>
export default function PlayerPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <PlayerRoute />
    </Suspense>
  );
}
