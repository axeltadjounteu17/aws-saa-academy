#!/usr/bin/env python3
"""Build localized academy JSON data from study markdown.

The app consumes two datasets:
- src/data/fr/* uses translated Markdown when it exists and falls back to EN.
- src/data/en/* uses the original English Markdown only.

Legacy root JSON files are still written with the French-preferred dataset for
backward compatibility with older builds.
"""

import json
import os
import re

SOURCE_DIR_EN = "/home/axel/Bureau/sante/SAA CO3/aws-solution-architect-study-material-main"
SOURCE_DIR_FR = "/home/axel/Bureau/sante/SAA CO3/aws-solution-architect-study-material-fr"
TARGET_DIR = "/home/axel/Bureau/sante/SAA CO3/aws-saa-academy/src/data"
BUILD_LANGUAGE = "fr"

DOMAIN_BY_CHAPTER = {
    2: "Domain 1: Design Secure Architectures",
    16: "Domain 1: Design Secure Architectures",
    23: "Domain 1: Design Secure Architectures",
    24: "Domain 1: Design Secure Architectures",
    25: "Domain 1: Design Secure Architectures",
    1: "Domain 2: Design Resilient Architectures",
    3: "Domain 2: Design Resilient Architectures",
    4: "Domain 2: Design Resilient Architectures",
    5: "Domain 2: Design Resilient Architectures",
    8: "Domain 2: Design Resilient Architectures",
    9: "Domain 2: Design Resilient Architectures",
    15: "Domain 2: Design Resilient Architectures",
    17: "Domain 2: Design Resilient Architectures",
    32: "Domain 2: Design Resilient Architectures",
    6: "Domain 3: Design High-Performing Architectures",
    7: "Domain 3: Design High-Performing Architectures",
    10: "Domain 3: Design High-Performing Architectures",
    11: "Domain 3: Design High-Performing Architectures",
    12: "Domain 3: Design High-Performing Architectures",
    13: "Domain 3: Design High-Performing Architectures",
    14: "Domain 3: Design High-Performing Architectures",
    18: "Domain 3: Design High-Performing Architectures",
    19: "Domain 3: Design High-Performing Architectures",
    20: "Domain 3: Design High-Performing Architectures",
    21: "Domain 3: Design High-Performing Architectures",
    22: "Domain 3: Design High-Performing Architectures",
    29: "Domain 4: Design Cost-Optimized Architectures",
    30: "Domain 4: Design Cost-Optimized Architectures",
}

DOMAIN_LABELS_FR = {
    "Domain 1: Design Secure Architectures": "Domaine 1 : Concevoir des architectures sécurisées",
    "Domain 2: Design Resilient Architectures": "Domaine 2 : Concevoir des architectures résilientes",
    "Domain 3: Design High-Performing Architectures": "Domaine 3 : Concevoir des architectures performantes",
    "Domain 4: Design Cost-Optimized Architectures": "Domaine 4 : Concevoir des architectures optimisées en coûts",
    "General & Frameworks": "Général et frameworks",
    "Bonus SAP-C02 : Solutions Architect Professional": "Bonus SAP-C02 : Solutions Architect Professional",
}

EXAM_DOMAIN_SECTIONS = {
    "Security Domain": "Domain 1: Design Secure Architectures",
    "Resilience Domain": "Domain 2: Design Resilient Architectures",
    "Performance Domain": "Domain 3: Design High-Performing Architectures",
    "Cost Optimization Domain": "Domain 4: Design Cost-Optimized Architectures",
    # French headings after translation
    "Domaine de sécurité": "Domain 1: Design Secure Architectures",
    "Domaine de résilience": "Domain 2: Design Resilient Architectures",
    "Domaine de performance": "Domain 3: Design High-Performing Architectures",
    "Domaine d'optimisation des coûts": "Domain 4: Design Cost-Optimized Architectures",
    "Domaine Sécurité": "Domain 1: Design Secure Architectures",
}


def get_source_dirs():
    return SOURCE_DIR_EN, SOURCE_DIR_FR


def read_markdown(filename, preferred_language=None):
    preferred_language = preferred_language or BUILD_LANGUAGE
    fr_path = os.path.join(SOURCE_DIR_FR, filename)
    en_path = os.path.join(SOURCE_DIR_EN, filename)
    if preferred_language == "fr" and os.path.exists(fr_path):
        with open(fr_path, "r", encoding="utf-8") as f:
            return f.read(), "fr"
    with open(en_path, "r", encoding="utf-8") as f:
        return f.read(), "en"


def list_markdown_files():
    en_files = sorted(f for f in os.listdir(SOURCE_DIR_EN) if f.endswith(".md"))
    return en_files


