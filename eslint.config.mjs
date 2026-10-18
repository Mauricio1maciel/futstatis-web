import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Escudos e fotos usam <img loading="lazy">: o export estático não otimiza imagens do next/image
      '@next/next/no-img-element': 'off',
      // Efeitos com dependências erradas viram requisição em loop: tratar como erro
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  { ignores: ['node_modules/**', '.next/**', 'out/**', 'next-env.d.ts', 'scripts/**'] },
];

export default eslintConfig;
