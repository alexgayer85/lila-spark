import json
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/home/alex/iCloudSync/Music/Lila Spark - Afterglow")
MAX_BYTES = 400 * 1024

GALLERY = [
    ("grok-image-c4d49059-9001-44cc-9b2c-1b4766c3d540.jpg", "concept-to-reality.jpg"),
    ("grok-image-22018e38-f19d-49d3-8689-24dbc97bae3e.jpg", "studio-lila-at-desk.jpg"),
    ("grok-image-deecadb1-8d79-43ff-81f9-94a8237583d2.jpg", "studio-over-shoulder.jpg"),
    ("Somehow (single)_3000x3000.jpg", "somehow.jpg"),
    ("Let_Me_Begin_3000x3000_d81fa070.jpg", "let-me-begin.jpg"),
    ("Layla (song cover).jpg", "layla.jpg"),
    ("grok-image-52c4dd08-827a-4638-9de7-c13ed9d8fce0.jpg", "looks-outdoor.jpg"),
    ("bodyshotreferences.jpg", "looks-studio.jpg"),
]


def aspect(path):
    with Image.open(path) as im:
        w, h = im.size
        return w / h


class TestGalleryFiles(unittest.TestCase):
    def test_eight_gallery_files_exist_sized_and_uncropped(self):
        for src_name, dest_name in GALLERY:
            dest = ROOT / "images" / "gallery" / dest_name
            src = SRC / src_name
            self.assertTrue(dest.is_file(), f"missing {dest}")
            self.assertLessEqual(dest.stat().st_size, MAX_BYTES, dest_name)
            with Image.open(dest) as im:
                self.assertEqual(im.mode, "RGB")
                self.assertLessEqual(max(im.size), 1600, dest_name)
            self.assertAlmostEqual(aspect(dest), aspect(src), places=2, msg=dest_name)


COVERS = [
    ("Somehow (single)_3000x3000.jpg", "somehow.jpg"),
    ("Layla (song cover).jpg", "layla.jpg"),
    ("Let_Me_Begin_3000x3000_d81fa070.jpg", "let-me-begin.jpg"),
]


class TestCoverFiles(unittest.TestCase):
    def test_three_single_covers_exist_sized_and_uncropped(self):
        for src_name, dest_name in COVERS:
            dest = ROOT / "images" / "covers" / dest_name
            src = SRC / src_name
            self.assertTrue(dest.is_file(), f"missing {dest}")
            self.assertLessEqual(dest.stat().st_size, MAX_BYTES, dest_name)
            with Image.open(dest) as im:
                self.assertEqual(im.mode, "RGB")
                self.assertLessEqual(max(im.size), 900, dest_name)
            self.assertAlmostEqual(aspect(dest), aspect(src), places=2, msg=dest_name)


EXPECTED_NEW = [
    {
        "src": "images/gallery/concept-to-reality.jpg",
        "alt": "Lila Spark from concept to reality",
        "caption": "From concept to reality",
    },
    {
        "src": "images/gallery/studio-lila-at-desk.jpg",
        "alt": "Lila and Alex in the studio, Lila at the desk",
        "caption": "Studio session · Lila at the desk",
    },
    {
        "src": "images/gallery/studio-over-shoulder.jpg",
        "alt": "Lila looking over Alex’s shoulder in the studio",
        "caption": "Studio session · over the shoulder",
    },
    {
        "src": "images/gallery/somehow.jpg",
        "alt": "Somehow single artwork",
        "caption": "Somehow · single art",
    },
    {
        "src": "images/gallery/let-me-begin.jpg",
        "alt": "Let Me Begin single artwork",
        "caption": "Let Me Begin · single art",
    },
    {
        "src": "images/gallery/layla.jpg",
        "alt": "Layla song cover",
        "caption": "Layla · song cover",
    },
    {
        "src": "images/gallery/looks-outdoor.jpg",
        "alt": "Lila Spark outdoor looks, four outfits",
        "caption": "Looks · outdoor",
    },
    {
        "src": "images/gallery/looks-studio.jpg",
        "alt": "Lila Spark studio looks, four outfits",
        "caption": "Looks · studio",
    },
]


