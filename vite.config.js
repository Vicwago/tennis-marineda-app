import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// VitePWA eliminado — causaba que el service worker sirviera JS/CSS obsoleto
// El manifest se mantiene como archivo estático en public/manifest.webmanifest
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: true,
    port: 5176,
  },
})
