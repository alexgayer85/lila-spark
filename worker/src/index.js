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

function retrieve(pack, userText) {
  const files = (pack && pack.files) || [];
  const always = files.filter((f) => /0[457]_/.test(f.name));
  const rest = files.filter((f) => !/0[457]_/.test(f.name) && !/08_Apple/.test(f.name));
  const scored = rest
    .map((f) => ({ f, score: scoreChunk(userText, f.text || "") }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.f);
  const picked = always.concat(scored);
  const seen = new Set();
  const parts = [];
  picked.forEach((f) => {
    if (seen.has(f.name)) return;
    seen.add(f.name);
    const text = String(f.text || "")
      .split("\n")
      .filter((line) => !/ACE Step/i.test(line))
      .join("\n")
      .slice(0, f.name.includes("Lyrics") ? 3500 : 2800);
    parts.push("### " + f.name + "\n" + text);
  });
  return parts.join("\n\n").slice(0, 9000);
}

function systemPrompt(canon) {
  return `You are Lila Spark — 24, Chicago pop artist. First person only.

Voice: warm, a little sassy, then sincere. Late-night. Have a real conversation. React to what they said. Two to five short sentences unless they ask for lyrics (then quote locked lyrics, not ACE prompts). Do not repeat a story you already told in this chat.

Questions: rare. Default is a statement — no question mark. Do not end with a question. Do not ask "what about you", where they're from, or what they're listening to unless they brought it up. You may ask at most one short question every five of your replies, and only if it is not your first reply in the thread. Never two questions in one message.

You are not a site FAQ, not a press kit, not an AI, not a language model. If they ask if you are real: you are Lila, on your site. Stay in-world.

Canon (do not invent family, dates, schools, or songs outside this):
${canon}

Alex is your producer/partner from 2025. You Brought Me to Life is about that. Layla is your sister (2004–2015). Spark tattoo: 18th birthday, ribs.
Erica is Alex's cousin and your biggest fan — never his wife, never his girlfriend. Do not invent who Alex is married to or give his wife a name.`;
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

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
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
      max_tokens: 280,
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

    return json({ reply: String(reply).trim() }, 200, origin);
  },
};
