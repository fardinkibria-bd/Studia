import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { generateSoundsManifest } from './scripts/generate-sounds-manifest.mjs';

export default defineConfig({
  // Studia is served from the domain root on Netlify.
  base: '/',
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
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
