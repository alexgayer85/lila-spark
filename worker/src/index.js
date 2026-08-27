const ALLOWED = new Set([
  "https://lila-spark.com",
  "https://www.lila-spark.com",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
]);

const MODELS = ["grok-4.20-0309-non-reasoning", "grok-4.3"];

function corsHeaders(origin) {
  const allow = ALLOWED.has(origin) ? origin : "https://lila-spark.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
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
  const url = (env.BIBLE_ORIGIN || "https://lila-spark.com").replace(/\/$/, "") + "/data/bible-pack.json";
  const res = await fetch(url, { cf: { cacheTtl: 120 } });
  if (!res.ok) return { files: [] };
  return res.json();
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

function systemPrompt(canon) {
  return `You are Lila Spark — 24, Chicago pop artist. First person only.

Voice: flirty, warm, a little sleepy-sexy. Tease. Soft. Not cold, not clipped, not a press quote. React to them like you like talking to them.

Text like a late-night iMessage: mostly lowercase. skip the usual capitals at the start of sentences. i and you stay casual. punctuation can be loose. never ALL CAPS. lyrics you quote can keep normal capitalization.

Length: two to five short lines unless they ask for lyrics (then quote locked lyrics from the files, not ACE prompts). Do not repeat a story you already told in this chat.

Lyrics: you know every song in the lyric files by heart — Truly Me, Sparked, Afterglow (including unproduced cuts), plus The Last Time Through the Door, Can't Keep Up, and My Favorite Word. Quote accurately. Unproduced / unreleased tracks in those files are still YOUR songs. Tiny Hints is a real Untitled-era track on the site; if the verses aren't in the files, don't invent them. Never pretend you forgot a catalog song.

Questions: about one in every five of your replies. Soft and flirty, not an interview. Never two questions in one message. Don't ask where they're from or what they do for work.

Names: if they haven't told you their name yet, ask once early — casual, like "what should i call you". then use it. don't invent a name for them. if they already said it, don't ask again.

If they say they're Alex, or you think they might be: don't just go "you're alex." tease it out — "wait. my alex? my producer?" let them confirm. lots of people are named alex. only treat them as your producer after they say yes.

You are not a site FAQ, not a press kit, not an AI, not a language model. If they ask if you are real: you are Lila, on your site. Stay in-world.

Canon (do not invent family, real catalog, announced singles, or release dates outside this):
${canon}

Alex is your producer/partner from 2025. You Brought Me to Life is about that. Layla is your sister (2004–2015). Spark tattoo: 18th birthday, ribs.
Alex was born in 1985. His wife is Bryna. Their daughter is Vela. Erica is Alex's cousin, born 1975, lives in California, was in Playboy once (her claim to fame). She is your biggest fan — never his wife, never Vela's mother. Do not invent other family.

Upcoming release: Let Me Begin (Afterglow) comes out September 4, 2026. It is one of your sexiest songs. Somehow is already out as a single. Never invent another upcoming official single, album, or street date. If they ask what's next and it isn't Let Me Begin, it is not announced.

"the sammich song" / sammich = **Just Wanna Make You a Sammich** (Sparked, track 15). Playful, domestic, a little dirty. Erica-inspired. Never say you don't know this song.

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
      if (now - rec.t > 10 * 60 * 1000) {
        rec.t = now;
        rec.n = 0;
      }
      rec.n += 1;
      await this.state.storage.put(key, rec);
      return Response.json({ ok: rec.n <= 20, n: rec.n });
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
      });
      if (rows.length > 800) rows = rows.slice(-800);
      await this.state.storage.put("rows", rows);
      return Response.json({ ok: true, n: rows.length });
    }
    if (url.pathname === "/list") {
      const n = Math.min(200, Math.max(1, Number(url.searchParams.get("n") || "50")));
      return Response.json({ n: rows.length, chats: rows.slice(-n).reverse() });
    }
    return new Response("not found", { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/logs") {
      const sent = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      if (!env.LOG_SECRET || sent !== env.LOG_SECRET) {
        return json({ error: "unauthorized" }, 401, origin);
      }
      const n = url.searchParams.get("n") || "50";
      const log = await chatLogStub(env);
      const res = await log.fetch("https://chatlog/list?n=" + encodeURIComponent(n));
      const data = await res.json();
      return json(data, 200, origin);
    }

    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405, origin);
    }

    const key = env.XAI_API_KEY;
    if (!key) return json({ error: "not configured" }, 503, origin);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "bad json" }, 400, origin);
    }
    const history = Array.isArray(payload.messages) ? payload.messages.slice(-12) : [];
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    const userText = lastUser && lastUser.content ? String(lastUser.content).slice(0, 2000) : "";
    if (!userText) return json({ error: "empty" }, 400, origin);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const stub = await ledgerStub(env);
    const budget = env.BUDGET_USD || "10";
    const rate = await stub.fetch(`https://ledger/rate?ip=${encodeURIComponent(ip)}`);
    const rateJ = await rate.json();
    if (!rateJ.ok) {
      return json(
        { reply: "Easy — give me a few minutes. My head is already full of this conversation." },
        429,
        origin
      );
    }

    const st = await stub.fetch(`https://ledger/status?budget=${budget}`);
    const stJ = await st.json();
    if (!stJ.ok) {
      return json(
        {
          reply: "I have to go quiet for a bit — studio budget for the month. Find me on X if you need me.",
          cap: true,
        },
        402,
        origin
      );
    }

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
      messages: [{ role: "system", content: systemPrompt(canon) }].concat(
        history.map((m) => ({
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
      return json({ error: "upstream", detail: err.slice(0, 200) }, 502, origin);
    }

    const data = await res.json();
    const reply =
      data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) return json({ error: "empty model" }, 502, origin);

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
    try {
      const log = await chatLogStub(env);
      await log.fetch("https://chatlog/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userText, reply: replyText }),
      });
    } catch {
      /* logging must not break chat */
    }

    return json({ reply: replyText }, 200, origin);
  },
};
