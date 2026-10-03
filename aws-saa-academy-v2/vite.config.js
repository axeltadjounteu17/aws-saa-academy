import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { META_CSP, SECURITY_HEADERS } from './security-headers.js';

const fromSource = (directory) => fileURLToPath(new URL(`./src/${directory}`, import.meta.url));

// CSP en balise meta, uniquement en production : en développement, le rafraîchissement
// à chaud de React injecte un script en ligne que la politique bloquerait.
function contentSecurityPolicy() {
  return {
    name: 'saa-content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: META_CSP }, injectTo: 'head-prepend' }],
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': fromSource(''),
      '@components': fromSource('components'),
      '@hooks': fromSource('hooks'),
      '@utils': fromSource('utils'),
      '@data': fromSource('data'),
      '@views': fromSource('views'),
      '@types': fromSource('types'),
    },
  },
  plugins: [
    react(),
    contentSecurityPolicy(),
    VitePWA({
      registerType: 'autoUpdate',
      // Script d'enregistrement externe (registerSW.js), jamais en ligne.
      injectRegister: 'script',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'theme-init.js', 'og-image.png'],
      manifest: {
        name: 'AWS SAA Academy PRO',
        short_name: 'SAA Academy',
        description: 'Préparation bilingue à la certification AWS Solutions Architect Associate',
        lang: 'fr',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,png,svg,woff2}'],
        // Le corpus complet (≈3 Mo par langue) doit être pré-caché pour le mode hors ligne.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  // Serveur de développement limité à la machine locale (pas d'exposition sur le réseau).
  server: { port: 5173 },
  // `npm run preview` applique les mêmes en-têtes que Vercel, pour tester la CSP en local.
  preview: { port: 4173, headers: SECURITY_HEADERS },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Mermaid n'est pas regroupé de force : il reste dans les morceaux chargés à la demande
        // (sinon les dépendances partagées l'entraînent dans le chargement initial).
        manualChunks(id) {
          if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    css: true,
  },
});
