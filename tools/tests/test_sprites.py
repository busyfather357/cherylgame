"""tools.sprites 的離線測試：用程式合成的綠幕原圖，不需要 reference/ 裡的真實原圖。暫存檔寫在 tools/work/。"""

from __future__ import annotations

import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image, ImageChops, ImageDraw, ImageFilter

from tools import config, sprites

GREEN = (0, 255, 0)
COLS, ROWS = 3, 2
CELL_W, CELL_H = 200, 240
JITTER = (0, 9, -7, 4, -10, 6)  # 每格角色的水平位置不同，腳底高度也跟著差 1/3


def draw_figure(draw: ImageDraw.ImageDraw, cx: int, feet: int, s: int, sword: int = 40) -> None:
    """畫一個有深色描邊的角色：白色身體、膚色的頭、往右伸到 sword 的灰色劍。(cx, feet) 是腳底中心，
    s 是放大倍率 (s = 1 時角色 160px 高)。"""
    outline = (20, 20, 20)
    draw.rounded_rectangle([cx - 30 * s, feet - 110 * s, cx + 30 * s, feet], radius=10 * s, fill="white", outline=outline, width=4 * s)
    draw.ellipse([cx - 25 * s, feet - 160 * s, cx + 25 * s, feet - 110 * s], fill=(240, 190, 150), outline=outline, width=4 * s)
    draw.rectangle([cx + 28 * s, feet - 70 * s, cx + sword * s, feet - 62 * s], fill=(150, 150, 160), outline=outline, width=2 * s)


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
        draw_figure(draw, cx, feet, s, 40 + 6 * i)
    image = big.resize((COLS * CELL_W, ROWS * CELL_H), Image.Resampling.LANCZOS)
    ImageDraw.Draw(image).rectangle([5, 5, 7, 7], fill=(90, 90, 90))
    return image


