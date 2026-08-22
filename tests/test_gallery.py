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


if __name__ == "__main__":
    unittest.main()
