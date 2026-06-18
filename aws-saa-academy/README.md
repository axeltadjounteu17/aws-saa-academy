# AWS SAA-C03 Academy

Plateforme locale de préparation à la certification **AWS Solutions Architect Associate (SAA-C03)**, entièrement en **français**, avec bonus **SAP-C02 Professional**.

## Contenu

| Ressource | Quantité | Source |
|-----------|----------|--------|
| Chapitres + annexes | 41 modules | Markdown traduits EN → FR |
| Ateliers pratiques | 120 labs | Extraits des chapitres |
| Questions SAA-C03 | 50 | Chapitre 36 |
| Questions SAP-C02 (bonus) | 25 | Chapitre 37 |

## Pipeline complet (traduction + build)

```bash
bash "/home/axel/Bureau/sante/SAA CO3/scratch/full_pipeline.sh"
```

Étapes séparées :

```bash
# Traduction (~1–2 h, cache dans scratch/.translation_cache.json)
python3 scratch/translate_material.py

# Import dans l'application (utilise FR si disponible, sinon EN)
python3 scratch/build_academy_data.py
```

## Lancer l'application

```bash
cd aws-saa-academy
npm install
npm run dev
```

## Examens

- **SAA-C03 Associate** : 50 questions (ch. 36)
- **SAP-C02 Bonus** : 25 questions (ch. 37)
- **Mixte** : les 75 questions

Les statistiques proviennent uniquement de votre activité locale (`localStorage`).
