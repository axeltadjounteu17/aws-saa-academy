#!/bin/bash
set -euo pipefail

ROOT="/home/axel/Bureau/sante/SAA CO3"
SCRATCH="$ROOT/scratch"
FR="$ROOT/aws-solution-architect-study-material-fr"
EN="$ROOT/aws-solution-architect-study-material-main"

echo "=== Étape 1/2 : Traduction EN → FR ==="
python3 "$SCRATCH/translate_material.py"

echo ""
echo "=== Étape 2/2 : Génération JSON pour l'application ==="
python3 "$SCRATCH/build_academy_data.py"

echo ""
echo "Terminé. Relancez l'app : cd \"$ROOT/aws-saa-academy\" && npm run dev"
