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
  build: {
    rollupOptions: {
      output: {
        // Separar dependencias grandes en chunks cacheables independientes:
        // el usuario solo re-descarga el código de la app al actualizar, no React entero.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (id.includes('/@supabase/') || id.includes('\\@supabase\\')) return 'vendor-supabase';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (/[\\/]node_modules[\\/]xlsx[\\/]/.test(id)) return 'vendor-xlsx'; // solo se carga al importar Excel
          return undefined;
        },
      },
    },
  },
})
