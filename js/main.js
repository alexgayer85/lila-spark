(function () {
  const year = String(new Date().getFullYear());
  document.querySelectorAll("#year, .js-year").forEach((el) => {
    el.textContent = year;
  });

  const header = document.querySelector(".site-header");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      nav.classList.toggle("is-open", !open);
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        nav.classList.remove("is-open");
      });
    });
  }

  // Placeholder socials: prevent dead navigation until real URLs are set
  document.querySelectorAll('a[data-placeholder="true"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
    });
    a.setAttribute("title", "Link coming soon");
    a.setAttribute("aria-disabled", "true");
  });

  // Only one track plays at a time
  const players = () => Array.from(document.querySelectorAll("audio.track-audio"));
  document.querySelectorAll("audio.track-audio").forEach((audio) => {
    audio.addEventListener("play", () => {
      players().forEach((other) => {
        if (other !== audio && !other.paused) other.pause();
      });
    });
  });

  function pauseAllAudio() {
    players().forEach((a) => {
      if (!a.paused) a.pause();
    });
  }

  // Album picker: show only selected album's tracks
  const albumCards = Array.from(document.querySelectorAll(".album-card[data-album]"));
  const albumPanels = Array.from(document.querySelectorAll(".album-panel[data-album]"));

  function selectAlbum(id) {
    pauseAllAudio();
    albumCards.forEach((card) => {
      const on = card.dataset.album === id;
      card.classList.toggle("is-active", on);
      card.setAttribute("aria-selected", on ? "true" : "false");
      card.tabIndex = on ? 0 : -1;
    });
    albumPanels.forEach((panel) => {
      const on = panel.dataset.album === id;
      panel.classList.toggle("is-active", on);
      if (on) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });
  }

  albumCards.forEach((card) => {
    card.addEventListener("click", () => selectAlbum(card.dataset.album));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectAlbum(card.dataset.album);
      }
      // Arrow keys between albums
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const i = albumCards.indexOf(card);
        const next =
          e.key === "ArrowRight"
            ? albumCards[(i + 1) % albumCards.length]
            : albumCards[(i - 1 + albumCards.length) % albumCards.length];
        selectAlbum(next.dataset.album);
        next.focus();
      }
    });
  });

  // Deep link: music.html?album=sparked or #panel-sparked
  const hash = window.location.hash.replace(/^#/, "");
  const albumParam = new URLSearchParams(window.location.search).get("album");
  if (albumCards.length) {
    if (hash.startsWith("panel-") || hash.startsWith("era-")) {
      const id = hash.replace(/^(panel|era)-/, "");
      if (albumCards.some((c) => c.dataset.album === id)) selectAlbum(id);
    } else if (albumParam && albumCards.some((c) => c.dataset.album === albumParam)) {
      selectAlbum(albumParam);
    }
  }
})();
