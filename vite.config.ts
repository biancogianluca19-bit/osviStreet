import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: { host: '0.0.0.0' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
