// Vérification dans un vrai navigateur (Chrome installé) sur le build de production :
// erreurs console, violations CSP, en-têtes de sécurité, rendu de chaque diagramme.
// Usage : npm run build && npm run test:e2e   (ou BASE_URL=https://… pour un autre serveur)
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { SECURITY_HEADERS } from '../../security-headers.js';

const server = process.env.BASE_URL ? null : await preview({ preview: { port: 4174, strictPort: true }, logLevel: 'silent' });
const BASE = process.env.BASE_URL || 'http://localhost:4174';
const OUT = process.env.SCREENSHOTS || 'test-results/screens';
const ROUTES = ['/dashboard', '/courses', '/courses/ch_03', '/exam', '/official', '/labs', '/labs/lab_ch_01_1', '/domains', '/diagrams', '/search?q=Aurora', '/assistant', '/profile', '/login'];
const problems = [];
mkdirSync(OUT, { recursive: true });

// En-têtes de sécurité réellement servis (ignorés si BASE_URL pointe vers un autre serveur).
if (!process.env.BASE_URL) {
  const response = await fetch(`${BASE}/courses`);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (response.headers.get(name) !== value) problems.push(`en-tête ${name} absent ou différent`);
  }
}

async function checkDiagrams(page, theme) {
  await page.goto(`${BASE}/diagrams`, { waitUntil: 'networkidle' });
  const buttons = page.locator('nav[aria-label="Liste des diagrammes"] button');
  const count = await buttons.count();
  if (count < 20) problems.push(`[${theme}] seulement ${count} diagrammes listés`);
  for (let index = 0; index < count; index += 1) {
    const title = (await buttons.nth(index).locator('span').first().textContent()).trim();
    await buttons.nth(index).click();
    await page.waitForFunction((expected) => {
      const caption = document.querySelector('.mermaid-container figcaption');
      const done = document.querySelector('.mermaid-viewport svg text, .mermaid-viewport [role=alert]');
      return caption?.textContent === expected && done && !document.querySelector('.mermaid-viewport [role=status]');
    }, title, { timeout: 20000 });
    const result = await page.evaluate(() => {
      const svg = document.querySelector('.mermaid-viewport svg');
      const texts = svg ? [...svg.querySelectorAll('text')].map((node) => node.textContent.trim()).filter(Boolean) : [];
      return {
        error: Boolean(document.querySelector('.mermaid-viewport [role=alert]')),
        labels: texts.length,
        unsupported: texts.some((text) => /unsupported markdown/i.test(text)),
      };
    });
    if (result.error) problems.push(`[${theme}] diagramme en erreur : ${title}`);
    else if (result.labels < 4) problems.push(`[${theme}] diagramme sans libellés : ${title}`);
    if (result.unsupported) problems.push(`[${theme}] libellé Markdown non pris en charge : ${title}`);
    if (index % 7 === 0) await page.screenshot({ path: `${OUT}/${theme}-diagram-${index + 1}.png` });
  }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: theme });
    const page = await context.newPage();
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) problems.push(`[${theme}] console ${message.type()}: ${message.text().slice(0, 300)}`);
    });
    page.on('pageerror', (error) => problems.push(`[${theme}] pageerror: ${error.message}`));
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => console.error(`CSP: ${event.violatedDirective} ${event.blockedURI}`));
    });

    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('#main-content h1', { timeout: 15000 });
      await page.screenshot({ path: `${OUT}/${theme}${route.replace(/[/?=]/g, '_')}.png` });
    }
    await checkDiagrams(page, theme);
    await context.close();
  }
} finally {
  await browser.close();
  await server?.close();
}

console.log(problems.length ? problems.join('\n') : 'Aucune erreur console, aucune violation CSP, tous les diagrammes affichés.');
process.exit(problems.length ? 1 : 0);
