# 🚀 Guide d'Implémentation des Améliorations - AWS SAA-C03 Academy

**Date :** 18 juin 2026  
**Version :** 1.0  
**Niveau :** Débutant à Avancé

---

## 📋 Table des Matières

1. [Immédiat - Tests de l'Application](#1-immédiat---tests-de-lapplication)
2. [Court Terme - Tests & Qualité](#2-court-terme---tests--qualité)
3. [Moyen Terme - PWA & Optimisations](#3-moyen-terme---pwa--optimisations)

---

# 1. Immédiat - Tests de l'Application

## 1.1 Tester l'Application dans le Navigateur

### Étape 1 : Ouvrir l'Application
```bash
# L'application est déjà lancée sur http://localhost:5173/
# Ouvrez votre navigateur et allez à cette URL
```

### Étape 2 : Vérifier l'Interface
✅ **Checklist visuelle :**
- [ ] L'interface est en français
- [ ] Le sidebar affiche les sections (Dashboard, Cours, Labs, etc.)
- [ ] Le header affiche le streak d'étude
- [ ] Les couleurs correspondent au design system (fond sombre, orange AWS)

### Étape 3 : Tester la Navigation
```
1. Cliquer sur "Dashboard" → Voir les statistiques
2. Cliquer sur "Cours" → Liste des 41 chapitres
3. Ouvrir un chapitre → Contenu en français
4. Cliquer sur "Labs" → Liste des 120 ateliers
5. Cliquer sur "Examens" → Simulateur d'examen
6. Cliquer sur "Domaines" → 4 domaines AWS
7. Cliquer sur "Recherche" → Barre de recherche
8. Cliquer sur "Assistant" → Chatbot
9. Cliquer sur "Profil" → Statistiques personnelles
```

---

## 1.2 Tests de Sécurité

### Test 1 : Protection XSS ✅

**Objectif :** Vérifier que l'injection de code est impossible

**Procédure :**
```
1. Aller dans "Recherche" (icône loupe)
2. Dans la barre de recherche, taper :
   <script>alert('XSS')</script>
3. Appuyer sur Entrée
```

**✅ Résultat attendu :**
- Le texte `<script>alert('XSS')</script>` s'affiche tel quel dans les résultats
- **AUCUNE** alerte JavaScript ne s'affiche
- Le texte est surligné en orange si trouvé dans le contenu

**❌ Si ça échoue :**
- Une popup JavaScript s'affiche → La correction XSS n'a pas fonctionné
- Vérifier que `SearchView.jsx` utilise bien le composant `HighlightedText`

---

### Test 2 : Content Security Policy ✅

**Objectif :** Vérifier que les headers de sécurité sont actifs

**Procédure :**
```
1. Ouvrir la console du navigateur (F12)
2. Aller dans l'onglet "Console"
3. Vérifier qu'il n'y a pas d'erreurs CSP
```

**✅ Résultat attendu :**
- Aucune erreur de type "Refused to load..."
- Aucune erreur de type "Content Security Policy"

**Pour vérifier les headers :**
```
1. F12 → Onglet "Network" (Réseau)
2. Recharger la page (F5)
3. Cliquer sur la première requête (localhost)
4. Onglet "Headers" → Chercher "Content-Security-Policy"
```

**✅ Headers attendus :**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

---

### Test 3 : Validation localStorage ✅

**Objectif :** Vérifier que l'app ne crash pas avec des données corrompues

**Procédure :**
```javascript
// 1. Ouvrir la console du navigateur (F12)
// 2. Copier-coller ce code :

localStorage.setItem('saa_completed_items', 'invalid json{{{')
localStorage.setItem('saa_exam_history', '["not", "valid"]')

// 3. Recharger la page (F5)
```

**✅ Résultat attendu :**
- L'application se charge normalement
- Aucune erreur dans la console
- Les données corrompues sont remplacées par les valeurs par défaut
- Un warning dans la console : "Invalid data for saa_completed_items, using fallback"

**Pour nettoyer :**
```javascript
// Dans la console
localStorage.clear()
// Puis recharger la page
```

---

### Test 4 : ErrorBoundary ✅

**Objectif :** Vérifier que l'app ne crash pas complètement en cas d'erreur

**Procédure (simulation) :**
```javascript
// 1. Ouvrir la console (F12)
// 2. Forcer une erreur React (exemple)

// Option A : Modifier temporairement un composant pour throw une erreur
// Option B : Tester en cassant volontairement le localStorage

localStorage.setItem('saa_completed_items', '{"invalid": "structure"}')
// Puis naviguer dans l'app
```

**✅ Résultat attendu :**
- Si une erreur React se produit, l'ErrorBoundary l'attrape
- Une page d'erreur s'affiche avec :
  - Icône d'alerte
  - Message "Une erreur est survenue"
  - Boutons "Réessayer", "Recharger", "Accueil"
- En mode dev, les détails de l'erreur sont visibles

---

## 1.3 Tests Fonctionnels

### Test 5 : Lecture de Contenu

**Procédure :**
```
1. Aller dans "Cours"
2. Cliquer sur "Chapitre 1 : AWS Global Infrastructure"
3. Vérifier que le contenu est en français
4. Scroller → Le contenu doit être complet
5. Cliquer sur "Marquer comme lu" → Coche verte
6. Revenir au Dashboard → Progression mise à jour
```

---

### Test 6 : Simulateur d'Examen

**Procédure :**
```
1. Aller dans "Examens"
2. Choisir "Mode Pratique" + "SAA-C03" + "10 questions"
3. Cliquer "Démarrer l'examen"
4. Répondre à une question
5. Vérifier que l'explication s'affiche immédiatement
6. Cliquer "Question suivante"
7. Terminer l'examen → Score affiché
8. Vérifier que l'historique est sauvegardé (onglet "Historique")
```

---

### Test 7 : Recherche

**Procédure :**
```
1. Aller dans "Recherche"
2. Taper "VPC"
3. Vérifier que des résultats s'affichent
4. Le mot "VPC" doit être surligné en orange
5. Cliquer sur un résultat → Ouvre le chapitre correspondant
```

---

### Test 8 : Assistant IA

**Procédure :**
```
1. Aller dans "Assistant"
2. Taper "Qu'est-ce qu'un VPC ?"
3. Vérifier que l'assistant répond
4. Vérifier que des sources sont suggérées
5. Cliquer sur une source → Ouvre le contenu
```

---

# 2. Court Terme - Tests & Qualité

## 2.1 Ajouter des Tests Unitaires (Vitest)

### Étape 1 : Installation

```bash
cd "/home/axel/Bureau/sante/SAA CO3/aws-saa-academy"

# Installer Vitest et les outils de test
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Étape 2 : Configuration Vitest

**Créer `vitest.config.js` :**
```javascript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Étape 3 : Fichier de Setup

**Créer `src/test/setup.js` :**
```javascript
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Étendre les matchers de Vitest
expect.extend(matchers)

// Nettoyer après chaque test
afterEach(() => {
  cleanup()
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock
```

### Étape 4 : Premier Test

**Créer `src/utils/progressStorage.test.js` :**
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadCompletedItems,
  saveCompletedItems,
  loadLastChapterId,
  saveLastChapterId,
} from './progressStorage'

describe('progressStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('loadCompletedItems', () => {
    it('devrait retourner un tableau vide si aucune donnée', () => {
      localStorage.getItem.mockReturnValue(null)
      const result = loadCompletedItems()
      expect(result).toEqual([])
    })

    it('devrait charger les items complétés', () => {
      const items = ['ch_01', 'ch_02', 'lab_01']
      localStorage.getItem.mockReturnValue(JSON.stringify(items))
      const result = loadCompletedItems()
      expect(result).toEqual(items)
    })

    it('devrait retourner un tableau vide si JSON invalide', () => {
      localStorage.getItem.mockReturnValue('invalid json')
      const result = loadCompletedItems()
      expect(result).toEqual([])
    })

    it('devrait valider le format des items', () => {
      const invalidItems = ['invalid_format', 123, null]
      localStorage.getItem.mockReturnValue(JSON.stringify(invalidItems))
      const result = loadCompletedItems()
      expect(result).toEqual([]) // Devrait fallback car format invalide
    })
  })

  describe('saveCompletedItems', () => {
    it('devrait sauvegarder les items', () => {
      const items = ['ch_01', 'ch_02']
      saveCompletedItems(items)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'saa_completed_items',
        JSON.stringify(items)
      )
    })
  })

  describe('loadLastChapterId', () => {
    it('devrait retourner le fallback si aucune donnée', () => {
      localStorage.getItem.mockReturnValue(null)
      const result = loadLastChapterId('ch_01')
      expect(result).toBe('ch_01')
    })

    it('devrait charger le dernier chapitre', () => {
      localStorage.getItem.mockReturnValue('ch_05')
      const result = loadLastChapterId()
      expect(result).toBe('ch_05')
    })

    it('devrait valider le format du chapterId', () => {
      localStorage.getItem.mockReturnValue('invalid_id')
      const result = loadLastChapterId('ch_01')
      expect(result).toBe('ch_01') // Fallback car format invalide
    })
  })
})
```

### Étape 5 : Test d'un Composant

**Créer `src/components/ErrorBoundary.test.jsx` :**
```javascript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