def get_build_language(preferred_language=None):
    preferred_language = preferred_language or BUILD_LANGUAGE
    if preferred_language == "en":
        total = len(list_markdown_files())
        return "en", 0, total

    fr_count = 0
    if os.path.isdir(SOURCE_DIR_FR):
        fr_count = len([f for f in os.listdir(SOURCE_DIR_FR) if f.endswith(".md")])
    total = len(list_markdown_files())
    if fr_count >= total - 1:
        return "fr", fr_count, total
    return "mixed", fr_count, total


def chapter_domain(ch_num: int) -> str:
    return DOMAIN_BY_CHAPTER.get(ch_num, "Domain 2: Design Resilient Architectures")


def domain_label(domain_key: str) -> str:
    return DOMAIN_LABELS_FR.get(domain_key, domain_key)


def heading_level(line: str):
    stripped = line.strip()
    match = re.match(r"^(#{1,6})\s", stripped)
    if not match:
        return None
    return len(match.group(1))


def is_lab_header(line: str) -> bool:
    stripped = line.strip()
    return (
        stripped.startswith("### Lab")
        or stripped.startswith("### Hands-On Lab")
        or stripped.startswith("## Hands-On Lab Exercise")
        or stripped.startswith("### Atelier")
        or stripped.startswith("## Exercice pratique")
    )


def should_stop_lab(next_line: str, header_level: int, in_code_block: bool) -> bool:
    if in_code_block:
        return False

    level = heading_level(next_line)
    if level is None:
        return False

    stripped = next_line.strip()

    if header_level == 2:
        return level <= 2 and not (
            stripped.startswith("## Hands-On Lab Exercise") or stripped.startswith("## Exercice pratique")
        )

    if level == 4:
        return False

    if level == 3:
        return True

    return level <= 2


def parse_courses(preferred_language=None):
    preferred_language = preferred_language or BUILD_LANGUAGE
    courses = []
    files = list_markdown_files()
    fr_count = 0

    for filename in files:
        if filename.lower() == "readme.md":
            continue

        content, lang = read_markdown(filename, preferred_language)
        if lang == "fr":
            fr_count += 1

        title_match = re.search(r"^#\s+(.*)$", content, re.MULTILINE)
        title = title_match.group(1).strip() if title_match else os.path.splitext(filename)[0]
        title = re.sub(r"^(Chapter \d+|Chapitre \d+|Appendix [A-D]|Annexe [A-D])\s*:\s*", "", title)

        if filename.startswith("Appendix") or filename.startswith("Annexe"):
            type_val = "appendix"
            match = re.match(r"^(?:Appendix|Annexe)\s+([A-D])", filename)
            id_val = f"app_{match.group(1).lower()}" if match else filename
            domain = "General & Frameworks"
        else:
            type_val = "chapter"
            match = re.match(r"^(\d+)", filename)
            id_val = f"ch_{match.group(1)}" if match else filename
            ch_num = int(match.group(1)) if match else None
            domain = chapter_domain(ch_num) if ch_num else "General & Frameworks"

        courses.append(
            {
                "id": id_val,
                "title": title,
                "filename": filename,
                "content": content,
                "type": type_val,
                "domain": domain,
                "domainLabel": domain_label(domain),
            }
        )

    return courses, fr_count


def extract_labs(preferred_language=None):
    preferred_language = preferred_language or BUILD_LANGUAGE
    labs = []
    files = list_markdown_files()

    for filename in files:
        if filename.lower() == "readme.md":
            continue

        content, _lang = read_markdown(filename, preferred_language)

        title_match = re.search(r"^#\s+(.*)$", content, re.MULTILINE)
        chapter_title = title_match.group(1).strip() if title_match else os.path.splitext(filename)[0]
        chapter_title = re.sub(r"^(Chapter \d+|Chapitre \d+|Appendix [A-D]|Annexe [A-D])\s*:\s*", "", chapter_title)

        if filename.startswith("Appendix") or filename.startswith("Annexe"):
            match = re.match(r"^(?:Appendix|Annexe)\s+([A-D])", filename)
            chapter_id = f"app_{match.group(1).lower()}" if match else filename
            ch_num = None
        else:
            match = re.match(r"^(\d+)", filename)
            chapter_id = f"ch_{match.group(1)}" if match else filename
            ch_num = int(match.group(1)) if match else None

        domain = chapter_domain(ch_num) if ch_num else "General & Frameworks"

        lines = content.split("\n")
        i = 0
        in_code_block = False

        while i < len(lines):
            line = lines[i]

            if line.strip().startswith("```"):
                in_code_block = not in_code_block

            if is_lab_header(line):
                header_level = heading_level(line)
                lab_lines = [line]
                i += 1
                in_code_block = False

                while i < len(lines):
                    next_line = lines[i]

                    if next_line.strip().startswith("```"):
                        in_code_block = not in_code_block

                    if should_stop_lab(next_line, header_level, in_code_block):
                        break

                    lab_lines.append(next_line)
                    i += 1

                lab_content = "\n".join(lab_lines).strip()
                lab_num = len([l for l in labs if l["chapterId"] == chapter_id]) + 1
                header_text = line.strip().lstrip("#").strip()

                labs.append(
                    {
                        "id": f"lab_{chapter_id}_{lab_num}",
                        "title": header_text,
                        "chapterId": chapter_id,
                        "chapterTitle": chapter_title,
                        "domain": domain,
                        "domainLabel": domain_label(domain),
                        "content": lab_content,
                    }
                )
            else:
                i += 1

    return labs


