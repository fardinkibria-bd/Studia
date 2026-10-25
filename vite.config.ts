import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { generateSoundsManifest } from './scripts/generate-sounds-manifest.mjs';
import { VitePWA } from 'vite-plugin-pwa';

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
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Studia — Study Planner',
        short_name: 'Studia',
        description: 'A next-generation study planner for students. Manage routines, homework, revision, exams, and focus sessions.',
        theme_color: '#6366f1',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Precache the app shell, local fonts, icons and other small assets.
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2,ttf,webmanifest}'],
        // Sound files are large; precache the core app shell and fetch sounds
        // on demand so the service-worker build stays within its size limit.
        globIgnores: ['**/*.mp3'],
        // Use the cached app shell for navigation while offline.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Cache large ambient sound files after a user plays them online.
        runtimeCaching: [
          {
            urlPattern: /\.(?:mp3)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'focus-sounds-cache',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
