# Updating the Music page

The page is driven by JSON. You should not need to edit `music.html`.

## Add or change a track

Edit `data/catalog.json`.

- `id` is the filename stem. Put the full song at `audio/{id}.mp3`.
- If that file is missing, the player falls back to `preview` (the old 30-second clip).
- `lyrics` is the stem of `data/lyrics/{id}.json`. Set `"lyrics": false` if there is no canon lyric yet (Tiny Hints).
- Optional `cover`, `apple` / `spotify` / `amazon`, `explicit`, `featured`.
- `description` is the one-line blurb under the title (e.g. “A flirty, high-energy dance-pop track…”).

Then refresh the site. Re-run `python3 scripts/build-catalog.py` only if you want to regenerate the whole catalog from that script.

## Lyrics / karaoke timing

On the Music page, open **Edit lyrics & timing** (or add `?edit=1` to the URL).

- Play the track and press **Enter** (or Stamp time) when a line should start. That writes seconds onto the selected line and advances.
- Edit the words in the fields. Add or remove lines as needed.
- Drafts stay in this browser (`localStorage`). **Download JSON** and replace `data/lyrics/{id}.json` in the repo to publish.
- **Revert to file** throws away the local draft.

`python3 scripts/extract-lyrics.py` rebuilds `data/lyrics/*.json` from the bible markdown (this overwrites files — don’t run it after you’ve timed songs unless you mean to).

Each line looks like:

```json
{ "text": "Midnight voltage, running through my body", "section": "Chorus" }
```

The player spreads untimed lines across the song by word count. For real karaoke, add seconds:

```json
{ "t": 42.8, "text": "Midnight voltage, running through my body", "section": "Chorus" }
```

Once any line has `t`, those times win.

## Waveform

Drawn live in the browser from the playing file. No extra assets.