def parse_question_block(block, q_id, domain, exam_level, reference, source):
    match = re.search(r"\*\*Q(\d+)\.\*\*\s*(.+)", block, re.DOTALL)
    if not match:
        return None

    rest = match.group(2).strip()
    answer_match = re.search(r"\*\*Answer:\s*([A-D])\*\*\s*[—\-–]?\s*(.*)", rest, re.DOTALL)
    if not answer_match:
        answer_match = re.search(r"\*\*Réponse\s*:\s*([A-D])\*\*\s*[—\-–]?\s*(.*)", rest, re.DOTALL)
    if not answer_match:
        return None

    correct = answer_match.group(1)
    explanation = answer_match.group(2).strip()
    question_body = rest[: answer_match.start()].strip()

    options = []
    for opt_match in re.finditer(r"^([A-D])\)\s*(.+)$", question_body, re.MULTILINE):
        options.append({"key": opt_match.group(1), "text": opt_match.group(2).strip()})

    if len(options) != 4:
        return None

    question_text_lines = []
    for q_line in question_body.split("\n"):
        if re.match(r"^[A-D]\)\s", q_line.strip()):
            break
        question_text_lines.append(q_line)

    question_text = "\n".join(question_text_lines).strip()

    return {
        "id": q_id,
        "domain": domain,
        "domainLabel": domain_label(domain),
        "examLevel": exam_level,
        "question": question_text,
        "options": options,
        "correctAnswer": correct,
        "explanation": explanation,
        "reference": reference,
        "source": source,
    }


def extract_questions_from_section(section, domain_sections, default_domain, exam_level, reference, source, id_prefix=""):
    current_domain = default_domain
    questions = []
    current_block = []

    def flush_block():
        nonlocal current_block
        if not current_block:
            return
        block = "\n".join(current_block).strip()
        current_block = []
        if not block or "**Q" not in block:
            return

        q_num_match = re.search(r"\*\*Q(\d+)\.\*\*", block)
        if not q_num_match:
            return

        q_num = int(q_num_match.group(1))
        q_id = f"{id_prefix}{q_num}" if id_prefix else q_num

        parsed = parse_question_block(block, q_id, current_domain, exam_level, reference, source)
        if parsed:
            questions.append(parsed)

    stop_markers = (
        "## Tips",
        "## Conseils",
        "## Exam",
        "## Professional Exam Strategy",
    )

    for line in section.split("\n"):
        stripped = line.strip()

        for section_name, domain in domain_sections.items():
            if stripped.startswith("###") and section_name.lower() in stripped.lower():
                flush_block()
                current_domain = domain
                break
        else:
            if stripped.startswith("###"):
                lower = stripped.lower()
                if "security" in lower or "sécurité" in lower:
                    flush_block()
                    current_domain = "Domain 1: Design Secure Architectures"
                elif "resilien" in lower or "résilien" in lower:
                    flush_block()
                    current_domain = "Domain 2: Design Resilient Architectures"
                elif "performance" in lower:
                    flush_block()
                    current_domain = "Domain 3: Design High-Performing Architectures"
                elif "cost" in lower or "coût" in lower or "coûts" in lower:
                    flush_block()
                    current_domain = "Domain 4: Design Cost-Optimized Architectures"

        if stripped == "---":
            flush_block()
            continue

        if any(stripped.startswith(m) for m in stop_markers):
            flush_block()
            break

        if re.match(r"^##\s+", stripped) and "Practice Exam" not in stripped and "Questions" not in stripped:
            if "Professional Exam Practice" not in stripped and "Questions d'examen" not in stripped:
                flush_block()
                break

        current_block.append(line)

    flush_block()
    return questions


