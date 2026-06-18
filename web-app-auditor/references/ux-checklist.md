# UX & Contenu Checklist by Site Type

## Portfolio / CV en ligne (ex: axeltadjounteu.vercel.app)

### Message & Positionnement
- [ ] Headline claire en < 10 mots : qui tu es + ce que tu fais
- [ ] Sous-titre qui précise la valeur apportée (pas juste "Développeur Full Stack")
- [ ] CTA principal visible above the fold (ex: "Voir mes projets", "Me contacter")
- [ ] Photo professionnelle ou avatar cohérent avec la marque

### Sections essentielles
- [ ] Hero (accroche + CTA)
- [ ] À propos (bref, humain, pas une liste de buzzwords)
- [ ] Compétences (visuellement organisées, pas juste une liste plate)
- [ ] Projets (avec screenshots, stack, lien demo + lien code)
- [ ] Contact (formulaire OU liens directs : email, LinkedIn, GitHub)

### Contenu professionnel
- [ ] Pas de fautes d'orthographe (français ET anglais)
- [ ] Descriptions de projets avec : contexte, problème résolu, résultat
- [ ] Pas de "Lorem ipsum" ou placeholders visibles
- [ ] Dates cohérentes sur les expériences/projets

### Design
- [ ] Palette de 2-3 couleurs max (primaire, secondaire, neutre)
- [ ] Typographie lisible : sans-serif pour le body, taille >= 16px
- [ ] Contrastes WCAG AA (ratio >= 4.5:1 pour le texte)
- [ ] Espacement cohérent (système de grille respecté)
- [ ] Animations subtiles (pas de parallax agressif, pas de transitions > 300ms)

---

## SaaS / Application Web

### Onboarding
- [ ] Explication claire de la valeur en 3 bullets max
- [ ] Flow de signup simplifié (< 3 champs pour commencer)
- [ ] Email de bienvenue et vérification fonctionnels
- [ ] Dashboard vide guidé ("empty state" avec action suggérée)

### Navigation
- [ ] Navbar fixe ou accessible facilement
- [ ] Breadcrumbs sur les pages profondes
- [ ] Pas plus de 7 items dans le menu principal
- [ ] Retour arrière toujours possible

### Formulaires
- [ ] Labels visibles (pas juste placeholders)
- [ ] Messages d'erreur explicites ("Email invalide" pas juste "Erreur")
- [ ] Validation inline (pas seulement à la soumission)
- [ ] Loading states sur les boutons de soumission

---

## Marketplace / E-commerce

### Confiance
- [ ] Mentions légales présentes
- [ ] CGV / Politique de confidentialité accessibles
- [ ] Logos de paiement sécurisé visibles
- [ ] Avis / témoignages (avec noms réels si possible)

### Produits
- [ ] Images de qualité (pas floues, pas trop lentes)
- [ ] Prix clairs (avec devise locale)
- [ ] CTA d'achat visible sans scroll
- [ ] Stock / disponibilité indiqué

---

## Règles UX universelles

### Performance perçue
- [ ] Skeleton loaders plutôt que spinners infinis
- [ ] Feedback immédiat sur toute action utilisateur (< 100ms)
- [ ] Messages d'erreur utiles (pas juste "Something went wrong")
- [ ] Page 404 customisée avec lien vers l'accueil

### Mobile
- [ ] Taille des zones de tap >= 44x44px
- [ ] Pas de texte tronqué sur petit écran
- [ ] Pas de scroll horizontal involontaire
- [ ] Menu hamburger fonctionnel et accessible

### Accessibilité (WCAG 2.1 AA minimum)
- [ ] Attributs `alt` sur toutes les images (vides `alt=""` pour les décos)
- [ ] Focus visible sur tous les éléments interactifs
- [ ] Pas de contenu uniquement par couleur (ex: erreur = rouge + icône + texte)
- [ ] Titres hiérarchiques (H1 unique par page, H2/H3 logiques)

### SEO de base
- [ ] `<title>` unique et descriptif par page
- [ ] Meta description présente
- [ ] URL lisibles (pas `/page?id=123`, plutôt `/projets/codesecure`)
- [ ] Sitemap.xml présent (pour les sites avec plusieurs pages)
- [ ] `robots.txt` configuré

---

## Scoring UI/UX

| Score | Critères |
|---|---|
| 9-10 | Design cohérent, message clair, accessibilité respectée, mobile parfait |
| 7-8 | Bon design avec quelques incohérences, message globalement clair |
| 5-6 | Design passable, message flou, problèmes mobile ou accessibilité |
| 3-4 | Design non professionnel, hiérarchie confuse, problèmes UX majeurs |
| 0-2 | Placeholder, design cassé, incompréhensible |