AGE_18 = [
    {
        "src": "images/gallery/lila-age-18.jpg",
        "alt": "Lila Spark at age 18",
        "caption": "Lila · age 18 · 2020",
    },
    {
        "src": "images/gallery/lila-age-18-portrait.jpg",
        "alt": "Lila Spark at age 18, portrait",
        "caption": "Lila · age 18 · 2020",
    },
]

AGE_18_SOURCES = [
    (
        Path("/home/alex/iCloudSync/Music/Lila Spark - Truly Me/1LLSj.jpg"),
        "lila-age-18.jpg",
    ),
    (
        Path("/home/alex/iCloudSync/Music/Lila Spark - Truly Me/dWs0E.jpg"),
        "lila-age-18-portrait.jpg",
    ),
]

AFTERGLOW_TURNAROUND = {
    "src": "images/gallery/afterglow-turnaround.jpg",
    "alt": "Lila Spark in red satin, front, profile, and back studio views",
    "caption": "Looks · Afterglow turnaround",
}
AFTERGLOW_TURNAROUND_SRC = Path(
    "/home/alex/iCloudSync/Music/Lila Spark - Afterglow/"
    "grok-image-756bf8b2-dfda-4b4c-86ac-dbc485bee1b7.jpg"
)

AFTERGLOW_LOUNGE = {
    "src": "images/gallery/afterglow-lounge.jpg",
    "alt": "Lila Spark in a red sequin dress singing at a candlelit lounge microphone",
    "caption": "Afterglow · lounge set",
}
AFTERGLOW_LOUNGE_SRC = Path(
    "/home/alex/iCloudSync/Music/Lila Spark - Afterglow/"
    "grok-image-3801620e-7908-483b-befd-b5345c5128de.jpg"
)

AFTERGLOW_STREET = {
    "src": "images/gallery/street.jpg",
    "alt": "Lila Spark on a downtown sidewalk in a navy blazer and white shirt",
    "caption": "Street · Afterglow",
}
AFTERGLOW_STREET_SRC = SRC / "street.jpg"

AFTERGLOW_TATTOO = {
    "src": "images/gallery/tattoo.jpg",
    "alt": "Lila Spark’s rib tattoo, a spark-shaped compass rose",
    "caption": "Tattoo · spark",
}
AFTERGLOW_TATTOO_SRC = SRC / "tattoo.jpg"


SPARKED_SRC = Path("/home/alex/iCloudSync/Music/Lila Spark - Sparked/Video working folder")
SPARKED_COVERS = [
    ("midnight_voltage.jpg", "midnight-voltage", "Midnight Voltage"),
    ("electric_crush.jpg", "electric-crush", "Electric Crush"),
    ("frequency_of_you.jpg", "frequency-of-you", "Frequency of You"),
    ("no_more_hiding.jpg", "no-more-hiding", "No More Hiding"),
    ("small_miracles.jpg", "small-miracles", "Small Miracles"),
    ("turn_the_page_tonight.jpg", "turn-the-page-tonight", "Turn the Page Tonight"),
    ("burn_through_the_dark.jpg", "burn-through-the-dark", "Burn Through the Dark"),
    ("velvet_lies.jpg", "velvet-lies", "Velvet Lies"),
    ("still_need_you.jpg", "still-need-you", "Still Need You"),
    ("louder_than_yesterday.jpg", "louder-than-yesterday", "Louder Than Yesterday"),
    ("diamond_tears.jpg", "diamond-tears", "Diamond Tears"),
    ("white_dress_envy.jpg", "white-dress-envy", "White Dress Envy"),
    ("starlit_promise.jpg", "starlit-promise", "Starlit Promise"),
    ("just_wanna_make_you_a_sammich.jpg", "just-wanna-make-you-a-sammich", "Just Wanna Make You a Sammich"),
    ("brain_glitch.jpg", "brain-glitch", "Brain Glitch"),
    ("heart_on_a_string.jpg", "heart-on-a-string", "Heart on a String"),
]

SPARKED_GALLERY = [
    {
        "src": f"images/gallery/{slug}.jpg",
        "alt": f"{title} track cover",
        "caption": f"{title} · track cover",
    }
    for _, slug, title in SPARKED_COVERS
]

