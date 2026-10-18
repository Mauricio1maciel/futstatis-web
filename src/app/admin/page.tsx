import type { Metadata } from 'next';
import { AdminScreen } from '@/components/screens/AdminScreen';

export const metadata: Metadata = { title: 'Administração', robots: { index: false } };

export default function AdminPage() {
  return <AdminScreen />;
}
