import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Kept separate from `vite.config.ts` (the library build) so the published
// bundle config stays free of test-only concerns.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.{ts,tsx}'],
      exclude: ['src/lib/index.ts'],
    },
  },
});
