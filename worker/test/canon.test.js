// Run: cd worker && npm test   (Node 18+; no dependencies)
// Uses the private bible pack when it is checked out next to this repo
// (LILA_BIBLE_PACK or ../../lila-spark-bible-clone/data/bible-pack.json); otherwise a tiny fixture.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildSongs,
  chicagoToday,
  matchSongs,
  releasesBlock,
  releaseStatus,
  retrieve,
  stripAce,
  CANON_CAP,
} from "../src/canon.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const packPath =
  process.env.LILA_BIBLE_PACK || path.resolve(here, "../../../lila-spark-bible-clone/data/bible-pack.json");

const FIXTURE = {
  files: [
    { name: "00_Song_Index.md", text: "# Song Index\nHeat Signature single October 23 lyrics index" },
    {
      name: "03_Afterglow_Lyrics.md",
      text:
        "# Afterglow\n\n## Track 8: No Apologies (upcoming single — November 13, 2026)\n\n    Empowering pop-rock\n    BPM: 106\n    ACE Step 1.5 Prompt:\n    Young adult female singer ONLY — secret prompt words\n\n    Lyrics:\n    [Verse 1]\n    I used to say sorry for taking up the space\n    [Chorus]\n    No apologies, this is who I am\n    No apologies — not tonight\n    [Verse 2]\n    They told me pretty girls should keep their voices soft\n\n## Track 10: Let Me Begin (released September 4, 2026)\n\n    ACE Step 1.5 Prompt:\n    secret prompt words\n\n    Lyrics:\n    [Chorus]\n    I can love you better — just let me begin\n",
    },
    { name: "04_Personality_Backstory.md", text: "# Personality\nBorn in Chicago." },
    { name: "08_Apple_Music_Lyrics_Guidelines.md", text: "# Apple Music Lyrics Guidelines\nlyrics lyrics" },
    {
      name: "12_Heat_Signature.md",
      text:
        "# Lila Spark — Heat Signature\n\n## Description\nDance pop.\n**Key:** F♯ minor\n\n**ACE Step 1.5 Prompt:**  \nYoung adult female singer ONLY — secret prompt words\n\n**Lyrics:**\n\n[Verse 1]  \nI come in and the air goes warm  \n\n[Chorus]  \nHeat signature, you can see me in the dark  \nHeat signature, baby follow that spark  \n\n[Verse 2]  \nI don't have to say it loud  \n",
    },
  ],
};

const realPack = existsSync(packPath) ? JSON.parse(readFileSync(packPath, "utf8")) : null;
const packs = realPack ? { fixture: FIXTURE, real: realPack } : { fixture: FIXTURE };

test("chicagoToday uses America/Chicago, not UTC", () => {
  // 2026-10-06 03:30 UTC is still Oct 5 in Chicago (CDT, UTC-5)
  assert.equal(chicagoToday(new Date("2026-10-06T03:30:00Z")), "2026-10-05");
  assert.equal(chicagoToday(new Date("2026-10-06T05:30:00Z")), "2026-10-06");
});

test("release status flips on the release day", () => {
  const s1 = releaseStatus("2026-10-22");
  assert.equal(s1.find((r) => r.title === "Heat Signature").out, false);
  assert.equal(s1.find((r) => r.title === "Let Me Begin").out, true);
  const s2 = releaseStatus("2026-10-23");
  assert.equal(s2.find((r) => r.title === "Heat Signature").out, true);
  assert.equal(s2.find((r) => r.title === "No Apologies").out, false);
});

