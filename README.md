# Lila Spark

Artist site for [lila-spark.com](https://lila-spark.com), hosted on **GitHub Pages**.

**Copyright © 2026 Alex Gayer. All rights reserved.** Lila Spark and all materials in this repository are the exclusive property of Alex Gayer. See [COPYRIGHT.md](COPYRIGHT.md).

## Pages

| Page | File | Purpose |
|------|------|---------|
| Home | `index.html` | Hero, featured track, era arc, story teaser |
| Music | `music.html` | Full discography (album art → tracklists) |
| Story | `story.html` | Long bio, partnership, family |
| Photos | `photos.html` | Gallery |
| Contact | `contact.html` | Email + socials |

## Local preview

```bash
cd ~/lila-spark
python3 -m http.server 8080
```

Open <http://localhost:8080>.

## Deploy

Pushes to `main` publish via GitHub Pages (`main` / root). Custom domain: `lila-spark.com` (`CNAME`).

## Editing

- Home copy: `index.html`
- Bio / family: `story.html`
- Tracks: `music.html` + files in `audio/`
- Covers: `images/covers/`
- Profile: `images/profile.jpg`
- Styles: `css/styles.css` (bump `?v=` in HTML when testing cache)


## Photos gallery

Layout is a **justified row gallery** (like Google Photos): each image keeps its native aspect ratio — no forced crop.

1. Add files under `images/gallery/` (or any path under the site).
2. Append an entry in `data/photos.json`:

```json
{
  "src": "images/gallery/my-shot.jpg",
  "alt": "Description",
  "caption": "Optional caption"
}
```

3. Commit and push. Pages rebuild automatically.

### Web uploads?

GitHub Pages is static — the browser cannot write files to the repo by itself. Real “upload from the website with login” needs a small backend (Cloudflare R2 + Worker, Supabase Storage, S3, etc.). Until then, add photos via git as above.
