(function () {
  const STORAGE_KEY = "lilaSpark.xaiKey";
  const API_URL = "https://api.x.ai/v1/chat/completions";
  const MODEL = "grok-4.6";
  const bibleUrl = new URL("data/lila-bible.json", document.baseURI).href;
  const packUrl = new URL("data/bible-pack.json", document.baseURI).href;

  let bible = null;
  let mdChunks = [];
  let messages = [];
  let busy = false;
  const asked = [];
  const usedEntries = [];
  let lastAskId = null;
  let lastLine = "";
  let turn = 0;
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

  function getKey() {
    try {
      return (localStorage.getItem(STORAGE_KEY) || "").trim();
    } catch {
      return "";
    }
  }

  function setKey(value) {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value.trim());
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
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
    const shouldAsk = !greetOnly && !userAsked && turn > 2 && turn % 4 === 0 && !/[?]/.test(line);
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

  async function grokAnswer(history) {
    const key = getKey();
    if (!key) return null;
    const body = {
      model: MODEL,
      stream: false,
      messages: [{ role: "system", content: biblePrompt() }, ...history],
    };
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error("SpaceXAI request failed (" + res.status + "). " + errText.slice(0, 180));
    }
    const data = await res.json();
    const text =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;
    if (!text) throw new Error("Empty reply from SpaceXAI.");
    return text;
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

    const settingsBtn = el("button", {
      class: "ls-chat-icon-btn",
      type: "button",
      "aria-label": "Chat settings",
      text: "⚙",
    });
    const closeBtn = el("button", {
      class: "ls-chat-icon-btn",
      type: "button",
      "aria-label": "Close chat",
      text: "×",
    });
    header.appendChild(el("div", { class: "ls-chat-header-actions" }, [settingsBtn, closeBtn]));

    const settings = el("form", { class: "ls-chat-settings", hidden: true });
    settings.innerHTML =
      '<label for="ls-chat-key">Optional SpaceXAI key (this browser only). Grok 4.6 stays in character from the life bible. Get a key at console.x.ai — XAI_API_KEY.</label>' +
      '<input id="ls-chat-key" type="password" autocomplete="off" placeholder="xai-…" />' +
      '<p class="ls-chat-hint">No key: she still talks from the bible on this site. Don\'t paste a production key.</p>' +
      '<button type="submit" class="ls-chat-save">Save</button>';

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

    panel.appendChild(header);
    panel.appendChild(settings);
    panel.appendChild(log);
    panel.appendChild(form);
    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    const opener = bible
      ? pick(bible.entries.find((e) => e.id === "hello").voice) + " " + nextQuestion()
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

    settingsBtn.addEventListener("click", () => {
      const show = settings.hidden;
      settings.hidden = !show;
      if (show) {
        settings.querySelector("input").value = getKey();
        settings.querySelector("input").focus();
      }
    });

    settings.addEventListener("submit", (e) => {
      e.preventDefault();
      setKey(settings.querySelector("input").value);
      settings.hidden = true;
      appendBubble(
        log,
        "assistant",
        getKey()
          ? "Okay. I'll talk a little looser now — still me, still the same life."
          : "Alright. Just us and what I already know about myself."
      );
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
      messages.push({ role: "user", content: text });
      busy = true;
      send.disabled = true;
      const thinking = appendBubble(log, "assistant", "…");
      thinking.classList.add("is-pending");
      try {
        let reply;
        if (getKey()) {
          try {
            reply = await grokAnswer(messages.slice(-16));
          } catch {
            reply = localAnswer(text);
          }
        } else {
          reply = localAnswer(text);
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

  Promise.all([
    fetch(bibleUrl).then((r) => (r.ok ? r.json() : null)),
    fetch(packUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ])
    .then(([data, pack]) => {
      bible = data;
      mdChunks = [];
      if (pack && Array.isArray(pack.files)) {
        pack.files.forEach((f) => {
          mdChunks = mdChunks.concat(chunkMarkdown(f.name, f.text || ""));
        });
      }
    })
    .catch(() => {
      bible = null;
    })
    .finally(mount);
})();
