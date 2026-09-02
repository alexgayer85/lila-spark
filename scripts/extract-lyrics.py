#!/usr/bin/env python3
"""Pull singable lines from bible markdown into data/lyrics/{slug}.json."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIBLE = Path("/home/alex/lila-spark-bible/bible")
if not (BIBLE / "01_Truly_Me_Lyrics.md").exists():
    BIBLE = ROOT / "bible"
OUT = ROOT / "data" / "lyrics"

SKIP_HEAD = re.compile(
    r"^(#|\*\*(Official|Notes|Era|Description|Full Structure|Duration|BPM|"
    r"Time Signature|Key|Style|ACE|Saved)|http|Track \d|"
    r"(Full Structure Order|Duration|BPM|Time Signature|Key|Style|ACE Step|"
    r"ACE STEP|Lyrics|Vibe)\s*:|"
    r"Young adult female singer)",
    re.I,
)
SECTION = re.compile(r"^\[([^\]]+)\]\s*$", re.M)
DURATION = re.compile(r"(?:\*\*)?Duration(?:\*\*)?:\s*(\d+)", re.I)
META_LINE = re.compile(
    r"^(Upbeat |Emotional |Sultry |Empowering |Sensual |Atmospheric |Mid-tempo |"
    r"Dark, |Cheeky, |Sexy |Frustrated |Warm |Playful |Intimate |Building |"
    r"Catchy |Smooth |Defiant |Lively |Heartfelt |Concise |Dance-pop |"
    r"Full Structure)",
    re.I,
)


def slugify(title: str) -> str:
    t = title.lower().replace("’", "'").replace("can't", "cant")
    t = re.sub(r"[()]", " ", t)
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t


def parse_file(path: Path) -> dict[str, dict]:
    text = path.read_text(encoding="utf-8")
    chunks = re.split(r"\n## ", text)
    found = {}
    for chunk in chunks[1:]:
        header, _, body = chunk.partition("\n")
        title = re.sub(r"^Track \d+:\s*", "", header).strip()
        title = re.sub(r"\s*\(upcoming.*$", "", title, flags=re.I)
        title = re.sub(r"\s*\(Not produced.*$", "", title, flags=re.I)
        title = re.sub(r"\s*\(AceMusic.*$", "", title, flags=re.I)
        dur = None
        m = DURATION.search(body)
        if m:
            dur = int(m.group(1))
        for marker in ("**Lyrics:**", "Lyrics:", "    Lyrics:"):
            lyric_start = body.find(marker)
            if lyric_start >= 0:
                body = body[lyric_start + len(marker) :]
                break
        else:
            first_sec = SECTION.search(body)
            if first_sec:
                body = body[first_sec.start() :]
        lines = []
        section = ""
        in_ace = False
        for raw in body.splitlines():
            line = raw.strip()
            if not line:
                continue
            if line.startswith("**ACE") or line.startswith("ACE Step") or line.startswith("ACE STEP"):
                in_ace = True
                continue
            if in_ace:
                if SECTION.match(line) or line.startswith("---") or line.startswith("Lyrics"):
                    in_ace = False
                else:
                    continue
            if line.startswith("---"):
                break
            if (SKIP_HEAD.match(line) or META_LINE.match(line)) and not SECTION.match(line):
                continue
            if len(line) > 220:
                continue
            sm = SECTION.match(line)
            if sm:
                section = sm.group(1)
                continue
            if line.startswith("(") and line.endswith(")"):
                continue
            if line.startswith("**"):
                continue
            lines.append({"text": line, "section": section})
        if not lines:
            continue
        rec = {
            "title": title,
            "durationHint": dur,
            "timed": False,
            "lines": lines,
        }
        slug = slugify(title)
        found[slug] = rec
        if "lights go low" in title.lower():
            found["lights-go-low"] = rec
            found["sweet-shock-lights-go-low"] = rec
        if "stop the hurt" in title.lower() and "reprise" in title.lower():
            found["stop-the-hurt-reprise"] = rec
    return found


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    all_tracks = {}
    for name in (
        "01_Truly_Me_Lyrics.md",
        "02_Sparked_Lyrics.md",
        "03_Afterglow_Lyrics.md",
        "09_New_Songs_Last_Time_and_Cant_Keep_Up.md",
    ):
        all_tracks.update(parse_file(BIBLE / name))
    # Aliases used by the site player
    aliases = {
        "sweet-shock-lights-go-low": "sweet-shock-lights-go-low",
        "lights-go-low": "sweet-shock-lights-go-low",
        "cant-keep-up": "cant-keep-up",
        "can-t-keep-up": "cant-keep-up",
    }
    if "sweet-shock-lights-go-low" in all_tracks:
        all_tracks["lights-go-low"] = all_tracks["sweet-shock-lights-go-low"]
    for slug, data in all_tracks.items():
        (OUT / f"{slug}.json").write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
    print(f"wrote {len(all_tracks)} lyric files to {OUT}")


if __name__ == "__main__":
    main()
