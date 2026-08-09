/**
 * Justified photo gallery (Google / iCloud style).
 * Scales each image to a shared row height so full frames show — no center-crop.
 */
(function () {
  const root = document.getElementById("photo-gallery");
  if (!root) return;

  const GAP = 10;
  const MANIFEST = root.dataset.manifest || "data/photos.json";

  function loadImageMeta(photo) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          ...photo,
          nw: img.naturalWidth || img.width,
          nh: img.naturalHeight || img.height,
          aspect: (img.naturalWidth || 1) / (img.naturalHeight || 1),
        });
      };
      img.onerror = () => reject(new Error("Failed to load " + photo.src));
      img.src = photo.src;
    });
  }

  function layout(items, containerWidth, targetH) {
    if (!items.length || containerWidth < 80) return [];

    const rows = [];
    let row = [];
    let aspectSum = 0;

    const flush = (force) => {
      if (!row.length) return;
      const n = row.length;
      const gaps = GAP * Math.max(0, n - 1);
      // Shared row height so row fills container width (last incomplete row keeps targetH)
      let h;
      if (force && aspectSum * targetH + gaps < containerWidth * 0.92) {
        h = targetH;
      } else {
        h = (containerWidth - gaps) / aspectSum;
        // Cap very tall rows from single ultra-wide images
        h = Math.min(h, targetH * 1.65);
        h = Math.max(h, targetH * 0.55);
      }
      rows.push(
        row.map((item) => ({
          ...item,
          displayW: item.aspect * h,
          displayH: h,
        }))
      );
      row = [];
      aspectSum = 0;
    };

    items.forEach((item) => {
      row.push(item);
      aspectSum += item.aspect;
      const provisional = aspectSum * targetH + GAP * Math.max(0, row.length - 1);
      if (provisional >= containerWidth) flush(false);
    });
    flush(true);
    return rows;
  }

  function render(rows) {
    root.innerHTML = "";
    root.classList.add("is-ready");

    rows.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "photo-row";
      row.forEach((item) => {
        const fig = document.createElement("figure");
        fig.className = "photo-item";
        fig.style.width = item.displayW + "px";
        fig.style.height = item.displayH + "px";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "photo-item-btn";
        btn.setAttribute("aria-label", item.caption || item.alt || "Open photo");

        const img = document.createElement("img");
        img.src = item.src;
        img.alt = item.alt || "";
        img.loading = "lazy";
        img.decoding = "async";
        // Full frame — never crop
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        img.style.objectPosition = "center";

        btn.appendChild(img);
        fig.appendChild(btn);

        if (item.caption) {
          const cap = document.createElement("figcaption");
          cap.className = "photo-item-caption";
          cap.textContent = item.caption;
          fig.appendChild(cap);
        }

        btn.addEventListener("click", () => openLightbox(item));
        rowEl.appendChild(fig);
      });
      root.appendChild(rowEl);
    });
  }

  /* Lightbox */
  let lb;
  function ensureLightbox() {
    if (lb) return lb;
    lb = document.createElement("div");
    lb.className = "photo-lightbox";
    lb.hidden = true;
    lb.innerHTML = `
      <button type="button" class="photo-lightbox-close" aria-label="Close">&times;</button>
      <img class="photo-lightbox-img" alt="" />
      <p class="photo-lightbox-cap"></p>
    `;
    document.body.appendChild(lb);
    lb.addEventListener("click", (e) => {
      if (e.target === lb || e.target.classList.contains("photo-lightbox-close")) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !lb.hidden) closeLightbox();
    });
    return lb;
  }

  function openLightbox(item) {
    const el = ensureLightbox();
    const img = el.querySelector(".photo-lightbox-img");
    const cap = el.querySelector(".photo-lightbox-cap");
    img.src = item.src;
    img.alt = item.alt || "";
    cap.textContent = item.caption || "";
    el.hidden = false;
    document.body.classList.add("lightbox-open");
  }

  function closeLightbox() {
    if (!lb) return;
    lb.hidden = true;
    document.body.classList.remove("lightbox-open");
  }

  let items = [];
  let targetH = 240;
  let ro;

  function relayout() {
    const width = root.clientWidth;
    if (!items.length || width < 40) return;
    render(layout(items, width, targetH));
  }

  async function init() {
    root.innerHTML = '<p class="photo-loading">Loading gallery…</p>';
    try {
      const res = await fetch(MANIFEST, { cache: "no-cache" });
      if (!res.ok) throw new Error("manifest " + res.status);
      const data = await res.json();
      targetH = data.targetRowHeight || 240;
      const list = Array.isArray(data.photos) ? data.photos : [];
      items = (await Promise.all(list.map((p) => loadImageMeta(p).catch(() => null)))).filter(
        Boolean
      );
      if (!items.length) {
        root.innerHTML =
          '<p class="photo-empty">No photos yet. Add files under <code>images/gallery/</code> and list them in <code>data/photos.json</code>.</p>';
        return;
      }
      relayout();
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => {
          window.requestAnimationFrame(relayout);
        });
        ro.observe(root);
      } else {
        window.addEventListener("resize", () => window.requestAnimationFrame(relayout));
      }
    } catch (err) {
      console.error(err);
      root.innerHTML =
        '<p class="photo-empty">Could not load the gallery. Check <code>data/photos.json</code>.</p>';
    }
  }

  init();
})();
