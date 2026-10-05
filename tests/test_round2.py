"""Round 2 (2026-10-05): per-song Listen links, published covers, Facebook link on Story."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LANDR = "https://release.landr.com/"


def catalog():
    return json.loads((ROOT / "data" / "catalog.json").read_text())


class TestListenLinks(unittest.TestCase):
    def test_released_tracks_have_landr_listen_links(self):
        for album in catalog()["albums"]:
            for t in album["tracks"]:
                if t.get("apple"):
                    self.assertTrue(t.get("listen", "").startswith(LANDR), t["id"])

    def test_known_links(self):
        tracks = {t["id"]: t for a in catalog()["albums"] for t in a["tracks"]}
        self.assertEqual(tracks["let-me-begin"]["listen"], LANDR + "991048797192")
        self.assertEqual(tracks["heart-on-a-string"]["listen"], LANDR + "991048736245")
        self.assertEqual(tracks["no-apologies"]["presave"], LANDR + "991061432100")
        self.assertNotIn("listen", tracks["no-apologies"])

    def test_untitled_has_no_links(self):
        for album in catalog()["albums"]:
            if album["id"] == "untitled":
                for t in album["tracks"]:
                    self.assertNotIn("listen", t)
                    self.assertNotIn("presave", t)

    def test_player_renders_links_outside_row_button(self):
        js = (ROOT / "js" / "player.js").read_text()
        self.assertIn("function trackLink(t)", js)
        self.assertIn("</button>\n            ${linkHtml}", js)
        self.assertIn("data-listen", (ROOT / "music.html").read_text())


class TestCovers(unittest.TestCase):
    def test_track_covers_exist(self):
        for album in catalog()["albums"]:
            for path in [album.get("cover")] + [t.get("cover") for t in album["tracks"]]:
                if path:
                    self.assertTrue((ROOT / path).is_file(), path)

    def test_afterglow_singles_have_own_covers(self):
        tracks = {t["id"]: t for a in catalog()["albums"] for t in a["tracks"]}
        for slug in ["boomerang", "rhythm-thief", "dark-static", "lights-go-low"]:
            self.assertTrue(tracks[slug]["cover"], slug)


class TestStoryFacebook(unittest.TestCase):
    def test_story_support_sentence_links_facebook(self):
        html = (ROOT / "story.html").read_text()
        i = html.index("If you’d like to support the work")
        para = html[i : html.index("</p>", i)]
        self.assertIn("https://www.facebook.com/profile.php?id=61594030887300", para)


if __name__ == "__main__":
    unittest.main()
