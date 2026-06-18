---
name: web-app-auditor
description: >
  Analyse complète d'un site ou d'une application web (GitHub repo, URL Vercel, fichiers locaux, ou combinaison des trois) pour produire un rapport d'audit professionnel couvrant : UI/UX & contenu, Sécurité (OWASP), Performance, et Code Quality. Génère un rapport structuré en markdown + une liste priorisée de fixes (P0/P1/P2) + un fichier Word/PDF téléchargeable.

  UTILISE CE SKILL dès que l'utilisateur mentionne : "audite mon site", "analyse mon repo", "regarde mon app", "améliore mon projet", "trouve les failles", "check ma sécurité", "mon site est pas pro", "review mon code", "analyse mon vercel", ou toute demande combinant un projet web (URL GitHub, URL Vercel, code partagé) avec des mots comme améliorer, analyser, auditer, sécuriser, optimiser, revoir, checker. Applicable à tous les stacks : Next.js, React, Flutter Web, HTML/CSS/JS vanilla, et tout autre framework détecté automatiquement.
---

# Web App Auditor

Skill d'audit complet pour sites et applications web. Analyse le code source, le site déployé, ou les deux, puis produit un rapport multi-axes professionnel.

---

## Étape 0 — Détection de la langue

Détecte la langue de l'utilisateur (français ou anglais) à partir de son message. Rédige tout le rapport dans cette langue. En cas d'ambiguïté, utilise le français.

---

## Étape 1 — Collecte des sources

L'utilisateur peut fournir une ou plusieurs sources. Traite toutes celles disponibles :

| Source | Action |
|---|---|
| URL GitHub (repo public) | `web_fetch` sur `github.com/<user>/<repo>` puis exploration des fichiers clés |
| URL Vercel / site déployé | `web_fetch` sur l'URL + inspection des headers HTTP de réponse |
| Fichiers uploadés localement | Lecture depuis `/mnt/user-data/uploads/` |
| Code collé directement | Analyse inline |

### Fichiers prioritaires à récupérer (GitHub)

Pour chaque repo GitHub fourni, tente de fetcher dans cet ordre :
1. `README.md`
2. `package.json` / `pubspec.yaml`
3. `next.config.js` / `next.config.ts` / `vite.config.*`
4. `src/app/layout.tsx` ou `pages/_app.tsx` (Next.js)
5. `.env.example` (JAMAIS `.env` réel)
6. `vercel.json`
7. Fichiers d'auth : `middleware.ts`, `auth.ts`, `[...nextauth]`
8. Composants principaux (dossier `components/`, `app/`, `pages/`)
9. Fichiers de config sécurité : `Content-Security-Policy`, `helmet`, headers

**Format URL raw GitHub :**
```
https://raw.githubusercontent.com/<user>/<repo>/main/<path>
```

### Headers HTTP à inspecter (site déployé)

Utilise `web_fetch` sur l'URL Vercel et note la présence/absence de :
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-XSS-Protection` (deprecated mais à noter si absent)

---

## Étape 2 — Détection du stack

Identifie automatiquement le stack à partir des fichiers collectés :

| Signal | Stack détecté |
|---|---|
| `next.config.*`, `app/` router, `pages/` | Next.js (App Router ou Pages Router) |
| `pubspec.yaml`, `lib/main.dart` | Flutter Web |
| Pas de bundler, `index.html` pur | HTML/CSS/JS vanilla |
| `vite.config.*` + `react` | React + Vite |
| `angular.json` | Angular |
| `nuxt.config.*` | Nuxt.js |

Note le stack détecté en haut du rapport. Adapte les règles d'analyse selon le stack (voir références/).

---

## Étape 3 — Analyse multi-axes

Effectue les 4 analyses en parallèle (dans ta tête) puis structure le rapport.

### AXE 1 — UI/UX & Contenu

Évalue :
- **Clarté du message** : est-ce qu'un visiteur comprend en 5 secondes ce que fait le site ?
- **Hiérarchie visuelle** : titres H1/H2/H3 bien structurés ? CTA visibles ?
- **Cohérence** : couleurs, typographie, espacement uniformes ?
- **Contenu professionnel** : fautes, formulations génériques ("lorem ipsum", "coming soon"), textes trop techniques pour le public cible ?
- **Accessibilité de base** : attributs `alt` sur les images, contraste suffisant, navigation clavier ?
- **Mobile-first** : responsive design présent ? Breakpoints cohérents ?
- **Internationalisation** : si multilangue, détection des strings hardcodées ?

### AXE 2 — Sécurité (OWASP Top 10 + extras)

Consulte `references/security-rules.md` pour les règles détaillées par stack.

Points clés à vérifier dans tous les cas :
- **A01 - Broken Access Control** : routes protégées ? Middleware d'auth présent ?
- **A02 - Cryptographic Failures** : secrets dans le code ? `.env` exposé ? HTTP au lieu de HTTPS ?
- **A03 - Injection** : inputs sanitisés ? Requêtes paramétrées ? `dangerouslySetInnerHTML` ?
- **A05 - Security Misconfiguration** : headers HTTP manquants, CORS trop permissif (`*`) ?
- **A06 - Vulnerable Components** : versions des dépendances dans `package.json` — chercher les patterns évidents (versions très anciennes)
- **A07 - Auth failures** : JWT stocké en localStorage ? Sessions sans expiration ?
- **A09 - Logging** : `console.log` avec données sensibles en production ?
- **Extras** : API keys exposées côté client, `process.env` public dans Next.js (NEXT_PUBLIC_ avec secrets)

### AXE 3 — Performance

- **Bundle size** : imports non optimisés (`import * as`), dépendances lourdes inutiles ?
- **Images** : format moderne (WebP/AVIF) ? `next/image` utilisé ? Lazy loading ?
- **Code splitting** : dynamic imports présents ? Chunks trop gros ?
- **Fonts** : Google Fonts avec `display=swap` ? Préchargement ?
- **Core Web Vitals** : patterns qui dégradent LCP, CLS, FID (ex: images sans dimensions, layout shifts)
- **Vercel config** : cache headers, Edge Runtime utilisé là où pertinent ?
- **Dependencies** : `package.json` — librairies en doublon ou mieux remplacées nativement ?

### AXE 4 — Code Quality

- **Architecture** : séparation des responsabilités respectée ? (UI / logique / data)
- **Naming** : variables/fonctions bien nommées ? Pas de `tmp`, `data2`, `stuff` ?
- **DRY** : code dupliqué identifiable ?
- **Types** : TypeScript utilisé ? Types `any` abusifs ?
- **Error handling** : try/catch présents ? Erreurs silencieuses (`catch {}`) ?
- **Comments** : code auto-documenté ou commentaires utiles ? Pas de code commenté laissé ?
- **Git hygiene** (si repo fourni) : `.gitignore` complet ? Fichiers sensibles trackés ?
- **Conventions** : ESLint/Prettier configurés ? Règles cohérentes ?

---

## Étape 4 — Construction du rapport

### Structure du rapport markdown

```markdown
# 🔍 Rapport d'Audit — [Nom du projet]
**Date :** [date]  
**Stack détecté :** [stack]  
**Sources analysées :** [GitHub / Vercel / Fichiers locaux]

