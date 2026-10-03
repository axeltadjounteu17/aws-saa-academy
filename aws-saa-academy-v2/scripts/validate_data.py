#!/usr/bin/env python3
"""Validation stricte des données générées pour AWS SAA Academy PRO v2."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "src" / "data"
LANGUAGES = ("fr", "en")
DOMAINS = {"D1", "D2", "D3", "D4"}
DIFFICULTIES = {"beginner", "intermediate", "advanced"}
EXPECTED = {"courses": 41, "questions": 895, "labs": 120, "diagrams": 8}
OFFICIAL_SET = {"D1": 20, "D2": 17, "D3": 15, "D4": 13}
FILES = {
    "courses": "coursesData.json",
    "questions": "examQuestions.json",
    "labs": "labsData.json",
    "diagrams": "diagramsData.json",
    "meta": "meta.json",
}
PLACEHOLDER = re.compile(r"à venir|to be completed|todo|\[service aws\]|option [abcd]$", re.IGNORECASE)


class Validator:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.data: dict[str, dict[str, Any]] = {}

    def error(self, location: str, message: str) -> None:
        self.errors.append(f"{location}: {message}")

    def load(self) -> None:
        for language in LANGUAGES:
            self.data[language] = {}
            for kind, filename in FILES.items():
                path = DATA_DIR / language / filename
                try:
                    self.data[language][kind] = json.loads(path.read_text(encoding="utf-8"))
                except FileNotFoundError:
                    self.error(str(path), "fichier manquant")
                except json.JSONDecodeError as exception:
                    self.error(str(path), f"JSON invalide ({exception})")

    def require(self, item: dict[str, Any], fields: tuple[str, ...], location: str) -> None:
        for field in fields:
            if field not in item or item[field] is None or item[field] == "":
                self.error(location, f"champ requis absent ou vide: {field}")

    def unique_ids(self, items: list[dict[str, Any]], location: str) -> None:
        ids = [item.get("id") for item in items]
        duplicates = [identifier for identifier, count in Counter(ids).items() if count > 1]
        if duplicates:
            self.error(location, f"IDs dupliqués: {duplicates[:10]}")
        if any(not isinstance(identifier, str) or not identifier for identifier in ids):
            self.error(location, "tous les IDs doivent être des chaînes non vides")

    def validate_courses(self, language: str) -> None:
        items = self.data[language].get("courses")
        location = f"{language}/coursesData.json"
        if not isinstance(items, list):
            self.error(location, "la racine doit être une liste")
            return
        if len(items) != EXPECTED["courses"]:
            self.error(location, f"{len(items)} cours au lieu de {EXPECTED['courses']}")
        self.unique_ids(items, location)
        orders = []
        for index, item in enumerate(items):
            here = f"{location}[{index}]"
            self.require(item, ("id", "title", "filename", "content", "type", "domain", "domainLabel", "difficulty", "words", "readingTime", "order"), here)
            if item.get("type") not in {"course", "appendix"}:
                self.error(here, "type invalide")
            if item.get("domain") not in DOMAINS:
                self.error(here, "domaine invalide")
            if item.get("difficulty") not in DIFFICULTIES:
                self.error(here, "difficulté invalide")
            if not isinstance(item.get("words"), int) or item.get("words", 0) <= 0:
                self.error(here, "words doit être un entier positif")
            if not isinstance(item.get("readingTime"), int) or item.get("readingTime", 0) <= 0:
                self.error(here, "readingTime doit être un entier positif")
            orders.append(item.get("order"))
        if orders != sorted(orders):
            self.error(location, "les cours ne sont pas triés par order")

    def validate_questions(self, language: str) -> None:
        items = self.data[language].get("questions")
        location = f"{language}/examQuestions.json"
        if not isinstance(items, list):
            self.error(location, "la racine doit être une liste")
            return
        if len(items) != EXPECTED["questions"]:
            self.error(location, f"{len(items)} questions au lieu de {EXPECTED['questions']}")
        self.unique_ids(items, location)
        texts: set[str] = set()
        domain_counts: Counter[str] = Counter()
        for index, item in enumerate(items):
            here = f"{location}[{index}]"
            self.require(item, ("id", "domain", "domainLabel", "examLevel", "question", "options", "correctAnswer", "explanation", "reference", "difficulty", "tags", "sourceLanguage", "isFallback"), here)
            domain = item.get("domain")
            if domain not in DOMAINS:
                self.error(here, "domaine invalide")
            else:
                domain_counts[domain] += 1
            if item.get("examLevel") not in {"associate", "professional", "all"}:
                self.error(here, "examLevel invalide")
            if item.get("difficulty") not in DIFFICULTIES:
                self.error(here, "difficulté invalide")
            question_text = str(item.get("question") or "").strip()
            if len(question_text) < 10:
                self.error(here, "question trop courte")
            normalized_text = re.sub(r"\s+", " ", question_text).casefold()
            if normalized_text in texts:
                self.error(here, "texte de question dupliqué")
            texts.add(normalized_text)
            explanation = str(item.get("explanation") or "").strip()
            if len(explanation) < 10 or PLACEHOLDER.search(explanation):
                self.error(here, "explication absente, trop courte ou placeholder")
            options = item.get("options")
            if not isinstance(options, list) or len(options) != 4:
                self.error(here, "exactement quatre options sont requises")
                continue
            option_ids = [option.get("id") for option in options if isinstance(option, dict)]
            if set(option_ids) != {"A", "B", "C", "D"}:
                self.error(here, f"options invalides: {option_ids}")
            if any(not str(option.get("text") or "").strip() for option in options if isinstance(option, dict)):
                self.error(here, "une option est vide")
            if item.get("correctAnswer") not in option_ids:
                self.error(here, "correctAnswer ne correspond à aucune option")
        for domain, per_exam in OFFICIAL_SET.items():
            minimum = per_exam * 3
            if domain_counts[domain] < minimum:
                self.error(location, f"{domain}: {domain_counts[domain]} questions, minimum {minimum} pour trois examens sans doublons")

    def validate_labs(self, language: str) -> None:
        items = self.data[language].get("labs")
        courses = self.data[language].get("courses") or []
        location = f"{language}/labsData.json"
        if not isinstance(items, list):
            self.error(location, "la racine doit être une liste")
            return
        if len(items) != EXPECTED["labs"]:
            self.error(location, f"{len(items)} labs au lieu de {EXPECTED['labs']}")
        self.unique_ids(items, location)
        course_ids = {course.get("id") for course in courses}
        for index, item in enumerate(items):
            here = f"{location}[{index}]"
            self.require(item, ("id", "title", "chapterId", "description", "objective", "prerequisites", "steps", "cleanup", "estimatedTime", "difficulty", "cost", "tags", "content"), here)
            if item.get("chapterId") not in course_ids:
                self.error(here, f"chapterId inconnu: {item.get('chapterId')}")
            if item.get("domain") not in DOMAINS:
                self.error(here, "domaine invalide")
            if item.get("difficulty") not in DIFFICULTIES:
                self.error(here, "difficulté invalide")
            if not isinstance(item.get("estimatedTime"), int) or item.get("estimatedTime", 0) <= 0:
                self.error(here, "estimatedTime doit être un entier positif")
            if not isinstance(item.get("cost"), (int, float)) or item.get("cost", -1) < 0:
                self.error(here, "cost doit être positif ou nul")
            steps = item.get("steps")
            if not isinstance(steps, list) or not steps:
                self.error(here, "au moins une étape est requise")
                continue
            for step_index, step in enumerate(steps):
                self.require(step, ("id", "title", "description"), f"{here}.steps[{step_index}]")

    def validate_diagrams(self, language: str) -> None:
        items = self.data[language].get("diagrams")
        location = f"{language}/diagramsData.json"
        if not isinstance(items, list):
            self.error(location, "la racine doit être une liste")
            return
        if len(items) < EXPECTED["diagrams"]:
            self.error(location, f"{len(items)} diagrammes, minimum {EXPECTED['diagrams']}")
        self.unique_ids(items, location)
        for index, item in enumerate(items):
            here = f"{location}[{index}]"
            self.require(item, ("id", "title", "description", "mermaidCode", "services", "domain", "tags", "sourceLanguage", "isFallback"), here)
            if item.get("domain") not in DOMAINS:
                self.error(here, "domaine invalide")
            if len(str(item.get("mermaidCode") or "")) < 20:
                self.error(here, "code Mermaid trop court")

    def validate_meta(self, language: str) -> None:
        meta = self.data[language].get("meta")
        location = f"{language}/meta.json"
        if not isinstance(meta, dict):
            self.error(location, "la racine doit être un objet")
            return
        self.require(meta, ("version", "language", "generatedBy", "statistics", "translationCoverage", "examSettings"), location)
        if meta.get("language") != language:
            self.error(location, "langue incohérente")
        stats = meta.get("statistics") or {}
        actual = {
            "totalChapters": len(self.data[language].get("courses") or []),
            "totalQuestions": len(self.data[language].get("questions") or []),
            "totalLabs": len(self.data[language].get("labs") or []),
            "totalDiagrams": len(self.data[language].get("diagrams") or []),
        }
        for key, count in actual.items():
            if stats.get(key) != count:
                self.error(location, f"{key}={stats.get(key)} mais {count} entrées chargées")
        for kind in ("courses", "questions", "labs", "diagrams"):
            values = meta.get("translationCoverage", {}).get(kind, {})
            items = self.data[language].get(kind) or []
            native = sum(not item.get("isFallback", False) for item in items)
            if values.get("total") != len(items) or values.get("native") != native or values.get("fallback") != len(items) - native:
                self.error(location, f"couverture {kind} incohérente")
        official = meta.get("examSettings", {}).get("official", {})
        if official.get("questionCount") != 65 or official.get("durationMinutes") != 130 or official.get("passingScore") != 720:
            self.error(location, "paramètres officiels SAA-C03 invalides")
        if meta.get("examSettings", {}).get("replayableSetsWithoutDuplicates", 0) < 3:
            self.error(location, "trois examens sans doublons doivent être annoncés")

    def validate_cross_language(self) -> None:
        for kind, expected in EXPECTED.items():
            fr_count = len(self.data.get("fr", {}).get(kind) or [])
            en_count = len(self.data.get("en", {}).get(kind) or [])
            if fr_count != en_count:
                self.error("fr/en", f"nombre de {kind} différent ({fr_count}/{en_count})")
            if kind != "diagrams" and fr_count != expected:
                self.error("fr/en", f"nombre de {kind} inattendu: {fr_count}")
        en_questions = self.data.get("en", {}).get("questions") or []
        fallback_count = sum(item.get("isFallback") is True for item in en_questions)
        if fallback_count != 820:
            self.error("en/examQuestions.json", f"820 fallbacks FR explicites attendus, trouvé {fallback_count}")

    def run(self) -> bool:
        self.load()
        for language in LANGUAGES:
            self.validate_courses(language)
            self.validate_questions(language)
            self.validate_labs(language)
            self.validate_diagrams(language)
            self.validate_meta(language)
        self.validate_cross_language()
        print("\nValidation des données AWS SAA Academy PRO v2")
        for language in LANGUAGES:
            loaded = self.data.get(language, {})
            print(f"- {language.upper()}: {len(loaded.get('courses') or [])} cours, {len(loaded.get('questions') or [])} questions, {len(loaded.get('labs') or [])} labs, {len(loaded.get('diagrams') or [])} diagrammes")
        for warning in self.warnings:
            print(f"AVERTISSEMENT: {warning}")
        if self.errors:
            print(f"\n{len(self.errors)} erreur(s):")
            for error in self.errors[:100]:
                print(f"- {error}")
            if len(self.errors) > 100:
                print(f"- ... {len(self.errors) - 100} erreur(s) supplémentaire(s)")
            return False
        print("\nToutes les validations ont réussi.")
        return True


def main() -> int:
    return 0 if Validator().run() else 1


if __name__ == "__main__":
    sys.exit(main())
