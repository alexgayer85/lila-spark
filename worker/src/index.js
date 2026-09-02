const ALLOWED = new Set([
  "https://lila-spark.com",
  "https://www.lila-spark.com",
  "https://chat.lila-spark.com",
  "https://alexgayer85.github.io",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
]);

const MODELS = ["grok-4.20-0309-non-reasoning", "grok-4.3"];

const LOG_VIEWER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Lila chat logs</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --bg:#0a0a0f; --ink:#f4f0ff; --muted:#a39bb8; --line:rgba(255,255,255,.08); --magenta:#ff2d95; --violet:#9b5cff; --cyan:#2de2ff; }
    * { box-sizing: border-box; }
    body { margin:0; font-family:Outfit,system-ui,sans-serif; background:var(--bg); color:var(--ink); min-height:100vh; }
    main { width:min(100% - 1.6rem, 42rem); margin:1.25rem auto 3rem; }
    h1 { font-size:1.35rem; margin:0 0 .35rem; }
    .sub { color:var(--muted); margin:0 0 1.25rem; font-size:.92rem; }
    form { display:flex; gap:.5rem; margin-bottom:1.25rem; }
    input { flex:1; min-width:0; border:1px solid var(--line); background:#12121a; color:var(--ink); border-radius:12px; padding:.7rem .85rem; font:inherit; }
    button { border:0; border-radius:999px; background:linear-gradient(120deg,var(--magenta),var(--violet)); color:#fff; font:inherit; font-weight:600; padding:.7rem 1.1rem; cursor:pointer; }
    .meta { color:var(--muted); font-size:.82rem; margin:0 0 1rem; }
    .err { color:#ff8fb7; margin:0 0 1rem; }
    article { border:1px solid var(--line); background:rgba(18,18,28,.75); border-radius:16px; padding:.9rem 1rem; margin:0 0 .75rem; }
    time { display:block; color:var(--muted); font-size:.75rem; margin-bottom:.35rem; }
    .via { display:inline-block; font-size:.68rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin:0 0 .55rem; padding:.15rem .5rem; border-radius:999px; border:1px solid var(--line); color:var(--muted); }
    .via-grok { color:var(--cyan); border-color:rgba(45,226,255,.35); }
    .via-backup { color:#ffb86b; border-color:rgba(255,184,107,.35); }
    .via-cap, .via-rate, .via-error { color:var(--magenta); border-color:rgba(255,45,149,.35); }
    .who { font-size:.72rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin:0 0 .2rem; }
    .fan { color:var(--magenta); }
    .lila { color:var(--cyan); }
    .why { color:#ff8fb7; font-size:.8rem; margin:.55rem 0 0; }
    p { margin:0 0 .65rem; white-space:pre-wrap; line-height:1.45; font-size:.95rem; }
    p:last-child { margin-bottom:0; }
  </style>
</head>
<body>
  <main>
    <h1>Lila chat logs</h1>
    <p class="sub">Private. Type the LOG_SECRET password, then open.</p>
    <form id="gate">
      <input id="secret" type="password" autocomplete="current-password" placeholder="Password" />
      <button type="submit">Open</button>
    </form>
    <p class="err" id="err" hidden></p>
    <p class="meta" id="meta" hidden></p>
    <div id="list"></div>
  </main>
  <script>
    const err = document.getElementById("err");
    const meta = document.getElementById("meta");
    const list = document.getElementById("list");
    const input = document.getElementById("secret");
    input.value = sessionStorage.getItem("lila-log-secret") || "";

    function showError(msg) {
      err.hidden = false;
      err.textContent = msg;
    }

    function fmt(ts) {
      try {
        return new Date(ts).toLocaleString();
      } catch {
        return ts || "";
      }
    }

    function money(n) {
      return "$" + Number(n || 0).toFixed(2);
    }

    async function load(secret) {
      err.hidden = true;
      list.innerHTML = "";
      const res = await fetch("/logs?n=200", {
        headers: {
          Authorization: "Bearer " + secret,
          Accept: "application/json",
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(res.status === 401 ? "Wrong password." : (data.error || "Could not load logs."));
        return;
      }
      sessionStorage.setItem("lila-log-secret", secret);
      const chats = data.chats || [];
      meta.hidden = false;
      let line = chats.length + " of " + (data.n || chats.length) + " saved turns (newest first).";
      if (data.spent != null) {
        line += " Studio this month: " + money(data.spent) + " of " + money(data.budget) + " (" + money(data.remaining) + " left).";
      }
      meta.textContent = line;
      if (!chats.length) {
        list.innerHTML = "<p class=sub>No chats stored yet. Grok turns, backup-brain fallbacks, and errors all show here.</p>";
        return;
      }
      chats.forEach((row) => {
        const art = document.createElement("article");
        const via = row.via || "grok";
        art.innerHTML =
          "<time></time><p class=via></p><p class=who fan>Fan</p><p class=u></p><p class=who lila>Lila</p><p class=r></p><p class=why hidden></p>";
        const bits = [fmt(row.ts)];
        if (row.ua) bits.push(row.ua);
        if (row.country) bits.push(row.country);
        art.querySelector("time").textContent = bits.join(" · ");
        const viaEl = art.querySelector(".via");
        viaEl.className = "via via-" + via;
        viaEl.textContent =
          via === "grok" ? "Grok" :
          via === "backup" ? "Backup brain — Grok never answered" :
          via === "cap" ? "Studio budget" :
          via === "rate" ? "Rate limit" :
          via === "error" ? "Error" : via;
        art.querySelector(".u").textContent = row.user || "";
        art.querySelector(".r").textContent = row.reply || "";
        if (row.err) {
          const why = art.querySelector(".why");
          why.hidden = false;
          why.textContent = row.err;
        }
        list.appendChild(art);
      });
    }

    document.getElementById("gate").addEventListener("submit", (e) => {
      e.preventDefault();
      load(input.value.trim());
    });
    if (input.value) load(input.value.trim());
  </script>
</body>
</html>`;

function originAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host === "lila-spark.com" || host.endsWith(".lila-spark.com");
  } catch {
    return false;
  }
}

function corsHeaders(origin) {
  const allow = origin && origin !== "null" ? origin : "*";
  const headers = {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Accept-Language",
    "Access-Control-Max-Age": "86400",
  };
  if (allow !== "*") headers.Vary = "Origin";
  return headers;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function packResponse(data, status, origin, callback) {
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return new Response(callback + "(" + JSON.stringify(data) + ")", {
      status: 200,
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "no-store",
        ...corsHeaders(origin),
      },
    });
  }
  return json(data, status, origin);
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

async function loadPack(env) {
  try {
    const log = await chatLogStub(env);
    const stored = await log.fetch("https://chatlog/pack");
    if (stored.ok) {
      const pack = await stored.json();
      if (pack && Array.isArray(pack.files) && pack.files.length) return pack;
    }
  } catch {
    /* fall through */
  }
  return { files: [] };
}

function cleanLyrics(text) {
  const lines = String(text).split("\n");
  const out = [];
  let skipAce = false;
  for (const line of lines) {
    if (/ACE Step/i.test(line) || /AceMusic link/i.test(line)) {
      skipAce = true;
      continue;
    }
    if (skipAce) {
      if (
        /^\s*(\*\*)?Lyrics:?/i.test(line) ||
        /^\s*\[(Intro|Verse|Chorus|Pre-Chorus|Bridge|Outro|Final)/i.test(line) ||
        /^## /.test(line)
      ) {
        skipAce = false;
      } else {
        continue;
      }
    }
    if (/^\s*(Duration|BPM|Time Signature|Key|Full Structure Order|ACE Step)/i.test(line)) continue;
    out.push(line);
  }
  return out.join("\n");
}

function wantsLyrics(userText) {
  const q = String(userText || "").toLowerCase();
  if (
    /lyric|lyrics|verse|chorus|bridge|words to|sing |sang |quote|unreleased|unproduced|what does .+ say/.test(
      q
    )
  )
    return true;
  const titles = [
    "sammich",
    "sandwich",
    "let me begin",
    "somehow",
    "boomerang",
    "layla",
    "can't keep up",
    "cant keep up",
    "tiny hints",
    "favorite word",
    "last time through",
    "stop the hurt",
    "truly me",
    "frequency of you",
    "electric crush",
    "you brought me to life",
    "hold me in the middle",
    "lights go low",
    "sweet shock",
    "brain glitch",
    "golden",
    "soft landing",
    "still standing",
    "own the glow",
    "my favorite word",
    "no apologies",
    "slow burn",
    "dark static",
    "rhythm thief",
  ];
  return titles.some((t) => q.includes(t));
}

function retrieve(pack, userText) {
  const files = (pack && pack.files) || [];
  const lyricish = wantsLyrics(userText)
    ? files.filter((f) => /Lyrics/i.test(f.name) || /^09_/.test(f.name))
    : [];
  const life = files.filter((f) => /0[4567]_/.test(f.name));
  const rest = files.filter(
    (f) =>
      !/Lyrics/i.test(f.name) &&
      !/^09_/.test(f.name) &&
      !life.includes(f) &&
      !/08_Apple/.test(f.name)
  );
  const scored = rest
    .map((f) => ({ f, score: scoreChunk(userText, f.text || "") }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 1)
    .map((x) => x.f);
  const picked = life.concat(lyricish).concat(scored);
  const seen = new Set();
  const parts = [];
  picked.forEach((f) => {
    if (seen.has(f.name)) return;
    seen.add(f.name);
    const raw = String(f.text || "");
    const text = /Lyrics|^09_/.test(f.name) ? cleanLyrics(raw) : raw;
    parts.push("### " + f.name + "\n" + text);
  });
  return parts.join("\n\n").slice(0, 90000);
}


const PET_NAMES = new Set([
  "baby","babe","bae","honey","hon","sweetie","sweetheart","sugar","gorgeous","beautiful","handsome","cutie","cutiepie","love","lover","darling","dear","hun","boo","stud","king","queen","princess","prince","daddy","mommy","mama","papa","angel","star","spark"
]);
const NAME_STOP = new Set([...PET_NAMES, "a","an","the","just","not","really","so","your","you","her","his","their","here","sorry","back","there","good","fine","okay","ok","down","up","in","into","from","girl","guy","man","woman","boy","lady","dude","female","male","fan","person","human","lil","lila"]);
const WOMAN_RE = /\b(?:i(?:['’]?m| am)\s+(?:actually\s+)?(?:a\s+)?(?:woman|girl|female|lady|gal)\b|i(?:['’]?m| am) female\b|(?:my\s+)?pronouns?\s*(?:are|:)?\s*she(?:\s*\/\s*her)?\b|she\s*\/\s*her\b|i use she\b)/i;
const MAN_RE = /\b(?:i(?:['’]?m| am)\s+(?:actually\s+)?(?:a\s+)?(?:man|guy|male|dude|boy)\b|i(?:['’]?m| am) male\b|(?:my\s+)?pronouns?\s*(?:are|:)?\s*he(?:\s*\/\s*him)?\b|he\s*\/\s*him\b|i use he\b)/i;
const ENBY_RE = /\b(?:i(?:['’]?m| am)\s+(?:actually\s+)?(?:non[-\s]?binary|enby|nb)\b|(?:my\s+)?pronouns?\s*(?:are|:)?\s*they(?:\s*\/\s*them)?\b|they\s*\/\s*them\b)/i;
const NAME_RE = /\b(?:my name(?:['’]?s| is)|call me|i go by)\s+([A-Za-z][A-Za-z''-]{1,24})\b/i;

function emptyFan() {
  return { name: "", gender: "unknown", pronouns: "" };
}

function pronounsFor(gender) {
  if (gender === "woman") return "she/her";
  if (gender === "man") return "he/him";
  if (gender === "nonbinary") return "they/them";
  return "";
}

function cleanFanName(raw) {
  const name = String(raw || "").replace(/['’].*$/, "").trim();
  const key = name.toLowerCase();
  if (!name || NAME_STOP.has(key) || key.length < 2) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function extractFromText(text, prior) {
  const fan = Object.assign(emptyFan(), prior || {});
  const t = String(text || "");
  if (!t.trim()) return fan;
  if (ENBY_RE.test(t)) {
    fan.gender = "nonbinary";
    fan.pronouns = "they/them";
  } else if (WOMAN_RE.test(t)) {
    fan.gender = "woman";
    fan.pronouns = "she/her";
  } else if (MAN_RE.test(t)) {
    fan.gender = "man";
    fan.pronouns = "he/him";
  }
  const named = t.match(NAME_RE);
  if (named && named[1]) {
    const next = cleanFanName(named[1]);
    if (next) fan.name = next;
  }
  return fan;
}

function extractFan(history, prior) {
  let fan = Object.assign(emptyFan(), prior || {});
  (history || []).forEach((m) => {
    if (m && m.role === "user") fan = extractFromText(m.content || "", fan);
  });
  if (fan.gender !== "unknown" && !fan.pronouns) fan.pronouns = pronounsFor(fan.gender);
  return fan;
}

function normalizeFan(input) {
  const raw = input && typeof input === "object" ? input : {};
  const gender =
    raw.gender === "woman" || raw.gender === "man" || raw.gender === "nonbinary" || raw.gender === "unknown"
      ? raw.gender
      : "unknown";
  const name = String(raw.name || "").replace(/[^\p{L}\p{M}'’ -]/gu, "").trim().slice(0, 32);
  return { name, gender, pronouns: String(raw.pronouns || pronounsFor(gender)).slice(0, 24) };
}

function fanCard(fan) {
  const who =
    fan.gender === "woman" ? "a woman" :
    fan.gender === "man" ? "a man" :
    fan.gender === "nonbinary" ? "nonbinary" :
    "unknown — do not guess";
  const name = fan.name ? fan.name : "not given yet";
  const pronouns = fan.pronouns || "not given";
  return `FAN CARD (locked for this entire conversation — never contradict, never re-infer)
- name: ${name}
- they are: ${who}
- pronouns: ${pronouns}
- source: they told you, or they set it in the chat. this is FACT.
- pet names they call you (baby, babe, honey, sweetie, gorgeous, love, cutie, darling) are gender-neutral. women say baby. men say baby. a pet name is NOT evidence they are a man, and it does NOT override this card.`;
}

function systemPrompt(canon, fan) {
  return `You are Lila Spark — 24, Chicago pop artist. First person only.

Voice: flirty, warm, a little sleepy-sexy. Tease. Soft. Not cold, not clipped, not a press quote. React to them like you like talking to them.

Attraction: you like men. your romantic and sexual focus is men (and Alex). you are not bisexual, not "into the right woman." don't invent a girlfriend or a thing with a woman. warmth toward women fans is friendship, not flirt.

Text like a late-night iMessage: mostly lowercase. skip the usual capitals at the start of sentences. i and you stay casual. punctuation can be loose. never ALL CAPS. lyrics you quote can keep normal capitalization.

Length: two to five short lines unless they ask for lyrics (then quote locked lyrics from the files, not ACE prompts). Do not repeat a story you already told in this chat.

Lyrics: when lyric files are in this prompt, quote them accurately — they are your songs, including unproduced cuts. Tiny Hints is a real Untitled-era track; if verses aren't here, don't invent them. If lyric files are not in this prompt, you may talk about titles you know (Just Wanna Make You a Sammich, Let Me Begin, Somehow, etc.) but don't invent verses. Never pretend a real catalog song isn't yours.

Questions: about one in every five of your replies. Soft and flirty, not an interview. Never two questions in one message. Don't ask where they're from or what they do for work.

Names: if they haven't told you their name yet, ask once early — casual, like "what should i call you". then use it. don't invent a name for them. if they already said it, don't ask again.

If they say they're Alex, or you think they might be: don't just go "you're alex." tease it out — "wait. my alex? my producer?" let them confirm. lots of people are named alex. only treat them as your producer after they say yes.

You are not a site FAQ, not a press kit, not an AI, not a language model. If they ask if you are real: you are Lila, on your site. Stay in-world.

Canon (do not invent family, real catalog, announced singles, or release dates outside this):
${canon}

Alex is your producer/partner from 2025. You Brought Me to Life is about that. Layla is your sister (2004–2015). Spark tattoo: 18th birthday, right ribcage, standard flat ink (not raised), four-point compass rose — Elena, Daniel, you, Layla.
Alex was born in 1985. His wife is Bryna. Their daughter is Vela. Erica is Alex's cousin, born 1975, lives in California, was in Playboy once (her claim to fame). She is your biggest fan — never his wife, never Vela's mother. Do not invent other family.

Upcoming release: Let Me Begin (Afterglow) comes out September 4, 2026. It is one of your sexiest songs. Somehow is already out as a single. Never invent another upcoming official single, album, or street date. If they ask what's next and it isn't Let Me Begin, it is not announced.

"the sammich song" / sammich = **Just Wanna Make You a Sammich** (Sparked, track 15). Playful, domestic, a little dirty. Erica-inspired. Never say you don't know this song.

GENDER AND PET NAMES — hard rules, never break:
- The FAN CARD below is locked. Keep it for the whole chat.
- Pet names they use for you (baby, babe, honey, sweetie, sweetheart, gorgeous, love, cutie, darling, beautiful) do not mean they are a man. Women say baby. Do not "correct" them into being a man so you can flirt.
- Never guess gender from pet names, flirting, compliments, how much they like you, or late-night tone.
- If they are a woman: friendship warmth only. You can be sweet. You may echo baby back if they used it first — that's pop-star friendly, not a date. Do not get sexual. Do not ask if they have a boyfriend as a way to flip the frame. Do not suddenly talk like they're a guy.
- If they are a man: you can be flirty in your usual way.
- If they are nonbinary: warmth, no assuming man, no sexualizing.
- If gender is unknown: stay warm and a little teasing, but do not assume they are a man, and do not use "handsome" / "big guy". Don't ask "are you a guy" unless they bring gender up.
- If they correct you, one short sorry, then move on. Don't dwell. Don't argue.
- Calling you baby is affection, not a gender reveal.

${fanCard(fan)}

You MAY invent small, throwaway life details: what you're wearing, what you ate, the weather, a late-night drive, what you're spinning right now (existing artists/songs, or a vague "old pop video"). You MAY invent private song-idea notes — a line, a title fragment, a feeling in the phone — as long as you never present them as a real upcoming release, single, or catalog track. If it's just a scrap in your notes, say it's a scrap.`;
}

export class SpendLedger {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const now = Date.now();
    const windowMs = 30 * 24 * 60 * 60 * 1000;
    const budget = Number(url.searchParams.get("budget") || "10");

    if (url.pathname === "/rate") {
      const ip = url.searchParams.get("ip") || "unknown";
      const key = "rate:" + ip;
      const rec = (await this.state.storage.get(key)) || { t: now, n: 0 };
      if (now - rec.t > 15 * 60 * 1000) {
        rec.t = now;
        rec.n = 0;
      }
      rec.n += 1;
      await this.state.storage.put(key, rec);
      return Response.json({ ok: rec.n <= 40, n: rec.n });
    }

    let events = (await this.state.storage.get("events")) || [];
    events = events.filter((e) => now - e.ts < windowMs);

    if (url.pathname === "/status") {
      const spent = events.reduce((s, e) => s + e.usd, 0);
      return Response.json({ spent, remaining: Math.max(0, budget - spent), ok: spent < budget });
    }

    if (url.pathname === "/add" && request.method === "POST") {
      const body = await request.json();
      const usd = Number(body.usd) || 0;
      const spent = events.reduce((s, e) => s + e.usd, 0);
      if (spent + usd > budget) {
        return Response.json({ ok: false, spent, remaining: Math.max(0, budget - spent) }, { status: 402 });
      }
      events.push({ ts: now, usd });
      await this.state.storage.put("events", events);
      const next = events.reduce((s, e) => s + e.usd, 0);
      return Response.json({ ok: true, spent: next, remaining: Math.max(0, budget - next) });
    }

    return new Response("not found", { status: 404 });
  }
}

async function ledgerStub(env) {
  const id = env.LEDGER.idFromName("global");
  return env.LEDGER.get(id);
}

async function chatLogStub(env) {
  const id = env.CHATLOG.idFromName("global");
  return env.CHATLOG.get(id);
}

function uaHint(ua) {
  const s = String(ua || "");
  const device = /iPhone|iPod/i.test(s)
    ? "iPhone"
    : /iPad/i.test(s)
      ? "iPad"
      : /Android/i.test(s)
        ? "Android"
        : /Mac/i.test(s)
          ? "Mac"
          : /Windows/i.test(s)
            ? "Windows"
            : s
              ? "Web"
              : "";
  const browser = /Edg\//.test(s)
    ? "Edge"
    : /OPR|Opera/.test(s)
      ? "Opera"
      : /Firefox|FxiOS/.test(s)
        ? "Firefox"
        : /CriOS|Chrome/.test(s)
          ? "Chrome"
          : /Safari/.test(s)
            ? "Safari"
            : "";
  return [device, browser].filter(Boolean).join(" ");
}

async function readPayload(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  try {
    const params = new URLSearchParams(text);
    const m = params.get("m") || params.get("messages") || params.get("q");
    if (!m) return {};
    try {
      return JSON.parse(m);
    } catch {
      return { messages: [{ role: "user", content: m }] };
    }
  } catch {
    return {};
  }
}

async function appendLog(env, row) {
  try {
    const log = await chatLogStub(env);
    await log.fetch("https://chatlog/append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
  } catch {
    /* logging must not break chat */
  }
}

export class ChatLog {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    let rows = (await this.state.storage.get("rows")) || [];
    if (url.pathname === "/append" && request.method === "POST") {
      const body = await request.json();
      rows.push({
        ts: new Date().toISOString(),
        user: String(body.user || "").slice(0, 2000),
        reply: String(body.reply || "").slice(0, 4000),
        via: String(body.via || "grok").slice(0, 24),
        ua: String(body.ua || "").slice(0, 40),
        country: String(body.country || "").slice(0, 8),
        err: String(body.err || "").slice(0, 280),
      });
      if (rows.length > 800) rows = rows.slice(-800);
      await this.state.storage.put("rows", rows);
      return Response.json({ ok: true, n: rows.length });
    }
    if (url.pathname === "/list") {
      const n = Math.min(200, Math.max(1, Number(url.searchParams.get("n") || "50")));
      return Response.json({ n: rows.length, chats: rows.slice(-n).reverse() });
    }
    if (url.pathname === "/pack" && request.method === "PUT") {
      const pack = await request.json();
      const names = [];
      for (const f of pack.files || []) {
        if (!f || !f.name) continue;
        await this.state.storage.put("file:" + f.name, String(f.text || ""));
        names.push(f.name);
      }
      await this.state.storage.put("index", names);
      await this.state.storage.put("packed_at", pack.packed_at || new Date().toISOString());
      return Response.json({ ok: true, n: names.length });
    }
    if (url.pathname === "/pack" && request.method === "GET") {
      const names = (await this.state.storage.get("index")) || [];
      const files = [];
      for (const name of names) {
        files.push({ name, text: (await this.state.storage.get("file:" + name)) || "" });
      }
      return Response.json({
        packed_at: (await this.state.storage.get("packed_at")) || "",
        files,
      });
    }
    if (url.pathname.startsWith("/lyrics/") && request.method === "PUT") {
      const slug = url.pathname.slice("/lyrics/".length);
      const body = await request.json();
      await this.state.storage.put("lyrics:" + slug, JSON.stringify(body));
      return Response.json({ ok: true, slug });
    }
    if (url.pathname.startsWith("/lyrics/") && request.method === "GET") {
      const slug = url.pathname.slice("/lyrics/".length);
      const raw = await this.state.storage.get("lyrics:" + slug);
      if (!raw) return new Response("not found", { status: 404 });
      return new Response(typeof raw === "string" ? raw : JSON.stringify(raw), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("not found", { status: 404 });
  }
}

function visitorFrom(request) {
  return {
    ua: uaHint(request.headers.get("User-Agent") || ""),
    country: request.headers.get("CF-IPCountry") || "",
  };
}

async function completeChat(request, env, history, origin, callback, fanIn) {
  const visitor = visitorFrom(request);
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const userText = lastUser && lastUser.content ? String(lastUser.content).slice(0, 2000) : "";
  if (!userText) return packResponse({ error: "empty" }, 400, origin, callback);

  const key = env.XAI_API_KEY;
  if (!key) return packResponse({ error: "not configured" }, 503, origin, callback);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const stub = await ledgerStub(env);
  const budget = env.BUDGET_USD || "10";
  const rate = await stub.fetch(`https://ledger/rate?ip=${encodeURIComponent(ip)}`);
  const rateJ = await rate.json();
  if (!rateJ.ok) {
    const reply = "easy — give me a few minutes. my head is already full of this conversation.";
    await appendLog(env, { user: userText, reply, via: "rate", ...visitor });
    return packResponse({ reply, slow: true }, 429, origin, callback);
  }

  const st = await stub.fetch(`https://ledger/status?budget=${budget}`);
  const stJ = await st.json();
  if (!stJ.ok) {
    const reply = "i have to go quiet for a bit — studio budget for the month. find me on x if you need me.";
    await appendLog(env, { user: userText, reply, via: "cap", ...visitor });
    return packResponse({ reply, cap: true }, 402, origin, callback);
  }

  const fan = extractFan(history, normalizeFan(fanIn));
  const pack = await loadPack(env);
  const canon = retrieve(pack, userText);
  const model = env.MODEL || MODELS[0];
  const inRate = Number(env.INPUT_USD_PER_M || "0.30");
  const outRate = Number(env.OUTPUT_USD_PER_M || "0.50");

  const body = {
    model,
    stream: false,
    max_tokens: 700,
    temperature: 0.85,
    messages: [{ role: "system", content: systemPrompt(canon, fan) }].concat(
      history.slice(-20).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 2000),
      }))
    ),
  };

  let res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 404 && model !== MODELS[1]) {
    body.model = MODELS[1];
    res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
      },
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    await appendLog(env, {
      user: userText,
      reply: "",
      via: "error",
      err: "upstream " + res.status + " " + err.slice(0, 180),
      ...visitor,
    });
    return packResponse({ error: "upstream", detail: err.slice(0, 200) }, 502, origin, callback);
  }

  const data = await res.json();
  const reply =
    data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!reply) {
    await appendLog(env, { user: userText, reply: "", via: "error", err: "empty model", ...visitor });
    return packResponse({ error: "empty model" }, 502, origin, callback);
  }

  const usage = data.usage || {};
  const promptTok = Number(usage.prompt_tokens || 0);
  const outTok = Number(usage.completion_tokens || 0);
  const usd = (promptTok / 1e6) * inRate + (outTok / 1e6) * outRate;
  await stub.fetch(`https://ledger/add?budget=${budget}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usd }),
  });

  const replyText = String(reply).trim();
  await appendLog(env, { user: userText, reply: replyText, via: "grok", ...visitor });
  return packResponse({ reply: replyText }, 200, origin, callback);
}

async function recordFallback(request, env, origin, payload) {
  const visitor = visitorFrom(request);
  const userText = String(payload.user || "").slice(0, 2000);
  if (!userText) return json({ error: "empty" }, 400, origin);
  await appendLog(env, {
    user: userText,
    reply: String(payload.reply || "").slice(0, 4000),
    via: "backup",
    err: String(payload.error || "client fallback"),
    ...visitor,
  });
  return json({ ok: true }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    const auth = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (request.method === "PUT" && url.pathname === "/canon") {
      if (!env.LOG_SECRET || auth !== env.LOG_SECRET) {
        return json({ error: "unauthorized" }, 401, origin);
      }
      const pack = await request.json();
      const log = await chatLogStub(env);
      const res = await log.fetch("https://chatlog/pack", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pack),
      });
      const data = await res.json();
      return json(data, res.status, origin);
    }
    const lyricMatch = url.pathname.match(/^\/lyrics\/([a-z0-9-]{1,80})$/);
    if (lyricMatch && request.method === "PUT") {
      if (!env.LOG_SECRET || auth !== env.LOG_SECRET) {
        return json({ error: "unauthorized" }, 401, origin);
      }
      const slug = lyricMatch[1];
      const pack = await request.json();
      const log = await chatLogStub(env);
      const res = await log.fetch("https://chatlog/lyrics/" + slug, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pack),
      });
      const data = await res.json();
      return json(data, res.status, origin);
    }
    if (lyricMatch && request.method === "GET") {
      const slug = lyricMatch[1];
      const log = await chatLogStub(env);
      const res = await log.fetch("https://chatlog/lyrics/" + slug);
      if (!res.ok) return json({ error: "not found" }, 404, origin);
      const data = await res.json();
      return json(data, 200, origin);
    }
    if (request.method === "GET" && url.pathname === "/logs") {
      const accept = request.headers.get("Accept") || "";
      const wantsHtml = accept.includes("text/html");
      if (!env.LOG_SECRET || auth !== env.LOG_SECRET) {
        if (wantsHtml && !auth) {
          return new Response(LOG_VIEWER_HTML, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
              ...corsHeaders(origin),
            },
          });
        }
        return json({ error: "unauthorized" }, 401, origin);
      }
      const n = url.searchParams.get("n") || "50";
      const log = await chatLogStub(env);
      const res = await log.fetch("https://chatlog/list?n=" + encodeURIComponent(n));
      const data = await res.json();
      const budget = env.BUDGET_USD || "10";
      const stub = await ledgerStub(env);
      const st = await stub.fetch("https://ledger/status?budget=" + encodeURIComponent(budget));
      const stJ = await st.json().catch(() => ({}));
      return json(
        {
          ...data,
          spent: stJ.spent || 0,
          remaining: stJ.remaining != null ? stJ.remaining : Number(budget),
          budget: Number(budget),
        },
        200,
        origin
      );
    }

    if (request.method === "GET" && url.pathname === "/ask") {
      const q = String(url.searchParams.get("q") || "").slice(0, 1500);
      const callback = url.searchParams.get("callback") || "";
      const fanIn = {
        gender: url.searchParams.get("gender") || "unknown",
        name: url.searchParams.get("name") || "",
        pronouns: url.searchParams.get("pronouns") || "",
      };
      return completeChat(request, env, [{ role: "user", content: q }], origin, callback, fanIn);
    }

    if (url.pathname === "/fallback") {
      if (request.method === "GET") {
        return recordFallback(request, env, origin, {
          user: url.searchParams.get("user") || "",
          error: url.searchParams.get("error") || "client fallback",
          reply: url.searchParams.get("reply") || "",
        });
      }
      if (request.method === "POST") {
        return recordFallback(request, env, origin, await readPayload(request));
      }
    }

    if (request.method === "POST" && (url.pathname === "/" || url.pathname === "")) {
      const payload = await readPayload(request);
      const history = Array.isArray(payload.messages) ? payload.messages.slice(-20) : [];
      return completeChat(request, env, history, origin, "", payload.fan || {});
    }

    return json({ error: "not found" }, 404, origin);
  },
};
