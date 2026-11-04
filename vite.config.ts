import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // GitHub Pages serve o site em /frontend-leetcode/, não na raiz.
  base: command === 'build' ? '/frontend-leetcode/' : '/',
  plugins: [react()],
  worker: { format: 'es' },
  // O TypeScript só é baixado quando um problema de tipos é corrigido.
  build: { chunkSizeWarningLimit: 4000 },
}));
