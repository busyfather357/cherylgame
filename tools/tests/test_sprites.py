"""tools.sprites 的離線測試：用程式合成的綠幕原圖，不需要 reference/ 裡的真實原圖。暫存檔寫在 tools/work/。"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from tools import config, sprites

GREEN = (0, 255, 0)
COLS, ROWS = 3, 2
CELL_W, CELL_H = 200, 240
JITTER = (0, 9, -7, 4, -10, 6)  # 每格角色的水平位置不同，腳底高度也跟著差 1/3


def make_source(bg: tuple[int, int, int] = GREEN) -> Image.Image:
    """合成的原圖，模擬 Gemini 畫的 3 欄 × 2 排精靈圖：每格一個有深色描邊的角色 (白色身體、膚色的頭、
    往右伸的灰色劍，劍每格一樣長度不同)，位置與腳底高度每格不同。先畫 4 倍大再縮小，邊緣會跟背景混色。
    左上角另外放一個小雜點。"""
    s = 4
    big = Image.new("RGB", (COLS * CELL_W * s, ROWS * CELL_H * s), bg)
    draw = ImageDraw.Draw(big)
    for i, dx in enumerate(JITTER):
        col, row = i % COLS, i // COLS
        cx = (col * CELL_W + CELL_W // 2 + dx) * s
        feet = (row * CELL_H + 210 + dx // 3) * s
        outline = (20, 20, 20)
        draw.rounded_rectangle([cx - 30 * s, feet - 110 * s, cx + 30 * s, feet], radius=10 * s, fill="white", outline=outline, width=4 * s)
        draw.ellipse([cx - 25 * s, feet - 160 * s, cx + 25 * s, feet - 110 * s], fill=(240, 190, 150), outline=outline, width=4 * s)
        draw.rectangle([cx + 28 * s, feet - 70 * s, cx + (40 + 6 * i) * s, feet - 62 * s], fill=(150, 150, 160), outline=outline, width=2 * s)
    image = big.resize((COLS * CELL_W, ROWS * CELL_H), Image.Resampling.LANCZOS)
    ImageDraw.Draw(image).rectangle([5, 5, 7, 7], fill=(90, 90, 90))
    return image


class WorkDirTestCase(unittest.TestCase):
    def setUp(self) -> None:
        config.WORK_DIR.mkdir(parents=True, exist_ok=True)
        tmp = tempfile.TemporaryDirectory(dir=config.WORK_DIR, prefix="test-sprites-")
        self.addCleanup(tmp.cleanup)
        self.dir = Path(tmp.name)
        self.characters_dir = self.dir / "characters"
        self.reference_dir = self.dir / "reference"
        self.characters_dir.mkdir()

    def add_character(self, char_id: str, settings: dict, source: Image.Image | None = None) -> None:
        (self.characters_dir / f"{char_id}.json").write_text(json.dumps(settings, ensure_ascii=False), encoding="utf-8")
        if source is not None:
            source_dir = self.reference_dir / "characters" / char_id
            source_dir.mkdir(parents=True)
            source.save(source_dir / settings["source"])

    def build(self, char_id: str) -> sprites.Built:
        return sprites.build_character(char_id, self.characters_dir, self.reference_dir)


SETTINGS = {
    "name": "測試",
    "source": "sheet.png",
    "animations": {"idle": {"frames": [0, 1, 2], "fps": 6}, "run": {"frames": [3, 4, 5], "fps": 12}},
}


class KeyBackgroundTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source = make_source()
        cls.keyed = sprites.key_background(cls.source, 40)

    def test_background_color_from_border(self) -> None:
        self.assertEqual(sprites.background_color(self.source), GREEN)

    def test_background_removed_and_inner_white_kept(self) -> None:
        self.assertEqual(self.keyed.getpixel((0, 0))[3], 0)
        self.assertEqual(self.keyed.getpixel((COLS * CELL_W - 1, ROWS * CELL_H - 1))[3], 0)
        # 第 1 格白色身體的中間：跟背景一樣亮，但被描邊包住，不能被去掉
        r, g, b, a = self.keyed.getpixel((CELL_W // 2, 210 - 55))
        self.assertEqual(a, 255)
        self.assertGreater(min(r, g, b), 240)

    def test_no_green_fringe(self) -> None:
        data = self.keyed.tobytes()
        pixels = (data[i:i + 4] for i in range(0, len(data), 4))
        greenish = [tuple(p) for p in pixels if p[3] and p[1] - max(p[0], p[2]) > 10]
        self.assertEqual(greenish, [])

    def test_speck_removed(self) -> None:
        self.assertEqual(self.keyed.getpixel((6, 6))[3], 0)


class FindFramesTest(unittest.TestCase):
    def test_frames_in_reading_order(self) -> None:
        frames = sprites.find_frames(sprites.key_background(make_source(), 40))
        self.assertEqual(len(frames), COLS * ROWS)
        centers = [((f.box[0] + f.box[2]) // 2 // CELL_W, (f.box[1] + f.box[3]) // 2 // CELL_H) for f in frames]
        self.assertEqual(centers, [(i % COLS, i // COLS) for i in range(COLS * ROWS)])

    def test_bands_merge_small_gaps(self) -> None:
        counts = [0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0]
        self.assertEqual(sprites._bands(counts, 3), [(1, 6), (11, 13)])


class BuildCharacterTest(WorkDirTestCase):
    def test_frames_aligned_by_feet_and_body(self) -> None:
        self.add_character("hero", SETTINGS, make_source())
        built = self.build("hero")
        cell = built.entry["cell"]
        anchor_x, anchor_y = built.entry["anchor"]
        self.assertEqual(built.sheet.size, (3 * cell, 2 * cell))
        for images in built.cells.values():
            for image in images:
                self.assertAlmostEqual(image.getchannel("A").getbbox()[3], anchor_y, delta=1)
        heads = [p for points in built.entry["attach"]["head"].values() for p in points]
        self.assertEqual(len(heads), 6)
        for x, _ in heads:
            self.assertAlmostEqual(x, anchor_x, delta=1)

    def test_entry_lists_animations_in_rows(self) -> None:
        self.add_character("hero", {**SETTINGS, "colors": 32}, make_source())
        entry = self.build("hero").entry
        self.assertEqual(entry["sheet"], "characters/hero.png")
        self.assertEqual(entry["animations"], {"idle": {"row": 0, "frames": 3, "fps": 6}, "run": {"row": 1, "frames": 3, "fps": 12}})

    def test_offsets_move_one_frame(self) -> None:
        self.add_character("hero", SETTINGS, make_source())
        plain = self.build("hero").entry["attach"]["head"]["run"]
        self.add_character("moved", {**SETTINGS, "offsets": {"run": {"1": [-3, 2]}}}, make_source())
        moved = self.build("moved").entry["attach"]["head"]["run"]
        self.assertEqual(moved[1], [plain[1][0] - 3, plain[1][1] + 2])
        self.assertEqual(moved[0], plain[0])

    def test_frame_index_out_of_range(self) -> None:
        settings = {**SETTINGS, "animations": {**SETTINGS["animations"], "run": {"frames": [3, 9], "fps": 12}}}
        self.add_character("hero", settings, make_source())
        with self.assertRaisesRegex(sprites.BuildError, "第 9 格"):
            self.build("hero")

    def test_missing_source(self) -> None:
        self.add_character("hero", SETTINGS)
        with self.assertRaises(sprites.MissingSource):
            self.build("hero")


class ConfigTest(unittest.TestCase):
    def test_defaults_filled_in(self) -> None:
        cfg = sprites.validate_config(SETTINGS, "test")
        self.assertEqual((cfg["cell"], cfg["charHeight"], cfg["colors"]), (128, 96, None))

    def test_game_animations_required(self) -> None:
        settings = {**SETTINGS, "animations": {"idle": SETTINGS["animations"]["idle"]}}
        with self.assertRaisesRegex(sprites.BuildError, "run"):
            sprites.validate_config(settings, "test")

    def test_typo_rejected(self) -> None:
        with self.assertRaisesRegex(sprites.BuildError, "charHieght"):
            sprites.validate_config({**SETTINGS, "charHieght": 80}, "test")

    def test_bad_offset_rejected(self) -> None:
        with self.assertRaisesRegex(sprites.BuildError, "offsets.idle"):
            sprites.validate_config({**SETTINGS, "offsets": {"idle": {"5": [1, 0]}}}, "test")


class ManifestTest(WorkDirTestCase):
    def test_round_trip_and_compact_arrays(self) -> None:
        entries = {"hero": {"name": "勇者", "anchor": [64, 120], "attach": {"head": {"idle": [[66, 30], [65, 31]]}}}}
        text = sprites.format_manifest(entries)
        self.assertTrue(text.startswith(sprites.MANIFEST_HEADER + "const CHARACTERS = {"))
        self.assertIn('"anchor": [64, 120]', text)
        self.assertIn('"idle": [[66, 30], [65, 31]]', text)
        path = self.dir / "characters.js"
        path.write_text(text, encoding="utf-8")
        self.assertEqual(sprites.read_manifest(path), entries)


if __name__ == "__main__":
    unittest.main()