TRULY_ME_SRC = Path("/home/alex/iCloudSync/Music/Lila Spark - Truly Me/Finalists")
TRULY_ME_COVERS = [
    ("01.Truly_Me.png", "truly-me-track", "Truly Me"),
    ("02.Sweet_Crush.png", "sweet-crush", "Sweet Crush"),
    ("03.What_I_Need.png", "what-i-need", "What I Need"),
    ("04.Hold_Me_Close.png", "hold-me-close", "Hold Me Close"),
    ("05.Key_to_My_Heart.png", "key-to-my-heart", "Key to My Heart"),
    ("06.Stop_the_Hurt.png", "stop-the-hurt", "Stop the Hurt"),
    ("07.Choose_Me_Now.png", "choose-me-now", "Choose Me Now"),
    ("08.Old_Enough.png", "old-enough", "Old Enough"),
    ("09.Spark_of_Love.png", "spark-of-love", "Spark of Love"),
    ("10.Feels_Good.png", "feels-good", "Feels Good"),
    ("11.Forever_Yours.png", "forever-yours", "Forever Yours"),
    ("12.Stop_the_Hurt_(Reprise).png", "stop-the-hurt-reprise", "Stop the Hurt (Reprise)"),
]

TRULY_ME_GALLERY = [
    {
        "src": f"images/gallery/{slug}.jpg",
        "alt": f"{title} track cover, age 18",
        "caption": f"{title} · track cover · age 18",
    }
    for _, slug, title in TRULY_ME_COVERS
]

RESHOOT_SRC = Path("/home/alex/iCloudSync/Music/Lila Spark - Truly Me")
RESHOOT_COVERS = [
    (RESHOOT_SRC / "What I Need 3000x3000.jpg", "what-i-need", "What I Need"),
    (RESHOOT_SRC / "hold_me_close_3000x3000_1e47e44c.jpg", "hold-me-close", "Hold Me Close"),
    (RESHOOT_SRC / "LANDR/key_to_my_heart-3000x3000.jpg", "key-to-my-heart", "Key to My Heart"),
    (RESHOOT_SRC / "LANDR/spark_of_love_3000x3000.jpg", "spark-of-love", "Spark of Love"),
    (RESHOOT_SRC / "LANDR/feels_good-3000x3000.jpg", "feels-good", "Feels Good"),
    (RESHOOT_SRC / "LANDR/forever_yours_3000x3000.jpg", "forever-yours", "Forever Yours"),
    (RESHOOT_SRC / "LANDR/heart_on_a_string_3000x3000.jpg", "heart-on-a-string", "Heart on a String"),
]

RESHOOT_GALLERY = [
    {
        "src": f"images/gallery/{slug}-age-24.jpg",
        "alt": f"{title} track cover, age 24 reshoot",
        "caption": f"{title} · track cover · age 24 reshoot",
    }
    for _src, slug, title in RESHOOT_COVERS
]


def flatten_photos(data):
    items = []
    for section in data.get("sections", []):
        if section.get("groups"):
            for group in section["groups"]:
                items.extend(group.get("photos") or [])
        else:
            items.extend(section.get("photos") or [])
    return items


def section_by_id(data, section_id):
    for section in data.get("sections", []):
        if section.get("id") == section_id:
            return section
    raise KeyError(section_id)


AGE_PHOTOS = [
    {
        "src": f"images/gallery/age-{i:02d}.jpg",
        "alt": "Lila Spark as a newborn" if i == 0 else f"Lila Spark at age {i}",
        "caption": "Lila · newborn · 2002" if i == 0 else f"Lila · age {i} · {2002 + i}",
    }
    for i in range(25)
]


