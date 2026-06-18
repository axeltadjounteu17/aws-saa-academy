#!/usr/bin/env python3
"""Translate AWS study markdown (EN → FR) while preserving code blocks and structure."""

import hashlib
import json
import os
import re
import time

from deep_translator import GoogleTranslator

SOURCE_DIR = "/home/axel/Bureau/sante/SAA CO3/aws-solution-architect-study-material-main"
TARGET_DIR = "/home/axel/Bureau/sante/SAA CO3/aws-solution-architect-study-material-fr"
CACHE_FILE = "/home/axel/Bureau/sante/SAA CO3/scratch/.translation_cache.json"
CHUNK_SIZE = 4200
SLEEP_SEC = 0.35

translator = GoogleTranslator(source="en", target="fr")


def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)


def cache_key(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def translate_text(text, cache):
    text = text.strip()
    if not text:
        return text

    key = cache_key(text)
    if key in cache:
        return cache[key]

    chunks = []
    current = ""
    for paragraph in text.split("\n\n"):
        block = paragraph if not current else current + "\n\n" + paragraph
        if len(block) > CHUNK_SIZE and current:
            chunks.append(current)
            current = paragraph
        elif len(block) > CHUNK_SIZE:
            for i in range(0, len(paragraph), CHUNK_SIZE):
                chunks.append(paragraph[i : i + CHUNK_SIZE])
            current = ""
        else:
            current = block
    if current:
        chunks.append(current)

    translated_parts = []
    for chunk in chunks:
        if not chunk.strip():
            continue
        try:
            translated_parts.append(translator.translate(chunk))
        except Exception as exc:
            print(f"  ! retry after error: {exc}")
            time.sleep(2)
            translated_parts.append(translator.translate(chunk))
        time.sleep(SLEEP_SEC)

    result = "\n\n".join(translated_parts)
    cache[key] = result
    return result


def split_markdown_segments(content):
    segments = []
    lines = content.split("\n")
    buf = []
    in_code = False

    for line in lines:
        if line.strip().startswith("```"):
            if in_code:
                buf.append(line)
                segments.append(("code", "\n".join(buf)))
                buf = []
                in_code = False
            else:
                if buf:
                    segments.append(("text", "\n".join(buf)))
                    buf = []
                in_code = True
                buf = [line]
        else:
            buf.append(line)

    if buf:
        segments.append(("code" if in_code else "text", "\n".join(buf)))

    return segments


def translate_markdown(content, cache):
    parts = []
    for kind, segment in split_markdown_segments(content):
        if kind == "code":
            parts.append(segment)
        else:
            parts.append(translate_text(segment, cache))
    return "\n".join(parts)


def translate_file(filename, cache):
    src = os.path.join(SOURCE_DIR, filename)
    dst = os.path.join(TARGET_DIR, filename)

    with open(src, "r", encoding="utf-8") as f:
        content = f.read()

        print(f"  → {filename} ({len(content):,} chars)", flush=True)
    translated = translate_markdown(content, cache)

    os.makedirs(TARGET_DIR, exist_ok=True)
    with open(dst, "w", encoding="utf-8") as f:
        f.write(translated)

    save_cache(cache)
    return dst


def main():
    files = sorted(f for f in os.listdir(SOURCE_DIR) if f.endswith(".md"))
    cache = load_cache()

    print(f"Traduction EN → FR : {len(files)} fichiers")
    print(f"Source : {SOURCE_DIR}")
    print(f"Cible  : {TARGET_DIR}\n")

    for idx, filename in enumerate(files, 1):
        print(f"[{idx}/{len(files)}] {filename}", flush=True)
        translate_file(filename, cache)

    print(f"\nTerminé. {len(files)} fichiers traduits dans {TARGET_DIR}")

    print("\n=== Régénération des données de l'application ===")
    import subprocess
    subprocess.run(["python3", os.path.join(os.path.dirname(__file__), "build_academy_data.py")], check=True)


if __name__ == "__main__":
    main()
