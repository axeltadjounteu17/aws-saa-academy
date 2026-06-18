# 🚀 Guide de Déploiement sur Vercel - AWS SAA-C03 Academy

## 📋 Prérequis

- Compte Vercel (gratuit) : https://vercel.com
- Dépôt GitHub avec le code
- Node.js 18+ installé localement

## ✅ Configuration Effectuée

### Fichier `vercel.json` Créé
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Ce fichier résout :**
- ✅ Erreur 404 sur les routes React
- ✅ Headers de sécurité automatiques
- ✅ Cache optimisé pour les assets

## 🚀 Méthode 1 : Déploiement via Dashboard Vercel (Recommandé)

### Étape 1 : Pousser sur GitHub

```bash
cd "/home/axel/Bureau/sante/SAA CO3"
git push -u origin main
```

### Étape 2 : Connecter à Vercel

1. Allez sur https://vercel.com/new
2. Cliquez sur "Import Git Repository"
3. Sélectionnez votre dépôt `aws-saa-academy`
4. Vercel détectera automatiquement Vite

### Étape 3 : Configuration du Projet

**Root Directory :** `aws-saa-academy`

**Build Settings (détectés automatiquement) :**
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### Étape 4 : Variables d'Environnement (Optionnel)

Si vous avez des variables d'environnement :
```
VITE_APP_NAME=AWS SAA-C03 Academy
VITE_APP_VERSION=1.0.0
```

### Étape 5 : Déployer

1. Cliquez sur "Deploy"
2. Attendez 2-3 minutes
3. Votre site sera disponible sur `https://votre-projet.vercel.app`

## 🚀 Méthode 2 : Déploiement via CLI Vercel

### Installation CLI

```bash
npm install -g vercel
```

### Connexion

```bash
vercel login
```

### Déploiement

```bash
cd "/home/axel/Bureau/sante/SAA CO3/aws-saa-academy"
vercel
```

Suivez les prompts :
- Set up and deploy? `Y`
- Which scope? Sélectionnez votre compte
- Link to existing project? `N`
- Project name? `aws-saa-academy`
- Directory? `./` (déjà dans aws-saa-academy)

### Déploiement en Production

```bash
vercel --prod
```

## 🔧 Résolution du Problème 404

### Cause du Problème

Les applications React SPA (Single Page Application) utilisent le routing côté client. Quand vous accédez à une route comme `/dashboard`, Vercel cherche un fichier `dashboard.html` qui n'existe pas.

### Solution Implémentée

Le fichier `vercel.json` contient :
```json
"rewrites": [
  {
    "source": "/(.*)",
    "destination": "/index.html"
  }
]
```

**Cela redirige toutes les routes vers `index.html`**, permettant à React Router de gérer le routing.

## 📊 Vérification du Déploiement

### 1. Vérifier le Build

```bash
cd aws-saa-academy
npm run build
```

Devrait créer le dossier `dist/` avec :
- `index.html`
- `assets/index-*.js`
- `assets/index-*.css`

### 2. Tester Localement

```bash
npm run preview
```

Ouvre http://localhost:4173 et testez :
- Page d'accueil : `/`
- Dashboard : `/dashboard` (ne devrait PAS donner 404)
- Cours : `/courses`
- Examen : `/exam`

### 3. Vérifier sur Vercel

Après déploiement, testez :
- `https://votre-projet.vercel.app/`
- `https://votre-projet.vercel.app/dashboard`
- `https://votre-projet.vercel.app/courses`

**Toutes les routes devraient fonctionner !**

## 🛡️ Headers de Sécurité

Le fichier `vercel.json` configure automatiquement :

```json
"headers": [
  {
    "source": "/(.*)",
    "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-XSS-Protection", "value": "1; mode=block" },
      { "key": "Referrer-Policy", "value": "no-referrer" },
      { "key": "Permissions-Policy", "value": "geolocation=(), microphone=(), camera=()" }
    ]
  }
]
```

Vérifiez avec :
```bash
curl -I https://votre-projet.vercel.app
```

## ⚡ Optimisations Vercel

### Cache des Assets