class TestPhotosManifest(unittest.TestCase):
    def test_sections_group_existing_and_age_portraits(self):
        data = json.loads((ROOT / "data" / "photos.json").read_text())
        self.assertEqual(
            [s["id"] for s in data["sections"]],
            ["years", "family", "albums", "singles", "more"],
        )

        years = section_by_id(data, "years")
        self.assertEqual(years["photos"], AGE_PHOTOS)
        self.assertEqual(years["title"], "Through the years")

        family = section_by_id(data, "family")
        self.assertEqual(
            [p["src"] for p in family["photos"]],
            [
                "images/family/lila-layla.jpg",
                "images/family/elena.jpg",
                "images/family/daniel.jpg",
            ],
        )

        albums = section_by_id(data, "albums")
        self.assertEqual(
            [p["src"] for p in albums["photos"]],
            [
                "images/covers/afterglow.jpg",
                "images/covers/sparked.jpg",
                "images/covers/truly-me.jpg",
            ],
        )

        singles = section_by_id(data, "singles")
        groups = {g["title"]: g["photos"] for g in singles["groups"]}
        self.assertEqual(
            [g["title"] for g in singles["groups"]],
            ["Afterglow", "Sparked", "Truly Me", "Age 24 reshoots"],
        )
        self.assertEqual(
            [p["src"] for p in groups["Afterglow"]],
            [
                "images/gallery/somehow.jpg",
                "images/gallery/layla.jpg",
                "images/gallery/let-me-begin.jpg",
            ],
        )
        self.assertEqual(groups["Sparked"], SPARKED_GALLERY)
        self.assertEqual(groups["Truly Me"], TRULY_ME_GALLERY)
        self.assertEqual(groups["Age 24 reshoots"], RESHOOT_GALLERY)

        more = section_by_id(data, "more")
        self.assertEqual(more["photos"][0]["src"], "images/profile.jpg")
        self.assertEqual(more["photos"][1:3], AGE_18)
        self.assertEqual(
            more["photos"][3:],
            [
                EXPECTED_NEW[0],  # concept-to-reality
                EXPECTED_NEW[1],  # studio-lila-at-desk
                EXPECTED_NEW[2],  # studio-over-shoulder
                EXPECTED_NEW[6],  # looks-outdoor
                EXPECTED_NEW[7],  # looks-studio
                AFTERGLOW_TURNAROUND,
                AFTERGLOW_LOUNGE,
                AFTERGLOW_STREET,
                AFTERGLOW_TATTOO,
            ],
        )

        photos = flatten_photos(data)
        self.assertEqual(len(photos), 81)
        for item in photos:
            self.assertTrue((ROOT / item["src"]).is_file(), item["src"])

    def test_age_portraits_sized(self):
        for i in range(25):
            src = SRC / f"age {i:02d}.jpg"
            dest = ROOT / "images" / "gallery" / f"age-{i:02d}.jpg"
            self.assertTrue(dest.is_file(), dest.name)
            self.assertLessEqual(dest.stat().st_size, MAX_BYTES, dest.name)
            with Image.open(dest) as im:
                self.assertEqual(im.mode, "RGB")
                self.assertLessEqual(max(im.size), 1600, dest.name)
            self.assertAlmostEqual(aspect(dest), aspect(src), places=2, msg=dest.name)

    def test_age_18_photo_sized(self):
        for src, dest_name in AGE_18_SOURCES:
            dest = ROOT / "images" / "gallery" / dest_name
            self.assertTrue(dest.is_file(), dest_name)
            self.assertLessEqual(dest.stat().st_size, MAX_BYTES, dest_name)
            with Image.open(dest) as im:
                self.assertEqual(im.mode, "RGB")
                self.assertLessEqual(max(im.size), 1600, dest_name)
            self.assertAlmostEqual(aspect(dest), aspect(src), places=2, msg=dest_name)

    def test_afterglow_miscellany_shots_sized(self):
        for src, dest_name in (
            (AFTERGLOW_TURNAROUND_SRC, "afterglow-turnaround.jpg"),
            (AFTERGLOW_LOUNGE_SRC, "afterglow-lounge.jpg"),
            (AFTERGLOW_STREET_SRC, "street.jpg"),
            (AFTERGLOW_TATTOO_SRC, "tattoo.jpg"),
        ):
            dest = ROOT / "images" / "gallery" / dest_name
            self.assertTrue(dest.is_file(), dest.name)
            self.assertLessEqual(dest.stat().st_size, MAX_BYTES, dest.name)
            with Image.open(dest) as im:
                self.assertEqual(im.mode, "RGB")
                self.assertLessEqual(max(im.size), 1600, dest.name)
            self.assertAlmostEqual(aspect(dest), aspect(src), places=2, msg=dest.name)

    def test_sparked_track_covers_sized(self):
        for src_name, slug, _title in SPARKED_COVERS:
            src = SPARKED_SRC / src_name
            for dest, max_edge in (
                (ROOT / "images" / "gallery" / f"{slug}.jpg", 1600),
                (ROOT / "images" / "covers" / f"{slug}.jpg", 900),
            ):
                self.assertTrue(dest.is_file(), dest.name)
                self.assertLessEqual(dest.stat().st_size, MAX_BYTES, dest.name)
                with Image.open(dest) as im:
                    self.assertEqual(im.mode, "RGB")
                    self.assertLessEqual(max(im.size), max_edge, dest.name)
                self.assertAlmostEqual(aspect(dest), aspect(src), places=2, msg=dest.name)

    def test_truly_me_track_covers_sized(self):
        for src_name, slug, _title in TRULY_ME_COVERS:
            src = TRULY_ME_SRC / src_name
            for dest, max_edge in (
                (ROOT / "images" / "gallery" / f"{slug}.jpg", 1600),
                (ROOT / "images" / "covers" / f"{slug}.jpg", 900),
            ):
                self.assertTrue(dest.is_file(), dest.name)
                self.assertLessEqual(dest.stat().st_size, MAX_BYTES, dest.name)
                with Image.open(dest) as im:
                    self.assertEqual(im.mode, "RGB")
                    self.assertLessEqual(max(im.size), max_edge, dest.name)
                self.assertAlmostEqual(aspect(dest), aspect(src), places=2, msg=dest.name)
        with Image.open(ROOT / "images" / "covers" / "truly-me.jpg") as album:
            self.assertEqual(album.size, (900, 900))

    def test_age_24_reshoot_covers_sized(self):
        for src, slug, _title in RESHOOT_COVERS:
            for dest, max_edge in (
                (ROOT / "images" / "gallery" / f"{slug}-age-24.jpg", 1600),
                (ROOT / "images" / "covers" / f"{slug}-age-24.jpg", 900),
            ):
                self.assertTrue(dest.is_file(), dest.name)
                self.assertLessEqual(dest.stat().st_size, MAX_BYTES, dest.name)
                with Image.open(dest) as im:
                    self.assertEqual(im.mode, "RGB")
                    self.assertLessEqual(max(im.size), max_edge, dest.name)
                self.assertAlmostEqual(aspect(dest), aspect(src), places=2, msg=dest.name)