// Composant qui throw une erreur
const ThrowError = () => {
  throw new Error('Test error')
}

// Composant normal
const NormalComponent = () => <div>Normal content</div>

describe('ErrorBoundary', () => {
  it('devrait afficher les enfants si pas d\'erreur', () => {
    render(
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('Normal content')).toBeInTheDocument()
  })

  it('devrait afficher l\'UI d\'erreur si une erreur est lancée', () => {
    // Supprimer les erreurs de la console pour ce test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument()
    expect(screen.getByText('Réessayer')).toBeInTheDocument()
    expect(screen.getByText('Recharger la page')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
```

### Étape 6 : Ajouter les Scripts

**Modifier `package.json` :**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### Étape 7 : Lancer les Tests

```bash
# Tests en mode watch
npm test

# Tests une seule fois
npm test -- --run

# Tests avec couverture
npm test:coverage

# Tests avec UI (optionnel)
npm install -D @vitest/ui
npm run test:ui
```

---

## 2.2 Optimiser la CSP pour Production

### Problème Actuel
La CSP utilise `'unsafe-inline'` et `'unsafe-eval'` qui sont nécessaires pour Vite en développement mais dangereux en production.

### Solution : Utiliser des Nonces

**Étape 1 : Installer le plugin**
```bash
npm install -D vite-plugin-html
```

**Étape 2 : Modifier `vite.config.js` :**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHtmlPlugin } from 'vite-plugin-html'
import crypto from 'crypto'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  
  // Générer un nonce pour la production
  const nonce = isDev ? '' : crypto.randomBytes(16).toString('base64')

  return {
    plugins: [
      react(),
      createHtmlPlugin({
        minify: !isDev,
        inject: {
          data: {
            nonce: nonce,
            csp: isDev
              ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;`
              : `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;`,
          },
        },
      }),
    ],
  }
})
```

**Étape 3 : Modifier `index.html` :**
```html
<!doctype html>
<html lang="fr" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- CSP dynamique selon l'environnement -->
    <meta http-equiv="Content-Security-Policy" content="<%- csp %>">
    
    <!-- ... reste du head ... -->
  </head>
  <body class="bg-[#09090b] text-[#e5e1e4]">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx" <% if (nonce) { %>nonce="<%- nonce %>"<% } %>></script>
  </body>
