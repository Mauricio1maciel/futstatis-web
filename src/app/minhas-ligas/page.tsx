import type { Metadata } from 'next';
import { FavoritesScreen } from '@/components/screens/FavoritesScreen';

export const metadata: Metadata = { title: 'Minhas Ligas' };

export default function FavoritesPage() {
  return <FavoritesScreen />;
}