class TestMusicMarkup(unittest.TestCase):
    def test_three_tracks_have_covers_and_cache_bust(self):
        html = (ROOT / "music.html").read_text()
        self.assertIn('href="css/styles.css?v=explicit-1"', html)
        self.assertNotIn('href="css/styles.css?v=social-icons-1"', html)
        afterglow = [
            ("images/covers/somehow.jpg", "Somehow"),
            ("images/covers/layla.jpg", "Layla"),
            ("images/covers/let-me-begin.jpg", "Let Me Begin"),
        ]
        sparked = [(f"images/covers/{slug}.jpg", title) for _, slug, title in SPARKED_COVERS]
        reshoot_slugs = {slug for _src, slug, _title in RESHOOT_COVERS}
        truly = [
            (
                f"images/covers/{slug}-age-24.jpg" if slug in reshoot_slugs else f"images/covers/{slug}.jpg",
                title,
            )
            for _, slug, title in TRULY_ME_COVERS
        ]
        # Heart on a String is Sparked-folder still in SPARKED_COVERS but Music uses the age-24 single
        sparked = [(src, title) for src, title in sparked if "heart-on-a-string.jpg" not in src]
        truly_extra = [("images/covers/heart-on-a-string-age-24.jpg", "Heart on a String")]
        for src, _title in afterglow + sparked + truly + truly_extra:
            self.assertIn(f'src="{src}"', html, src)
        self.assertEqual(html.count('class="track-cover"'), 31)
        self.assertEqual(html.count("has-cover"), 31)
        self.assertEqual(html.count("-age-24.jpg"), 7)
        self.assertIn('class="track-title">Boomerang</h3>', html)
        self.assertNotIn("images/covers/boomerang", html)

    def test_track_cover_css_rules_exist(self):
        css = (ROOT / "css" / "styles.css").read_text()
        self.assertIn(".track-card.has-cover", css)
        self.assertIn("grid-template-columns: auto auto 1fr auto", css)
        self.assertIn(".track-cover", css)
        self.assertIn("border-radius: 8px", css)
        self.assertIn("width: 56px", css)
        self.assertIn("height: 56px", css)


