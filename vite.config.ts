import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // In dev, the Express server (npm run server) answers /api. API_URL points elsewhere if needed.
  server: {
    proxy: { '/api': process.env.API_URL || 'http://localhost:8787' },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
