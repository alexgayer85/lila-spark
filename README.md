# Lila Spark

Artist site for [lila-spark.com](https://lila-spark.com), hosted on **GitHub Pages**.

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
