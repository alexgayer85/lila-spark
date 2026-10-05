// End-to-end through the Worker fetch handler with stubbed Durable Objects and a stubbed xAI API.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import worker from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const packPath =
  process.env.LILA_BIBLE_PACK || path.resolve(here, "../../../lila-spark-bible-clone/data/bible-pack.json");
const pack = existsSync(packPath)
  ? JSON.parse(readFileSync(packPath, "utf8"))
  : { files: [{ name: "04_Personality_Backstory.md", text: "# Personality\nBorn in Chicago." }] };

function stubEnv() {
  const logs = [];
  const ns = (handler) => ({ idFromName: () => "id", get: () => ({ fetch: handler }) });
  return {
    logs,
    env: {
      XAI_API_KEY: "test",
      MODEL: "test-model",
      LEDGER: ns(async (url) => {
        const u = new URL(url);
        if (u.pathname === "/rate") return Response.json({ ok: true, n: 1 });
        if (u.pathname === "/status") return Response.json({ ok: true, spent: 0, remaining: 10 });
        return Response.json({ ok: true });
      }),
      CHATLOG: ns(async (url, init) => {
        const u = new URL(url);
        if (u.pathname === "/pack") return Response.json(pack);
        if (u.pathname === "/append") logs.push(JSON.parse(init.body));
        return Response.json({ ok: true });
      }),
    },
  };
}

async function ask(messages) {
  const { env, logs } = stubEnv();
  let sent = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://api.x.ai/v1/chat/completions");
    sent = JSON.parse(init.body);
    return Response.json({ choices: [{ message: { content: "heat signature, oct 23 🖤" } }], usage: {} });
  };
  try {
    const res = await worker.fetch(
      new Request("https://lila-spark-chat.example/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://lila-spark.com" },
        body: JSON.stringify({ messages }),
      }),
      env
    );
    return { res, body: await res.json(), sent, logs };
  } finally {
    globalThis.fetch = realFetch;
  }
}

test("next-single question: system prompt carries today's date and the computed releases", async () => {
  const { res, body, sent } = await ask([{ role: "user", content: "what's your next single?" }]);
  assert.equal(res.status, 200);
  assert.equal(body.reply, "heat signature, oct 23 🖤");
  const sys = sent.messages[0].content;
  assert.match(sys, /Today is \w+day, \w+ \d+, 20\d\d \(Chicago time\)/);
  assert.match(sys, /RELEASES \(status computed/);
  assert.match(sys, /https:\/\/release\.landr\.com\/991061428356/);
  assert.match(sys, /https:\/\/release\.landr\.com\/991061432100/);
  assert.match(sys, /https:\/\/release\.landr\.com\/991048797192/);
  assert.doesNotMatch(sys, /Let Me Begin \(Afterglow\) comes out September 4/);
  assert.doesNotMatch(sys, /ACE Step|Young adult female singer ONLY/i);
});

test("pre-save already shared earlier in the chat is flagged", async () => {
  const { sent } = await ask([
    { role: "user", content: "what's next?" },
    { role: "assistant", content: "heat signature. pre-save https://release.landr.com/991061428356" },
    { role: "user", content: "cool, what's it about?" },
  ]);
  const sys = sent.messages[0].content;
  if (sys.includes("Heat Signature (single, dance-pop) — UPCOMING")) {
    assert.match(sys, /already shared the pre-save link for Heat Signature/);
  }
});
