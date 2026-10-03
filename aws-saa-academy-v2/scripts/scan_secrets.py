#!/usr/bin/env python3
"""Recherche de secrets dans les fichiers qui seraient versionnés (sans dépendance externe).

Ne remplace pas un outil dédié (gitleaks, Trivy) mais bloque les fuites courantes.
Les valeurs trouvées ne sont jamais affichées : seuls le fichier, la ligne et le type sont indiqués.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"node_modules", "dist", "dev-dist", "legacy", "test-results", "playwright-report", ".git", "__pycache__"}
SKIP_FILES = {"package-lock.json"}
TEXT_SUFFIXES = {".js", ".jsx", ".mjs", ".ts", ".json", ".py", ".html", ".css", ".md", ".yml", ".yaml", ".sql", ".txt", ".toml"}

PATTERNS = {
    "clé d'accès AWS": re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
    "clé secrète AWS": re.compile(r"aws_secret_access_key\s*[:=]\s*['\"]?[A-Za-z0-9/+=]{40}", re.IGNORECASE),
    "clé privée": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----"),
    "jeton GitHub": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"),
    "jeton Slack": re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b"),
    "clé API Google": re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b"),
    "clé Stripe": re.compile(r"\b(?:sk|rk)_live_[0-9A-Za-z]{20,}\b"),
    "clé secrète Supabase": re.compile(r"\bsb_secret_[A-Za-z0-9_\-]{10,}\b"),
    "JWT": re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
    "mot de passe en clair": re.compile(r"(?i)\b(?:password|passwd|mot_de_passe)\s*[:=]\s*['\"][^'\"\s]{8,}['\"]"),
}
# Valeurs d'exemple de la documentation AWS (AKIAIOSFODNN7EXAMPLE…) présentes dans les cours.
ALLOWED_MARKERS = ("EXAMPLE", "example", "xxxx", "XXXX", "<", "${")
# Heuristique à faux positifs, non appliquée au corpus de cours : ses exemples de code contiennent
# volontairement des mots de passe fictifs dans les extraits de code. Les motifs à forte
# certitude (clés AWS, clés privées, jetons) restent appliqués partout.
EDUCATIONAL_DATA = ROOT / "src" / "data"
HEURISTICS_SKIPPED_IN_DATA = {"mot de passe en clair"}


def candidate_files() -> list[Path]:
    """Fichiers suivis ou non ignorés par Git (respecte .gitignore) ; à défaut, parcours complet."""
    try:
        output = subprocess.run(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            cwd=ROOT, capture_output=True, check=True,
        ).stdout.decode("utf-8")
        paths = [ROOT / name for name in output.split("\0") if name]
    except (OSError, subprocess.CalledProcessError):
        paths = [path for path in ROOT.rglob("*") if not any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts)]
    return [
        path for path in paths
        if path.is_file() and path.name not in SKIP_FILES
        and (path.suffix in TEXT_SUFFIXES or path.name.startswith(".env"))
    ]


def main() -> int:
    files = candidate_files()
    findings = []
    for path in files:
        if path.name.startswith(".env") and path.name != ".env.example":
            findings.append(f"{path.relative_to(ROOT)} — fichier d'environnement non ignoré par Git")
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except (UnicodeDecodeError, OSError):
            continue
        for number, line in enumerate(lines, start=1):
            for label, pattern in PATTERNS.items():
                if label in HEURISTICS_SKIPPED_IN_DATA and EDUCATIONAL_DATA in path.parents:
                    continue
                for match in pattern.finditer(line):
                    context = line[max(0, match.start() - 20):match.end() + 20]
                    if any(marker in context for marker in ALLOWED_MARKERS):
                        continue
                    findings.append(f"{path.relative_to(ROOT)}:{number} — {label}")
    if findings:
        print(f"{len(findings)} secret(s) potentiel(s) (valeurs masquées) :")
        print("\n".join(f"- {item}" for item in findings))
        return 1
    print(f"Aucun secret détecté ({len(files)} fichiers analysés).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
