import type { Metadata, Viewport } from 'next';
import { Suspense, type ReactNode } from 'react';
import { NavigationTracker } from '@/components/layout/NavigationTracker';
import { Notices } from '@/components/layout/Notices';
import { PushBootstrap } from '@/components/layout/PushBootstrap';
import './globals.css';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: { default: 'FutStats', template: '%s · FutStats' },
  description: 'Jogos ao vivo, resultados, classificação e estatísticas de futebol.',
  applicationName: 'FutStats',
  manifest: `${base}/manifest.json`,
  // "Adicionar à Tela de Início" no iPhone abre como app, sem a barra do Safari
  appleWebApp: { capable: true, title: 'FutStats', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: `${base}/icons/favicon-32.png`, sizes: '32x32' }, { url: `${base}/icons/icon-192.png`, sizes: '192x192' }],
    apple: [{ url: `${base}/icons/apple-touch-icon.png`, sizes: '180x180' }],
  },
  // O site já é em português: sem isso o tradutor do Chrome "traduz" pt→pt e troca
  // "Classificação" por frases sem sentido e "Fim" por "Filme"
  other: { 'apple-mobile-web-app-capable': 'yes', google: 'notranslate' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1120',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" translate="no" className="notranslate">
      <body>
        {/* Coluna central de no máximo 520px, como um app, também no computador */}
        <div className="relative mx-auto min-h-dvh w-full max-w-130 bg-screen min-[521px]:border-x min-[521px]:border-line">
          {children}
        </div>
        <Notices />
        <PushBootstrap />
        <Suspense fallback={null}>
          <NavigationTracker />
        </Suspense>
      </body>
    </html>
  );
}
