import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchScreen } from '@/components/screens/SearchScreen';

export const metadata: Metadata = { title: 'Busca' };

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchScreen />
    </Suspense>
  );
}
