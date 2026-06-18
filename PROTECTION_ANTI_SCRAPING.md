# 🛡️ Protection Anti-Scraping - AWS SAA-C03 Academy

## 📊 État Actuel de la Protection

### ✅ Protections Déjà Implémentées

#### 1. **Content Security Policy (CSP)**
```html
<!-- Dans index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
">
```
**Protection :** Empêche l'injection de scripts externes et l'embedding dans des iframes.

#### 2. **Headers de Sécurité**
```html
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="Referrer-Policy" content="no-referrer">
<meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=()">
```
**Protection :** Empêche l'embedding et limite les permissions.

#### 3. **Application React (SPA)**
- **Rendu côté client** : Le contenu n'est pas directement accessible dans le HTML source
- **Données JSON** : Chargées dynamiquement via imports JavaScript
- **Pas d'API publique** : Tout est en local, pas de endpoints à scraper

### ⚠️ Limitations Actuelles

| Vulnérabilité | Niveau de Risque | Impact |
|---------------|------------------|--------|
| **Données JSON publiques** | 🟡 Moyen | Les fichiers JSON sont accessibles dans le build |
| **Pas de rate limiting** | 🟡 Moyen | Aucune limite sur les requêtes |
| **Pas d'obfuscation** | 🟡 Moyen | Code JavaScript lisible |
| **Pas de watermarking** | 🟢 Faible | Contenu peut être copié |
| **Pas de CAPTCHA** | 🟢 Faible | Pas de vérification humaine |

---

## 🔒 Protections Anti-Scraping Recommandées

### Niveau 1 : Protection Basique (Actuel + Améliorations Simples)

#### A. Obfuscation du Code JavaScript

**Installation :**
```bash
cd aws-saa-academy
npm install --save-dev vite-plugin-obfuscator
```

**Configuration `vite.config.js` :**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscator from 'vite-plugin-obfuscator'

export default defineConfig({
  plugins: [
    react(),
    obfuscator({
      enable: true,
      options: {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        debugProtection: true,
        debugProtectionInterval: 4000,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
      }
    })
  ]
})
```

**Avantages :**
- ✅ Code JavaScript illisible
- ✅ Protection contre le reverse engineering
- ✅ Détection de debugger
- ✅ Auto-défense du code

**Inconvénients :**
- ❌ Augmente la taille du bundle (~30%)
- ❌ Peut ralégir légèrement l'exécution

#### B. Chiffrement des Données JSON

**Créer `src/utils/dataEncryption.js` :**
```javascript
import CryptoJS from 'crypto-js'

const SECRET_KEY = import.meta.env.VITE_DATA_KEY || 'aws-saa-academy-2026'

export function encryptData(data) {
  const jsonString = JSON.stringify(data)
  return CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString()
}

export function decryptData(encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY)
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(decryptedString)
  } catch (error) {
    console.error('Decryption failed:', error)
    return null
  }
}
```

**Script de chiffrement `scratch/encrypt_data.py` :**
```python
import json
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2

def encrypt_json_file(input_file, output_file, password):
    # Générer une clé depuis le mot de passe
    kdf = PBKDF2(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'aws-saa-academy-salt',
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    fernet = Fernet(key)
    
    # Lire et chiffrer
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    json_string = json.dumps(data)
    encrypted = fernet.encrypt(json_string.encode())
    
    # Sauvegarder
    with open(output_file, 'w') as f:
        f.write(encrypted.decode())
    
    print(f"✓ {input_file} chiffré → {output_file}")

# Chiffrer tous les fichiers
encrypt_json_file('src/data/fr/coursesData.json', 'src/data/fr/coursesData.enc', 'secret123')
```

**Avantages :**
- ✅ Données JSON illisibles
- ✅ Nécessite la clé pour déchiffrer
- ✅ Protection forte du contenu

**Inconvénients :**
- ❌ Complexité accrue
- ❌ Clé peut être extraite du code

#### C. Détection de DevTools

**Ajouter dans `src/utils/devToolsDetection.js` :**
```javascript
export function detectDevTools() {
  const threshold = 160
  let devtoolsOpen = false

  const checkDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold
    
    if (widthThreshold || heightThreshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true
        handleDevToolsOpen()
      }
    } else {
      devtoolsOpen = false
    }
  }

  const handleDevToolsOpen = () => {
    // Option 1 : Avertissement
    console.clear()
    console.log('%c⚠️ ATTENTION', 'color: red; font-size: 40px; font-weight: bold;')
    console.log('%cCe contenu est protégé par le droit d\'auteur.', 'font-size: 16px;')
    console.log('%cLe scraping est interdit.', 'font-size: 16px;')
    
    // Option 2 : Bloquer (plus agressif)
    // document.body.innerHTML = '<h1>Accès non autorisé</h1>'
    
    // Option 3 : Rediriger
    // window.location.href = '/unauthorized'
  }

  // Vérifier toutes les 500ms
  setInterval(checkDevTools, 500)

  // Désactiver le clic droit
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    return false
  })

  // Désactiver les raccourcis clavier
  document.addEventListener('keydown', (e) => {
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
      (e.ctrlKey && e.key === 'U')
    ) {
      e.preventDefault()
      return false
    }
  })
}
```

**Intégrer dans `App.jsx` :**
```javascript
import { detectDevTools } from './utils/devToolsDetection'