---

## 📊 Score Global

| Axe | Score | Niveau |
|-----|-------|--------|
| UI/UX & Contenu | /10 | 🟢/🟡/🔴 |
| Sécurité | /10 | 🟢/🟡/🔴 |
| Performance | /10 | 🟢/🟡/🔴 |
| Code Quality | /10 | 🟢/🟡/🔴 |
| **TOTAL** | **/40** | |

---

## 🎨 Axe 1 — UI/UX & Contenu
### ✅ Points forts
### ⚠️ Points à améliorer
### 💡 Recommandations concrètes

## 🔒 Axe 2 — Sécurité
### ✅ Points forts
### ⚠️ Vulnérabilités détectées
[Sévérité : CRITIQUE / HAUTE / MOYENNE / FAIBLE]
### 💡 Recommandations concrètes (avec exemples de code)

## ⚡ Axe 3 — Performance
### ✅ Points forts
### ⚠️ Points à améliorer
### 💡 Recommandations concrètes

## 🏗️ Axe 4 — Code Quality
### ✅ Points forts
### ⚠️ Points à améliorer
### 💡 Recommandations concrètes

---

## 🚨 Plan d'action priorisé

### P0 — CRITIQUE (à corriger immédiatement)
- [ ] ...

### P1 — IMPORTANT (à corriger cette semaine)
- [ ] ...

### P2 — AMÉLIORATION (à planifier)
- [ ] ...

---

## 📎 Ressources utiles
[Liens vers docs officielles pertinentes]
```

### Règles de scoring

| Score | Niveau | Emoji |
|---|---|---|
| 8-10 | Bon | 🟢 |
| 5-7 | À améliorer | 🟡 |
| 0-4 | Critique | 🔴 |

### Règles de priorisation

| Priorité | Critères |
|---|---|
| **P0 CRITIQUE** | Faille de sécurité exploitable, données exposées, site cassé |
| **P1 IMPORTANT** | Dégradation UX majeure, perf < 50 Lighthouse, vulnérabilité moyenne |
| **P2 AMÉLIORATION** | Code quality, optimisations, polish UI, bonnes pratiques |

---

## Étape 5 — Génération des fichiers de sortie

Après avoir affiché le rapport markdown dans le chat :

1. **Lire le skill docx** : `view /mnt/skills/public/docx/SKILL.md` pour générer le rapport Word
2. **Générer le `.docx`** avec le rapport complet structuré
3. **Présenter les fichiers** avec `present_files`

Le fichier Word doit inclure :
- Page de garde (nom projet, date, stack)
- Table des matières
- Les 4 sections d'analyse
- Le plan d'action priorisé P0/P1/P2
- Mise en forme professionnelle (couleurs par sévérité)

---

## Étape 6 — Suivi

Après le rapport, propose :
> "Tu veux que je génère le code corrigé pour un des P0 ou P1 détectés ?"

Si l'utilisateur accepte, applique le skill `secure-vibe-coding` pour les corrections de sécurité.

---

## Références

- `references/security-rules.md` — Règles OWASP détaillées par stack (Next.js, Flutter Web, Vanilla)
- `references/ux-checklist.md` — Checklist UI/UX complète par type de site (portfolio, SaaS, marketplace)
