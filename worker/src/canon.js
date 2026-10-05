// Canon helpers for the Lila chat worker: release dates, ACE-prompt cleanup,
// and per-song lyric retrieval from the bible pack. Pure functions (no Worker
// globals) so they can be tested with plain Node.

export const TIME_ZONE = "America/Chicago";

// Locked release list. Status ("out now" vs "upcoming") is computed from today's
// date in America/Chicago, so nothing here needs editing when a date passes.
export const RELEASES = [
  {
    title: "Let Me Begin",
    date: "2026-09-04",
    note: "Afterglow single",
    link: "https://release.landr.com/991048797192",
  },
  {
    title: "Heat Signature",
    date: "2026-10-23",
    note: "single, dance-pop",
    link: "https://release.landr.com/991061428356",
  },
  {
    title: "No Apologies",
    date: "2026-11-13",
    note: "Afterglow track 8, single, clean",
    link: "https://release.landr.com/991061432100",
  },
];

/** Today's date in America/Chicago as YYYY-MM-DD. */
export function chicagoToday(now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (t) => parts.find((p) => p.type === t).value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return new Date(now.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  }
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ymdParts(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return { y, m, d };
}

export function longDate(ymd, withWeekday = false) {
  const { y, m, d } = ymdParts(ymd);
  const base = `${MONTHS[m - 1]} ${d}, ${y}`;
  if (!withWeekday) return base;
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${base}`;
}

export function daysBetween(fromYmd, toYmd) {
  const a = ymdParts(fromYmd);
  const b = ymdParts(toYmd);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

/** Releases with a computed status for the given day. */
export function releaseStatus(today) {
  return RELEASES.map((r) => ({ ...r, out: today >= r.date, daysUntil: daysBetween(today, r.date) }));
}

function normTitle(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[’‘`']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function upcomingRelease(title, today) {
  const key = normTitle(title);
  return releaseStatus(today).find((r) => !r.out && normTitle(r.title) === key) || null;
}

/** RELEASES + date block for the system prompt. `history` is the chat so far. */
export function releasesBlock(today, history) {
  const said = (history || [])
    .filter((m) => m && m.role === "assistant")
    .map((m) => String(m.content || ""))
    .join("\n");
  const rows = releaseStatus(today);
  const lines = rows.map((r) => {
    if (r.out) {
      return `- ${r.title} (${r.note}) — OUT NOW, released ${longDate(r.date)}. listen link: ${r.link}`;
    }
    const when = r.daysUntil === 1 ? "tomorrow" : `in ${r.daysUntil} days`;
    return `- ${r.title} (${r.note}) — UPCOMING, comes out ${longDate(r.date)} (${when}). pre-save link: ${r.link}`;
  });
  const upcoming = rows.filter((r) => !r.out);
  const next = upcoming.length
    ? `What's next: ${upcoming.map((r) => `${r.title} (${longDate(r.date)})`).join(", then ")}.`
    : "What's next: nothing new is announced right now.";
  const shared = upcoming.filter((r) => said.includes(r.link));
  const sharedNote = shared.length
    ? `\nYou already shared the pre-save link for ${shared.map((r) => r.title).join(" and ")} in this chat. don't post it again unless they ask for it.`
    : "";
  return `Today is ${longDate(today, true)} (Chicago time).

RELEASES (status computed from today's date; this overrides any "upcoming" or "released" wording in the canon files):
${lines.join("\n")}
${next}
Somehow is already out as a single. Never invent another upcoming single, album, or street date beyond this list. If they ask what's next and nothing is upcoming, say nothing new is announced yet — you're always writing, but no title or date.

UPCOMING songs (rule): before a song's release day, quote at most one line or the hook — never full verses or the full lyrics, even if they beg. tease that the rest drops on release day.
PRE-SAVE links (rule): only when it's relevant (they ask what's next or about that song, or how to listen or save it), share that song's pre-save link once per chat as a plain URL — no markdown, no brackets. never drop links into unrelated chat. for OUT NOW songs you may share the listen link when they ask where to listen.${sharedNote}`;
}

const ACE_START = /ACE\s*STEP[^\n]*PROMPT|AceMusic link/i;
const ACE_STOP = /^\s*(\*\*)?Lyrics:?|^\s*\[(Intro|Verse|Chorus|Pre-Chorus|Bridge|Outro|Final|Hook|Refrain)|^\s*#{1,6}\s|^\s*\*\*[A-Za-z]/i;

/** Remove ACE-Step production prompts (and AceMusic links) from any bible text. */
export function stripAce(text) {
  const out = [];
  let skip = false;
  for (const line of String(text || "").split("\n")) {
    if (ACE_START.test(line)) {
      skip = true;
      continue;
    }
    if (skip) {
      if (ACE_STOP.test(line)) skip = false;
      else continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

const META_LINE = /^\s*(Duration|BPM|Time Signature|Key|Full Structure Order)\b/i;

/** Lyric chunks: no ACE prompts, no generation settings lines. */
export function cleanLyrics(text) {
  return stripAce(text)
    .split("\n")
    .filter((line) => !META_LINE.test(line))
    .join("\n");
}

const LYRIC_INTENT =
  /lyric|verse|chorus|bridge|hook|words to|\bsing\b|\bsang\b|\bquote\b|unreleased|unproduced|what does .+ say/i;

export function wantsLyrics(userText) {
  return LYRIC_INTENT.test(String(userText || ""));
}

const EXTRA_ALIASES = {
  "just wanna make you a sammich": ["sammich", "sandwich song", "sammich song"],
  "the last time through the door": ["last time through the door", "last time through"],
};
// One-word titles that are also everyday words: only match with lyric intent or "song"/"track".
const AMBIGUOUS = new Set(["almost", "golden", "somehow"]);

function songTitleFromHeading(heading) {
  let t = heading.replace(/^#+\s*/, "").replace(/^Track\s+\d+\s*:\s*/i, "").trim();
  t = t.replace(/\s*\(([^)]*)\)/g, (m, inner) =>
    /upcoming|released|not produced|single|demo/i.test(inner) ? "" : m
  );
  return t.trim();
}

function aliasesFor(title) {
  const base = normTitle(title);
  const set = new Set([base]);
  const paren = title.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (paren && !/reprise/i.test(paren[2])) {
    set.add(normTitle(paren[1]));
    set.add(normTitle(paren[2]));
  }
  (EXTRA_ALIASES[base] || []).forEach((a) => set.add(a));
  return [...set].filter(Boolean);
}

function isSongFile(name) {
  return (/Lyrics/i.test(name) && !/^08_/.test(name)) || /^09_/.test(name);
}

/** Split the pack into one chunk per song (era files, 09, and single-song files 10+). */
export function buildSongs(pack) {
  const songs = [];
  const files = (pack && pack.files) || [];
  for (const f of files) {
    const name = String(f.name || "");
    const text = String(f.text || "");
    if (/^0[0-8]_/.test(name) && !isSongFile(name)) continue;
    if (isSongFile(name)) {
      const headingRe = /^\d{2}_.*Lyrics/i.test(name) ? /^## Track\s+\d+\s*:.*$/gm : /^## .*$/gm;
      const marks = [...text.matchAll(headingRe)];
      marks.forEach((m, i) => {
        const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
        const title = songTitleFromHeading(m[0]);
        songs.push({ file: name, title, aliases: aliasesFor(title), text: text.slice(m.index, end).trim() });
      });
    } else if (/^\s*(\*\*)?Lyrics:?/im.test(text)) {
      const h = text.match(/^#\s+(?:Lila Spark\s*[—–-]\s*)?(.+)$/m);
      if (!h) continue;
      const title = songTitleFromHeading(h[1]);
      songs.push({ file: name, title, aliases: aliasesFor(title), text: text.trim() });
    }
  }
  return songs;
}

/** Songs whose title (or alias) appears in the text. Longest match wins on overlap. */
export function matchSongs(text, songs) {
  const q = ` ${normTitle(text)} `;
  const loose = wantsLyrics(text) || /\b(song|track|single)\b/i.test(String(text || ""));
  const hits = [];
  for (const s of songs) {
    const alias = s.aliases
      .filter((a) => q.includes(` ${a} `) && (loose || !AMBIGUOUS.has(a)))
      .sort((a, b) => b.length - a.length)[0];
    if (alias) hits.push({ song: s, alias });
  }
  return hits
    .filter((h) => !hits.some((o) => o !== h && o.alias.length > h.alias.length && o.alias.includes(h.alias)))
    .map((h) => h.song);
}

/** For a not-yet-released song: keep the description and the hook (first chorus) only. */
export function holdBack(text, release) {
  const lines = cleanLyrics(text).split("\n");
  const firstTag = lines.findIndex((l) => /^\s*\[/.test(l));
  const head = (firstTag < 0 ? lines : lines.slice(0, firstTag)).filter(
    (l) => !/^\s*(\*\*)?Lyrics:?\s*(\*\*)?\s*$/i.test(l)
  );
  const hook = [];
  const c = lines.findIndex((l) => /^\s*\[(Chorus|Hook)/i.test(l));
  if (c >= 0) {
    for (let i = c; i < lines.length; i += 1) {
      if (i > c && /^\s*\[/.test(lines[i])) break;
      hook.push(lines[i]);
    }
  }
  return `${head.join("\n").trim()}\n\nHOOK (the only lyric you may quote before release — one line or this hook, never more):\n${hook
    .join("\n")
    .trim()}\n\n(full lyrics stay private until release day, ${longDate(release.date)}.)`;
}

function tokens(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreChunk(query, text) {
  const q = tokens(query);
  const hay = new Set(tokens(text));
  let n = 0;
  q.forEach((w) => {
    if (hay.has(w)) n += 1;
  });
  return n;
}

export const CANON_CAP = 90000;
const MAX_SONGS = 4;

/**
 * Build the canon text for one turn.
 * - persona files 04–07 always
 * - only the songs named in this message (or, for a lyric follow-up, in the last few messages)
 * - upcoming releases are reduced to their hook
 * - 08 (Apple guidelines) never; ACE prompts stripped everywhere
 */
export function retrieve(pack, userText, opts = {}) {
  const today = opts.today || chicagoToday();
  const prior = opts.priorUserTexts || [];
  const files = (pack && pack.files) || [];
  const songs = buildSongs(pack);
  const songFiles = new Set(songs.map((s) => s.file));
  const lyricAsk = wantsLyrics(userText);

  let picked = matchSongs(userText, songs);
  if (!picked.length && lyricAsk) {
    for (const t of prior) {
      picked = matchSongs(t, songs);
      if (picked.length) break;
    }
  }
  picked = picked.slice(0, MAX_SONGS);

  const parts = [];
  const life = files.filter((f) => /^0[4567]_/.test(f.name));
  life.forEach((f) => parts.push(`### ${f.name}\n${stripAce(f.text)}`));

  picked.forEach((s) => {
    const rel = upcomingRelease(s.title, today);
    const body = rel ? holdBack(s.text, rel) : cleanLyrics(s.text);
    parts.push(`### ${s.title} (${s.file})\n${body}`);
  });

  const rest = files.filter(
    (f) => !life.includes(f) && !songFiles.has(f.name) && !/^08_/.test(f.name)
  );
  let extra = rest
    .map((f) => ({ f, score: scoreChunk(userText, f.text || "") }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 1)
    .map((x) => x.f);
  if (lyricAsk && !picked.length) {
    const index = files.find((f) => /^00_/.test(f.name));
    if (index && !extra.includes(index)) extra = [index].concat(extra).slice(0, 1);
    parts.push(
      "### lyric note\nNo song lyrics are loaded for this message. If they want lyrics, ask which song (titles are in the index) — never invent verses."
    );
  }
  extra.forEach((f) => parts.push(`### ${f.name}\n${stripAce(f.text)}`));

  return parts.join("\n\n").slice(0, CANON_CAP);
}