def extract_associate_questions(preferred_language=None):
    content, _ = read_markdown("36 Solutions Architect Associate Exam Guide.md", preferred_language)

    markers = [
        "## Practice Exam Questions (50 Questions)",
        "## Questions d'examen pratique (50 questions)",
    ]
    section = None
    for marker in markers:
        if marker in content:
            section = content.split(marker, 1)[1]
            break
    if section is None:
        raise ValueError("Associate practice exam section not found in chapter 36")

    return extract_questions_from_section(
        section,
        EXAM_DOMAIN_SECTIONS,
        "Domain 1: Design Secure Architectures",
        "associate",
        "Chapitre 36 — Guide d'examen Solutions Architect Associate",
        "AWS SAA-C03 — Guide chapitre 36",
    )


def extract_professional_questions(preferred_language=None):
    content, _ = read_markdown("37 Solutions Architect Professional Exam Guide.md", preferred_language)

    markers = [
        "## Professional Exam Practice Questions (25 Questions)",
        "## Questions d'examen pratique Professional (25 questions)",
        "## Questions d'examen pratique Professional",
        "## Questions pratiques sur l'examen professionnel (25 questions)",
        "## Questions pratiques sur l'examen professionnel",
    ]
    section = None
    for marker in markers:
        if marker in content:
            section = content.split(marker, 1)[1]
            break
    if section is None:
        raise ValueError("Professional practice exam section not found in chapter 37")

    pro_domain = "Bonus SAP-C02 : Solutions Architect Professional"
    return extract_questions_from_section(
        section,
        {},
        pro_domain,
        "professional",
        "Chapitre 37 — Guide d'examen Solutions Architect Professional",
        "AWS SAP-C02 — Guide chapitre 37 (bonus)",
        id_prefix="pro_",
    )


def validate_labs(labs):
    bad = [l["id"] for l in labs if l["content"].count("```") % 2 != 0]
    if bad:
        raise ValueError(f"{len(bad)} labs have unclosed code blocks: {bad[:5]}...")


def build_dataset(preferred_language):
    lang, fr_count, total = get_build_language(preferred_language)
    label = "French preferred" if preferred_language == "fr" else "English"
    print(f"Build language: {label} ({fr_count}/{total - 1} modules en français)")

    courses, course_fr = parse_courses(preferred_language)
    labs = extract_labs(preferred_language)
    associate = extract_associate_questions(preferred_language)
    professional = extract_professional_questions(preferred_language)
    questions = associate + professional

    validate_labs(labs)

    meta = {
        "language": lang,
        "preferredLanguage": preferred_language,
        "frenchModules": course_fr,
        "totalModules": len(courses),
        "associateQuestions": len(associate),
        "professionalQuestions": len(professional),
        "generatedFromEn": SOURCE_DIR_EN,
        "generatedFromFr": SOURCE_DIR_FR,
    }

    localized_dir = os.path.join(TARGET_DIR, preferred_language)
    os.makedirs(localized_dir, exist_ok=True)

    with open(os.path.join(localized_dir, "coursesData.json"), "w", encoding="utf-8") as f:
        json.dump(courses, f, ensure_ascii=False, indent=2)

    with open(os.path.join(localized_dir, "labsData.json"), "w", encoding="utf-8") as f:
        json.dump(labs, f, ensure_ascii=False, indent=2)

    with open(os.path.join(localized_dir, "examQuestions.json"), "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    with open(os.path.join(localized_dir, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"Courses: {len(courses)}")
    print(f"Labs: {len(labs)}")
    print(f"Associate questions: {len(associate)}")
    print(f"Professional questions (bonus): {len(professional)}")
    print(f"Saved to {localized_dir}")
    return courses, labs, questions, meta


def write_legacy_dataset(courses, labs, questions, meta):
    """Keep the original import paths available for older code."""
    with open(os.path.join(TARGET_DIR, "coursesData.json"), "w", encoding="utf-8") as f:
        json.dump(courses, f, ensure_ascii=False, indent=2)

    with open(os.path.join(TARGET_DIR, "labsData.json"), "w", encoding="utf-8") as f:
        json.dump(labs, f, ensure_ascii=False, indent=2)

    with open(os.path.join(TARGET_DIR, "examQuestions.json"), "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    with open(os.path.join(TARGET_DIR, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)


def main():
    os.makedirs(TARGET_DIR, exist_ok=True)
    fr_courses, fr_labs, fr_questions, fr_meta = build_dataset("fr")
    build_dataset("en")
    write_legacy_dataset(fr_courses, fr_labs, fr_questions, fr_meta)


if __name__ == "__main__":
    main()
