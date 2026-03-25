import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,  // ← Service Worker desactivado en dev (evita interferir con auth)
      },
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'Escuela de Tenis Marineda',
        short_name: 'Marineda',
        description: 'Gestión de rankings de Pádel y Tenis',
        theme_color: '#060d1a',
        background_color: '#03060f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        // Solo cachear iconos/imágenes estáticas — el JS/CSS siempre desde red
        // Esto evita que el service worker sirva código desactualizado
        globPatterns: ['**/*.{ico,svg,png,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5176,
  },
})
