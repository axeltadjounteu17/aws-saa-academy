// Génère vercel.json depuis security-headers.js, pour garder une seule source de vérité.
import { writeFileSync } from 'node:fs';
import { SECURITY_HEADERS } from '../security-headers.js';

const headers = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value }));

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: 'vite',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  cleanUrls: true,
  trailingSlash: false,
  rewrites: [{ source: '/((?!assets/|icons/|.*\\..*).*)', destination: '/index.html' }],
  headers: [
    { source: '/(.*)', headers },
    { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/(sw.js|registerSW.js|index.html|manifest.webmanifest)', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
  ],
};

writeFileSync(new URL('../vercel.json', import.meta.url), `${JSON.stringify(config, null, 2)}\n`);
console.log('vercel.json généré');
