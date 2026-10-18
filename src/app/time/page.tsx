import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TeamRoute } from '@/components/screens/TeamScreen';
import { ScreenFallback } from '@/components/ui/ScreenFallback';

export const metadata: Metadata = { title: 'Time' };

// /time/?id=<api_id do time>
export default function TeamPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <TeamRoute />
    </Suspense>
  );
}
