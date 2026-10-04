#!/usr/bin/env python3
"""Génère les JSON v2 depuis les données valides de aws-saa-academy.

Les données sources restent intactes. Les contenus EN manquants sont conservés
en français avec des marqueurs de fallback explicites dans chaque entrée et
les métadonnées.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from content.extra_diagrams import DIAGRAM_BUILDERS  # noqa: E402  contenu ajouté, versionné à part
from content.extra_labs import EXTRA_LABS  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT.parent / "aws-saa-academy" / "src" / "data"
DEFAULT_OUTPUT = ROOT / "src" / "data"
VERSION = "2.0.0"
RELEASE_DATE = "2026-09-28"

DOMAIN_LABELS = {
    "D1": {"fr": "Concevoir des architectures sécurisées", "en": "Design Secure Architectures"},
    "D2": {"fr": "Concevoir des architectures résilientes", "en": "Design Resilient Architectures"},
    "D3": {"fr": "Concevoir des architectures hautement performantes", "en": "Design High-Performing Architectures"},
    "D4": {"fr": "Concevoir des architectures optimisées en coûts", "en": "Design Cost-Optimized Architectures"},
}
SOURCE_DOMAINS = {
    "domain 1: design secure architectures": "D1",
    "domain 2: design resilient architectures": "D2",
    "domain 3: design high-performing architectures": "D3",
    "domain 4: design cost-optimized architectures": "D4",
}
DOMAIN_KEYWORDS = {
    "D1": ("iam", "security", "secure", "sécur", "kms", "encrypt", "chiffr", "audit", "compliance", "conform", "waf", "shield", "guardduty", "macie", "organization", "control tower", "scp", "gdpr"),
    "D2": ("resilien", "résilien", "availability", "disponibil", "failover", "basculement", "disaster", "sinistre", "backup", "sauvegarde", "rto", "rpo", "multi-region", "multi-région", "replica", "réplica", "route 53"),
    "D3": ("performance", "latency", "latence", "throughput", "débit", "cache", "cloudfront", "accelerator", "kinesis", "transfer", "migration", "direct connect", "fargate", "auto scaling"),
    "D4": ("cost", "coût", "cheapest", "économ", "saving", "reserved", "réserv", "spot", "pricing", "budget", "rightsiz", "graviton"),
}
AWS_SERVICES = (
    "API Gateway", "Athena", "Aurora", "Auto Scaling", "CloudFormation", "CloudFront",
    "CloudTrail", "CloudWatch", "CodeBuild", "CodeDeploy", "CodePipeline", "Cognito",
    "Config", "Direct Connect", "DynamoDB", "EBS", "EC2", "ECR", "ECS", "EFS",
    "ElastiCache", "EventBridge", "Fargate", "GuardDuty", "IAM", "Kinesis", "KMS",
    "Lambda", "Network Firewall", "OpenSearch", "Organizations", "RDS", "Route 53",
    "S3", "Secrets Manager", "SNS", "SQS", "Systems Manager", "Transit Gateway", "VPC", "WAF",
)


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Impossible de lire {path}: {error}") from error


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(path)


def compact(text: Any) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def infer_domain(source_domain: Any, text: str = "") -> str:
    normalized = compact(source_domain).lower()
    if normalized in SOURCE_DOMAINS:
        return SOURCE_DOMAINS[normalized]
    haystack = f"{normalized} {text}".lower()
    scores = {domain: sum(haystack.count(word) for word in words) for domain, words in DOMAIN_KEYWORDS.items()}
    return max(scores, key=lambda domain: (scores[domain], -int(domain[1]))) if any(scores.values()) else "D2"


def tags_for(text: str) -> list[str]:
    lowered = text.lower()
    tags = [service for service in AWS_SERVICES if service.lower() in lowered]
    return tags[:12] or ["AWS"]


def word_count(markdown: str) -> int:
    plain = re.sub(r"```.*?```", " ", markdown, flags=re.DOTALL)
    plain = re.sub(r"[`#*_>\[\](){}|~-]", " ", plain)
    return max(1, len(re.findall(r"\b[\wÀ-ÿ'-]+\b", plain)))


def course_difficulty(order: int, course_type: str) -> str:
    if course_type == "appendix":
        return "intermediate"
    if order <= 10:
        return "beginner"
    if order <= 30:
        return "intermediate"
    return "advanced"


MARKDOWN_ESCAPE = re.compile(r"\\([\\`*_{}\[\]()#+\-.!&$\"'|<>~])")
FENCE_OPEN = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
FIRST_PART = {"fr": "Partie 1 : Fondations AWS", "en": "Part 1: AWS Foundations"}
APPENDIX_PART = {"fr": "Annexes", "en": "Appendices"}


def clean_heading(text: str) -> str:
    """Titre lisible : espaces insécables normalisés et échappements Markdown retirés."""
    return compact(MARKDOWN_ESCAPE.sub(r"\1", str(text or "").replace("\xa0", " ")).replace("*", ""))


def iter_prose_lines(content: str):
    """Énumère (index, ligne, dans_un_bloc_de_code) selon les règles CommonMark des clôtures."""
    fence = None
    for index, line in enumerate(content.splitlines()):
        match = FENCE_OPEN.match(line)
        if fence is None and match:
            fence = match.group(1)
            yield index, line, True
            continue
        if fence is not None:
            stripped = line.strip()
            # Une clôture fermante ne porte pas d'info string (```yaml ne ferme pas un bloc).
            if stripped and set(stripped) == {fence[0]} and len(stripped) >= len(fence):
                fence = None
            yield index, line, True
            continue
        yield index, line, False


def repair_markdown(content: str) -> str:
    """Corrige les titres sans espace (« ##Présentation ») et ferme un bloc de code resté ouvert."""
    lines = content.splitlines()
    for index, line, in_code in iter_prose_lines(content):
        if not in_code:
            line = re.sub(r"^(#{1,6})(?=[^\s#])", r"\1 ", line)
            # « Théorie \&Concepts », « EBS\& EFS » → « Théorie & Concepts », « EBS & EFS ».
            lines[index] = re.sub(r"[ \t]*\\?&[ \t]*(?=\S)", " & ", line) if re.match(r"^#{1,6}\s", line) else line
    # Détermine si le dernier bloc reste ouvert.
    fence = None
    for line in lines:
        match = FENCE_OPEN.match(line)
        if fence is None and match:
            fence = match.group(1)
        elif fence is not None:
            stripped = line.strip()
            if stripped and set(stripped) == {fence[0]} and len(stripped) >= len(fence):
                fence = None
    open_fence = fence is not None
    repaired = "\n".join(lines)
    if open_fence:
        repaired += "\n" + fence
    return repaired + ("\n" if content.endswith("\n") else "")


def prose_headings(content: str) -> list[tuple[int, str]]:
    headings = []
    for _, line, in_code in iter_prose_lines(content):
        match = re.match(r"^(#{1,3})\s+(.+?)\s*#*\s*$", line)
        if not in_code and match:
            headings.append((len(match.group(1)), clean_heading(match.group(2))))
    return headings


def course_identity(content: str, item: dict[str, Any], course_type: str) -> tuple[str, str, str | None]:
    """Retourne (libellé « Chapitre 4 », titre « Amazon EC2 », partie éventuelle déclarée avant le chapitre)."""
    part = None
    for _, heading in prose_headings(content):
        part_match = re.match(r"^(Partie|Part)\s+(\d+)\s*[:：]\s*(.+)$", heading, flags=re.IGNORECASE)
        if part_match and part is None:
            part = f"{part_match.group(1)} {part_match.group(2)}{' :' if part_match.group(1).lower() == 'partie' else ':'} {part_match.group(3)}"
            continue
        chapter_match = re.match(r"^(Chapitre|Chapter|Annexe|Appendix)\s+([0-9]+|[A-Z])\s*[:：]\s*(.+)$", heading, flags=re.IGNORECASE)
        if chapter_match:
            return f"{chapter_match.group(1).capitalize()} {chapter_match.group(2)}", chapter_match.group(3), part
    fallback = clean_heading(item.get("title")) or str(item.get("filename") or "")
    return ("", fallback, part)


def normalize_courses(items: list[dict[str, Any]], language: str) -> list[dict[str, Any]]:
    courses = []
    for index, item in enumerate(items, start=1):
        identifier = str(item.get("id") or f"ch_{index:02d}")
        course_type = "appendix" if identifier.startswith("app_") or "appendix" in str(item.get("filename", "")).lower() else "course"
        number_match = re.search(r"(\d+)", identifier)
        letter_match = re.match(r"app_([a-z])$", identifier)
        # Ordre : chapitres 1→37, puis annexes A→D (100+).
        order = int(number_match.group(1)) if number_match else 100 + (ord(letter_match.group(1)) - ord("a") + 1 if letter_match else index)
        content = repair_markdown(str(item.get("content") or ""))
        label, title, part = course_identity(content, item, course_type)
        domain = infer_domain(item.get("domain"), f"{title} {content[:3000]}")
        words = word_count(content)
        courses.append({
            "id": identifier,
            "label": label,
            "title": title,
            "fullTitle": f"{label} : {title}" if label and language == "fr" else f"{label}: {title}" if label else title,
            "part": part,
            "filename": str(item.get("filename") or f"course-{order}.md"),
            "content": content,
            "type": course_type,
            "domain": domain,
            "domainLabel": DOMAIN_LABELS[domain][language],
            "difficulty": course_difficulty(order, course_type),
            "words": words,
            "readingTime": max(1, math.ceil(words / 200)),
            "order": order,
            "sourceLanguage": language,
            "isFallback": False,
        })
    courses.sort(key=lambda course: (course["order"], course["id"]))
    # Chaque cours hérite de la partie déclarée par un chapitre précédent.
    current_part = FIRST_PART[language]
    for course in courses:
        if course["type"] == "appendix":
            course["part"] = APPENDIX_PART[language]
        elif course["part"]:
            current_part = course["part"]
        else:
            course["part"] = current_part
    return courses


def question_difficulty(item: dict[str, Any]) -> str:
    if item.get("examLevel") == "professional":
        return "advanced"
    size = len(compact(item.get("question"))) + len(compact(item.get("explanation")))
    return "beginner" if size < 450 else "advanced" if size > 1200 else "intermediate"


def normalize_question(item: dict[str, Any], identifier: str, source_language: str, fallback: bool) -> dict[str, Any]:
    question = compact(item.get("question"))
    explanation = compact(item.get("explanation"))
    domain = infer_domain(item.get("domain"), f"{question} {explanation}")
    options = []
    for index, option in enumerate(item.get("options") or []):
        option_id = str(option.get("id") or option.get("key") or chr(65 + index)).upper()
        options.append({"id": option_id, "text": compact(option.get("text"))})
    reference = compact(item.get("reference")) or "AWS SAA-C03 course material"
    return {
        "id": identifier,
        "domain": domain,
        "domainLabel": DOMAIN_LABELS[domain][source_language],
        "examLevel": item.get("examLevel") if item.get("examLevel") in {"associate", "professional", "all"} else "associate",
        "chapterId": str(item["chapterId"]) if item.get("chapterId") else None,
        "question": question,
        "options": options,
        "correctAnswer": str(item.get("correctAnswer") or "").upper(),
        "explanation": explanation,
        "reference": reference,
        "difficulty": question_difficulty(item),
        "tags": tags_for(f"{question} {explanation} {reference}"),
        "sourceLanguage": source_language,
        "isFallback": fallback,
    }


def normalize_questions(source: Path, language: str) -> list[dict[str, Any]]:
    fr_items = load_json(source / "fr" / "examQuestions.json")
    if language == "fr":
        selected = [(item, "fr", False) for item in fr_items]
    else:
        en_items = load_json(source / "en" / "examQuestions.json")
        native_count = min(len(en_items), len(fr_items))
        selected = [(item, "en", False) for item in en_items[:native_count]]
        selected.extend((item, "fr", True) for item in fr_items[native_count:])
    return [normalize_question(item, f"q_{index:04d}", source_language, fallback) for index, (item, source_language, fallback) in enumerate(selected, start=1)]


def labeled_section(content: str, labels: tuple[str, ...]) -> str:
    alternatives = "|".join(re.escape(label) for label in labels)
    pattern = rf"\*\*(?:{alternatives})\s*[:：]?\s*\*\*\s*(.*?)(?=\n\s*\n|\n#{{2,5}}\s|\n\*\*|$)"
    match = re.search(pattern, content, flags=re.IGNORECASE | re.DOTALL)
    return compact(match.group(1)) if match else ""


def prerequisites_for(content: str, language: str) -> list[str]:
    labels = ("Prérequis", "Prerequisites")
    alternatives = "|".join(labels)
    match = re.search(rf"\*\*(?:{alternatives})\s*[:：]?\s*\*\*\s*(.*?)(?=\n#{{2,5}}\s|\n\*\*|$)", content, flags=re.IGNORECASE | re.DOTALL)
    if match:
        lines = [compact(re.sub(r"^[-*+]\s*", "", line)) for line in match.group(1).splitlines()]
        values = [line for line in lines if line]
        if values:
            return values[:12]
    return ["Compte AWS de laboratoire avec les autorisations requises" if language == "fr" else "AWS lab account with the required permissions"]


STEP_KEYWORDS = r"(?:Étape|Etape|Step|Scénario|Scenario|Tâche|Task|Exercice|Exercise|Partie|Part)"
STEP_HEADING = re.compile(rf"^#{{3,5}}\s+(.+?)\s*$")
STEP_BOLD = re.compile(rf"^\*\*\s*({STEP_KEYWORDS}\s*\d*\s*[:：.\-]?\s*.*?)\s*\*\*\s*[:：]?\s*$", flags=re.IGNORECASE)
STEPS_LABEL = re.compile(r"^\*\*\s*(?:Étapes(?: de l'exercice)?|Etapes|Steps|Exercise Steps|Instructions)\s*[:：]?\s*\*\*\s*[:：]?\s*$", flags=re.IGNORECASE)
NUMBERED_ITEM = re.compile(r"^(\d+)[.)]\s+(.+)$")
TRAILING_LABEL = re.compile(r"^\*\*\s*(Résultats? attendus?|Expected (?:Outcomes?|Results?|Output)|Nettoyage|Cleanup|Clean up)\s*[:：]?\s*\*\*\s*[:：]?\s*(.*)$", flags=re.IGNORECASE)
CLEANUP_HEADING = re.compile(r"^#{2,5}\s+.*(Nettoyage|Cleanup|Clean up|Clean-up)", flags=re.IGNORECASE)


def _step_title(raw: str, index: int, language: str) -> str:
    title = clean_heading(raw)
    title = re.sub(rf"^{STEP_KEYWORDS}\s*\d*\s*[:：.\-]\s*", "", title, flags=re.IGNORECASE) or title
    return title or (f"Étape {index}" if language == "fr" else f"Step {index}")


def split_lab(content: str, language: str) -> dict[str, Any]:
    """Découpe un lab en introduction, étapes, résultats attendus et nettoyage, sans perdre de contenu."""
    lines = content.splitlines()
    info = list(iter_prose_lines(content))
    first_heading = next((i for i, line, code in info if not code and re.match(r"^#{1,3}\s+", line)), None)
    markers: list[tuple[int, str]] = []
    trailing: list[tuple[int, str]] = []
    in_steps_list = False
    for index, line, in_code in info:
        if in_code:
            continue
        stripped = line.strip()
        trailing_match = TRAILING_LABEL.match(stripped)
        if trailing_match or CLEANUP_HEADING.match(stripped):
            trailing.append((index, (trailing_match.group(1) if trailing_match else "cleanup").lower()))
            in_steps_list = False
            continue
        if index == first_heading:
            continue
        heading = STEP_HEADING.match(stripped)
        bold = STEP_BOLD.match(stripped)
        if heading:
            markers.append((index, heading.group(1)))
        elif bold:
            markers.append((index, bold.group(1)))
        elif STEPS_LABEL.match(stripped):
            in_steps_list = True
        elif in_steps_list and NUMBERED_ITEM.match(line):
            markers.append((index, NUMBERED_ITEM.match(line).group(2)))

    end_of_steps = trailing[0][0] if trailing else len(lines)
    markers = [marker for marker in markers if marker[0] < end_of_steps]
    steps = []
    for position, (start, raw_title) in enumerate(markers):
        stop = markers[position + 1][0] if position + 1 < len(markers) else end_of_steps
        body_lines = lines[start + 1:stop]
        # Pour une liste numérotée, le texte de l'item fait partie de l'étape.
        if NUMBERED_ITEM.match(lines[start]):
            body_lines = [NUMBERED_ITEM.match(lines[start]).group(2)] + body_lines
        body = "\n".join(body_lines).strip()
        steps.append({
            "id": len(steps) + 1,
            "title": _step_title(raw_title, len(steps) + 1, language)[:160],
            "description": body or clean_heading(raw_title),
        })
    body_start = (first_heading + 1) if first_heading is not None else 0
    intro_end = markers[0][0] if markers else end_of_steps
    intro = "\n".join(lines[body_start:intro_end]).strip()
    if not steps:
        steps = [{
            "id": 1,
            "title": "Réalisation du laboratoire" if language == "fr" else "Complete the lab",
            "description": intro or content,
        }]
        intro = ""

    expected_parts, cleanup_parts = [], []
    for position, (start, kind) in enumerate(trailing):
        stop = trailing[position + 1][0] if position + 1 < len(trailing) else len(lines)
        first = TRAILING_LABEL.match(lines[start].strip())
        section = "\n".join(([first.group(2)] if first and first.group(2) else []) + lines[start + 1:stop]).strip()
        (cleanup_parts if re.search(r"nettoyage|clean", kind) else expected_parts).append(section)
    return {
        "intro": intro,
        "steps": steps,
        "expectedOutcome": "\n\n".join(part for part in expected_parts if part),
        "cleanup": "\n\n".join(part for part in cleanup_parts if part),
    }


def split_steps(content: str, language: str) -> list[dict[str, Any]]:
    return split_lab(content, language)["steps"]


def cleanup_for(content: str, language: str) -> str:
    cleanup = split_lab(content, language)["cleanup"]
    if cleanup:
        return cleanup
    if language == "fr":
        return "Supprimez les ressources créées pendant ce laboratoire et vérifiez la facturation AWS afin d’éviter tout coût résiduel."
    return "Delete the resources created during this lab and review AWS billing to avoid residual charges."


def estimated_time(content: str, step_count: int) -> int:
    match = re.search(r"(?:durée|duration|estimated time|temps estimé)\D{0,15}(\d{1,3})", content, flags=re.IGNORECASE)
    return max(5, int(match.group(1))) if match else min(120, max(20, step_count * 15))


def normalize_labs(items: list[dict[str, Any]], language: str, courses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    course_titles = {course["id"]: course["fullTitle"] for course in courses}
    labs = []
    for item in items:
        content = repair_markdown(str(item.get("content") or ""))
        objective = labeled_section(content, ("Objectif", "Objective"))
        if not objective:
            objective = clean_heading(item.get("title"))
        parts = split_lab(content, language)
        steps = parts["steps"]
        domain = infer_domain(item.get("domain"), f"{item.get('title', '')} {content[:3000]}")
        chapter_id = str(item.get("chapterId"))
        labs.append({
            "id": str(item.get("id")),
            "title": clean_heading(item.get("title")),
            "chapterId": chapter_id,
            "chapterTitle": course_titles.get(chapter_id) or clean_heading(item.get("chapterTitle")),
            "intro": parts["intro"],
            "expectedOutcome": parts["expectedOutcome"],
            "domain": domain,
            "domainLabel": DOMAIN_LABELS[domain][language],
            "description": objective,
            "objective": objective,
            "prerequisites": prerequisites_for(content, language),
            "steps": steps,
            "cleanup": parts["cleanup"] or cleanup_for("", language),
            "estimatedTime": estimated_time(content, len(steps)),
            "difficulty": "beginner" if len(steps) <= 2 else "advanced" if len(steps) >= 7 else "intermediate",
            "cost": 0,
            "costNote": "Consulter AWS Pricing; le montant dépend du compte et de la région." if language == "fr" else "Check AWS Pricing; charges depend on the account and Region.",
            "tags": tags_for(f"{item.get('title', '')} {content}"),
            "content": content,
            "sourceLanguage": language,
            "isFallback": False,
        })
    return labs


LAB_LABELS = {
    "fr": {"objective": "Objectif", "prerequisites": "Prérequis", "step": "Étape", "expected": "Résultats attendus", "cleanup": "Nettoyage", "sep": " :"},
    "en": {"objective": "Objective", "prerequisites": "Prerequisites", "step": "Step", "expected": "Expected outcomes", "cleanup": "Cleanup", "sep": ":"},
}


def added_labs(language: str, courses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Labs rédigés pour la v2 (scripts/content/extra_labs.py), au même format que ceux du corpus."""
    pick = (lambda pair: pair[0]) if language == "fr" else (lambda pair: pair[1])
    labels = LAB_LABELS[language]
    sep = labels["sep"]
    course_titles = {course["id"]: course["fullTitle"] for course in courses}
    labs = []
    for item in EXTRA_LABS:
        steps = []
        for number, step in enumerate(item["steps"], start=1):
            description = pick(step["text"])
            if step.get("code"):
                description += f"\n\n```bash\n{step['code'].strip()}\n```"
            steps.append({"id": number, "title": pick(step["title"]), "description": description})
        title = pick(item["title"])
        objective = pick(item["objective"])
        prerequisites = [pick(entry) for entry in item["prerequisites"]]
        intro = f"**{labels['objective']}{sep}** {objective}\n\n**{labels['prerequisites']}{sep}**\n\n" + "\n".join(f"- {entry}" for entry in prerequisites)
        expected = "\n".join(f"- {pick(entry)}" for entry in item["expected"])
        cleanup = f"{pick(item['cleanup']['text'])}\n\n```bash\n{item['cleanup']['code'].strip()}\n```"
        content = "\n\n".join(
            [f"### {title}", intro]
            + [f"#### {labels['step']} {step['id']}{sep} {step['title']}\n\n{step['description']}" for step in steps]
            + [f"**{labels['expected']}{sep}**\n\n{expected}", f"**{labels['cleanup']}{sep}**\n\n{cleanup}"]
        )
        labs.append({
            "id": item["id"], "title": title, "chapterId": item["chapterId"],
            "chapterTitle": course_titles.get(item["chapterId"], ""),
            "intro": intro, "expectedOutcome": expected,
            "domain": item["domain"], "domainLabel": DOMAIN_LABELS[item["domain"]][language],
            "description": objective, "objective": objective, "prerequisites": prerequisites,
            "steps": steps, "cleanup": cleanup, "estimatedTime": item["estimatedTime"],
            "difficulty": item["difficulty"], "cost": 0, "costNote": pick(item["cost"]),
            "tags": item["tags"], "content": content,
            "sourceLanguage": language, "isFallback": False, "origin": "added",
        })
    return labs


def order_labs(labs: list[dict[str, Any]], courses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Regroupe les labs par chapitre dans l'ordre du programme : ceux du corpus, puis ceux ajoutés."""
    chapter_order = {course["id"]: course["order"] for course in courses}
    for lab in labs:
        lab.setdefault("origin", "corpus")
    ranked = sorted(enumerate(labs), key=lambda pair: (chapter_order.get(pair[1]["chapterId"], 999), pair[1]["origin"] != "corpus", pair[0]))
    return [lab for _, lab in ranked]


def extra_diagrams(language: str) -> list[dict[str, Any]]:
    localized = {
        "fr": [
            ("Architecture de microservices conteneurisée", "Services ECS découplés par files et événements.", "D3"),
            ("Pipeline CI/CD sécurisé", "Livraison continue avec contrôles, tests et déploiement progressif.", "D1"),
            ("Traitement de données en temps réel", "Ingestion et analyse serverless d'un flux de données.", "D3"),
        ],
        "en": [
            ("Containerized microservices architecture", "ECS services decoupled with queues and events.", "D3"),
            ("Secure CI/CD pipeline", "Continuous delivery with controls, tests, and progressive deployment.", "D1"),
            ("Real-time data processing", "Serverless ingestion and analysis of a data stream.", "D3"),
        ],
    }
    words = {
        "fr": {
            "users": "Utilisateurs", "services": "Services ECS Fargate", "worker": "Service de traitement asynchrone",
            "repo": "Dépôt Git", "tests": "Tests unitaires et de sécurité", "approval": "Approbation manuelle",
            "deploy": "Déploiement ECS blue/green", "producers": "Producteurs : IoT, applications",
            "processing": "Lambda : transformation", "multi_az": "Multi-AZ",
        },
        "en": {
            "users": "Users", "services": "ECS Fargate services", "worker": "Asynchronous worker service",
            "repo": "Git repository", "tests": "Unit and security tests", "approval": "Manual approval",
            "deploy": "ECS blue/green deployment", "producers": "Producers: IoT, apps",
            "processing": "Lambda: transformation", "multi_az": "Multi-AZ",
        },
    }[language]
    codes = [
        f'flowchart LR\n  U(["{words["users"]}"]) --> ALB["Application Load Balancer"]\n  subgraph VPC["VPC · {words["multi_az"]}"]\n    ALB --> ECS["{words["services"]}"]\n    ECS --> SQS["Amazon SQS"]\n    SQS --> W["{words["worker"]}"]\n    ECS --> CACHE["ElastiCache"]\n    ECS --> RDS[("Amazon Aurora")]\n  end',
        f'flowchart LR\n  G["{words["repo"]}"] --> CP["CodePipeline"]\n  CP --> CB["CodeBuild"]\n  CB --> T["{words["tests"]}"]\n  T --> A{{"{words["approval"]}"}}\n  A --> CD["CodeDeploy"]\n  CD --> ECS["{words["deploy"]}"]',
        f'flowchart LR\n  P(["{words["producers"]}"]) --> K["Kinesis Data Streams"]\n  K --> L["{words["processing"]}"]\n  L --> S3[("Amazon S3")]\n  L --> DDB[("DynamoDB")]\n  S3 --> A["Athena"]\n  A --> Q["QuickSight"]',
    ]
    services = [
        ["ECS", "Fargate", "SQS", "Aurora", "ElastiCache"],
        ["CodePipeline", "CodeBuild", "CodeDeploy", "ECS"],
        ["Kinesis", "Lambda", "S3", "DynamoDB", "Athena"],
    ]
    result = []
    for index, ((title, description, domain), code, service_list) in enumerate(zip(localized[language], codes, services), start=6):
        result.append({
            "id": f"diagram_{index:02d}", "title": title, "description": description,
            "mermaidCode": code, "explanation": description, "services": service_list,
            "domain": domain, "tags": ["architecture", "reference"],
            "sourceLanguage": language, "isFallback": False, "origin": "added",
        })
    return result


MERMAID_EDGE = re.compile(r"(\s*<?(?=[-.=]{2,})[-.=]+>?(?:\s*\|[^|]*\|)?\s*)")
MERMAID_SHAPE = re.compile(r"\(\([^)]*\)\)|\[\([^)]*\)\]|\[[^\]]*\]|\([^)]*\)|\{[^}]*\}")
SIMPLE_NODE = re.compile(r"^[A-Za-z0-9_]+(?:\x00\d+\x00)?$")


def repair_mermaid(code: str) -> str:
    """Rend valides les flowcharts qui référencent un sous-graphe par son titre (avec espaces).

    Chaque « subgraph Titre long » reçoit un identifiant (« subgraph sg_titre_long["Titre long"] »),
    puis les extrémités d'arêtes et les listes « class » écrites en toutes lettres sont remplacées
    par l'identifiant du sous-graphe correspondant (titre exact ou préfixe du titre).
    """
    lines = code.splitlines()
    subgraphs: list[tuple[str, str]] = []
    for index, line in enumerate(lines):
        match = re.match(r"^(\s*)subgraph\s+([^\[\]\"]+?)\s*$", line)
        if match and " " in match.group(2):
            title = match.group(2)
            identifier = "sg_" + re.sub(r"[^A-Za-z0-9]+", "_", title).strip("_").lower()
            subgraphs.append((title, identifier))
            lines[index] = f'{match.group(1)}subgraph {identifier}["{title.replace(chr(34), "")}"]'
    if not subgraphs:
        return code

    def resolve(name: str) -> str:
        name = name.strip()
        if not name or SIMPLE_NODE.match(name):
            return name
        for title, identifier in sorted(subgraphs, key=lambda item: -len(item[0])):
            if title == name or title.startswith(name + " "):
                return identifier
        identifier = "n_" + re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_").lower()
        return f'{identifier}["{name}"]'

    for index, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or stripped.startswith(("%%", "subgraph", "end", "classDef", "style", "graph", "flowchart", "direction")):
            continue
        indent = line[: len(line) - len(line.lstrip())]
        if stripped.startswith("class "):
            body = stripped[len("class "):].rstrip(";")
            targets, _, class_name = body.rpartition(" ")
            resolved = ",".join(resolve(item).split("[")[0] for item in targets.split(","))
            lines[index] = f"{indent}class {resolved} {class_name};"
            continue
        # Masque les libellés de forme pour ne découper que sur les vraies arêtes.
        shapes: list[str] = []
        masked = MERMAID_SHAPE.sub(lambda m: shapes.append(m.group(0)) or f"\x00{len(shapes) - 1}\x00", stripped)
        parts = MERMAID_EDGE.split(masked)
        if len(parts) < 3:
            continue
        rebuilt = "".join(part if position % 2 else resolve(part) if " " in part.strip() else part for position, part in enumerate(parts))
        lines[index] = indent + re.sub(r"\x00(\d+)\x00", lambda m: shapes[int(m.group(1))], rebuilt)
    return "\n".join(lines)


QUOTED_NUMBERED_LABEL = re.compile(r'(\|"|\["|\("|\{")\s*(\d+)\.\s+')
BARE_NUMBERED_EDGE_LABEL = re.compile(r'\|\s*(\d+)\.\s+([^|"]*)\|')


def safe_numbered_labels(code: str) -> str:
    """« 1. Texte » en début de libellé est lu comme une liste Markdown par Mermaid : on écrit « (1) Texte »."""
    code = BARE_NUMBERED_EDGE_LABEL.sub(lambda m: f'|"({m.group(1)}) {m.group(2).strip()}"|', code)
    return QUOTED_NUMBERED_LABEL.sub(lambda m: f"{m.group(1)}({m.group(2)}) ", code)


def added_diagrams(language: str, start: int) -> list[dict[str, Any]]:
    """Diagrammes rédigés pour la v2 (scripts/content/extra_diagrams.py)."""
    result = []
    for offset, builder in enumerate(DIAGRAM_BUILDERS):
        item = builder(language)
        result.append({
            "id": f"diagram_{start + offset:02d}", "title": item["title"], "description": item["description"],
            "mermaidCode": item["code"], "explanation": item["explanation"], "services": item["services"],
            "domain": item["domain"], "tags": ["architecture", "exam"],
            "sourceLanguage": language, "isFallback": False, "origin": "added",
        })
    return result


def normalize_diagrams(items: list[dict[str, Any]], language: str) -> list[dict[str, Any]]:
    English_titles = [
        "Multi-AZ three-tier web application", "Event-driven serverless architecture",
        "Hybrid hub-and-spoke connectivity", "Multi-Region disaster recovery",
        "Multi-account landing zone",
    ]
    diagrams = []
    for index, item in enumerate(items[:5], start=1):
        title = compact(item.get("title"))
        description = compact(item.get("description"))
        fallback = language == "en"
        if fallback:
            title = English_titles[index - 1]
            description = "Reference architecture imported from the French corpus; technical diagram labels remain in French."
        code = repair_mermaid(str(item.get("mermaid") or item.get("mermaidCode") or ""))
        domain = infer_domain("", f"{title} {description} {code}")
        diagrams.append({
            "id": f"diagram_{index:02d}", "title": title, "description": description,
            "mermaidCode": code, "explanation": str(item.get("explanation") or description),
            "services": tags_for(f"{title} {description} {code}"), "domain": domain,
            "tags": ["architecture", "reference"], "sourceLanguage": "fr",
            "isFallback": fallback,
        })
    for diagram in diagrams:
        diagram["origin"] = "corpus"
    combined = diagrams + extra_diagrams(language)
    combined += added_diagrams(language, start=len(combined) + 1)
    for diagram in combined:
        diagram["mermaidCode"] = safe_numbered_labels(diagram["mermaidCode"])
    return combined


def coverage(items: list[dict[str, Any]], expected_language: str) -> dict[str, int]:
    native = sum(not item.get("isFallback", False) for item in items)
    return {"total": len(items), "native": native, "fallback": len(items) - native, "coveragePercent": round(native * 100 / len(items)) if items else 100}


def build_meta(language: str, courses: list[dict[str, Any]], questions: list[dict[str, Any]], labs: list[dict[str, Any]], diagrams: list[dict[str, Any]]) -> dict[str, Any]:
    domain_counts = Counter(question["domain"] for question in questions)
    return {
        "version": VERSION,
        "releaseDate": RELEASE_DATE,
        "language": language,
        "generatedBy": "scripts/build_data.py",
        "statistics": {
            "totalChapters": len(courses), "totalQuestions": len(questions),
            "totalLabs": len(labs), "totalDiagrams": len(diagrams),
            "associateQuestions": sum(question["examLevel"] == "associate" for question in questions),
            "professionalQuestions": sum(question["examLevel"] == "professional" for question in questions),
            "questionsByDomain": dict(sorted(domain_counts.items())),
        },
        "translationCoverage": {
            "courses": coverage(courses, language), "questions": coverage(questions, language),
            "labs": coverage(labs, language), "diagrams": coverage(diagrams, language),
        },
        "examSettings": {
            "official": {"questionCount": 65, "durationMinutes": 130, "passingScore": 720, "domainDistribution": {"D1": 30, "D2": 26, "D3": 24, "D4": 20}},
            "replayableSetsWithoutDuplicates": 3,
        },
    }


def generate(source: Path, output: Path) -> None:
    required = [source / language / name for language in ("fr", "en") for name in ("coursesData.json", "examQuestions.json", "labsData.json")]
    required.append(source / "fr" / "diagramsData.json")
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise RuntimeError("Sources manquantes:\n- " + "\n- ".join(missing))
    source_diagrams = load_json(source / "fr" / "diagramsData.json")
    for language in ("fr", "en"):
        courses = normalize_courses(load_json(source / language / "coursesData.json"), language)
        questions = normalize_questions(source, language)
        corpus_labs = normalize_labs(load_json(source / language / "labsData.json"), language, courses)
        labs = order_labs(corpus_labs + added_labs(language, courses), courses)
        diagrams = normalize_diagrams(source_diagrams, language)
        destination = output / language
        write_json(destination / "coursesData.json", courses)
        write_json(destination / "examQuestions.json", questions)
        write_json(destination / "labsData.json", labs)
        write_json(destination / "diagramsData.json", diagrams)
        write_json(destination / "meta.json", build_meta(language, courses, questions, labs, diagrams))
        print(f"{language.upper()}: {len(courses)} cours, {len(questions)} questions, {len(labs)} labs, {len(diagrams)} diagrammes")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    generate(args.source.resolve(), args.output.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
