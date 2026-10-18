import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // O tsconfig do Next usa "jsx: preserve"; nos testes o JSX é compilado aqui
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
