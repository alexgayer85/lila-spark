# Lila Spark

Artist / music brand site for [lila-spark.com](https://lila-spark.com), hosted on **GitHub Pages**.

## Local preview

```bash
cd ~/lila-spark
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Deploy

Pushes to `main` publish via GitHub Pages (Settings → Pages → Deploy from branch `main` / root).

## Custom domain (Porkbun)

1. In the repo: **Settings → Pages → Custom domain** → `lila-spark.com` (enable HTTPS when available).
2. At Porkbun DNS for `lila-spark.com` — remove parking A records, then set:

| Type  | Host | Answer / value            | TTL  |
|-------|------|---------------------------|------|
| A     | `@`  | `185.199.108.153`         | 600  |
| A     | `@`  | `185.199.109.153`         | 600  |
| A     | `@`  | `185.199.110.153`         | 600  |
| A     | `@`  | `185.199.111.153`         | 600  |
| CNAME | `www`| `alexgayer85.github.io`   | 600  |

DNS can take a few minutes to a few hours. GitHub will issue a free HTTPS certificate.

## Editing copy

- Hero, about, music tracks, contact: `index.html`
- Contact email: search for `mailto:` in `index.html`
- Social links: replace `href="#"` on `.social-link` items and remove `data-placeholder="true"`
- Colors and fonts: `css/styles.css`

## Repo layout

```
index.html
css/styles.css
js/main.js
assets/favicon.svg
CNAME              # custom domain for GitHub Pages
README.md
```
