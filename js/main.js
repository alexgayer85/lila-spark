(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

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
  const players = Array.from(document.querySelectorAll("audio.track-audio"));
  players.forEach((audio) => {
    audio.addEventListener("play", () => {
      players.forEach((other) => {
        if (other !== audio && !other.paused) other.pause();
      });
    });
  });
})();