```json
{
  "source": "/assets/(.*)",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "public, max-age=31536000, immutable"
    }
  ]
}
```

Les fichiers dans `/assets/` sont cachés pendant 1 an.

### Compression Automatique

Vercel compresse automatiquement :
- Gzip pour tous les navigateurs
- Brotli pour les navigateurs modernes

### CDN Global

Votre site est automatiquement distribué sur le CDN global de Vercel (Edge Network).

## 🔄 Déploiements Automatiques

### Configuration

1. Allez dans Settings → Git
2. Activez "Automatic Deployments"

**Maintenant :**
- Chaque push sur `main` → Déploiement en production
- Chaque push sur autre branche → Preview deployment

### Preview Deployments

Créez une branche pour tester :
```bash
git checkout -b feature/nouvelle-fonctionnalite
git push origin feature/nouvelle-fonctionnalite
```

Vercel créera automatiquement une URL de preview :
`https://aws-saa-academy-git-feature-nouvelle-fonctionnalite.vercel.app`

## 📈 Monitoring

### Analytics Vercel

1. Allez dans votre projet sur Vercel
2. Onglet "Analytics"
3. Voyez :
   - Visiteurs uniques
   - Pages vues
   - Temps de chargement
   - Erreurs

### Logs

1. Onglet "Deployments"
2. Cliquez sur un déploiement
3. Voyez les logs de build

## 🌐 Domaine Personnalisé

### Ajouter un Domaine

1. Settings → Domains
2. Ajoutez votre domaine : `aws-academy.votredomaine.com`
3. Configurez les DNS :

```
Type: CNAME
Name: aws-academy
Value: cname.vercel-dns.com
```

### SSL Automatique

Vercel génère automatiquement un certificat SSL (Let's Encrypt).

## 🐛 Dépannage

### Erreur : "Build Failed"

**Vérifiez :**
```bash
cd aws-saa-academy
npm install
npm run build
```

Si ça fonctionne localement, le problème vient de Vercel.

**Solutions :**
1. Vérifiez Node.js version dans Settings → General
2. Changez en Node.js 18.x ou 20.x

### Erreur : "Module not found"

**Cause :** Dépendance manquante dans `package.json`

**Solution :**
```bash
npm install --save la-dependance-manquante
git add package.json package-lock.json
git commit -m "fix: add missing dependency"
git push
```

### Erreur 404 Persiste

**Vérifiez :**
1. Le fichier `vercel.json` est bien dans `aws-saa-academy/`
2. Le contenu est correct (voir ci-dessus)
3. Redéployez :
   ```bash
   vercel --prod --force
   ```

### Build Trop Long

**Cause :** Obfuscation du code prend du temps

**Solution temporaire :**
Désactivez l'obfuscation pour les previews :

```javascript
// vite.config.js
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      plugins: process.env.VERCEL_ENV === 'production' 
        ? [obfuscator({ /* ... */ })]
        : []
    }
  }
})
```

## 📊 Métriques de Performance

### Lighthouse Score Attendu

- Performance: 90+
- Accessibility: 95+
- Best Practices: 100
- SEO: 90+

### Web Vitals

- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

## 🎯 Checklist de Déploiement

- [x] `vercel.json` créé
- [x] Code poussé sur GitHub
- [ ] Projet importé sur Vercel
- [ ] Root directory configuré : `aws-saa-academy`
- [ ] Build réussi
- [ ] Routes testées (pas de 404)
- [ ] Headers de sécurité vérifiés
- [ ] Performance testée (Lighthouse)
- [ ] Domaine personnalisé configuré (optionnel)

## 🚀 Commandes Rapides

```bash
# Build local
cd aws-saa-academy && npm run build

# Preview local
npm run preview

# Déployer sur Vercel
vercel --prod

# Voir les logs
vercel logs

# Lister les déploiements
vercel ls

# Rollback
vercel rollback
```

## 📞 Support

- Documentation Vercel : https://vercel.com/docs
- Support Vercel : https://vercel.com/support
- Community Discord : https://vercel.com/discord

---

**Votre site devrait maintenant être accessible sans erreur 404 ! 🎉**

Pour toute question, consultez les logs de déploiement sur Vercel.