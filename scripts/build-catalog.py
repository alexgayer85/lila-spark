#!/usr/bin/env python3
"""Write data/catalog.json — the Music page source of truth."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "audio"
SPOTIFY = "https://open.spotify.com/artist/6ARsLc0ziUa7wxmG2WSG0b"
AMAZON = "https://music.amazon.com/artists/B0HCW621SL/lila-spark"


def has_full(slug: str) -> bool:
    return (AUDIO / f"{slug}.mp3").is_file()


def track(
    num,
    title,
    slug,
    *,
    description="",
    cover=None,
    explicit=False,
    featured=False,
    apple=None,
    lyrics=None,
):
    t = {
        "id": slug,
        "num": num,
        "title": title,
        "description": description,
        "audio": f"audio/{slug}.mp3",
        "cover": cover,
        "explicit": explicit,
        "featured": featured,
        "lyrics": False if lyrics is False else (lyrics or slug),
    }
    if apple:
        t["apple"] = apple
        t["spotify"] = SPOTIFY
        t["amazon"] = AMAZON
    if not has_full(slug):
        preview = AUDIO / "previews" / f"{slug}.mp3"
        if preview.is_file():
            t["preview"] = f"audio/previews/{slug}.mp3"
    return t


catalog = {
    "version": 1,
    "note": "Edit this file to add albums/tracks. Drop full mp3s in audio/{id}.mp3. Lyrics live in data/lyrics/{id}.json. Set description for the one-line blurb under the title. Optional LRC-style times: add \"t\": seconds on a line.",
    "albums": [
        {
            "id": "untitled",
            "title": "Untitled",
            "subtitle": "Newest · title TBA",
            "blurb": "New work after Afterglow. A title hasn’t settled yet.",
            "cover": "images/covers/untitled.jpg",
            "unreleased": True,
            "tracks": [
                track(
                    "01",
                    "Can't Keep Up",
                    "cant-keep-up",
                    description="Frustrated mid-tempo pop about prices climbing and the quiet exhaustion of trying to stay afloat.",
                ),
                track(
                    "02",
                    "The Last Time Through the Door",
                    "the-last-time-through-the-door",
                    description="Bittersweet soft pop about walking through a door for the first time — and later for the last.",
                ),
                track(
                    "03",
                    "Tiny Hints",
                    "tiny-hints",
                    lyrics=False,
                    description="An Untitled-era cut. Lyrics aren’t locked in the bible yet.",
                ),
                track(
                    "04",
                    "My Favorite Word",
                    "my-favorite-word",
                    explicit=True,
                    description="Cheeky, bouncy pop-R&B about the one four-letter word she likes saying best.",
                ),
            ],
        },
        {
            "id": "afterglow",
            "title": "Afterglow",
            "subtitle": None,
            "blurb": "Mature, reflective territory — late-night pop with heavier undercurrents.",
            "cover": "images/covers/afterglow.jpg",
            "tracks": [
                track(
                    "★",
                    "You Brought Me to Life",
                    "you-brought-me-to-life",
                    featured=True,
                    description="Sexy dance-pop R&B about the person whose songs woke her all the way up.",
                ),
                track(
                    "01",
                    "Boomerang",
                    "boomerang",
                    description="A flirty, high-energy dance-pop track about feelings that keep coming back no matter what.",
                ),
                track(
                    "02",
                    "Somehow",
                    "somehow",
                    cover="images/covers/somehow.jpg",
                    apple="https://music.apple.com/us/album/somehow/6797913002?i=6797913004",
                    description="Intimate midtempo R&B about staying on someone’s side through the quiet, ordinary hours.",
                ),
                track(
                    "03",
                    "Rhythm Thief",
                    "rhythm-thief",
                    description="Sassy groove-pop about the person who steals her beat the second they walk in.",
                ),
                track(
                    "04",
                    "Almost",
                    "almost",
                    description="Yearning mid-tempo pop-rock about a love that came close enough to haunt her.",
                ),
                track(
                    "05",
                    "Slow Burn",
                    "slow-burn",
                    description="Sensual mid-tempo R&B about taking the night slow and meaning every second of it.",
                ),
                track(
                    "06",
                    "Dark Static",
                    "dark-static",
                    description="Atmospheric late-night dance-pop — city lights, humming bass, and a charge she can’t shake.",
                ),
                track(
                    "07",
                    "Sweet Shock (Lights Go Low)",
                    "lights-go-low",
                    lyrics="lights-go-low",
                    description="Sultry club-ready dance-pop for when the lights go low and she’s in total control.",
                ),
                track(
                    "08",
                    "No Apologies",
                    "no-apologies",
                    description="Empowering pop-rock about taking up space and refusing to say sorry for it.",
                ),
                track(
                    "09",
                    "Layla",
                    "layla",
                    cover="images/covers/layla.jpg",
                    description="Dark, furious mid-tempo rock — grief and rage for the sister she still can’t let go.",
                ),
                track(
                    "10",
                    "Hold Me in the Middle",
                    "hold-me-in-the-middle",
                    description="Tender mid-tempo about being little again, swinging between two people who made the world feel light.",
                ),
                track(
                    "11",
                    "Let Me Begin",
                    "let-me-begin",
                    cover="images/covers/let-me-begin.jpg",
                    description="Sultry late-night R&B-pop about claiming someone who isn’t being claimed right.",
                ),
            ],
        },
        {
            "id": "sparked",
            "title": "Sparked",
            "subtitle": None,
            "blurb": "More confident and varied — neon nights, synth glow, and radio-ready hooks.",
            "cover": "images/covers/sparked.jpg",
            "apple": "https://music.apple.com/us/album/sparked/6800083050",
            "spotify": SPOTIFY,
            "amazon": AMAZON,
            "tracks": [
                track("01", "Midnight Voltage", "midnight-voltage", cover="images/covers/midnight-voltage.jpg", apple="https://music.apple.com/us/album/midnight-voltage/6800083050?i=6800083051", description="Dance-pop opener — electric late-night heat running through her body."),
                track("02", "Electric Crush", "electric-crush", cover="images/covers/electric-crush.jpg", apple="https://music.apple.com/us/album/electric-crush/6800083050?i=6800083052", description="A catchy dance-crush banger about the one who makes her heartbeat multiply."),
                track("03", "Frequency of You", "frequency-of-you", cover="images/covers/frequency-of-you.jpg", apple="https://music.apple.com/us/album/frequency-of-you/6800083050?i=6800083053", description="Smooth mid-tempo R&B about being tuned to one person and nobody else."),
                track("04", "No More Hiding", "no-more-hiding", cover="images/covers/no-more-hiding.jpg", apple="https://music.apple.com/us/album/no-more-hiding/6800083050?i=6800083054", description="Empowering pop-rock about stepping into the light and staying there."),
                track("05", "Small Miracles", "small-miracles", cover="images/covers/small-miracles.jpg", apple="https://music.apple.com/us/album/small-miracles/6800083050?i=6800083055", description="Warm uplifting pop about the tiny everyday things that still feel like magic."),
                track("06", "Turn the Page Tonight", "turn-the-page-tonight", cover="images/covers/turn-the-page-tonight.jpg", apple="https://music.apple.com/us/album/turn-the-page-tonight/6800083050?i=6800083056", description="Reflective groovy mid-tempo about closing a chapter and starting the next one."),
                track("07", "Burn Through the Dark", "burn-through-the-dark", cover="images/covers/burn-through-the-dark.jpg", apple="https://music.apple.com/us/album/burn-through-the-dark/6800083050?i=6800083057", description="Sensual lush R&B about wanting the night hot enough to light the dark."),
                track("08", "Velvet Lies", "velvet-lies", cover="images/covers/velvet-lies.jpg", apple="https://music.apple.com/us/album/velvet-lies/6800083050?i=6800083058", description="Elegant sophisti-pop about pretty words that don’t quite tell the truth."),
                track("09", "Still Need You", "still-need-you", cover="images/covers/still-need-you.jpg", apple="https://music.apple.com/us/album/still-need-you/6800083050?i=6800083059", description="Intimate, needy R&B about the ache that doesn’t go quiet after midnight."),
                track("10", "Louder Than Yesterday", "louder-than-yesterday", cover="images/covers/louder-than-yesterday.jpg", apple="https://music.apple.com/us/album/louder-than-yesterday/6800083050?i=6800083060", description="Building empowering pop-rock about getting bigger, bolder, harder to ignore."),
                track("11", "Diamond Tears", "diamond-tears", cover="images/covers/diamond-tears.jpg", apple="https://music.apple.com/us/album/diamond-tears/6800083050?i=6800083061", description="An emotional piano ballad about crying pretty and still meaning every drop."),
                track("12", "White Dress Envy", "white-dress-envy", cover="images/covers/white-dress-envy.jpg", apple="https://music.apple.com/us/album/white-dress-envy/6800083050?i=6800083062", description="A jealousy ballad about watching someone else wear the future she wanted."),
                track("13", "Starlit Promise", "starlit-promise", cover="images/covers/starlit-promise.jpg", apple="https://music.apple.com/us/album/starlit-promise/6800083050?i=6800083063", description="Intimate acoustic closer — a vow made under the kind of sky you don’t forget."),
                track("14", "Just Wanna Make You a Sammich", "just-wanna-make-you-a-sammich", cover="images/covers/just-wanna-make-you-a-sammich.jpg", apple="https://music.apple.com/us/album/just-wanna-make-you-a-sammich/6800083050?i=6800083064", description="Warm country-soul pop about love that looks like feeding someone you actually like."),
                track("15", "Brain Glitch", "brain-glitch", cover="images/covers/brain-glitch.jpg", apple="https://music.apple.com/us/album/brain-glitch/6800083050?i=6800083065", description="Bouncy playful pop-R&B about a crush so loud it shorts out her thinking."),
            ],
        },
        {
            "id": "truly-me",
            "title": "Truly Me",
            "subtitle": None,
            "blurb": "Youthful searching — the first cohesive artistic world.",
            "cover": "images/covers/truly-me.jpg",
            "tracks": [
                track("01", "Truly Me", "truly-me", cover="images/covers/truly-me-track.jpg", description="Uplifting teen-pop anthem about dropping the mask and standing in who she actually is."),
                track("02", "Sweet Crush", "sweet-crush", cover="images/covers/sweet-crush.jpg", description="Flirtatious bubblegum pop about a crush so sugar-bright she can’t play it cool."),
                track("03", "What I Need", "what-i-need", cover="images/covers/what-i-need-age-24.jpg", apple="https://music.apple.com/us/album/what-i-need/6799450289?i=6799450290", description="Mid-tempo pop-rock about naming the thing she’s been too shy to ask for."),
                track("04", "Hold Me Close", "hold-me-close", cover="images/covers/hold-me-close-age-24.jpg", apple="https://music.apple.com/us/album/hold-me-close/6799916557?i=6799916558", description="A soft emotional ballad about wanting to be held like the night might last."),
                track("05", "Key to My Heart", "key-to-my-heart", cover="images/covers/key-to-my-heart-age-24.jpg", apple="https://music.apple.com/us/album/key-to-my-heart/6799450749?i=6799450931", description="Smooth romantic R&B-pop about handing someone the only key that matters."),
                track("06", "Stop the Hurt", "stop-the-hurt", cover="images/covers/stop-the-hurt.jpg", description="Energetic frustration-fueled pop about being done with the cycle that keeps cutting her."),
                track("07", "Choose Me Now", "choose-me-now", cover="images/covers/choose-me-now.jpg", description="Upbeat dance-pop about not wanting to wait in line for someone’s maybe."),
                track("08", "Old Enough", "old-enough", cover="images/covers/old-enough.jpg", description="Defiant empowering pop about being grown enough to want what she wants."),
                track("09", "Spark of Love", "spark-of-love", cover="images/covers/spark-of-love-age-24.jpg", apple="https://music.apple.com/us/album/spark-of-love/6799939816?i=6799939818", description="Sultry groove-oriented R&B about that first catch of heat you can’t talk yourself out of."),
                track("10", "Feels Good", "feels-good", cover="images/covers/feels-good-age-24.jpg", apple="https://music.apple.com/us/album/feels-good/6799451574?i=6799451575", description="Lively funky pop about the simple fact that this — whatever this is — feels good."),
                track("11", "Forever Yours", "forever-yours", cover="images/covers/forever-yours-age-24.jpg", apple="https://music.apple.com/us/album/forever-yours/6799940272?i=6799940273", description="Heartfelt acoustic-driven ballad about promising herself to someone for keeps."),
                track("12", "Heart on a String", "heart-on-a-string", cover="images/covers/heart-on-a-string-age-24.jpg", apple="https://music.apple.com/us/album/heart-on-a-string/6800055541?i=6800055542", description="Playful pop-R&B bounce about handing over her heart and hoping they don’t yank the line."),
                track("13", "Stop the Hurt (Reprise)", "stop-the-hurt-reprise", cover="images/covers/stop-the-hurt-reprise.jpg", description="A concise, quieter return to Stop the Hurt — the wound still there, the voice a little older."),
            ],
        },
    ],
}

for album in catalog["albums"]:
    album["subtitle"] = album.get("subtitle") or f"{len(album['tracks'])} tracks"

(ROOT / "data" / "catalog.json").write_text(
    json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)
print("wrote data/catalog.json")
