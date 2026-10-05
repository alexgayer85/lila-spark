/* "Coming soon" block (Home + Music), driven by data/releases.json.
   Before a release date: "Pre-save". From the date (America/Chicago): "Out now" + Listen.
   Hidden `showDaysAfter` days after release. Section stays hidden if nothing is current. */
(function () {
  const sections = document.querySelectorAll("[data-releases-section]");
  if (!sections.length) return;

  const TZ = "America/Chicago";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function today() {
    try {
      const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const g = (t) => p.find((x) => x.type === t).value;
      return g("year") + "-" + g("month") + "-" + g("day");
    } catch (e) {
      return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
    }
  }

  function utc(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  }

  function nice(ymd) {
    const d = new Date(utc(ymd));
    return DAYS[d.getUTCDay()] + ", " + MONTHS[d.getUTCMonth()] + " " + d.getUTCDate();
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function card(r, now) {
    const out = now >= r.date;
    const days = Math.round((utc(r.date) - utc(now)) / 86400000);
    const li = el("li", "release-card" + (out ? " is-out" : ""));

    const art = el("span", "cover-frame release-cover");
    const img = el("img");
    img.src = r.cover;
    img.alt = r.title + " — Lila Spark single cover";
    img.width = 900;
    img.height = 900;
    img.loading = "lazy";
    art.appendChild(img);
    li.appendChild(art);

    const body = el("div", "release-body");
    body.appendChild(el("p", "release-kind", r.kind || "Single"));
    body.appendChild(el("h3", "release-title", r.title));
    const when = out ? "Out now" : "Out " + nice(r.date) + (days === 1 ? " · tomorrow" : " · in " + days + " days");
    const meta = el("p", "release-when", when);
    (r.tags || []).forEach((t) => meta.appendChild(el("span", "release-tag", t)));
    body.appendChild(meta);
    if (r.blurb) body.appendChild(el("p", "release-blurb", r.blurb));

    const href = out ? r.listen || r.presave : r.presave;
    if (href) {
      const a = el("a", "btn btn-primary btn-sm release-btn", out ? "Listen now" : "Pre-save");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", (out ? "Listen to " : "Pre-save ") + r.title);
      body.appendChild(a);
    }
    li.appendChild(body);
    return li;
  }

  fetch(new URL("data/releases.json", document.baseURI).href, { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data || !Array.isArray(data.releases)) return;
      const now = today();
      const keep = Number(data.showDaysAfter) || 21;
      const live = data.releases
        .filter((r) => r && r.title && r.date)
        .filter((r) => (utc(now) - utc(r.date)) / 86400000 < keep)
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      if (!live.length) return;
      const anyUpcoming = live.some((r) => now < r.date);
      sections.forEach((section) => {
        const list = section.querySelector("[data-releases]");
        if (!list) return;
        list.textContent = "";
        live.forEach((r) => list.appendChild(card(r, now)));
        const title = section.querySelector("[data-releases-title]");
        if (title) title.textContent = anyUpcoming ? "Coming soon" : "Out now";
        section.hidden = false;
      });
    })
    .catch(() => {});
})();
