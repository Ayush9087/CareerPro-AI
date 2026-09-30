import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],

      // ── Web App Manifest ─────────────────────────────────────
      manifest: {
        name: 'CareerPro AI',
        short_name: 'CareerPro',
        description: 'AI-powered career readiness platform — know where you stand, know exactly what to do next.',
        theme_color: '#5F6B35',
        background_color: '#F5EBD5',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      // ── Workbox service worker configuration ─────────────────
      workbox: {
        // Pre-cache the app shell
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],

        // Runtime caching strategies
        runtimeCaching: [
          // Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // Google Fonts webfont files
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // API GET requests — cache safe read-only data
          {
            urlPattern: /\/api\/v1\/(dashboard\/summary|users\/career-profile|roles|interviews\/options)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-read-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [200] },
            },
          },
        ],

        // Offline fallback for navigation requests
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],

  // ── Build optimizations ────────────────────────────────────
  build: {
    // Code-split large dependencies into separate chunks
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
        },
      },
    },
    // Target modern browsers
    target: 'es2020',
    // Minification
    minify: 'esbuild',
    // Source maps for debugging (not shipped to users)
    sourcemap: false,
    // Chunk size warning
    chunkSizeWarningLimit: 600,
  },
});