test("releases block: today, statuses, next up, pre-save once", () => {
  const b = releasesBlock("2026-10-05", []);
  assert.match(b, /Today is Monday, October 5, 2026/);
  assert.match(b, /Let Me Begin .*OUT NOW/);
  assert.match(b, /Heat Signature .*UPCOMING, comes out October 23, 2026 \(in 18 days\).*991061428356/);
  assert.match(b, /No Apologies .*clean.*UPCOMING.*991061432100/);
  assert.match(b, /What's next: Heat Signature \(October 23, 2026\), then No Apologies/);
  assert.doesNotMatch(b, /already shared/);
  const again = releasesBlock("2026-10-05", [
    { role: "assistant", content: "pre-save it here https://release.landr.com/991061428356" },
  ]);
  assert.match(again, /already shared the pre-save link for Heat Signature/);
  const later = releasesBlock("2026-11-20", []);
  assert.match(later, /nothing new is announced/);
  assert.doesNotMatch(later, /UPCOMING, comes out/);
});

test("stripAce removes prompts but keeps lyrics and the ACE-Step tools note", () => {
  const out = stripAce(
    "**ACE Step 1.5 Prompt:**  \nYoung adult female singer ONLY\n\n**Lyrics:**\n[Verse 1]\nline one\nwritten with **ACE-Step 1.5** as the core tool"
  );
  assert.doesNotMatch(out, /Young adult female singer/);
  assert.match(out, /line one/);
  assert.match(out, /ACE-Step 1\.5\*\* as the core tool/);
});

for (const [label, pack] of Object.entries(packs)) {
  test(`[${label}] no ACE prompt text ever reaches the model`, () => {
    for (const q of ["lyrics to heat signature", "sing me no apologies", "when does heat signature come out", "let me begin lyrics", "hi"]) {
      const c = retrieve(pack, q, { today: "2026-10-05" });
      assert.doesNotMatch(c, /ACE Step|Young adult female singer ONLY/i, q);
      assert.ok(c.length <= CANON_CAP);
    }
  });

  test(`[${label}] 08 Apple guidelines never included`, () => {
    const c = retrieve(pack, "lyrics please, apple music lyrics guidelines", { today: "2026-10-05" });
    assert.doesNotMatch(c, /^### 08_|Apple Music Lyrics Submission Guidelines/m);
  });

  test(`[${label}] upcoming songs are reduced to the hook before release, full after`, () => {
    const before = retrieve(pack, "sing me the lyrics to heat signature", { today: "2026-10-05" });
    assert.match(before, /Heat signature, you can see me in the dark/);
    assert.doesNotMatch(before, /I come in and the air goes warm/);
    assert.match(before, /full lyrics stay private until release day, October 23, 2026/);
    const after = retrieve(pack, "sing me the lyrics to heat signature", { today: "2026-10-23" });
    assert.match(after, /I come in and the air goes warm/);

    const na = retrieve(pack, "no apologies lyrics", { today: "2026-10-05" });
    assert.match(na, /No apologies, this is who I am/);
    assert.doesNotMatch(na, /I used to say sorry for taking up the space/);
    const naAfter = retrieve(pack, "no apologies lyrics", { today: "2026-11-13" });
    assert.match(naAfter, /I used to say sorry for taking up the space/);
  });

  test(`[${label}] released song lyrics come through in full`, () => {
    const c = retrieve(pack, "what are the lyrics to let me begin", { today: "2026-10-05" });
    assert.match(c, /I can love you better — just let me begin/);
  });

  test(`[${label}] lyric follow-up uses the song from earlier in the chat`, () => {
    const c = retrieve(pack, "sing me the chorus", {
      today: "2026-10-05",
      priorUserTexts: ["i love let me begin so much"],
    });
    assert.match(c, /just let me begin/);
  });
}

if (realPack) {
  test("[real] every song is found and the new titles match", () => {
    const songs = buildSongs(realPack);
    assert.ok(songs.length >= 50, `only ${songs.length} songs`);
    const titles = songs.map((s) => s.title);
    for (const t of ["Heat Signature", "Almost Here", "Tiny Hints", "Can’t Keep Up", "The Last Time Through the Door", "Heart on a String", "Midnight Voltage", "My Favorite Word"]) {
      assert.ok(titles.includes(t), `missing ${t}`);
    }
    const pick = (q) => matchSongs(q, songs).map((s) => s.title);
    assert.deepEqual(pick("lyrics for almost here"), ["Almost Here"]);
    assert.deepEqual(pick("sing tiny hints"), ["Tiny Hints"]);
    assert.deepEqual(pick("cant keep up lyrics"), ["Can’t Keep Up"]);
    assert.deepEqual(pick("the sammich song"), ["Just Wanna Make You a Sammich"]);
    assert.deepEqual(pick("lights go low chorus"), ["Sweet Shock (Lights Go Low)"]);
    assert.deepEqual(pick("i almost forgot to say hi"), []);
    assert.deepEqual(pick("sing me almost"), ["Almost"]);
  });

  test("[real] lyric requests are small now (one song, not three albums)", () => {
    const c = retrieve(realPack, "lyrics to midnight voltage", { today: "2026-10-05" });
    assert.match(c, /Midnight voltage, running through my body/);
    assert.deepEqual([...c.matchAll(/^### (.+)$/gm)].map((m) => m[1]).filter((h) => /\(\d\d_.*\.md\)$/.test(h)), ["Midnight Voltage (02_Sparked_Lyrics.md)"]);
    assert.doesNotMatch(c, /Track 2: Electric Crush/);
    assert.ok(c.length < 30000, `canon is ${c.length} chars`);
  });

  test("[real] almost here and tiny hints lyrics reach the model", () => {
    assert.match(retrieve(realPack, "lyrics for almost here", { today: "2026-10-05" }), /You were almost here/);
    assert.match(retrieve(realPack, "tiny hints lyrics", { today: "2026-10-05" }), /### Tiny Hints/);
  });
}
