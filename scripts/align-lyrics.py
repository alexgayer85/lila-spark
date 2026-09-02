#!/usr/bin/env python3
"""Align catalog lyric lines to an mp3 using Whisper word timestamps."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "audio"
LYRICS = ROOT / "data" / "lyrics"
CATALOG = ROOT / "data" / "catalog.json"

WORD_RE = re.compile(r"[a-z0-9]+")


def norm_words(text: str) -> list[str]:
    return WORD_RE.findall(text.lower().replace("'", "").replace("’", ""))


def find_span(words: list[dict], start: int, target: list[str]) -> tuple[int, int] | None:
    if not target or start >= len(words):
        return None
    needle = target[: min(6, len(target))]
    limit = len(words)
    for i in range(start, limit):
        ok = True
        for j, tw in enumerate(needle):
            if i + j >= limit:
                ok = False
                break
            ww = words[i + j]["w"]
            if ww != tw and not ww.startswith(tw[:3]) and not tw.startswith(ww[:3]):
                if abs(len(ww) - len(tw)) > 2 or (ww[:2] != tw[:2] if len(tw) > 2 else ww != tw):
                    ok = False
                    break
        if not ok:
            continue
        end = min(limit, i + max(len(target), len(needle)))
        return i, end
    return None


def align_track(model, slug: str, title: str) -> dict:
    audio = AUDIO / f"{slug}.mp3"
    lyric_path = LYRICS / f"{slug}.json"
    data = json.loads(lyric_path.read_text(encoding="utf-8"))
    lines = data.get("lines") or []
    if not audio.is_file() or not lines:
        print(f"skip {slug}: missing audio or lyrics")
        return data

    result = model.transcribe(
        str(audio),
        language="en",
        word_timestamps=True,
        verbose=False,
        condition_on_previous_text=False,
        initial_prompt=title + ". " + " ".join(l.get("text") or "" for l in lines[:8]),
    )
    words = []
    for seg in result.get("segments") or []:
        for w in seg.get("words") or []:
            tok = norm_words(w.get("word") or "")
            if not tok:
                continue
            words.append({"w": tok[0], "t": float(w.get("start") or 0)})

    cursor = 0
    hit = 0
    for line in lines:
        target = norm_words(line.get("text") or "")
        if not target:
            continue
        span = find_span(words, cursor, target)
        if not span:
            span = find_span(words, 0, target)
        if not span:
            line.pop("t", None)
            continue
        i, end = span
        line["t"] = round(words[i]["t"], 2)
        cursor = max(cursor, i + 1)
        hit += 1

    data["timed"] = hit > 0
    data["title"] = data.get("title") or title
    lyric_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{slug}: timed {hit}/{len(lines)} lines  ({len(words)} whisper words)")
    return data


def main() -> None:
    album_id = sys.argv[1] if len(sys.argv) > 1 else "truly-me"
    only = sys.argv[2:]
    cat = json.loads(CATALOG.read_text(encoding="utf-8"))
    album = next(a for a in cat["albums"] if a["id"] == album_id)
    tracks = album["tracks"]
    if only:
        tracks = [t for t in tracks if t["id"] in only]
    import whisper

    model = whisper.load_model("small")
    for t in tracks:
        slug = t.get("lyrics") or t["id"]
        if t.get("lyrics") is False:
            print(f"skip {t['id']}: no locked lyrics")
            continue
        align_track(model, slug, t["title"])


if __name__ == "__main__":
    main()
