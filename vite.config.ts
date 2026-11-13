import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function buildServiceWorkerPrecache(): Plugin {
  let outDir = path.resolve(process.cwd(), 'dist');
  return {
    name: 'solarpv-service-worker-precache',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const manifestPath = path.join(outDir, 'manifest.web.json');
      const swPath = path.join(outDir, 'sw.js');
      const manifestText = readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestText) as Record<string, {
        file: string; css?: string[]; assets?: string[];
      }>;
      const assets = new Set<string>(['/', '/index.html', '/manifest.json', '/manifest.web.json', '/favicon.ico', '/icon.svg']);
      for (const entry of Object.values(manifest)) {
        for (const file of [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])]) {
          if (file && !file.endsWith('.map')) assets.add(`/${file}`);
        }
      }
      const sortedAssets = [...assets].sort();
      const source = readFileSync(swPath, 'utf8');
      const version = createHash('sha256')
        .update(manifestText)
        .update(source)
        .update(JSON.stringify(sortedAssets))
        .digest('hex')
        .slice(0, 16);
      const staticAssetsStart = source.indexOf('const STATIC_ASSETS = ');
      const staticAssetsEnd = source.indexOf('];', staticAssetsStart);
      if (staticAssetsStart < 0 || staticAssetsEnd < 0) throw new Error('dist/sw.js is missing the STATIC_ASSETS placeholder.');
      const staticAssetsDeclaration = source.slice(staticAssetsStart, staticAssetsEnd + 2);
      const versionedSource = source
        .replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'solarpv-studio-${version}';`)
        .replace(staticAssetsDeclaration, `const STATIC_ASSETS = ${JSON.stringify(sortedAssets)};`);
      if (versionedSource === source) throw new Error('Failed to inject generated versioned precache into dist/sw.js.');
      writeFileSync(swPath, versionedSource, 'utf8');
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const realInternet =
    env.VITE_REAL_INTERNET ??
    env.REAL_INTERNET ??
    process.env.VITE_REAL_INTERNET ??
    process.env.REAL_INTERNET ??
    'true';

  return {
    plugins: [react(), buildServiceWorkerPrecache()],
    define: {
      'import.meta.env.VITE_REAL_INTERNET': JSON.stringify(realInternet),
      __SOLARPV_PRODUCTION__: JSON.stringify(mode === 'production'),
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
    },
    optimizeDeps: {
      // React's client entry is dynamically referenced by the browser bootstrap.
      // Force a fresh, explicit prebundle on desktop launches to avoid Vite
      // serving a stale/missing react-dom_client.js cache entry after npm install,
      // observed with the Windows Node 22 desktop launcher.
      include: ['react-dom/client'],
      force: true,
    },
    build: {
      manifest: 'manifest.web.json',
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
  };
});
