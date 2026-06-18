# Security Rules by Stack

## Next.js (App Router & Pages Router)

### Secrets & Environment Variables
- `NEXT_PUBLIC_*` variables sont exposées côté client — JAMAIS de secrets dedans
- Vérifier que les API keys, DB URLs, JWT secrets sont uniquement dans des vars sans préfixe `NEXT_PUBLIC_`
- `.env.local` doit être dans `.gitignore`

### Authentication
- Middleware `middleware.ts` doit protéger les routes `/dashboard`, `/admin`, `/api/private`
- JWT stocké en `httpOnly cookie` (pas `localStorage`) → chercher `localStorage.setItem('token'`
- Session expiration configurée dans NextAuth/Auth.js
- `callbacks.session` ne doit pas exposer le password hash

### API Routes / Route Handlers
- Vérifier `authGuard` sur chaque `app/api/*/route.ts`
- Validation des inputs avec zod/yup avant tout traitement
- Rate limiting sur les routes d'auth (`/api/auth/signin`, `/api/register`)
- Pas de `console.log(req.body)` en production avec données sensibles

### XSS
- `dangerouslySetInnerHTML` → chercher dans tout le code, chaque occurrence est suspecte
- Si utilisé, vérifier DOMPurify ou sanitize-html
- `next/script` strategy correcte (pas `beforeInteractive` pour scripts tiers non critiques)

### Headers (à configurer dans `next.config.js`)
```js
headers: async () => [{
  source: '/(.*)',
  headers: [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    // CSP à adapter selon le projet
  ]
}]
```

### CORS (API Routes)
- Pas de `Access-Control-Allow-Origin: *` sur les routes avec auth
- Whitelist explicite des origines autorisées

### Server Actions (App Router)
- Validation des inputs côté serveur (pas seulement côté client)
- `use server` directive vérifiée
- Pas de logique d'auth bypassable via direct fetch

---

## Flutter Web

### Secrets
- Aucune API key dans le code Dart compilé (visible dans le JS bundle)
- Utiliser Firebase Remote Config ou un backend proxy pour les secrets
- `flutter build web` → vérifier que les env vars sensibles ne se retrouvent pas dans `main.dart.js`

### Authentication
- Tokens stockés dans `SharedPreferences` ou `flutter_secure_storage` (pas en mémoire volatile)
- Déconnexion propre (clear token + redirect)
- Firebase Auth rules correctement configurées côté Firestore/RTDB

### HTTP/API
- HTTPS uniquement en production
- Certificate pinning si API critique
- Pas de `http` (non sécurisé) en production dans `pubspec.yaml`

### XSS (Flutter Web spécifique)
- `HtmlElementView` avec contenu externe → dangereux
- `dart:html` `setInnerHtml` sans sanitisation

---

## HTML/CSS/JS Vanilla

### XSS
- `innerHTML = userInput` → CRITIQUE, toujours sanitiser
- `document.write()` avec données externes → CRITIQUE
- `eval()` → CRITIQUE sauf cas très justifié
- Préférer `textContent` à `innerHTML` pour les données utilisateur

### Secrets
- Aucune API key dans le JS frontend (visible dans les DevTools)
- Utiliser un backend proxy ou des fonctions serverless

### Forms & Inputs
- Validation côté client ET côté serveur
- `autocomplete="off"` sur les champs sensibles (non suffisant seul)
- CSRF token sur les formulaires POST

### LocalStorage
- Ne jamais stocker de tokens d'auth ou données PII en localStorage
- Préférer les cookies `httpOnly; Secure; SameSite=Strict`

### Dépendances CDN
- Utiliser SRI (Subresource Integrity) sur les scripts CDN
  ```html
  <script src="..." integrity="sha384-..." crossorigin="anonymous"></script>
  ```

---

## Règles universelles (tous stacks)

### OWASP Top 10 Quick Reference

| # | Catégorie | Signaux d'alerte dans le code |
|---|---|---|
| A01 | Broken Access Control | Routes sans auth check, IDOR possible |
| A02 | Cryptographic Failures | HTTP, secrets en clair, MD5/SHA1 pour mots de passe |
| A03 | Injection | Concaténation de strings dans les queries, eval() |
| A04 | Insecure Design | Pas de rate limiting, logique métier bypassable |
| A05 | Security Misconfiguration | Headers manquants, CORS *, debug mode en prod |
| A06 | Vulnerable Components | Dépendances très anciennes, CVE connues |
| A07 | Auth Failures | Sessions sans expiration, mots de passe en clair |
| A08 | Software Integrity | Pas de SRI, supply chain non vérifiée |
| A09 | Logging Failures | console.log avec PII, pas de logging des erreurs auth |
| A10 | SSRF | fetch/axios avec URL contrôlée par l'utilisateur |

### Sévérité des vulnérabilités

| Sévérité | Exemples | Priorité |
|---|---|---|
| CRITIQUE | Secrets exposés, SQLi, auth bypass | P0 |
| HAUTE | XSS stocké, IDOR, headers CSP absents | P0/P1 |
| MOYENNE | CORS permissif, logging PII, sessions longues | P1 |
| FAIBLE | X-Frame-Options absent, cookies sans SameSite | P2 |
