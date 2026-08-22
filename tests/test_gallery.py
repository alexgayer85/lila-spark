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
        Path("/home/alex/iCloudSync/Music/Lila Spark - Truly Me/lila_spark.png"),
        "lila-age-18.jpg",
    ),
    (
        Path("/home/alex/iCloudSync/Music/Lila Spark - Truly Me/Lila Spark 1.jpg"),
        "lila-age-18-portrait.jpg",
    ),
]


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


class TestPhotosManifest(unittest.TestCase):
    def test_appends_eight_after_existing_seven(self):
        data = json.loads((ROOT / "data" / "photos.json").read_text())
        photos = data["photos"]
        self.assertEqual(len(photos), 33)
        self.assertEqual(photos[0]["src"], "images/profile.jpg")
        self.assertEqual(photos[6]["src"], "images/family/daniel.jpg")
        self.assertEqual(photos[7:9], AGE_18)
        self.assertEqual(photos[9:17], EXPECTED_NEW)
        self.assertEqual(photos[17:], SPARKED_GALLERY)
        for item in photos[7:]:
            self.assertTrue((ROOT / item["src"]).is_file(), item["src"])

    def test_age_18_photo_sized(self):
        for src, dest_name in AGE_18_SOURCES:
            dest = ROOT / "images" / "gallery" / dest_name
            self.assertTrue(dest.is_file(), dest_name)
            self.assertLessEqual(dest.stat().st_size, MAX_BYTES, dest_name)
            with Image.open(dest) as im:
                self.assertEqual(im.mode, "RGB")
                self.assertLessEqual(max(im.size), 1600, dest_name)
            self.assertAlmostEqual(aspect(dest), aspect(src), places=2, msg=dest_name)

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


class TestMusicMarkup(unittest.TestCase):
    def test_three_tracks_have_covers_and_cache_bust(self):
        html = (ROOT / "music.html").read_text()
        self.assertIn('href="css/styles.css?v=preview-covers-1"', html)
        self.assertNotIn('href="css/styles.css?v=social-icons-1"', html)
        afterglow = [
            ("images/covers/somehow.jpg", "Somehow"),
            ("images/covers/layla.jpg", "Layla"),
            ("images/covers/let-me-begin.jpg", "Let Me Begin"),
        ]
        sparked = [(f"images/covers/{slug}.jpg", title) for _, slug, title in SPARKED_COVERS]
        for src, _title in afterglow + sparked:
            self.assertIn(f'src="{src}"', html, src)
        self.assertEqual(html.count('class="track-cover"'), 19)
        self.assertEqual(html.count("has-cover"), 19)
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


if __name__ == "__main__":
    unittest.main()
