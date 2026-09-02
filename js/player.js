(function () {
  const CATALOG_URL = "data/catalog.json";
  const LYRICS_DIR = "data/lyrics/";
  const PROXY = "https://lila-spark-chat.alexgayer85.workers.dev";
  const SECRET_KEY = "lila-log-secret";

  const root = document.getElementById("ls-player");
  if (!root) return;

  const els = {
    cover: root.querySelector("[data-cover]"),
    title: root.querySelector("[data-title]"),
    desc: root.querySelector("[data-desc]"),
    album: root.querySelector("[data-album-name]"),
    wave: root.querySelector("[data-wave]"),
    lyrics: root.querySelector("[data-lyrics]"),
    play: root.querySelector("[data-play]"),
    prev: root.querySelector("[data-prev]"),
    next: root.querySelector("[data-next]"),
    skips: root.querySelectorAll("[data-skip]"),
    seek: root.querySelector("[data-seek]"),
    cur: root.querySelector("[data-cur]"),
    dur: root.querySelector("[data-dur]"),
    seekFill: root.querySelector("[data-seek-fill]"),
    audio: root.querySelector("audio"),
    editor: root.querySelector("[data-editor]"),
    editToggle: root.querySelector("[data-edit-toggle]"),
    editRows: root.querySelector("[data-edit-rows]"),
    stamp: root.querySelector("[data-stamp]"),
    addLine: root.querySelector("[data-add-line]"),
    addBreak: root.querySelector("[data-add-break]"),
    download: root.querySelector("[data-download]"),
    revert: root.querySelector("[data-revert]"),
    publish: root.querySelector("[data-publish]"),
    publishPass: root.querySelector("[data-publish-pass]"),
    publishStatus: root.querySelector("[data-publish-status]"),
  };

  const state = {
    catalog: null,
    albumId: null,
    index: 0,
    lyrics: { lines: [], timed: false, title: "", durationHint: null },
    estimates: [],
    editIndex: 0,
    editing: false,
    scrubbing: false,
    wantPlay: false,
    raf: 0,
    loadId: 0,
    blobUrl: "",
    peaks: null,
    pcm: null,
    pcmRate: 0,
    smoothBars: null,
    decodeDuration: 0,
    decodeCtx: null,
  };

  function lyricKey(track) {
    return "lila-lyrics:" + (track.lyrics || track.id);
  }

  function albums() {
    return (state.catalog && state.catalog.albums) || [];
  }

  function albumById(id) {
    return albums().find((a) => a.id === id) || albums()[0];
  }

  function currentAlbum() {
    return albumById(state.albumId);
  }

  function currentTrack() {
    const a = currentAlbum();
    return a && a.tracks[state.index];
  }

  function mediaDuration(audio) {
    const el = audio || els.audio;
    const d = el.duration;
    if (Number.isFinite(d) && d > 0) return d;
    if (Number.isFinite(state.decodeDuration) && state.decodeDuration > 0) {
      return state.decodeDuration;
    }
    const hint =
      (currentTrack() && currentTrack().duration) ||
      (state.lyrics && state.lyrics.durationHint);
    if (Number.isFinite(hint) && hint > 0) return hint;
    return 0;
  }

  function setSeekUi(ratio) {
    const r = Math.min(1, Math.max(0, ratio));
    if (els.seekFill) els.seekFill.style.width = r * 100 + "%";
    if (els.seek) {
      els.seek.setAttribute("aria-valuenow", String(Math.round(r * 1000)));
    }
  }

  function seekTo(seconds) {
    const d = mediaDuration();
    let t = Number(seconds);
    if (!Number.isFinite(t)) return;
    if (d) t = Math.min(Math.max(0, t), d);
    else t = Math.max(0, t);
    try {
      els.audio.currentTime = t;
    } catch {
      /* some browsers throw if not ready */
    }
    els.cur.textContent = fmt(t);
    if (d) setSeekUi(t / d);
  }

  function fmt(t) {
    if (!Number.isFinite(t) || t < 0) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function fmtPrecise(t) {
    if (!Number.isFinite(t) || t < 0) return "";
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return m + ":" + s.toFixed(2).padStart(5, "0");
  }

  function parseTime(raw) {
    const s = String(raw || "").trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
    const m = s.match(/^(\d+):(\d+(?:\.\d+)?)$/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function srcFor(track) {
    return track.audio;
  }

  function fallbackSrc(track) {
    return track.preview || null;
  }

  function normalizePack(data, title) {
    const lines = (data.lines || []).map((l) => ({
      text: String((l && l.text) || ""),
      section: (l && l.section) || "",
      t: l && typeof l.t === "number" ? l.t : undefined,
      break: !!(l && l.break),
    }));
    return {
      title: data.title || title || "",
      durationHint: data.durationHint || null,
      timed: lines.some((l) => typeof l.t === "number"),
      lines,
    };
  }

  function lyricSlug(track) {
    return String((track && (track.lyrics || track.id)) || "").replace(/[^a-z0-9-]/g, "");
  }

  async function fetchLyricFile(track) {
    const slug = lyricSlug(track);
    if (!slug) return { title: track.title, durationHint: null, timed: false, lines: [] };
    try {
      const live = await fetch(PROXY + "/lyrics/" + encodeURIComponent(slug));
      if (live.ok) return normalizePack(await live.json(), track.title);
    } catch {
      /* fall through to repo file */
    }
    if (!track.lyrics) return { title: track.title, durationHint: null, timed: false, lines: [] };
    const res = await fetch(LYRICS_DIR + track.lyrics + ".json");
    if (!res.ok) throw new Error("no lyrics");
    return normalizePack(await res.json(), track.title);
  }

  async function loadLyrics(track, { forceFile } = {}) {
    state.estimates = [];
    try {
      if (forceFile) {
        if (!track.lyrics) {
          state.lyrics = { title: track.title, durationHint: null, timed: false, lines: [] };
        } else {
          const res = await fetch(LYRICS_DIR + track.lyrics + ".json");
          if (!res.ok) throw new Error("no lyrics");
          state.lyrics = normalizePack(await res.json(), track.title);
        }
      } else {
        const saved = localStorage.getItem(lyricKey(track));
        if (saved) state.lyrics = normalizePack(JSON.parse(saved), track.title);
        else state.lyrics = await fetchLyricFile(track);
      }
    } catch {
      state.lyrics = { title: track.title, durationHint: null, timed: false, lines: [] };
    }
    state.editIndex = 0;
    buildEstimates(els.audio.duration);
    renderLyrics(-1);
    renderEditor();
  }

  function persistLyrics() {
    const track = currentTrack();
    if (!track) return;
    localStorage.setItem(lyricKey(track), JSON.stringify(packForSave()));
  }

  function packForSave() {
    const lines = state.lyrics.lines.map((l) => {
      const row = { text: l.text, section: l.section || "" };
      if (typeof l.t === "number") row.t = Math.round(l.t * 100) / 100;
      if (l.break) row.break = true;
      return row;
    });
    return {
      title: state.lyrics.title || (currentTrack() && currentTrack().title) || "",
      durationHint: state.lyrics.durationHint || null,
      timed: lines.some((l) => typeof l.t === "number"),
      lines,
    };
  }

  function buildEstimates(duration) {
    const lines = state.lyrics.lines;
    state.estimates = [];
    if (!lines.length) return;
    const dur = duration || state.lyrics.durationHint || 180;
    const start = dur * 0.06;
    const span = dur * 0.86;
    const weights = lines.map((l) => Math.max(4, String(l.text).split(/\s+/).length));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    lines.forEach((_, i) => {
      state.estimates[i] = start + (acc / total) * span;
      acc += weights[i];
    });
  }

  function lineTime(i) {
    const l = state.lyrics.lines[i];
    if (l && typeof l.t === "number") return l.t;
    return state.estimates[i];
  }

  function activeLine(time) {
    const lines = state.lyrics.lines;
    if (!lines.length) return -1;
    let i = 0;
    for (let n = 0; n < lines.length; n++) {
      const t = lineTime(n);
      if (typeof t === "number" && t <= time) i = n;
    }
    return i;
  }

  function isBreak(line) {
    if (!line) return false;
    if (line.break) return true;
    const s = String(line.section || "").toLowerCase();
    if (s.indexOf("instrumental") >= 0) return true;
    const text = String(line.text || "").replace(/\s/g, "");
    return text.length > 0 && /^[♪.·•]+$/.test(text);
  }

  function lyricsFingerprint() {
    const track = currentTrack();
    const sig = state.lyrics.lines
      .map((l) => (l.break ? "b" : "l") + (l.t != null ? l.t : "") + (l.text || ""))
      .join("|");
    return (track && track.id) + ":" + sig;
  }

  function applyKaraoke() {
    buildEstimates(els.audio.duration);
    if (els.lyrics) els.lyrics.dataset.fp = "";
    renderLyrics(activeLine(els.audio.currentTime || 0));
  }

  function syncEditorIntoState() {
    if (!els.editRows) return;
    els.editRows.querySelectorAll("[data-edit-i]").forEach(readEditorRow);
  }

  function renderLyrics(active) {
    const box = els.lyrics;
    const lines = state.lyrics.lines;
    if (!lines.length) {
      box.innerHTML = '<p class="ls-lyric-empty">Lyrics aren’t locked for this one yet.</p>';
      return;
    }
    const fp = lyricsFingerprint();
    let trackEl = box.querySelector(".ls-lyrics-track");
    if (!trackEl || box.dataset.fp !== fp) {
      box.dataset.fp = fp;
      box.innerHTML =
        '<div class="ls-lyrics-track">' +
        lines
          .map((l, i) => {
            const br = isBreak(l) ? " is-break" : "";
            const label = isBreak(l) ? escapeHtml(l.text || "♪ ♪ ♪") : escapeHtml(l.text);
            return `<p class="ls-lyric-line${br}" data-i="${i}">${label}</p>`;
          })
          .join("") +
        "</div>";
      trackEl = box.querySelector(".ls-lyrics-track");
    }
    const kids = trackEl.children;
    for (let i = 0; i < kids.length; i++) {
      kids[i].className =
        "ls-lyric-line" +
        (isBreak(lines[i]) ? " is-break" : "") +
        (i === active ? " is-current" : i === active - 1 || i === active + 1 ? " is-near" : "");
    }
    const idx = active >= 0 ? active : 0;
    const cur = kids[idx];
    if (!cur) return;
    const y = cur.offsetTop + cur.offsetHeight / 2 - box.clientHeight / 2;
    trackEl.style.transform = "translateY(" + -y + "px)";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function setPlaying(on) {
    root.classList.toggle("is-playing", on);
    els.play.setAttribute("aria-label", on ? "Pause" : "Play");
    els.play.innerHTML = on ? icons.pause : icons.play;
  }

  const icons = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
  };

  const FFT_N = 1024;
  const BAR_N = 48;

  function fftMags(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        const tr = re[i];
        re[i] = re[j];
        re[j] = tr;
        const ti = im[i];
        im[i] = im[j];
        im[j] = ti;
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = (Math.PI * 2) / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0; j < half; j++) {
          const ang = step * j;
          const wr = Math.cos(ang);
          const wi = -Math.sin(ang);
          const ur = re[i + j];
          const ui = im[i + j];
          const vr = re[i + j + half] * wr - im[i + j + half] * wi;
          const vi = re[i + j + half] * wi + im[i + j + half] * wr;
          re[i + j] = ur + vr;
          im[i + j] = ui + vi;
          re[i + j + half] = ur - vr;
          im[i + j + half] = ui - vi;
        }
      }
    }
    const mags = new Float32Array(n / 2);
    const inv = 1 / n;
    for (let i = 0; i < mags.length; i++) {
      mags[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) * inv;
    }
    return mags;
  }

  function liveBands(time) {
    const pcm = state.pcm;
    const out = new Float32Array(BAR_N);
    if (!pcm || !state.pcmRate) return out;
    const start = Math.max(0, Math.min(pcm.length - FFT_N, Math.floor(time * state.pcmRate)));
    const re = new Float32Array(FFT_N);
    const im = new Float32Array(FFT_N);
    for (let i = 0; i < FFT_N; i++) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_N - 1)));
      re[i] = (pcm[start + i] || 0) * hann;
    }
    const mags = fftMags(re, im);
    const ny = mags.length;
    for (let i = 0; i < BAR_N; i++) {
      const t0 = i / BAR_N;
      const t1 = (i + 1) / BAR_N;
      const a = 1 + Math.pow(ny - 1, t0);
      const b = 1 + Math.pow(ny - 1, t1);
      const lo = Math.max(1, Math.floor(a));
      const hi = Math.max(lo + 1, Math.min(ny, Math.floor(b)));
      let sum = 0;
      for (let k = lo; k < hi; k++) sum += mags[k];
      const raw = (sum / (hi - lo)) * (1.2 + i / BAR_N);
      out[i] = Math.min(1, Math.pow(raw * 18, 0.55));
    }
    return out;
  }

  function decodePeaks(buf) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!state.decodeCtx) state.decodeCtx = new AC();
    const id = state.loadId;
    state.decodeCtx.decodeAudioData(
      buf,
      (decoded) => {
        if (id !== state.loadId) return;
        state.pcm = decoded.getChannelData(0);
        state.pcmRate = decoded.sampleRate;
        state.decodeDuration = decoded.duration;
        state.smoothBars = new Float32Array(BAR_N);
        const d = mediaDuration();
        if (d) {
          els.dur.textContent = fmt(d);
          buildEstimates(d);
        }
      },
      () => {}
    );
  }

  function drawWave() {
    const canvas = els.wave;
    if (!canvas) return;
    const ctx2 = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const gap = 3;
    const bw = (w - gap * (BAR_N - 1)) / BAR_N;
    if (!state.smoothBars) state.smoothBars = new Float32Array(BAR_N);

    function frame() {
      state.raf = requestAnimationFrame(frame);
      const playing = !els.audio.paused;
      const t = els.audio.currentTime || 0;
      const live = liveBands(t);
      ctx2.clearRect(0, 0, w, h);
      for (let i = 0; i < BAR_N; i++) {
        const target = playing ? live[i] : live[i] * 0.22;
        const prev = state.smoothBars[i];
        const rise = target > prev;
        state.smoothBars[i] = prev + (target - prev) * (rise ? 0.45 : 0.12);
        const bh = Math.max(4, state.smoothBars[i] * (h - 4));
        const x = i * (bw + gap);
        const y = (h - bh) / 2;
        const g = ctx2.createLinearGradient(x, y, x, y + bh);
        g.addColorStop(0, "#2de2ff");
        g.addColorStop(0.55, "#9b5cff");
        g.addColorStop(1, "#ff2d95");
        ctx2.fillStyle = g;
        const rad = Math.min(3, bw / 2);
        ctx2.beginPath();
        ctx2.moveTo(x + rad, y);
        ctx2.arcTo(x + bw, y, x + bw, y + bh, rad);
        ctx2.arcTo(x + bw, y + bh, x, y + bh, rad);
        ctx2.arcTo(x, y + bh, x, y, rad);
        ctx2.arcTo(x, y, x + bw, y, rad);
        ctx2.closePath();
        ctx2.fill();
      }
    }
    cancelAnimationFrame(state.raf);
    frame();
  }

  async function loadBlob(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch " + res.status);
    return res.arrayBuffer();
  }

  async function loadTrack(albumId, index, play) {
    const album = albumById(albumId);
    if (!album) return;
    state.albumId = album.id;
    state.index = Math.max(0, Math.min(index, album.tracks.length - 1));
    const track = currentTrack();
    const cover = track.cover || album.cover;
    els.cover.src = cover;
    els.cover.alt = "";
    els.title.textContent = track.title;
    const bits = [album.title];
    if (track.explicit) bits.push("Explicit");
    els.album.textContent = bits.join(" · ");
    if (els.desc) {
      els.desc.textContent = track.description || "";
      els.desc.hidden = !track.description;
    }
    state.wantPlay = !!play;
    state.peaks = null;
    state.pcm = null;
    state.pcmRate = 0;
    state.smoothBars = null;
    state.decodeDuration = 0;
    const loadId = ++state.loadId;
    els.audio.removeAttribute("crossorigin");
    els.audio.preload = "auto";
    await loadLyrics(track);
    highlightRow();
    setPlaying(false);
    const pageUrl = new URL(window.location.href);
    pageUrl.searchParams.set("album", album.id);
    pageUrl.searchParams.set("track", track.id);
    if (state.editing) pageUrl.searchParams.set("edit", "1");
    else pageUrl.searchParams.delete("edit");
    history.replaceState({}, "", pageUrl.pathname + pageUrl.search);

    const urls = [srcFor(track), fallbackSrc(track)].filter(Boolean);
    let buf = null;
    for (const u of urls) {
      try {
        buf = await loadBlob(u);
        break;
      } catch {
        buf = null;
      }
    }
    if (loadId !== state.loadId) return;
    if (!buf) {
      els.dur.textContent = "0:00";
      return;
    }
    if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
    state.blobUrl = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
    decodePeaks(buf.slice(0));
    await new Promise((resolve) => {
      let done = false;
      const ready = () => {
        if (done) return;
        done = true;
        els.audio.removeEventListener("loadedmetadata", ready);
        els.audio.removeEventListener("canplay", ready);
        resolve();
      };
      els.audio.addEventListener("loadedmetadata", ready);
      els.audio.addEventListener("canplay", ready);
      els.audio.src = state.blobUrl;
      setTimeout(ready, 4000);
    });
    if (loadId !== state.loadId) return;
    if (play) {
      try {
        await els.audio.play();
      } catch {
        /* autoplay blocked */
      }
    }
  }

  function highlightRow() {
    document.querySelectorAll(".ls-row").forEach((row) => {
      const on = row.dataset.album === state.albumId && Number(row.dataset.index) === state.index;
      row.classList.toggle("is-current", on);
      row.setAttribute("aria-current", on ? "true" : "false");
    });
  }

  function renderLists() {
    albums().forEach((album) => {
      const list = document.querySelector('.track-list[data-album="' + album.id + '"]');
      if (!list) return;
      list.innerHTML = album.tracks
        .map((t, i) => {
          const cover = t.cover
            ? `<img class="track-cover" src="${t.cover}" alt="" width="56" height="56" />`
            : "";
          const e = t.explicit
            ? '<abbr class="explicit-mark" title="Explicit lyrics">E</abbr>'
            : "";
          const feat = t.featured ? " track-card-feature" : "";
          const hasCover = t.cover ? " has-cover" : "";
          const desc = t.description
            ? `<span class="track-desc">${escapeHtml(t.description)}</span>`
            : "";
          return `<li>
            <button type="button" class="ls-row track-card${feat}${hasCover}" data-album="${album.id}" data-index="${i}">
              ${cover}
              <span class="track-num">${t.num}</span>
              <span class="track-body">
                <span class="track-title">${escapeHtml(t.title)}${e}</span>
                ${desc}
              </span>
            </button>
          </li>`;
        })
        .join("");
    });
    albums().forEach((album) => {
      const n = album.tracks.length;
      const sub = document.querySelector('.album-card[data-album="' + album.id + '"] .album-sub');
      if (sub && !album.subtitle) sub.textContent = n + " tracks";
    });
  }

  function next(delta) {
    const album = currentAlbum();
    if (!album) return;
    const i = (state.index + delta + album.tracks.length) % album.tracks.length;
    loadTrack(album.id, i, true);
  }

  function setEditing(on) {
    state.editing = !!on;
    root.classList.toggle("is-editing", state.editing);
    if (els.editor) els.editor.hidden = !state.editing;
    if (els.editToggle) {
      els.editToggle.textContent = state.editing ? "Done editing" : "Edit lyrics & timing";
    }
    renderEditor();
  }

  function renderEditor() {
    if (!els.editRows || !state.editing) return;
    const lines = state.lyrics.lines;
    els.editRows.innerHTML = lines
      .map((l, i) => {
        const sel = i === state.editIndex ? " is-selected" : "";
        const t = typeof l.t === "number" ? fmtPrecise(l.t) : "";
        const br = isBreak(l) ? " is-break" : "";
        return `<div class="ls-edit-row${sel}${br}" data-edit-i="${i}">
          <input class="ls-edit-time" data-field="t" value="${escapeHtml(t)}" aria-label="Time" />
          <input class="ls-edit-text" data-field="text" value="${escapeHtml(l.text)}" aria-label="Lyric" />
          <button type="button" class="ls-edit-del" data-del="${i}" aria-label="Remove line">×</button>
        </div>`;
      })
      .join("");
    const sel = els.editRows.querySelector(".is-selected");
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }

  function readEditorRow(row) {
    const i = Number(row.dataset.editI);
    const line = state.lyrics.lines[i];
    if (!line) return;
    const text = row.querySelector('[data-field="text"]').value;
    const t = parseTime(row.querySelector('[data-field="t"]').value);
    line.text = text;
    if (t == null) delete line.t;
    else line.t = t;
    line.break = isBreak(line);
    state.lyrics.timed = state.lyrics.lines.some((l) => typeof l.t === "number");
  }

  function stampLine() {
    syncEditorIntoState();
    const i = state.editIndex;
    const line = state.lyrics.lines[i];
    if (!line) return;
    line.t = Math.round(els.audio.currentTime * 100) / 100;
    state.lyrics.timed = true;
    if (i < state.lyrics.lines.length - 1) state.editIndex = i + 1;
    persistLyrics();
    renderEditor();
    applyKaraoke();
  }

  function addLine() {
    syncEditorIntoState();
    state.lyrics.lines.splice(state.editIndex + 1, 0, { text: "", section: "" });
    state.editIndex += 1;
    persistLyrics();
    renderEditor();
    applyKaraoke();
  }

  function addBreak() {
    syncEditorIntoState();
    const now = Math.round((els.audio.currentTime || 0) * 100) / 100;
    const i = Math.max(0, state.editIndex);
    const cur = state.lyrics.lines[i];
    const curT = cur && typeof cur.t === "number" ? cur.t : null;
    const alreadyPassed = cur && !isBreak(cur) && curT != null && curT <= now + 0.2;
    const at = alreadyPassed ? i + 1 : i;
    state.lyrics.lines.splice(at, 0, {
      text: "♪ ♪ ♪",
      section: "Instrumental",
      t: now,
      break: true,
    });
    state.editIndex = Math.min(at + 1, state.lyrics.lines.length - 1);
    state.lyrics.timed = true;
    persistLyrics();
    renderEditor();
    applyKaraoke();
  }

  function downloadPack() {
    const track = currentTrack();
    if (!track) return;
    const name = lyricSlug(track) + ".json";
    const blob = new Blob([JSON.stringify(packForSave(), null, 2) + "\n"], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function setPublishStatus(msg, kind) {
    const el = els.publishStatus || root.querySelector("[data-publish-status]");
    els.publishStatus = el;
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("is-ok", "is-bad");
    if (kind) el.classList.add(kind);
  }

  function editorPassword() {
    const typed = els.publishPass && els.publishPass.value.trim();
    if (typed) {
      sessionStorage.setItem(SECRET_KEY, typed);
      return typed;
    }
    return sessionStorage.getItem(SECRET_KEY) || "";
  }

  async function publishLyrics() {
    const track = currentTrack();
    if (!track || !els.publish) return;
    const slug = lyricSlug(track);
    if (!slug) return;
    syncEditorIntoState();
    const secret = editorPassword();
    if (!secret) {
      setPublishStatus("Enter the logs password, then Save live.", "is-bad");
      if (els.publishPass) els.publishPass.focus();
      return;
    }
    els.publish.disabled = true;
    const prevLabel = els.publish.textContent;
    els.publish.textContent = "Saving…";
    setPublishStatus("Saving…");
    try {
      const res = await fetch(PROXY + "/lyrics/" + encodeURIComponent(slug), {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + secret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(packForSave()),
      });
      if (res.status === 401) {
        sessionStorage.removeItem(SECRET_KEY);
        if (els.publishPass) els.publishPass.value = "";
        setPublishStatus("Wrong password.", "is-bad");
        return;
      }
      if (!res.ok) throw new Error("http " + res.status);
      persistLyrics();
      applyKaraoke();
      els.publish.textContent = "Saved";
      setPublishStatus("Saved. Keep playing this track.", "is-ok");
      setTimeout(() => {
        if (els.publish) els.publish.textContent = prevLabel;
      }, 2500);
    } catch (err) {
      setPublishStatus("Save failed. Check the network and try again.", "is-bad");
      console.error(err);
    } finally {
      els.publish.disabled = false;
      if (els.publish && els.publish.textContent === "Saving…") {
        els.publish.textContent = prevLabel;
      }
    }
  }

  els.audio.addEventListener("play", () => {
    setPlaying(true);
    drawWave();
  });
  els.audio.addEventListener("pause", () => {
    setPlaying(false);
  });
  els.audio.addEventListener("ended", () => next(1));
  function refreshTimes() {
    const t = els.audio.currentTime || 0;
    const d = mediaDuration();
    els.cur.textContent = fmt(t);
    if (d) {
      els.dur.textContent = fmt(d);
      if (!state.scrubbing) setSeekUi(t / d);
    }
  }

  els.audio.addEventListener("timeupdate", () => {
    refreshTimes();
    const t = els.audio.currentTime || 0;
    const i = activeLine(t);
    if (i !== Number(els.lyrics.dataset.active)) {
      els.lyrics.dataset.active = String(i);
      renderLyrics(i);
    }
  });
  els.audio.addEventListener("durationchange", () => {
    const d = mediaDuration();
    if (d) {
      els.dur.textContent = fmt(d);
      buildEstimates(d);
    }
  });
  els.audio.addEventListener("loadedmetadata", () => {
    const d = mediaDuration();
    els.dur.textContent = fmt(d);
    buildEstimates(d);
  });
  els.audio.addEventListener("error", () => {
    /* blob load failures are handled in loadTrack */
  });

  els.play.addEventListener("click", () => {
    if (els.audio.paused) {
      state.wantPlay = true;
      els.audio.play().catch(() => {});
    } else {
      state.wantPlay = false;
      els.audio.pause();
    }
  });
  els.prev.addEventListener("click", () => next(-1));
  els.next.addEventListener("click", () => next(1));
  els.skips.forEach((btn) => {
    btn.addEventListener("click", () => {
      seekTo((els.audio.currentTime || 0) + Number(btn.dataset.skip));
    });
  });

  function ratioFromPointer(e) {
    if (!els.seek) return;
    const point = e.touches && e.touches[0] ? e.touches[0] : e;
    const rect = els.seek.getBoundingClientRect();
    if (!rect.width) return;
    const r = Math.min(1, Math.max(0, (point.clientX - rect.left) / rect.width));
    const d = mediaDuration();
    setSeekUi(r);
    if (d) seekTo(r * d);
  }

  const seekPtr = { x: 0, y: 0, id: null, locked: false };

  els.seek.addEventListener("pointerdown", (e) => {
    seekPtr.x = e.clientX;
    seekPtr.y = e.clientY;
    seekPtr.id = e.pointerId;
    seekPtr.locked = false;
    state.scrubbing = false;
  });
  els.seek.addEventListener("pointermove", (e) => {
    if (seekPtr.id !== e.pointerId) return;
    const dx = e.clientX - seekPtr.x;
    const dy = e.clientY - seekPtr.y;
    if (!seekPtr.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        seekPtr.id = null;
        return;
      }
      seekPtr.locked = true;
      state.scrubbing = true;
      try {
        els.seek.setPointerCapture(e.pointerId);
      } catch {
        /* capture optional */
      }
    }
    if (state.scrubbing) ratioFromPointer(e);
  });
  function endScrub(e) {
    if (seekPtr.id !== e.pointerId) return;
    if (state.scrubbing || (!seekPtr.locked && Math.hypot(e.clientX - seekPtr.x, e.clientY - seekPtr.y) < 8)) {
      ratioFromPointer(e);
    }
    state.scrubbing = false;
    seekPtr.id = null;
    seekPtr.locked = false;
  }
  els.seek.addEventListener("pointerup", endScrub);
  els.seek.addEventListener("pointercancel", () => {
    state.scrubbing = false;
    seekPtr.id = null;
    seekPtr.locked = false;
  });
  let lyricTap = null;
  els.lyrics.addEventListener("pointerdown", (e) => {
    lyricTap = { x: e.clientX, y: e.clientY };
  });
  els.lyrics.addEventListener("click", (e) => {
    if (lyricTap && Math.hypot(e.clientX - lyricTap.x, e.clientY - lyricTap.y) > 10) return;
    const line = e.target.closest("[data-i]");
    if (!line) return;
    const t = lineTime(Number(line.dataset.i));
    if (typeof t === "number") seekTo(t);
  });

  document.addEventListener("click", (e) => {
    const row = e.target.closest(".ls-row");
    if (!row) return;
    loadTrack(row.dataset.album, Number(row.dataset.index), true);
  });

  if (els.editToggle) {
    els.editToggle.addEventListener("click", () => setEditing(!state.editing));
  }
  if (els.stamp) els.stamp.addEventListener("click", stampLine);
  if (els.addLine) els.addLine.addEventListener("click", addLine);
  if (els.addBreak) els.addBreak.addEventListener("click", addBreak);
  if (els.download) els.download.addEventListener("click", downloadPack);
  if (els.publish) els.publish.addEventListener("click", () => publishLyrics());
  if (els.revert) {
    els.revert.addEventListener("click", async () => {
      const track = currentTrack();
      if (!track) return;
      localStorage.removeItem(lyricKey(track));
      await loadLyrics(track, { forceFile: true });
    });
  }
  if (els.editRows) {
    els.editRows.addEventListener("focusin", (e) => {
      const row = e.target.closest("[data-edit-i]");
      if (!row) return;
      state.editIndex = Number(row.dataset.editI);
      els.editRows.querySelectorAll(".ls-edit-row").forEach((r) => {
        r.classList.toggle("is-selected", r === row);
      });
    });
    els.editRows.addEventListener("input", (e) => {
      const row = e.target.closest("[data-edit-i]");
      if (!row) return;
      readEditorRow(row);
      persistLyrics();
      if (e.target.dataset.field === "text") {
        renderLyrics(activeLine(els.audio.currentTime || 0));
      }
    });
    els.editRows.addEventListener("click", (e) => {
      const del = e.target.closest("[data-del]");
      if (!del) return;
      const i = Number(del.dataset.del);
      state.lyrics.lines.splice(i, 1);
      state.editIndex = Math.max(0, Math.min(i, state.lyrics.lines.length - 1));
      persistLyrics();
      renderEditor();
      renderLyrics(activeLine(els.audio.currentTime || 0));
    });
  }

  document.addEventListener("keydown", (e) => {
    if (state.editing && e.key === "Enter" && e.target.closest(".ls-edit")) {
      e.preventDefault();
      const row = e.target.closest("[data-edit-i]");
      if (row) readEditorRow(row);
      stampLine();
      return;
    }
    if (e.target.closest("input, textarea, [contenteditable]")) return;
    if (state.editing && e.key === "Enter") {
      e.preventDefault();
      stampLine();
      return;
    }
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      els.play.click();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      seekTo((els.audio.currentTime || 0) - 5);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      seekTo((els.audio.currentTime || 0) + 5);
    }
  });

  window.addEventListener("lila:album", (e) => {
    const id = e.detail && e.detail.id;
    if (!id || id === state.albumId) return;
    loadTrack(id, 0, false);
  });

  fetch(CATALOG_URL)
    .then((r) => r.json())
    .then((cat) => {
      state.catalog = cat;
      renderLists();
      const params = new URLSearchParams(location.search);
      if (params.get("edit") === "1") setEditing(true);
      const albumId = params.get("album") || (albums()[0] && albums()[0].id);
      const trackId = params.get("track");
      const album = albumById(albumId);
      let idx = 0;
      if (trackId && album) {
        const found = album.tracks.findIndex((t) => t.id === trackId);
        if (found >= 0) idx = found;
      }
      loadTrack(album.id, idx, false);
    })
    .catch((err) => {
      els.title.textContent = "Couldn’t load the catalog";
      console.error(err);
    });

  els.play.innerHTML = icons.play;
  drawWave();
})();