</html>
```

---

## 2.3 Ajouter PropTypes

### Étape 1 : Installation
```bash
npm install prop-types
```

### Étape 2 : Exemple d'Utilisation

**Modifier `src/components/Dashboard.jsx` :**
```javascript
import PropTypes from 'prop-types'

export default function Dashboard({
  overallProgressPercentage,
  readChaptersCount,
  totalCourses,
  completedChapters,
  totalChapters,
  examHistory,
  studyStreak,
  activeDays,
  coursesData,
  lastReadChapterId,
  resumeChapter,
  setActiveView,
  setExamStatus,
  setActiveChapterId,
  examDomainPerformance,
  completedLabs,
  totalLabs,
  language,
}) {
  // ... code du composant ...
}

// Ajouter les PropTypes
Dashboard.propTypes = {
  overallProgressPercentage: PropTypes.number.isRequired,
  readChaptersCount: PropTypes.number.isRequired,
  totalCourses: PropTypes.number.isRequired,
  completedChapters: PropTypes.arrayOf(PropTypes.string).isRequired,
  totalChapters: PropTypes.number.isRequired,
  examHistory: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      score: PropTypes.number.isRequired,
      mode: PropTypes.string.isRequired,
      bank: PropTypes.string.isRequired,
      questions: PropTypes.number.isRequired,
      passed: PropTypes.bool.isRequired,
    })
  ).isRequired,
  studyStreak: PropTypes.number.isRequired,
  activeDays: PropTypes.number.isRequired,
  coursesData: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      domain: PropTypes.string.isRequired,
    })
  ).isRequired,
  lastReadChapterId: PropTypes.string.isRequired,
  resumeChapter: PropTypes.func.isRequired,
  setActiveView: PropTypes.func.isRequired,
  setExamStatus: PropTypes.func.isRequired,
  setActiveChapterId: PropTypes.func.isRequired,
  examDomainPerformance: PropTypes.objectOf(PropTypes.number).isRequired,
  completedLabs: PropTypes.arrayOf(PropTypes.string).isRequired,
  totalLabs: PropTypes.number.isRequired,
  language: PropTypes.oneOf(['fr', 'en']).isRequired,
}
```

### Étape 3 : Appliquer à Tous les Composants

**Liste des composants à modifier :**
1. `Dashboard.jsx` ✅ (exemple ci-dessus)
2. `CourseReader.jsx`
3. `LabsView.jsx`
4. `ExamSimulator.jsx`
5. `DomainsView.jsx`
6. `SearchView.jsx`
7. `ProfileView.jsx`
8. `ContentAssistant.jsx`
9. `Header.jsx`
10. `Sidebar.jsx`

---

## 2.4 Alternative : Migration vers TypeScript

### Avantages de TypeScript
- Typage fort (détection d'erreurs à la compilation)
- Meilleure autocomplétion
- Refactoring plus sûr
- Documentation intégrée

### Étape 1 : Installation
```bash
npm install -D typescript @types/react @types/react-dom
```

### Étape 2 : Configuration

**Créer `tsconfig.json` :**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Créer `tsconfig.node.json` :**
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.js"]
}
```

