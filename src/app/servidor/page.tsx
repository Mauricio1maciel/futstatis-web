import type { Metadata } from 'next';
import { ServerScreen } from '@/components/screens/ServerScreen';

export const metadata: Metadata = { title: 'Servidor', robots: { index: false } };

export default function ServerPage() {
  return <ServerScreen />;
}
