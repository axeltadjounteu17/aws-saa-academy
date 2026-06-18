# 🎓 AWS SAA-C03 Academy - Plateforme de Préparation à la Certification

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![React](https://img.shields.io/badge/React-19-blue)]()
[![Vite](https://img.shields.io/badge/Vite-8-purple)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

Plateforme interactive complète pour préparer la certification **AWS Solutions Architect Associate (SAA-C03)** avec assistant IA intelligent, simulateur d'examen, et contenu bilingue (FR/EN).

## ✨ Fonctionnalités Principales

### 📚 Contenu Complet
- **42 modules de cours** couvrant tous les domaines de l'examen
- **120 ateliers pratiques** hands-on
- **75 questions d'examen** (50 SAA-C03 + 25 SAP-C02)
- **Contenu bilingue** français et anglais

### 🤖 Assistant IA Intelligent (Niveau 1)
- **Recherche fuzzy** avec Fuse.js (tolère les fautes de frappe)
- **Suggestions intelligentes** contextuelles et dynamiques
- **Historique conversationnel** avec mémoire de contexte
- **Réponses structurées** avec sources citées
- **Détection automatique** des domaines AWS

### 📝 Simulateur d'Examen
- **Mode pratique** : questions illimitées avec explications
- **Mode simulation** : conditions réelles d'examen avec timer
- **Statistiques détaillées** par domaine
- **Historique des résultats** avec graphiques de progression

### 🎯 Suivi de Progression
- **Tableau de bord** avec métriques clés
- **Streak d'étude** et jours actifs
- **Progression par domaine** (4 domaines SAA-C03)
- **Sauvegarde locale** avec validation des données

### 🔒 Sécurité Renforcée
- **Content Security Policy** (CSP) complète
- **Protection XSS** avec composants React sécurisés
- **Validation localStorage** avec schémas
- **ErrorBoundary** global pour gestion d'erreurs

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+ 
- npm 10+

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/axeltadjounteu17/aws-saa-academy.git
cd aws-saa-academy

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build pour production
npm run build
```

L'application sera accessible sur `http://localhost:5173`

## 📖 Structure du Projet

```
aws-saa-academy/
├── src/
│   ├── components/          # Composants React
│   │   ├── Dashboard.jsx
│   │   ├── CourseReader.jsx
│   │   ├── ExamSimulator.jsx
│   │   ├── ContentAssistant.jsx  # Assistant IA
│   │   └── ...
│   ├── utils/              # Utilitaires
│   │   ├── fuzzySearch.js       # Recherche fuzzy (Fuse.js)
│   │   ├── smartSuggestions.js  # Suggestions intelligentes
│   │   ├── conversationContext.js # Contexte conversationnel
│   │   ├── contentSearch.js     # Recherche hybride
│   │   └── ...
│   ├── data/               # Données JSON
│   │   ├── fr/            # Contenu français
│   │   └── en/            # Contenu anglais
│   └── App.jsx            # Composant principal
├── scratch/               # Scripts de génération
│   ├── translate_material.py
│   ├── build_academy_data.py
│   └── full_pipeline.sh
└── docs/                  # Documentation
    ├── AMELIORATIONS_SECURITE_QUALITE.md
    ├── GUIDE_AMELIORATION_IA_ASSISTANT.md
    └── RAPPORT_AUDIT_COMPLET.md
```

## 🤖 Assistant IA - Niveau 1

L'assistant IA actuel utilise une **recherche hybride** (exacte + fuzzy) avec des fonctionnalités avancées :

### Fonctionnalités Implémentées
- ✅ **Recherche fuzzy** : tolère les fautes de frappe ("VCP" → "VPC")
- ✅ **Suggestions contextuelles** : basées sur le domaine détecté
- ✅ **Historique conversationnel** : se souvient des 20 derniers messages
- ✅ **Enrichissement de requêtes** : ajoute le contexte automatiquement
- ✅ **Réponses structurées** : résumé, concept, pratique, examen, prochaines étapes

### Score Actuel : **6.5/10**

### Évolution Possible
Pour passer au **Niveau 2** (score 8/10) avec IA générative :
- Backend Node.js/Python
- Embeddings vectoriels (OpenAI)
- Base vectorielle (Pinecone/Qdrant)
- Génération de réponses avec GPT-4
- Coût estimé : 100-140€/mois

Voir `GUIDE_AMELIORATION_IA_ASSISTANT.md` pour les détails complets.

## 📊 Domaines de l'Examen SAA-C03

1. **Design Secure Architectures** (30%)
2. **Design Resilient Architectures** (26%)
3. **Design High-Performing Architectures** (24%)
4. **Design Cost-Optimized Architectures** (20%)

## 🛠️ Technologies Utilisées

- **React 19** - Framework UI
- **Vite 8** - Build tool ultra-rapide
- **Tailwind CSS 4** - Styling moderne
- **Fuse.js** - Recherche fuzzy
- **Lucide React** - Icônes
- **Marked** - Rendu Markdown

## 📈 Métriques de Qualité

### Sécurité
- ✅ Content Security Policy (CSP)
- ✅ Protection XSS
- ✅ Validation des données
- ✅ ErrorBoundary global

### Performance
- ✅ Build optimisé (< 8 MB)
- ✅ Lazy loading des composants
- ✅ Memoization avec useMemo/useCallback
- ✅ Recherche optimisée

### Code Quality
- ✅ Composants modulaires
- ✅ Hooks personnalisés
- ✅ Gestion d'état centralisée
- ✅ Documentation complète

## 📝 Scripts Disponibles

```bash
# Développement
npm run dev              # Lancer le serveur de dev

# Production
npm run build            # Build pour production
npm run preview          # Prévisualiser le build

# Génération de données
cd scratch
./full_pipeline.sh       # Pipeline complet (traduction + build)
python translate_material.py  # Traduction EN → FR
python build_academy_data.py  # Génération des JSON
```

## 🌍 Internationalisation

L'application supporte **français** et **anglais** :
- Changement de langue en temps réel
- Contenu complet traduit
- Interface utilisateur bilingue
- Sauvegarde de la préférence

## 📄 Documentation

- **[Guide d'Amélioration IA](GUIDE_AMELIORATION_IA_ASSISTANT.md)** - 3 niveaux d'évolution de l'assistant
- **[Rapport d'Audit](RAPPORT_AUDIT_COMPLET.md)** - Audit professionnel 4 axes
- **[Améliorations Sécurité](AMELIORATIONS_SECURITE_QUALITE.md)** - Corrections P0/P1/P2

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📜 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👨‍💻 Auteur

**Axel Tadjounteu**
- GitHub: [@axeltadjounteu17](https://github.com/axeltadjounteu17)

## 🙏 Remerciements

- Contenu basé sur la documentation officielle AWS
- Communauté AWS pour les best practices
- Contributeurs open source

---

**⭐ Si ce projet vous aide, n'hésitez pas à lui donner une étoile !**