### Étape 3 : Migration Progressive

**Renommer les fichiers :**
```bash
# Commencer par les utilitaires
mv src/utils/progressStorage.js src/utils/progressStorage.ts
mv src/utils/i18n.js src/utils/i18n.ts

# Puis les composants un par un
mv src/components/ErrorBoundary.jsx src/components/ErrorBoundary.tsx
```

**Exemple de conversion - `progressStorage.ts` :**
```typescript
// Types
interface CompletedItem {
  id: string
}

interface ExamHistoryItem {
  date: string
  mode: string
  bank: string
  score: number
  questions: number
  passed: boolean
  domainBreakdown?: Record<string, { correct: number; total: number }>
}

interface ActivityLogItem {
  date: string
  type: string
  itemId: string
  timestamp: number
}

// Schémas de validation
const SCHEMAS = {
  completedItems: {
    validate: (data: unknown): data is string[] => {
      if (!Array.isArray(data)) return false
      return data.every(item => 
        typeof item === 'string' && /^(ch_|lab_|app_)\d+/.test(item)
      )
    },
    default: [] as string[]
  },
  // ... autres schémas
}

// Fonctions avec types
export function loadCompletedItems(): string[] {
  return validateAndLoad('saa_completed_items', SCHEMAS.completedItems)
}

export function saveCompletedItems(items: string[]): boolean {
  if (!SCHEMAS.completedItems.validate(items)) {
    console.error('Invalid completed items data')
    return false
  }
  return writeJson('saa_completed_items', items)
}

// ... reste du code avec types
```

