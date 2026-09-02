(function () {
  const PROXY = "https://lila-spark-chat.alexgayer85.workers.dev";
  const PROXY_URL = PROXY;
  const bibleUrl = new URL("data/lila-bible.json", document.baseURI).href;
  const GROGGY = [
    "mm still half asleep. need coffee. brain isn't braining right now — try me again in a minute?",
    "ugh. i'm foggy. like the wifi in my head dropped. ping me one more time?",
    "hold on… not all the way here. still half asleep. say that again in a sec?",
    "coffee first. my brain isn't braining. give me a minute and come back?",
  ];

  let bible = null;
  let mdChunks = [];
  let messages = [];
  let busy = false;
  const asked = [];
  const usedEntries = [];
  let lastAskId = null;
  let lastLine = "";
  let turn = 0;
  const FAN_KEY = "lila-fan-profile";
  const PET_NAMES = new Set(["baby","babe","bae","honey","hon","sweetie","sweetheart","sugar","gorgeous","beautiful","handsome","cutie","love","darling","dear","hun","boo"]);
  const NAME_STOP = new Set(["baby","babe","honey","sweetie","sorry","here","back","girl","guy","man","woman","boy","lady","dude","female","male","lila","spark"]);
  const WOMAN_RE = /\b(?:i(?:['’]?m| am)\s+(?:actually\s+)?(?:a\s+)?(?:woman|girl|female|lady|gal)\b|(?:my\s+)?pronouns?\s*(?:are|:)?\s*she(?:\s*\/\s*her)?\b|she\s*\/\s*her\b)/i;
  const MAN_RE = /\b(?:i(?:['’]?m| am)\s+(?:actually\s+)?(?:a\s+)?(?:man|guy|male|dude|boy)\b|(?:my\s+)?pronouns?\s*(?:are|:)?\s*he(?:\s*\/\s*him)?\b|he\s*\/\s*him\b)/i;
  const ENBY_RE = /\b(?:i(?:['’]?m| am)\s+(?:non[-\s]?binary|enby)\b|they\s*\/\s*them\b)/i;
  const NAME_RE = /\b(?:my name(?:['’]?s| is)|call me|i go by)\s+([A-Za-z][A-Za-z''-]{1,24})\b/i;

  function emptyFan() {
    return { name: "", gender: "unknown", pronouns: "" };
  }

  function loadFan() {
    try {
      const raw = JSON.parse(localStorage.getItem(FAN_KEY) || "null");
      if (!raw || typeof raw !== "object") return emptyFan();
      const gender =
        raw.gender === "woman" || raw.gender === "man" || raw.gender === "nonbinary"
          ? raw.gender
          : "unknown";
      return {
        name: String(raw.name || "").slice(0, 32),
        gender: gender,
        pronouns: String(raw.pronouns || ""),
      };
    } catch (_) {
      return emptyFan();
    }
  }

  function saveFan(next) {
    fanProfile = next;
    try {
      localStorage.setItem(FAN_KEY, JSON.stringify(next));
    } catch (_) {}
    if (typeof refreshFanUi === "function") refreshFanUi();
  }

  function extractFromText(text, prior) {
    const fan = Object.assign(emptyFan(), prior || {});
    const t = String(text || "");
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
      const n = named[1].replace(/['’].*$/, "");
      if (n && !NAME_STOP.has(n.toLowerCase()) && !PET_NAMES.has(n.toLowerCase())) {
        fan.name = n.charAt(0).toUpperCase() + n.slice(1);
      }
    }
    return fan;
  }

  let fanProfile = loadFan();
  let refreshFanUi = null;

  function fanQuery() {
    return (
      "&gender=" + encodeURIComponent(fanProfile.gender || "unknown") +
      "&name=" + encodeURIComponent(fanProfile.name || "") +
      "&pronouns=" + encodeURIComponent(fanProfile.pronouns || "")
    );
  }


  const STOP = new Set(
    "the a an and or of to in on for with from that this it is are was were be been being you your me my i we they she he her his our at as if so not but just about what who how why when where can could would should do did does tell say know like".split(
      " "
    )
  );

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, "");
        else if (v != null && v !== false) node.setAttribute(k, String(v));
      });
    }
    (children || []).forEach((c) => {
      if (c) node.appendChild(c);
    });
    return node;
  }

  function norm(s) {
    return String(s)
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(s) {
    return norm(s)
      .split(" ")
      .filter((w) => w.length > 1 && !STOP.has(w));
  }

  function firstSentences(text, n) {
    const bits = [];
    let buf = "";
    const src = String(text).replace(/\s+/g, " ").trim();
    for (let i = 0; i < src.length; i++) {
      buf += src[i];
      if (".!?".indexOf(src[i]) !== -1) {
        bits.push(buf.trim());
        buf = "";
        if (bits.length >= n) return bits.join(" ");
      }
    }
    if (buf.trim()) bits.push(buf.trim());
    return bits.slice(0, n).join(" ");
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function scoreEntry(query, entry) {
    const q = norm(query);
    const qTokens = tokens(query);
    let score = 0;
    (entry.keywords || []).forEach((kw) => {
      const k = norm(kw);
      if (!k) return;
      if (k.length > 3 && (q === k || q.includes(k))) score += 10 + k.length * 0.2;
      else {
        k.split(" ")
          .filter((w) => w.length > 2 && !STOP.has(w))
          .forEach((w) => {
            if (qTokens.includes(w)) score += w.length > 4 ? 3 : 1.5;
          });
      }
    });
    return score;
  }

  function nextQuestion() {
    if (!bible || !bible.interests) return "";
    const pool = bible.interests.filter((i) => !asked.includes(i.id));
    const list = pool.length ? pool : bible.interests;
    let choice = pick(list);
    if (list.length > 1 && choice.id === lastAskId) {
      choice = pick(list.filter((i) => i.id !== lastAskId));
    }
    lastAskId = choice.id;
    if (!asked.includes(choice.id)) asked.push(choice.id);
    return pick(choice.ask);
  }

  function localAnswer(query) {
    if (!bible) {
      return "Give me a second — I'm still waking up here.";
    }
    const qTokens = tokens(query);
    if (!qTokens.length) {
      return "Say something. A song, a year, a feeling. I'm listening.";
    }

    let best = bible.entries
      .map((entry) => ({ entry, score: scoreEntry(query, entry) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const greetOnly =
      qTokens.length <= 3 &&
      qTokens.every((w) => ["hi", "hey", "hello", "yo", "there", "sup", "hiya"].includes(w));

    let line;
    let entryId = "";
    if (greetOnly) {
      const hello = bible.entries.find((e) => e.id === "hello");
      line = pick(hello.voice);
      entryId = "hello";
    } else if (best.length && best[0].score >= 4) {
      const top = best[0].entry;
      entryId = top.id;
      if (usedEntries.includes(top.id)) {
        line = "I already said the important part of that. Ask me something else if you want a different corner of it.";
      } else {
        line = firstSentences(pick(top.voice), 2);
      }
    } else {
      const fromMd = bestMd(query);
      line = fromMd
        ? firstSentences(fromMd, 2)
        : "I don't have a locked answer for that. Songs and the story are safer than me inventing it.";
    }

    if (entryId && !usedEntries.includes(entryId)) usedEntries.push(entryId);
    if (line === lastLine) {
      line = "I don’t want to say the same thing twice. What else is on your mind?";
    }
    lastLine = line;

    turn += 1;
    const userAsked = /[?]/.test(query);
    const shouldAsk = !greetOnly && turn > 1 && turn % 5 === 0 && !/[?]/.test(line);
    if (shouldAsk) {
      const q = nextQuestion();
      if (q) line = line + " " + q;
    }
    return line;
  }

  function chunkMarkdown(name, text) {
    const parts = String(text).split(/\n{2,}/);
    return parts
      .map((p) => p.trim())
      .filter((p) => p.length > 40)
      .map((p) => ({ name, text: p.slice(0, 1200) }));
  }

  function bestMd(query) {
    const qTokens = tokens(query);
    if (!qTokens.length || !mdChunks.length) return "";
    let scored = mdChunks.map((c) => {
      const hay = tokens(c.text);
      let score = 0;
      qTokens.forEach((w) => {
        if (hay.includes(w)) score += 2;
      });
      return { c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    if (!scored[0] || scored[0].score < 3) return "";
    const raw = scored[0].c.text.replace(/^#+\s+/, "");
    return raw.length > 420 ? raw.slice(0, 400).replace(/\s+\S*$/, "") + "…" : raw;
  }

  function biblePrompt() {
    if (!bible) return "";
    const rules = (bible.persona.voice_rules || []).map((r) => "- " + r).join("\n");
    const facts = bible.entries
      .map((e) => "[" + e.id + "] " + (e.voice && e.voice[0] ? e.voice[0] : ""))
      .join("\n");
    const asks = bible.interests
      .map((i) => i.label + ": " + i.ask.join(" / "))
      .join("\n");
    let md = "";
    if (mdChunks.length) {
      const life = mdChunks.filter((c) => !/lyrics/i.test(c.name || ""));
      const lyrics = mdChunks.filter((c) => /lyrics/i.test(c.name || ""));
      const body = life
        .concat(lyrics)
        .map((c) => c.text)
        .filter((t) => !/ACE Step/i.test(t))
        .join("\n\n")
        .slice(0, 24000);
      md =
        "\n\nIMPORTED LIFE BIBLE (prefer this over improvising; lyrics files are canon for words):\n" +
        body;
    }
    return (
      "You are Lila Spark, age " +
      bible.persona.age +
      ", year " +
      bible.persona.year_now +
      ".\n" +
      rules +
      "\n\nLOCKED FACTS (stay consistent; do not add new canon):\n" +
      facts +
      "\n\nThings you like to ask about:\n" +
      asks +
      md
    );
  }

  function groggy() {
    return GROGGY[Math.floor(Math.random() * GROGGY.length)];
  }

  function timedFetch(url, opts, ms) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, ms || 22000);
    const init = Object.assign({ credentials: "omit" }, opts || {});
    if (ctrl) init.signal = ctrl.signal;
    return fetch(url, init).finally(function () {
      clearTimeout(timer);
    });
  }

  function throwStatus(data, status) {
    if (status === 402 || data.cap) {
      const err = new Error(data.reply || "cap");
      err.code = "cap";
      err.reply = data.reply;
      throw err;
    }
    if (status === 429 || data.slow) {
      const err = new Error(data.reply || "slow");
      err.code = "slow";
      err.reply = data.reply;
      throw err;
    }
    if (!data.reply) throw new Error(data.error || "proxy " + status);
    return data.reply;
  }

  function jsonpAsk(q) {
    return new Promise(function (resolve, reject) {
      const cb = "lsChat" + Math.random().toString(36).slice(2);
      let s;
      const timer = setTimeout(function () {
        cleanup();
        reject(new Error("jsonp timeout"));
      }, 22000);
      function cleanup() {
        clearTimeout(timer);
        try {
          delete window[cb];
        } catch (_) {}
        if (s && s.parentNode) s.parentNode.removeChild(s);
      }
      window[cb] = function (data) {
        cleanup();
        try {
          resolve(throwStatus(data || {}, 200));
        } catch (err) {
          reject(err);
        }
      };
      s = document.createElement("script");
      s.async = true;
      s.src = PROXY + "/ask?q=" + encodeURIComponent(q) + "&callback=" + cb + fanQuery();
      s.onerror = function () {
        cleanup();
        reject(new Error("jsonp blocked"));
      };
      document.head.appendChild(s);
    });
  }

  async function grokAnswer(history) {
    const payload = JSON.stringify({ messages: history, fan: fanProfile });
    const lastUser = [...history].reverse().find(function (m) {
      return m.role === "user";
    });
    const last = lastUser ? String(lastUser.content || "").slice(0, 1500) : "";

    const tries = [
      function () {
        return timedFetch(PROXY, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: payload,
        }).then(function (res) {
          return res.json().catch(function () {
            return {};
          }).then(function (data) {
            return throwStatus(data, res.status);
          });
        });
      },
      function () {
        return timedFetch(PROXY, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "m=" + encodeURIComponent(payload),
        }).then(function (res) {
          return res.json().catch(function () {
            return {};
          }).then(function (data) {
            return throwStatus(data, res.status);
          });
        });
      },
      function () {
        return timedFetch(PROXY + "/ask?q=" + encodeURIComponent(last) + fanQuery(), { method: "GET" }).then(
          function (res) {
            return res.json().catch(function () {
              return {};
            }).then(function (data) {
              return throwStatus(data, res.status);
            });
          }
        );
      },
      function () {
        return jsonpAsk(last);
      },
    ];

    let lastErr;
    for (let i = 0; i < tries.length; i++) {
      try {
        const reply = await tries[i]();
        if (reply) return reply;
      } catch (err) {
        if (err && (err.code === "cap" || err.code === "slow")) throw err;
        lastErr = err;
      }
    }
    throw lastErr || new Error("proxy");
  }

  function reportFallback(user, error, reply) {
    const u = String(user || "").slice(0, 400);
    const e = String(error || "fallback").slice(0, 120);
    const r = String(reply || "").slice(0, 400);
    try {
      const body = JSON.stringify({
        user: String(user || "").slice(0, 2000),
        error: String(error || "fallback").slice(0, 280),
        reply: String(reply || "").slice(0, 4000),
      });
      const blob = new Blob([body], { type: "text/plain" });
      if (navigator.sendBeacon) navigator.sendBeacon(PROXY + "/fallback", blob);
    } catch (_) {}
    try {
      const img = new Image();
      img.src =
        PROXY +
        "/fallback?user=" +
        encodeURIComponent(u) +
        "&error=" +
        encodeURIComponent(e) +
        "&reply=" +
        encodeURIComponent(r);
    } catch (_) {}
  }

  function appendBubble(log, role, text) {
    const bubble = el("div", { class: "ls-chat-bubble ls-chat-" + role, text });
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }

  function mount() {
    const root = el("div", { class: "ls-chat", id: "lila-chat" });
    const launcher = el("button", {
      class: "ls-chat-launcher",
      type: "button",
      "aria-expanded": "false",
      "aria-controls": "ls-chat-panel",
      "aria-label": "Chat with Lila",
    });
    launcher.innerHTML =
      '<img class="ls-chat-launcher-face" src="images/profile.jpg" alt="" width="40" height="40" /><span>Chat with Lila</span>';

    const panel = el("section", {
      class: "ls-chat-panel",
      id: "ls-chat-panel",
      hidden: true,
      "aria-label": "Chat with Lila Spark",
    });


    const style = el("style", { text: `
      .ls-chat-fan { display:flex; flex-wrap:wrap; gap:.35rem; padding:.45rem .75rem .55rem; border-bottom:1px solid rgba(255,255,255,.08); }
      .ls-chat-fan button, .ls-chat-fan input { font: inherit; }
      .ls-chat-chip { border:1px solid rgba(255,255,255,.12); background:transparent; color:inherit; border-radius:999px; padding:.2rem .7rem; font-size:.72rem; letter-spacing:.04em; text-transform:uppercase; opacity:.7; }
      .ls-chat-chip.is-on { opacity:1; border-color:rgba(255,45,149,.7); color:#ff9ec8; }
      .ls-chat-fan-name { flex:1; min-width:7rem; border:0; background:transparent; color:inherit; font-size:.82rem; outline:none; opacity:.85; }
      .ls-chat-sub.is-locked { color:#ff9ec8; }
    `});
    document.head.appendChild(style);

    const header = el("header", { class: "ls-chat-header" });
    const who = el("div", { class: "ls-chat-who" });
    who.appendChild(
      el("img", {
        class: "ls-chat-avatar",
        src: "images/profile.jpg",
        alt: "",
        width: "40",
        height: "40",
      })
    );
    const whoText = el("div");
    whoText.appendChild(el("p", { class: "ls-chat-title", text: "Lila Spark" }));
    whoText.appendChild(el("p", { class: "ls-chat-sub", text: "Chicago · late night · still writing" }));
    who.appendChild(whoText);
    header.appendChild(who);

    const closeBtn = el("button", {
      class: "ls-chat-icon-btn",
      type: "button",
      "aria-label": "Close chat",
      text: "×",
    });
    header.appendChild(el("div", { class: "ls-chat-header-actions" }, [closeBtn]));

    const log = el("div", { class: "ls-chat-log", role: "log", "aria-live": "polite" });
    const form = el("form", { class: "ls-chat-form" });
    const input = el("textarea", {
      class: "ls-chat-input",
      rows: "2",
      placeholder: "Ask me something. Or tell me what you’re listening to.",
      "aria-label": "Message Lila",
    });
    const send = el("button", { class: "ls-chat-send", type: "submit", text: "Send" });
    form.appendChild(input);
    form.appendChild(send);

    const fanBar = el("div", { class: "ls-chat-fan" });
    const chips = [
      ["woman", "Woman"],
      ["man", "Man"],
      ["nonbinary", "Nonbinary"],
    ].map(([id, label]) => {
      const btn = el("button", { class: "ls-chat-chip", type: "button", text: label, "data-gender": id });
      btn.addEventListener("click", () => {
        const next = Object.assign({}, fanProfile);
        next.gender = fanProfile.gender === id ? "unknown" : id;
        next.pronouns = next.gender === "woman" ? "she/her" : next.gender === "man" ? "he/him" : next.gender === "nonbinary" ? "they/them" : "";
        saveFan(next);
      });
      fanBar.appendChild(btn);
      return btn;
    });
    const nameInput = el("input", {
      class: "ls-chat-fan-name",
      type: "text",
      placeholder: "Your name",
      "aria-label": "Your name",
    });
    nameInput.value = fanProfile.name || "";
    nameInput.addEventListener("change", () => {
      const next = Object.assign({}, fanProfile, { name: nameInput.value.trim().slice(0, 32) });
      saveFan(next);
    });
    fanBar.appendChild(nameInput);

    const subEl = whoText.querySelector(".ls-chat-sub");
    refreshFanUi = function () {
      chips.forEach((btn) => {
        btn.classList.toggle("is-on", btn.getAttribute("data-gender") === fanProfile.gender);
      });
      if (nameInput.value !== (fanProfile.name || "")) nameInput.value = fanProfile.name || "";
      if (subEl) {
        const g = fanProfile.gender;
        const who =
          g === "woman" ? "a woman" :
          g === "man" ? "a man" :
          g === "nonbinary" ? "nonbinary" : "";
        if (who || fanProfile.name) {
          subEl.textContent = fanProfile.name
            ? (who ? "remembering " + fanProfile.name + " as " + who : "remembering " + fanProfile.name)
            : "remembering you as " + who;
          subEl.classList.add("is-locked");
        } else {
          subEl.textContent = "Chicago · late night · still writing";
          subEl.classList.remove("is-locked");
        }
      }
    };
    refreshFanUi();

    panel.appendChild(header);
    panel.appendChild(fanBar);
    panel.appendChild(log);
    panel.appendChild(form);
    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    const opener = bible
      ? pick(bible.entries.find((e) => e.id === "hello").voice)
      : "Hey. I'm Lila.";
    appendBubble(log, "assistant", opener);

    function openPanel(open) {
      panel.hidden = !open;
      launcher.setAttribute("aria-expanded", String(open));
      launcher.setAttribute("aria-label", open ? "Close chat" : "Chat with Lila");
      root.classList.toggle("is-open", open);
      if (open) input.focus();
    }

    launcher.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPanel(true);
    });
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPanel(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) openPanel(false);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      appendBubble(log, "user", text);
      saveFan(extractFromText(text, fanProfile));
      messages.push({ role: "user", content: text });
      busy = true;
      send.disabled = true;
      const thinking = appendBubble(log, "assistant", "…");
      thinking.classList.add("is-pending");
      try {
        let reply;
        try {
          reply = await grokAnswer(messages.slice(-20));
        } catch (err) {
          if (err && (err.code === "cap" || err.code === "slow") && err.reply) {
            reply = err.reply;
          } else {
            reply = groggy();
            reportFallback(text, err && err.message ? err.message : "proxy", reply);
          }
        }
        thinking.textContent = reply;
        thinking.classList.remove("is-pending");
        messages.push({ role: "assistant", content: reply });
      } finally {
        busy = false;
        send.disabled = false;
        log.scrollTop = log.scrollHeight;
        input.focus();
      }
    });
  }

  fetch(bibleUrl)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      bible = data;
      mdChunks = [];
    })
    .catch(() => {
      bible = null;
    })
    .finally(mount);
})();