def make_base(bg: tuple[int, int, int] = GREEN) -> Image.Image:
    """合成的全身圖原圖：一個 800px 高的角色站在 900×1000 的純色背景中央。先畫 2 倍大再縮小，然後整張稍微模糊：
    背景色滲進輪廓好幾個像素，模擬生圖模型的柔邊與 JPEG 壓縮。"""
    big = Image.new("RGB", (1800, 2000), bg)
    draw_figure(ImageDraw.Draw(big), 900, 1800, 10)
    return big.resize((900, 1000), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(2))


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

    def test_enclosed_chroma_hole_removed(self) -> None:
        im = make_source()
        cx, cy = CELL_W // 2, 210 - 55
        ImageDraw.Draw(im).rectangle([cx - 5, cy - 5, cx + 5, cy + 5], fill=GREEN)
        keyed = sprites.key_background(im, 40)
        self.assertEqual(keyed.getpixel((cx, cy))[3], 0)


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

    def test_separate_sources_scaled_independently(self) -> None:
        idle_src = make_source()
        run_src = make_source().resize((COLS * CELL_W // 2, ROWS * CELL_H // 2), Image.Resampling.LANCZOS)
        # 底部邊緣加上 1px 壓縮雜訊線，確認 find_frames 不會當成一格
        ImageDraw.Draw(run_src).line([(0, run_src.height - 1), (run_src.width - 1, run_src.height - 1)], fill=(110, 254, 110))
        settings = {
            "name": "雙原圖",
            "source": "idle.png",
            "animations": {
                "idle": {"source": "idle.png", "frames": [0, 1, 2], "fps": 6},
                "run": {"source": "run.png", "frames": [0, 1, 2], "fps": 8},
            },
        }
        self.add_character("dual", settings, idle_src)
        run_src.save(self.reference_dir / "characters" / "dual" / "run.png")
        built = self.build("dual")
        self.assertEqual(built.warnings, [])
        idle_bbox = built.cells["idle"][0].getchannel("A").getbbox()
        run_bbox = built.cells["run"][0].getchannel("A").getbbox()
        self.assertEqual(idle_bbox[3] - idle_bbox[1], 96)
        self.assertEqual(run_bbox[3] - run_bbox[1], 96)


# 全身圖直接用精靈圖原圖的第 1 格 (角色很小，會被放大)：不用另外合成、處理一張大的基準立繪，測試比較快
FULL_SETTINGS = {**SETTINGS, "fullBody": {"source": "sheet.png"}}


class FullBodyTest(WorkDirTestCase):
    def test_base_portrait_centered_on_background(self) -> None:
        self.add_character("hero", {**SETTINGS, "fullBody": {"source": "base.png"}}, make_source())
        make_base().save(self.reference_dir / "characters" / "hero" / "base.png")
        built = self.build("hero")
        width, height = sprites.FULL_BODY_SIZE
        self.assertEqual((built.full_body.mode, built.full_body.size), ("RGB", (width, height)))
        self.assertEqual(built.entry["fullBody"], {"image": "characters/hero_full.jpg", "width": width, "height": height})
        self.assertEqual(built.warnings, [])
        # 角色的範圍：跟只有底色的圖不一樣的地方
        background = sprites._full_body_background(sprites.FULL_BODY_DEFAULTS["background"])
        left, top, right, bottom = ImageChops.difference(built.full_body, background).getbbox()
        margin = round(height * sprites.FULL_BODY_MARGIN)
        self.assertAlmostEqual(bottom, height - margin, delta=1)
        self.assertAlmostEqual(top, margin, delta=1)
        self.assertAlmostEqual((left + right) / 2, width / 2, delta=1)
        # 底色：中央是第 1 個顏色、角落是第 2 個；角色身上與邊緣沒有殘留的綠色
        self.assertEqual(background.getpixel((width // 2, height // 2)), (255, 248, 220))
        self.assertEqual(background.getpixel((0, 0)), (230, 201, 146))
        data = built.full_body.tobytes()
        greenish = [tuple(data[i:i + 3]) for i in range(0, len(data), 3) if data[i + 1] - max(data[i], data[i + 2]) > 10]
        self.assertEqual(greenish, [])

    def test_single_background_color(self) -> None:
        self.add_character("hero", {**SETTINGS, "fullBody": {"source": "sheet.png", "background": "#3D4F73"}}, make_source())
        full_body = self.build("hero").full_body
        self.assertEqual(full_body.getpixel((0, 0)), (61, 79, 115))
        self.assertEqual(full_body.getpixel((sprites.FULL_BODY_SIZE[0] - 1, 300)), (61, 79, 115))

    def test_warns_about_several_figures_and_small_source(self) -> None:
        self.add_character("hero", FULL_SETTINGS, make_source())
        built = self.build("hero")
        self.assertEqual(built.full_body.size, sprites.FULL_BODY_SIZE)
        self.assertEqual(len(built.warnings), 2)
        self.assertIn("切出 6 格", built.warnings[0])
        self.assertIn("放大", built.warnings[1])

    def test_edges_cleaned_on_magenta_background(self) -> None:
        magenta = (255, 0, 255)
        source = make_base(magenta)
        self.add_character("hero", {**SETTINGS, "fullBody": {"source": "base.png"}}, make_source(magenta))
        source.save(self.reference_dir / "characters" / "hero" / "base.png")
        data = self.build("hero").full_body.tobytes()
        pinkish = [tuple(data[i:i + 3]) for i in range(0, len(data), 3) if min(data[i], data[i + 2]) - data[i + 1] > 10]
        self.assertEqual(pinkish, [])

    def test_neutral_background_left_alone(self) -> None:
        rgb = Image.new("RGB", (40, 60), (200, 200, 200))
        ImageDraw.Draw(rgb).rectangle([10, 10, 29, 49], fill=(40, 160, 60))  # 綠色的角色、灰色的背景
        alpha = Image.new("L", (40, 60), 0)
        ImageDraw.Draw(alpha).rectangle([10, 10, 29, 49], fill=255)
        figure = sprites.clean_edges(rgb, alpha, (200, 200, 200))
        self.assertEqual(figure.size, (20, 40))
        self.assertEqual(figure.getpixel((0, 0)), (40, 160, 60, 255))

    def test_without_full_body(self) -> None:
        self.add_character("hero", SETTINGS, make_source())
        built = self.build("hero")
        self.assertIsNone(built.full_body)
        self.assertNotIn("fullBody", built.entry)
        self.assertIn("沒有", built.report[-1])

    def test_missing_full_body_source(self) -> None:
        self.add_character("hero", {**SETTINGS, "fullBody": {"source": "base.png"}}, make_source())
        with self.assertRaises(sprites.MissingSource):
            self.build("hero")

    def test_same_picture_ignores_tiny_differences_only(self) -> None:
        figure = Image.new("RGBA", (120, 300), (200, 40, 40, 255))
        picture, _ = sprites.compose_full_body(figure, "#3D4F73")
        self.assertTrue(sprites.same_picture(picture, picture))
        # 每個像素都差一點點 (不同作業系統的縮放、壓縮誤差)
        self.assertTrue(sprites.same_picture(picture, ImageChops.add(picture, Image.new("RGB", picture.size, (5, 5, 5)))))
        # 角色移動 2px、大小不同
        self.assertFalse(sprites.same_picture(picture, ImageChops.offset(picture, 2, 0)))
        self.assertFalse(sprites.same_picture(picture, picture.resize((256, 384))))


class BuildAndCheckTest(WorkDirTestCase):
    """build() 與 check() 寫入、檢查的是 public/：把 public/、tools/work/ 與設定檔、原圖的位置都換成暫存資料夾。"""

    def setUp(self) -> None:
        super().setUp()
        self.public_dir = self.dir / "public"
        (self.public_dir / "js").mkdir(parents=True)
        build_character = sprites.build_character
        for target, name, value in (
            (config, "PUBLIC_DIR", self.public_dir),
            (config, "WORK_DIR", self.dir / "work"),
            (sprites, "all_character_ids", lambda: sorted(p.stem for p in self.characters_dir.glob("*.json"))),
            (sprites, "build_character", lambda char_id, **options: build_character(
                char_id, self.characters_dir, self.reference_dir, **options)),
        ):
            patcher = mock.patch.object(target, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def run_quietly(self, command, *args) -> tuple[int, str]:
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = command(*args)
        return code, output.getvalue()

    def test_build_writes_full_body_and_check_passes(self) -> None:
        self.add_character("hero", FULL_SETTINGS, make_source())
        self.add_character("plain", SETTINGS, make_source())
        code, _ = self.run_quietly(sprites.build, ["hero", "plain"], True)
        self.assertEqual(code, 0)

        full_path = self.public_dir / "characters" / "hero_full.jpg"
        with Image.open(full_path) as image:
            self.assertEqual((image.format, image.size), ("JPEG", sprites.FULL_BODY_SIZE))
        self.assertFalse((self.public_dir / "characters" / "plain_full.jpg").exists())
        entries = sprites.read_manifest(self.public_dir / "js" / "characters.js")
        self.assertEqual(entries["hero"]["fullBody"]["image"], "characters/hero_full.jpg")
        self.assertNotIn("fullBody", entries["plain"])
        self.assertEqual(self.run_quietly(sprites.check, ["hero", "plain"], True)[0], 0)

    def test_check_reports_changed_missing_and_leftover_full_body(self) -> None:
        self.add_character("hero", FULL_SETTINGS, make_source())
        self.run_quietly(sprites.build, ["hero"], True)
        full_path = self.public_dir / "characters" / "hero_full.jpg"

        # 底色換掉：characters.js 的設定不變，只有圖不同
        self.add_character("hero", {**SETTINGS, "fullBody": {"source": "sheet.png", "background": "#3D4F73"}})
        code, output = self.run_quietly(sprites.check, ["hero"], True)
        self.assertEqual(code, 1)
        self.assertIn("hero_full.jpg 跟重新處理的結果不同", output)

        # 設定檔拿掉 fullBody，圖還留著
        self.add_character("hero", SETTINGS)
        code, output = self.run_quietly(sprites.check, ["hero"], True)
        self.assertEqual(code, 1)
        self.assertIn("設定檔沒有 fullBody", output)

        # 圖被刪掉
        self.add_character("hero", FULL_SETTINGS)
        full_path.unlink()
        code, output = self.run_quietly(sprites.check, ["hero"], True)
        self.assertEqual(code, 1)
        self.assertIn("缺少", output)

    def test_full_body_only_leaves_sprite_sheet_alone(self) -> None:
        self.add_character("hero", SETTINGS, make_source())
        self.run_quietly(sprites.build, ["hero"], True)
        sheet_path = self.public_dir / "characters" / "hero.png"
        sheet_before = sheet_path.read_bytes()
        entry_before = sprites.read_manifest(self.public_dir / "js" / "characters.js")["hero"]

        # 只有全身圖的原圖：精靈圖的原圖 sheet.png 不在
        (self.reference_dir / "characters" / "hero" / "sheet.png").unlink()
        make_base().save(self.reference_dir / "characters" / "hero" / "full.png")
        self.add_character("hero", {**SETTINGS, "fullBody": {"source": "full.png"}})
        code, output = self.run_quietly(sprites.build, ["hero"], False, True)
        self.assertEqual(code, 0, output)
        self.assertTrue((self.public_dir / "characters" / "hero_full.jpg").is_file())
        self.assertEqual(sheet_path.read_bytes(), sheet_before)
        entry = sprites.read_manifest(self.public_dir / "js" / "characters.js")["hero"]
        self.assertEqual(entry, {**entry_before, "fullBody": {"image": "characters/hero_full.jpg", "width": 512, "height": 768}})
        self.assertEqual(list(entry)[-1], "fullBody")  # 跟重建整個角色時的欄位順序相同

    def test_full_body_only_needs_config_and_existing_character(self) -> None:
        self.add_character("hero", SETTINGS, make_source())
        self.run_quietly(sprites.build, ["hero"], True)
        code, output = self.run_quietly(sprites.build, ["hero"], False, True)
        self.assertEqual(code, 1)
        self.assertIn("設定檔沒有 fullBody", output)
        self.add_character("newcomer", FULL_SETTINGS, make_source())
        code, output = self.run_quietly(sprites.build, ["newcomer"], False, True)
        self.assertEqual(code, 1)
        self.assertIn("先重建整個角色", output)
        self.assertFalse((self.public_dir / "characters" / "newcomer_full.jpg").exists())

    def test_check_reports_full_body_without_config(self) -> None:
        self.add_character("hero", SETTINGS, make_source())
        self.run_quietly(sprites.build, ["hero"], True)
        Image.new("RGB", (8, 8)).save(self.public_dir / "characters" / "ghost_full.jpg")
        code, output = self.run_quietly(sprites.check, ["hero"], True)
        self.assertEqual(code, 1)
        self.assertIn("ghost_full.jpg 沒有設定檔", output)


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

    def test_full_body_defaults_filled_in(self) -> None:
        self.assertIsNone(sprites.validate_config(SETTINGS, "test")["fullBody"])
        cfg = sprites.validate_config({**SETTINGS, "fullBody": {"source": "base.png"}}, "test")
        self.assertEqual(cfg["fullBody"], {"source": "base.png", "background": ["#FFF8DC", "#E6C992"]})

    def test_bad_full_body_rejected(self) -> None:
        for full_body, message in (
            ("base.png", "fullBody 要是"),
            ({}, "fullBody 缺少 source"),
            ({"source": "base.png", "bakground": "#FFFFFF"}, "bakground"),
            ({"source": "base.png", "background": "white"}, "fullBody.background"),
            ({"source": "base.png", "background": ["#FFFFFF", "#000000", "#FF0000"]}, "fullBody.background"),
        ):
            with self.subTest(full_body=full_body), self.assertRaisesRegex(sprites.BuildError, message):
                sprites.validate_config({**SETTINGS, "fullBody": full_body}, "test")


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