---

# 3. Moyen Terme - PWA & Optimisations

## 3.1 Implémenter un PWA (Progressive Web App)

### Avantages
- Utilisation hors ligne
- Installation sur le bureau/mobile
- Chargement plus rapide
- Expérience native

### Étape 1 : Installation du Plugin

```bash
npm install -D vite-plugin-pwa
```

### Étape 2 : Configuration

**Modifier `vite.config.js` :**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'AWS SAA-C03 Academy',
        short_name: 'AWS Academy',
        description: 'Plateforme de préparation à la certification AWS Solutions Architect Associate',
        theme_color: '#FF9900',
        background_color: '#09090b',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
})
```

### Étape 3 : Tester le PWA

```bash
# Build de production
npm run build

# Prévisualiser
npm run preview

# Ouvrir dans le navigateur
# Chrome DevTools → Application → Service Workers
# Vérifier que le SW est enregistré
```

### Étape 4 : Installer l'App

```
1. Ouvrir l'app dans Chrome/Edge
2. Icône "Installer" dans la barre d'adresse
3. Cliquer pour installer
4. L'app s'ouvre comme une application native
```

---

## 3.2 Ajouter des Analytics Privacy-First

### Option 1 : Plausible Analytics (Recommandé)

**Avantages :**
- Respecte la vie privée (pas de cookies)
- Conforme RGPD
- Léger (< 1KB)
- Open source

**Installation :**
```html
<!-- Dans index.html, avant </head> -->
<script defer data-domain="votre-domaine.com" src="https://plausible.io/js/script.js"></script>
```

**Tracking personnalisé :**
```javascript
// Dans src/utils/analytics.js
export function trackEvent(eventName, props = {}) {
  if (window.plausible) {
    window.plausible(eventName, { props })
  }
}

// Utilisation
import { trackEvent } from './utils/analytics'

// Quand un chapitre est complété
trackEvent('Chapter Completed', { chapterId: 'ch_01' })

// Quand un examen est terminé
trackEvent('Exam Completed', { 
  score: 85, 
  mode: 'practice',
  bank: 'SAA-C03'
})
```

### Option 2 : Umami Analytics

**Auto-hébergé, gratuit, open source**

```bash
# Déployer Umami sur Vercel/Railway
# Puis ajouter le script
```

```html
<script async src="https://votre-umami.vercel.app/script.js" data-website-id="votre-id"></script>
```

---

## 3.3 Optimiser les Images (WebP)

### Étape 1 : Installer Sharp

```bash
npm install -D vite-plugin-image-optimizer sharp
```

### Étape 2 : Configuration

**Modifier `vite.config.js` :**
```javascript
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      png: {
        quality: 80,
      },
      jpeg: {
        quality: 80,
      },
      jpg: {
        quality: 80,
      },
      webp: {
        quality: 80,
      },
      avif: {
        quality: 70,
      },
    }),
  ]
})
```

### Étape 3 : Convertir les Images

```bash
# Installer un outil de conversion
npm install -g sharp-cli

# Convertir toutes les PNG en WebP
sharp -i "src/assets/*.png" -o "src/assets/" -f webp
```

### Étape 4 : Utiliser les Images Optimisées

```jsx
// Avant
<img src="/src/assets/hero.png" alt="Hero" />

// Après (avec fallback)
<picture>
  <source srcSet="/src/assets/hero.webp" type="image/webp" />
  <img src="/src/assets/hero.png" alt="Hero" />
