import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg', 'splash-1179x2556.png', 'splash-1290x2796.png', 'splash-1170x2532.png', 'splash-750x1334.png'],
      manifest: {
        name: 'Gym Log',
        short_name: 'Gym Log',
        description: 'Maschineneinstellungen & Trainingsnotizen, komplett offline.',
        lang: 'de',
        theme_color: '#1F2024',
        background_color: '#1F2024',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // Dev-only: Der Vite-Dev-Server führt keine Vercel Serverless Functions aus —
  // /api/* wird an die Production-Deployment-URL weitergereicht (dort lebt die echte Function).
  server: {
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'https://gym-log-virid.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