useEffect(() => {
  if (import.meta.env.PROD) {
    detectDevTools()
  }
}, [])
```

**Avantages :**
- ✅ Détecte l'ouverture des DevTools
- ✅ Désactive clic droit et raccourcis
- ✅ Avertit les utilisateurs

**Inconvénients :**
- ❌ Peut être contourné
- ❌ Peut gêner les utilisateurs légitimes

---

### Niveau 2 : Protection Avancée (Avec Backend)

#### A. Rate Limiting avec Backend

**Backend Express.js :**
```javascript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max
  message: 'Trop de requêtes, réessayez plus tard.'
})

app.use('/api/', limiter)
```

#### B. Authentification JWT

```javascript
import jwt from 'jsonwebtoken'

// Générer un token
const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '24h' })

// Vérifier le token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']
  if (!token) return res.status(403).send('Token requis')
  
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).send('Token invalide')
    req.userId = decoded.userId
    next()
  })
}
```

#### C. Fingerprinting du Navigateur

```javascript
import FingerprintJS from '@fingerprintjs/fingerprintjs'

const fp = await FingerprintJS.load()
const result = await fp.get()
const visitorId = result.visitorId

// Envoyer au backend pour tracking
fetch('/api/track', {
  method: 'POST',
  body: JSON.stringify({ visitorId, action: 'access' })
})
```

#### D. CAPTCHA sur Actions Sensibles

```javascript
import ReCAPTCHA from 'react-google-recaptcha'

<ReCAPTCHA
  sitekey="YOUR_SITE_KEY"
  onChange={handleCaptchaChange}
/>
```

---

### Niveau 3 : Protection Maximale (Production)

#### A. CDN avec Protection DDoS
- **Cloudflare** : Bot protection, rate limiting, DDoS protection
- **AWS CloudFront** : AWS WAF, Shield

#### B. Watermarking Invisible
```javascript
// Ajouter un watermark invisible dans le contenu
function addWatermark(userId, timestamp) {
  const watermark = `<!-- User: ${userId}, Time: ${timestamp} -->`
  // Insérer dans le DOM de manière invisible
}
```

#### C. Monitoring et Alertes
```javascript
// Détecter les comportements suspects
const suspiciousActivity = {
  rapidClicks: 0,
  rapidPageChanges: 0,
  copyPasteAttempts: 0
}

document.addEventListener('copy', () => {
  suspiciousActivity.copyPasteAttempts++
  if (suspiciousActivity.copyPasteAttempts > 10) {
    reportSuspiciousActivity()
  }
})
```

---

## 📊 Comparaison des Niveaux

| Protection | Niveau 1 | Niveau 2 | Niveau 3 | Coût |
|------------|----------|----------|----------|------|
| **Obfuscation code** | ✅ | ✅ | ✅ | Gratuit |
| **Chiffrement données** | ✅ | ✅ | ✅ | Gratuit |
| **DevTools detection** | ✅ | ✅ | ✅ | Gratuit |
| **Rate limiting** | ❌ | ✅ | ✅ | Backend requis |
| **Authentification** | ❌ | ✅ | ✅ | Backend requis |
| **Fingerprinting** | ❌ | ✅ | ✅ | ~$50/mois |
| **CAPTCHA** | ❌ | ✅ | ✅ | Gratuit (Google) |
| **CDN + WAF** | ❌ | ❌ | ✅ | ~$20-200/mois |
| **Monitoring** | ❌ | ❌ | ✅ | ~$30/mois |

---

## 🎯 Recommandations

### Pour Votre Cas (Site Éducatif)

**Niveau 1 Recommandé :**
1. ✅ **Obfuscation du code** (vite-plugin-obfuscator)
2. ✅ **Détection DevTools** (avertissement uniquement)
3. ✅ **Désactivation clic droit** (optionnel)
4. ❌ **Pas de chiffrement** (trop complexe pour un site éducatif)

**Pourquoi ?**
- Site éducatif = contenu doit rester accessible
- Protection contre le scraping automatisé
- N'empêche pas l'apprentissage légitime
- Coût : 0€

### Si Contenu Premium (Payant)

**Niveau 2 Recommandé :**
- Authentification JWT
- Rate limiting backend
- Fingerprinting
- CAPTCHA sur téléchargements

---

## 🚀 Implémentation Rapide (Niveau 1)

### Étape 1 : Installer l'obfuscateur
```bash
cd aws-saa-academy
npm install --save-dev vite-plugin-obfuscator
```

### Étape 2 : Configurer Vite
Voir configuration ci-dessus dans `vite.config.js`

### Étape 3 : Ajouter détection DevTools
Créer `src/utils/devToolsDetection.js` et intégrer dans `App.jsx`

### Étape 4 : Build et tester
```bash
npm run build
npm run preview
```

---

## ⚖️ Considérations Légales

### ⚠️ Important
- **Contenu éducatif** : Doit rester accessible
- **Fair use** : Les utilisateurs ont le droit d'apprendre
- **Trop de protection** = mauvaise UX

### ✅ Bonnes Pratiques
- Avertir clairement (© Copyright)
- Termes d'utilisation visibles
- Protection raisonnable, pas excessive
- Permettre l'usage personnel

---

## 📝 Conclusion

**État Actuel :** 🟡 Protection Basique (5/10)
- CSP et headers de sécurité ✅
- Application React (SPA) ✅
- Pas d'obfuscation ❌
- Pas de détection DevTools ❌

**Avec Niveau 1 :** 🟢 Protection Bonne (7/10)
- Obfuscation du code ✅
- Détection DevTools ✅
- Désactivation clic droit ✅
- Coût : 0€

**Recommandation :** Implémenter le Niveau 1 pour un bon équilibre protection/accessibilité.