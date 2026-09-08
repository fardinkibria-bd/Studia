import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { generateSoundsManifest } from './scripts/generate-sounds-manifest.mjs';

export default defineConfig({
  // Root base — Studia is served at the domain root on Netlify, so absolute
  // root paths like /alarm.mp3 are correct here. (A GitHub-Pages-style
  // sub-path deployment would instead set this to '/studia/'.)
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
