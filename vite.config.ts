import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_REAL_INTERNET': JSON.stringify(
      process.env.REAL_INTERNET ?? 'true'
    ),
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    modulePreload: {
      filter(url) {
        // Only preload essential runtime vendors needed for initial shell.
        // Heavy 3D and mapping engines are on-demand and should not be preloaded on initial page load.
        if (
          url.includes('vendor-three') ||
          url.includes('vendor-leaflet') ||
          url.includes('ThreeJsViewer') ||
          url.includes('SiteLocationMap')
        ) {
          return false;
        }
        return true;
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-leaflet': ['leaflet'],
          'vendor-react': ['react', 'react-dom'],
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
});