class TestPhotosPage(unittest.TestCase):
    def test_photos_page_uses_sections_and_cache_bust(self):
        html = (ROOT / "photos.html").read_text()
        self.assertIn('href="css/styles.css?v=photos-2"', html)
        self.assertIn("js/photos.js?v=sections-2", html)
        self.assertIn('id="photo-jump"', html)
        self.assertIn('id="photo-gallery"', html)
        self.assertIn('class="photo-sections"', html)
        js = (ROOT / "js" / "photos.js").read_text()
        self.assertIn("data.sections", js)
        self.assertIn("photo-block", js)
        self.assertIn("photo-jump", js)
        css = (ROOT / "css" / "styles.css").read_text()
        self.assertIn(".photo-block", css)
        self.assertIn(".photo-jump", css)
        self.assertIn(".photo-group-title", css)


class TestRealityStudio(unittest.TestCase):
    def test_studio_screenshot_exists(self):
        dest = ROOT / "images" / "studio" / "lss.jpg"
        src = SRC / "lss.png"
        self.assertTrue(dest.is_file(), dest)
        self.assertTrue(src.is_file(), src)
        self.assertLessEqual(dest.stat().st_size, MAX_BYTES, "lss.jpg")
        with Image.open(dest) as im:
            self.assertEqual(im.mode, "RGB")
            self.assertLessEqual(max(im.size), 1800)
        self.assertAlmostEqual(aspect(dest), aspect(src), places=2)

    def test_story_shows_screenshot_and_edit_tools(self):
        html = (ROOT / "story.html").read_text()
        self.assertIn('href="css/styles.css?v=story-lore-6"', html)
        self.assertIn("images/studio/lss.jpg", html)
        self.assertIn("variational autoencoder", html)
        self.assertNotIn("1D VAE", html)
        self.assertIn("Repaint / Extend", html)
        self.assertIn("<strong>Extract</strong>", html)
        self.assertIn("<strong>Lego</strong>", html)
        css = (ROOT / "css" / "styles.css").read_text()
        self.assertIn(".studio-shot", css)
        self.assertIn(".bio-figure", css)
        self.assertIn(".years-strip", css)

    def test_lore_has_quiet_years_songs_tattoo_and_inline_photos(self):
        html = (ROOT / "story.html").read_text()
        self.assertIn("2022 through 2024", html)
        self.assertIn("Stop the Hurt", html)
        self.assertIn("accelerated", html)
        self.assertIn("semester early", html)
        self.assertIn("leaving song", html)
        self.assertIn("healing now, goodbye", html)
        self.assertIn("twenty-nine seconds", html)
        self.assertNotIn("barely a minute", html)
        self.assertNotIn("walk through twice", html)
        self.assertIn("grandparents", html)
        self.assertIn("Hold Me in the Middle", html)
        self.assertIn("swing her between them", html)
        self.assertIn("She also suggested", html)
        self.assertIn("mad at the world", html)
        self.assertIn("burn-it-down", html)
        self.assertIn("Amy Lee", html)
        self.assertNotIn("keeps a sister in the room", html)
        self.assertIn("four-pointed spark", html)
        self.assertIn("Elena, Daniel, Lila, Layla", html)
        self.assertIn("images/gallery/age-13.jpg", html)
        self.assertIn("images/gallery/age-18.jpg", html)
        self.assertIn("images/gallery/tattoo.jpg", html)
        self.assertIn("images/gallery/street.jpg", html)
        self.assertIn("photos.html#years", html)
        self.assertIn("music.html?album=afterglow", html)
        self.assertIn("music.html?album=truly-me", html)
        self.assertIn("born 1978", html)
        self.assertIn("born 1974", html)
        self.assertIn("age 37 · 2015", html)
        self.assertIn("age 41 · 2015", html)
        self.assertNotIn("Late <strong>30s</strong>", html)
        self.assertNotIn("Early <strong>40s</strong>", html)


if __name__ == "__main__":
    unittest.main()