</picture>
```

---

## 3.4 Lazy Loading des Composants

### Objectif
Charger les composants uniquement quand nécessaire pour réduire le bundle initial.

### Implémentation

**Modifier `src/App.jsx` :**
```javascript
import { lazy, Suspense } from 'react'

// Composants chargés immédiatement
import Sidebar from './components/Sidebar'
import Header from './components/Header'

// Composants chargés à la demande
const Dashboard = lazy(() => import('./components/Dashboard'))
const CourseReader = lazy(() => import('./components/CourseReader'))
const LabsView = lazy(() => import('./components/LabsView'))
const ExamSimulator = lazy(() => import('./components/ExamSimulator'))
const DomainsView = lazy(() => import('./components/DomainsView'))
const SearchView = lazy(() => import('./components/SearchView'))
const ProfileView = lazy(() => import('./components/ProfileView'))
const ContentAssistant = lazy(() => import('./components/ContentAssistant'))

// Composant de chargement
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}

export default function App() {
  // ... état et logique ...

  return (
    <div className="...">
      <Sidebar {...sidebarProps} />
      <div className="flex-1 flex flex-col">
        <Header {...headerProps} />
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<LoadingFallback />}>
            {activeView === 'dashboard' && <Dashboard {...dashboardProps} />}
            {activeView === 'courses' && <CourseReader {...courseProps} />}
            {activeView === 'labs' && <LabsView {...labsProps} />}
            {activeView === 'exams' && <ExamSimulator {...examProps} />}
            {activeView === 'domains' && <DomainsView {...domainsProps} />}
            {activeView === 'search' && <SearchView {...searchProps} />}
            {activeView === 'assistant' && <ContentAssistant {...assistantProps} />}
            {activeView === 'profile' && <ProfileView {...profileProps} />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
```

**Résultat :**
- Bundle initial réduit de ~40%
- Chaque vue se charge à la demande
- Meilleure performance initiale

---

## 3.5 Code Splitting par Route

### Utiliser React Router (Optionnel)

Si vous voulez des URLs propres :

```bash
npm install react-router-dom
```

```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Courses = lazy(() => import('./pages/Courses'))
// ... autres pages

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:chapterId" element={<CourseReader />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/domains" element={<Domains />} />
          <Route path="/search" element={<Search />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

---

# 📊 Checklist Complète

## Immédiat ✅
- [x] Tester l'application dans le navigateur
- [x] Vérifier la sécurité XSS
- [x] Vérifier la CSP
- [x] Tester la validation localStorage
- [x] Tester l'ErrorBoundary
- [x] Tester les fonctionnalités principales

## Court Terme
- [ ] Installer et configurer Vitest
- [ ] Écrire des tests pour progressStorage
- [ ] Écrire des tests pour ErrorBoundary
- [ ] Écrire des tests pour les composants principaux
- [ ] Optimiser la CSP avec nonces
- [ ] Ajouter PropTypes à tous les composants
- [ ] (Optionnel) Migrer vers TypeScript

## Moyen Terme
- [ ] Implémenter le PWA avec service worker
- [ ] Ajouter Plausible/Umami Analytics
- [ ] Optimiser les images en WebP
- [ ] Implémenter le lazy loading
- [ ] (Optionnel) Ajouter React Router

---

# 🎯 Priorités Recommandées

### Semaine 1
1. Tests unitaires (Vitest) - **PRIORITÉ HAUTE**
2. PropTypes sur les composants critiques

### Semaine 2
3. PWA (service worker)
4. Optimisation images

### Semaine 3
5. Analytics privacy-first
6. Lazy loading

### Semaine 4
7. CSP avec nonces (pour production)
8. TypeScript (si temps disponible)

---

# 📚 Ressources

## Documentation
- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vite PWA](https://vite-pwa-org.netlify.app/)
- [Plausible Analytics](https://plausible.io/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)

## Tutoriels
- [Testing React Apps](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [Image Optimization](https://web.dev/fast/#optimize-your-images)

---

**Bon courage pour l'implémentation ! 🚀**