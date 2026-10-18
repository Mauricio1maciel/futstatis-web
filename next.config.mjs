import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Site 100% estático (out/): toda a busca de dados acontece no navegador.
// Rotas com parâmetro usam query string (/jogo/?id=...), que funciona em qualquer hospedagem estática.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Cada página vira pasta/index.html: abre direto em Vercel, Netlify, GitHub Pages ou qualquer servidor de arquivos
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: basePath || undefined,
  reactStrictMode: true,
  // A raiz do projeto é esta pasta (evita o Next escolher outro package-lock.json acima dela)
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
};

export default nextConfig;
