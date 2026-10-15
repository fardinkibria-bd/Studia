import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { generateSoundsManifest } from './scripts/generate-sounds-manifest.mjs';

export default defineConfig({
  base: '/studia/',
  plugins: [
    react(),
    {
      // Keep the focus-sounds manifest in sync with public/ on every
      // dev/build/preview start. See scripts/generate-sounds-manifest.mjs.
      name: 'sounds-manifest',
      buildStart() {
        generateSoundsManifest();
      },
    },
    {
      name: 'root-favicon',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url === '/favicon.ico' || req.url.startsWith('/favicon.ico?'))) {
            req.url = '/studia' + req.url;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
