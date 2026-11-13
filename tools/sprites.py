"""角色精靈圖建置工具：原圖 (AI 生成) → 去背、切格、對齊、縮放、打包 → 遊戲用的角色圖與設定。

設計與流程：private/doc/character_pipeline.md；原圖怎麼畫：private/doc/art_guide.md。只用 Pillow，不連網。

每個角色：
* 設定檔 tools/characters/<id>.json (進 git)。
* 原圖放 reference/characters/<id>/ (不進 git)。reference/ 的正本在 Google Drive 上對照 repo 的資料夾，
  Drive 有掛載時直接讀那裡，否則讀 repo 裡的 reference/ (見 tools/config.py)。
產出：
* public/characters/<id>.png：每格 cell×cell，每排一個動畫 (依設定檔 animations 的順序)，
  角色腳底中心固定在格子的 anchor。
* public/js/characters.js：所有角色的設定 (全域 const CHARACTERS)，script.js 依它繪製。不要手動修改。
* tools/work/sprites/<id>/：預覽圖 preview.png、各動畫的 GIF、報告 report.txt (不進 git)。

設定檔 (name、source、animations 必填，其他可省略)：

    {
        "name": "騎士",
        "source": "Pal_test.png",
        "animations": {
            "idle": { "frames": [0, 1, 2, 3], "fps": 6 },
            "run":  { "frames": [4, 5, 6, 7], "fps": 12 }
        },
        "colors": 64
    }

* source：原圖檔名。個別動畫可以用自己的 "source" 指定另一張原圖。
* animations：遊戲需要 idle 與 run。frames 是自動切出的格子編號 (由上而下、由左而右，從 0 開始，
  報告裡有每一格在原圖的位置)，可以重新排序、跳過畫壞的格子。fps：每秒幾格。
* charHeight (96)：idle 第 1 格的角色縮放後有多高；所有格子用同一個倍率，角色不會忽大忽小。
* cell (128)、padding (8)：每格大小、腳底到格子下緣的距離。
* drawScale (0.5)：遊戲裡的繪製倍率，128 × 0.5 = 畫面上 64px。
* colors (null)：限制色數可以讓檔案小很多，但插畫的漸層會出現色帶；看預覽再決定。
* tolerance (40)：去背時，RGB 各分量跟背景色都差在這個值以內就算背景。
* offsets：個別格子的手動偏移 (精靈圖像素)，例如 {"run": {"2": [-2, 0]}} 把 run 第 3 格往左移 2。

指令 (從 repo 根目錄執行)：

    python -m tools.sprites knight     重建一個角色 (可以列多個)
    python -m tools.sprites --all      重建全部角色
    python -m tools.sprites --check    檢查 public/ 的產出是否跟原圖與設定一致，不寫檔
    python -m tools.sprites template   產生給 Gemini 參考的版面圖 tools/work/sprites/template.png

結束代碼：0 成功；1 處理失敗或檢查不一致；2 用法錯誤。
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from statistics import median

import PIL
from PIL import Image, ImageChops, ImageDraw, ImageFilter

from tools import config

PILLOW_VERSION = "12.3.0"  # 產出以這個版本為準；版本不同時縮放、減色的結果可能有細微差異，--check 會不一致
GAME_ANIMATIONS = ("idle", "run")  # script.js 用到的動畫
REQUIRED = ("name", "source", "animations")
DEFAULTS = {"charHeight": 96, "cell": 128, "padding": 8, "drawScale": 0.5, "colors": None, "tolerance": 40, "offsets": {}}
MANIFEST_HEADER = "// 此檔由 tools/sprites.py 產生，請勿手動修改 (見 private/doc/character_pipeline.md)\n"
MANIFEST_PREFIX = "const CHARACTERS = "
FRINGE_FACTOR = 2.5      # 去掉反鋸齒邊：邊緣像素跟背景色差在 tolerance × 這個倍數以內就去掉
MIN_SPECK_AREA = 30      # 小於這個面積的獨立色塊當成雜點去掉 (格線殘留等)
ROW_GAP, COL_GAP = 8, 10  # 切格時，至少要有這麼多列 / 欄的空白，才算兩格之間的間隔
PLAYER_SIZE = (50, 52)   # 遊戲裡玩家方塊的大小 (script.js 的 PLAYER_WIDTH、PLAYER_HEIGHT)，預覽時畫出碰撞範圍對照
PREVIEW_FLOORS = ("#4CAF50", "#2F4F4F")  # 預覽用的地板：森林、地牢 (js/stages.js)
PREVIEW_ZOOM = 3


class BuildError(Exception):
    """無法處理這個角色；訊息說明原因。"""


class MissingSource(BuildError):
    """原圖不在本機 (reference/ 不進 git)。"""


@dataclass
class Frame:
    """原圖中自動切出的一格。box 是原圖座標 (left, top, right, bottom)，image 已裁到角色的範圍。"""

    box: tuple[int, int, int, int]
    image: Image.Image


@dataclass
class Built:
    """一個角色處理完的結果，還沒寫入檔案。"""

    sheet: Image.Image                  # 要寫入 public/characters/ 的精靈圖 (限制色數時是 P 模式)
    entry: dict                         # characters.js 裡這個角色的設定
    cells: dict[str, list[Image.Image]]  # 每個動畫的格子 (RGBA)，預覽用
    report: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


# --- 設定檔 ---

def load_config(char_id: str, characters_dir: Path = config.CHARACTERS_DIR) -> dict:
    path = characters_dir / f"{char_id}.json"
    if not path.is_file():
        raise BuildError(f"找不到設定檔 {config.display_path(path)}")
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise BuildError(f"{config.display_path(path)} 不是正確的 JSON：{e}") from e
    return validate_config(raw, config.display_path(path))


def validate_config(raw: dict, where: str) -> dict:
    """檢查設定檔並補上預設值。打錯的欄位名稱會被擋下，不會被默默忽略。"""
    problems = []
    unknown = set(raw) - set(REQUIRED) - set(DEFAULTS)
    if unknown:
        problems.append(f"不認得的欄位 {sorted(unknown)}")
    problems += [f"缺少 {key}" for key in REQUIRED if key not in raw]
    animations = raw.get("animations", {})
    problems += [f"animations 缺少 {name} (遊戲需要)" for name in GAME_ANIMATIONS if name not in animations]
    for name, anim in animations.items():
        extra = set(anim) - {"frames", "fps", "source"}
        if extra:
            problems.append(f"{name} 不認得的欄位 {sorted(extra)}")
        frames = anim.get("frames")
        if not isinstance(frames, list) or not frames or not all(isinstance(i, int) and i >= 0 for i in frames):
            problems.append(f"{name}.frames 要是非負整數的清單")
        fps = anim.get("fps")
        if not isinstance(fps, (int, float)) or fps <= 0:
            problems.append(f"{name}.fps 要是正數")
    for name, offsets in raw.get("offsets", {}).items():
        if name not in animations:
            problems.append(f"offsets 的 {name} 不是動畫")
            continue
        for n, offset in offsets.items():
            if not n.isdigit() or int(n) >= len(animations[name].get("frames", [])):
                problems.append(f"offsets.{name} 沒有第 {n} 格")
            elif not (isinstance(offset, list) and len(offset) == 2 and all(isinstance(v, int) for v in offset)):
                problems.append(f"offsets.{name}.{n} 要是 [dx, dy] 兩個整數")
    if problems:
        raise BuildError(f"{where}：" + "；".join(problems))
    return {**DEFAULTS, **raw}


def all_character_ids(characters_dir: Path = config.CHARACTERS_DIR) -> list[str]:
    return sorted(path.stem for path in characters_dir.glob("*.json"))


# --- 去背 ---

def background_color(im: Image.Image) -> tuple[int, int, int]:
    """原圖的背景色：四邊像素的中位數。Gemini 畫的純色背景不一定是精確的色碼，所以不用指定。"""
    w, h = im.size
    px = im.convert("RGB").load()
    border = [px[x, y] for x in range(w) for y in (0, h - 1)] + [px[x, y] for y in range(h) for x in (0, w - 1)]
    return tuple(int(median(p[c] for p in border)) for c in range(3))


def key_background(im: Image.Image, tolerance: int) -> Image.Image:
    """去背，回傳 RGBA (背景的 alpha 為 0)：
    1. 綠幕、洋紅等鮮豔背景：整張圖顏色接近背景的像素都設為透明 (包含手臂與身體圍出的封閉小洞)；
       淺灰、白色等中性背景則只從四邊 flood fill，保留角色內部的眼白與白衣。
    2. 去掉兩圈跟背景混色的反鋸齒邊。
    3. 鮮豔背景的邊緣三圈去掉背景色的溢色 (despill)。頭與身體交接的凹角，溢色會滲到第 3 圈。
    4. 去掉面積很小的雜點 (格線殘留等)。
    """
    im = im.convert("RGBA")
    w, h = im.size
    rgba = im.tobytes()
    bg = background_color(im)

    def distance(i: int) -> int:
        j = 4 * i
        return max(abs(rgba[j] - bg[0]), abs(rgba[j + 1] - bg[1]), abs(rgba[j + 2] - bg[2]))

    alpha = bytearray(b"\xff") * (w * h)
    seen = bytearray(w * h)
    is_chroma = max(bg) - min(bg) > 100
    if is_chroma:
        for i in range(w * h):
            if distance(i) <= tolerance:
                alpha[i] = 0
    else:
        queue = deque(list(range(w)) + list(range(w * (h - 1), w * h)) + [y * w for y in range(h)] + [y * w + w - 1 for y in range(h)])
        while queue:
            i = queue.popleft()
            if seen[i]:
                continue
            seen[i] = 1
            if distance(i) > tolerance:
                continue
            alpha[i] = 0
            x = i % w
            if x > 0:
                queue.append(i - 1)
            if x < w - 1:
                queue.append(i + 1)
            if i >= w:
                queue.append(i - w)
            if i < w * (h - 1):
                queue.append(i + w)

    for _ in range(2):
        for i in _edge_indices(alpha, w, h, 1):
            if distance(i) <= tolerance * FRINGE_FACTOR:
                alpha[i] = 0

    key = [c for c in range(3) if bg[c] > 127]
    other = [c for c in range(3) if bg[c] <= 127]
    if max(bg) - min(bg) > 100 and key and other:
        px = im.load()
        for i in _edge_indices(alpha, w, h, 3):
            pixel = list(rgba[4 * i:4 * i + 4])
            limit = max(pixel[c] for c in other)
            for c in key:
                pixel[c] = min(pixel[c], limit)
            px[i % w, i // w] = tuple(pixel)

    _remove_specks(alpha, w, h)
    im.putalpha(Image.frombytes("L", (w, h), bytes(alpha)))
    return im


def _edge_indices(alpha: bytearray, w: int, h: int, width: int) -> list[int]:
    """不透明、而且離透明像素 width 格以內 (8 方向) 的位置。"""
    mask = Image.frombytes("L", (w, h), bytes(alpha))
    inner = mask
    for _ in range(width):
        inner = inner.filter(ImageFilter.MinFilter(3))
    edge = ImageChops.subtract(mask, inner).tobytes()
    return [i for i, v in enumerate(edge) if v]


def _remove_specks(alpha: bytearray, w: int, h: int) -> None:
    seen = bytearray(w * h)
    for start in [i for i, v in enumerate(alpha) if v]:
        if seen[start]:
            continue
        seen[start] = 1
        component = [start]
        k = 0
        while k < len(component):
            i = component[k]
            k += 1
            x = i % w
            for j in (i - 1 if x > 0 else -1, i + 1 if x < w - 1 else -1, i - w, i + w if i + w < w * h else -1):
                if j >= 0 and alpha[j] and not seen[j]:
                    seen[j] = 1
                    component.append(j)
        if len(component) < MIN_SPECK_AREA:
            for i in component:
                alpha[i] = 0


# --- 切格與對齊 ---

def find_frames(keyed: Image.Image) -> list[Frame]:
    """依空白帶切格：先找橫向的空白帶分出各排，再在每排找直向的空白帶分出各格。
    不假設格子等分，Gemini 排得不整齊也能切。回傳的順序由上而下、由左而右。"""
    w, h = keyed.size
    alpha = keyed.getchannel("A")
    data = alpha.tobytes()
    row_counts = [w - data[y * w:(y + 1) * w].count(0) for y in range(h)]
    frames = []
    for top, bottom in _bands(row_counts, ROW_GAP):
        bh = bottom - top
        if bh <= 2:
            continue
        columns = alpha.crop((0, top, w, bottom)).transpose(Image.Transpose.TRANSPOSE).tobytes()  # 轉置後每一列是原圖的一欄
        col_counts = [bh - columns[x * bh:(x + 1) * bh].count(0) for x in range(w)]
        for left, right in _bands(col_counts, COL_GAP):
            l, t, r, b = alpha.crop((left, top, right, bottom)).getbbox()
            if r - l <= 2 or b - t <= 2:
                continue
            box = (left + l, top + t, left + r, top + b)
            frames.append(Frame(box, keyed.crop(box)))
    return frames


def _bands(counts: list[int], min_gap: int) -> list[tuple[int, int]]:
    """counts 中有內容的區段 (start, end)；中間的空白少於 min_gap 時算同一段。"""
    bands = []
    start, end = None, 0
    for i, count in enumerate(counts):
        if not count:
            continue
        if start is not None and i - end >= min_gap:
            bands.append((start, end))
            start = None
        if start is None:
            start = i
        end = i + 1
    if start is not None:
        bands.append((start, end))
    return bands


def _median_x(img: Image.Image, top: float, bottom: float) -> float:
    """img 從上往下 top～bottom 比例的範圍內，不透明像素 x 的中位數。"""
    w, h = img.size
    data = img.getchannel("A").tobytes()
    y0 = int(h * top)
    y1 = max(int(h * bottom), y0 + 1)
    return median(x for y in range(y0, y1) for x in range(w) if data[y * w + x])


def body_center_x(img: Image.Image) -> float:
    """水平對齊的基準：上半身 (頭與軀幹) 的中心，不受劍、披風、腿影響。"""
    return _median_x(img, 0, 0.45)


def head_x(img: Image.Image) -> float:
    return _median_x(img, 0, 0.2)


# --- 建置 ---

def build_character(char_id: str, characters_dir: Path = config.CHARACTERS_DIR,
                    reference_dir: Path = config.REFERENCE_DIR) -> Built:
    """依設定檔處理一個角色，結果放在記憶體裡，不寫檔。"""
    cfg = load_config(char_id, characters_dir)
    source_dir = reference_dir / "characters" / char_id
    report: list[str] = []
    warnings: list[str] = []
    sources: dict[str, list[Frame]] = {}

    def frames_of(name: str) -> list[Frame]:
        if name not in sources:
            path = source_dir / name
            if not path.is_file():
                raise MissingSource(f"找不到原圖 {config.display_path(path)} (原圖不進 git，正本在 Google Drive)")
            with Image.open(path) as im:
                size = im.size
                bg = background_color(im)
                frames = find_frames(key_background(im, cfg["tolerance"]))
            sources[name] = frames
            report.append(f"原圖 {name}：{size[0]}×{size[1]}，背景色 #{bg[0]:02X}{bg[1]:02X}{bg[2]:02X}，切出 {len(frames)} 格")
            heights = [f.image.height for f in frames]
            for i, f in enumerate(frames):
                l, t, r, b = f.box
                report.append(f"  {i:2d}: x {l}～{r}，y {t}～{b} ({r - l}×{b - t})")
                if f.image.height < median(heights) * 0.3:
                    warnings.append(f"{name} 第 {i} 格很小 ({r - l}×{b - t})，可能是分離的劍尖或雜點，格子編號會因此往後移")
        return sources[name]

    picked: dict[str, list[Frame]] = {}
    source_scales: dict[str, float] = {}
    for name, anim in cfg["animations"].items():
        src_name = anim.get("source", cfg["source"])
        frames = frames_of(src_name)
        for i in anim["frames"]:
            if i >= len(frames):
                raise BuildError(f"{char_id}：{name} 用到第 {i} 格，但原圖只切出 {len(frames)} 格 (0～{len(frames) - 1})")
        picked[name] = [frames[i] for i in anim["frames"]]
        if src_name not in source_scales:
            source_scales[src_name] = cfg["charHeight"] / picked[name][0].image.height

    cell = cfg["cell"]
    anchor = (cell // 2, cell - cfg["padding"])
    cells: dict[str, list[Image.Image]] = {}
    heads: dict[str, list[list[int]]] = {}
    for name, frames in picked.items():
        src_name = cfg["animations"][name].get("source", cfg["source"])
        scale = source_scales[src_name]
        offsets = cfg["offsets"].get(name, {})
        cells[name], heads[name] = [], []
        for n, frame in enumerate(frames):
            img = frame.image
            size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
            dx, dy = offsets.get(str(n), (0, 0))
            x = round(anchor[0] - body_center_x(img) * scale) + dx
            y = anchor[1] - size[1] + dy
            if x < 0 or y < 0 or x + size[0] > cell or y + size[1] > cell:
                warnings.append(f"{name} 第 {n} 格超出格子，邊緣被裁掉：調小 charHeight 或加大 cell")
            image = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
            image.paste(img.resize(size, Image.Resampling.LANCZOS), (x, y))
            cells[name].append(image)
            heads[name].append([round(x + head_x(img) * scale), y])

    columns = max(len(c) for c in cells.values())
    sheet = Image.new("RGBA", (columns * cell, len(cells) * cell), (0, 0, 0, 0))
    for row, images in enumerate(cells.values()):
        for col, image in enumerate(images):
            sheet.paste(image, (col * cell, row * cell))
    if cfg["colors"]:
        sheet = sheet.quantize(colors=cfg["colors"], method=Image.Quantize.FASTOCTREE)

    entry = {
        "name": cfg["name"],
        "sheet": f"characters/{char_id}.png",
        "cell": cell,
        "drawScale": cfg["drawScale"],
        "anchor": list(anchor),
        "animations": {name: {"row": row, "frames": len(images), "fps": cfg["animations"][name]["fps"]}
                       for row, (name, images) in enumerate(cells.items())},
        "attach": {"head": heads},
    }

    on_screen = cfg["drawScale"]
    scale_text = "、".join(f"{s:.4f}" for s in source_scales.values())
    report.append(f"縮放倍率 {scale_text}；角色在畫面上約 {cfg['charHeight'] * on_screen:.0f}px 高；每格 {cell}×{cell}，畫面上 {cell * on_screen:.0f}px")
    for name, points in heads.items():
        xs = [p[0] for p in points]
        report.append(f"{name}：{len(points)} 格，{cfg['animations'][name]['fps']} fps，頭部水平晃動 {(max(xs) - min(xs)) * on_screen:.1f}px (畫面上)")
    report.append(f"精靈圖 {sheet.width}×{sheet.height}，{'限制 ' + str(cfg['colors']) + ' 色' if cfg['colors'] else '全彩'}，PNG {len(png_bytes(sheet)) / 1024:.1f} KB")
    return Built(sheet, entry, cells, report, warnings)


def png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, "PNG", optimize=True)
    return buffer.getvalue()


# --- characters.js ---

def format_manifest(entries: dict) -> str:
    text = json.dumps(entries, ensure_ascii=False, indent=4)
    # 數字陣列寫成一行：[64, 120]，以及 [[66, 30], [65, 31]]
    one_line = lambda m: json.dumps(json.loads(m.group()))  # noqa: E731
    text = re.sub(r"\[[-\d\s,.]*\]", one_line, text)
    text = re.sub(r"\[(?:\s*\[[-\d, .]*\],?)+\s*\]", one_line, text)
    return MANIFEST_HEADER + MANIFEST_PREFIX + text + ";\n"


def read_manifest(path: Path) -> dict:
    if not path.is_file():
        return {}
    text = path.read_text(encoding="utf-8")
    start = text.find(MANIFEST_PREFIX)
    if start < 0:
        raise BuildError(f"{config.display_path(path)} 不是本工具產生的格式")
    return json.loads(text[start + len(MANIFEST_PREFIX):].strip().removesuffix(";"))


# --- 預覽 ---

def write_preview(char_id: str, built: Built, out_dir: Path) -> None:
    """preview.png：精靈圖放在兩種地板上，畫出玩家的碰撞範圍 (白框)、腳底中心 (紅)、頭頂掛點 (黃)；
    <動畫>.gif：以遊戲裡的大小播放、放大 3 倍；report.txt：處理報告。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    entry = built.entry
    cell, scale = entry["cell"], entry["drawScale"]
    ax, ay = entry["anchor"]
    box_w, box_h = PLAYER_SIZE[0] / scale, PLAYER_SIZE[1] / scale
    sheet = built.sheet.convert("RGBA")

    preview = Image.new("RGBA", (sheet.width, sheet.height * len(PREVIEW_FLOORS)))
    for k, floor in enumerate(PREVIEW_FLOORS):
        panel = Image.new("RGBA", sheet.size, floor)
        panel.alpha_composite(sheet)
        draw = ImageDraw.Draw(panel)
        for name, anim in entry["animations"].items():
            for col in range(anim["frames"]):
                ox, oy = col * cell, anim["row"] * cell
                # 碰撞範圍是玩家方塊中間的一半 (script.js 的 getPlayerHitbox())
                draw.rectangle([ox + ax - box_w / 4, oy + ay - box_h * 3 / 4, ox + ax + box_w / 4, oy + ay - box_h / 4], outline="white")
                draw.line([ox + ax - 4, oy + ay, ox + ax + 4, oy + ay], fill="red", width=2)
                hx, hy = entry["attach"]["head"][name][col]
                draw.ellipse([ox + hx - 2, oy + hy - 2, ox + hx + 2, oy + hy + 2], fill="yellow")
        preview.paste(panel, (0, sheet.height * k))
    preview.save(out_dir / "preview.png")

    size = round(cell * scale)
    big = size * PREVIEW_ZOOM
    for name, images in built.cells.items():
        frames = []
        for image in images:
            small = image.resize((size, size), Image.Resampling.LANCZOS).resize((big, big), Image.Resampling.NEAREST)
            canvas = Image.new("RGB", (big * len(PREVIEW_FLOORS), big))
            for k, floor in enumerate(PREVIEW_FLOORS):
                tile = Image.new("RGBA", (big, big), floor)
                tile.alpha_composite(small)
                canvas.paste(tile.convert("RGB"), (big * k, 0))
            frames.append(canvas)
        duration = round(1000 / entry["animations"][name]["fps"])
        frames[0].save(out_dir / f"{name}.gif", save_all=True, append_images=frames[1:], duration=duration, loop=0)

    lines = [f"角色 {char_id} ({entry['name']})", *built.report]
    lines += [f"注意：{w}" for w in built.warnings]
    (out_dir / "report.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_template(path: Path, cols: int = 4, rows: int = 2, cell: int = 256) -> None:
    """給 Gemini 參考的版面圖：純綠背景、格線，每格有一條腳底基準線。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (cols * cell, rows * cell), (0, 255, 0))
    draw = ImageDraw.Draw(image)
    for c in range(1, cols):
        draw.line([(c * cell, 0), (c * cell, rows * cell)], fill=(0, 150, 0), width=2)
    for r in range(1, rows):
        draw.line([(0, r * cell), (cols * cell, r * cell)], fill=(0, 150, 0), width=2)
    for r in range(rows):
        y = r * cell + round(cell * 0.9)
        for c in range(cols):
            draw.line([(c * cell + cell * 0.15, y), (c * cell + cell * 0.85, y)], fill=(0, 100, 0), width=3)
    image.save(path)


# --- 指令 ---

def build(ids: list[str], rebuild_all: bool) -> int:
    """先處理完所有角色，全部成功才寫檔，不會只更新一半。"""
    known = all_character_ids()
    results: dict[str, Built] = {}
    failed = False
    for char_id in ids:
        try:
            results[char_id] = build_character(char_id)
        except BuildError as e:
            print(f"失敗：{e}")
            failed = True
    if failed:
        print("沒有寫入任何檔案")
        return 1

    manifest_path = config.PUBLIC_DIR / "js" / "characters.js"
    entries = {} if rebuild_all else read_manifest(manifest_path)
    for char_id, built in results.items():
        sheet_path = config.PUBLIC_DIR / "characters" / f"{char_id}.png"
        sheet_path.parent.mkdir(exist_ok=True)
        sheet_path.write_bytes(png_bytes(built.sheet))
        preview_dir = config.WORK_DIR / "sprites" / char_id
        write_preview(char_id, built, preview_dir)
        entries[char_id] = built.entry
        print(f"{char_id}：寫入 {config.display_path(sheet_path)}，預覽在 {config.display_path(preview_dir)}/")
        for line in built.report[-len(built.entry['animations']) - 2:]:
            print(f"  {line}")
        for warning in built.warnings:
            print(f"  注意：{warning}")
    for char_id in [k for k in entries if k not in known]:
        print(f"{char_id} 沒有設定檔，從 characters.js 移除 (public/characters/{char_id}.png 請手動刪除)")
    manifest_path.write_text(format_manifest({k: entries[k] for k in sorted(entries) if k in known}), encoding="utf-8", newline="\n")
    print(f"更新 {config.display_path(manifest_path)}")
    return 0


def check(ids: list[str], check_orphans: bool) -> int:
    """重新處理一次，跟 public/ 裡的產出比較；原圖不在本機的角色略過。"""
    manifest_path = config.PUBLIC_DIR / "js" / "characters.js"
    entries = read_manifest(manifest_path)
    problems, skipped = [], []
    for char_id in ids:
        try:
            built = build_character(char_id)
        except MissingSource as e:
            skipped.append(f"{char_id}：{e}")
            continue
        except BuildError as e:
            problems.append(str(e))
            continue
        sheet_path = config.PUBLIC_DIR / "characters" / f"{char_id}.png"
        if entries.get(char_id) != built.entry:
            problems.append(f"{char_id}：characters.js 的設定跟重新處理的結果不同")
        if not sheet_path.is_file():
            problems.append(f"{char_id}：缺少 {config.display_path(sheet_path)}")
        else:
            with Image.open(sheet_path) as existing:
                same = existing.size == built.sheet.size and existing.convert("RGBA").tobytes() == built.sheet.convert("RGBA").tobytes()
            if not same:
                problems.append(f"{char_id}：{config.display_path(sheet_path)} 跟重新處理的結果不同")
    if check_orphans:
        known = set(all_character_ids())
        problems += [f"characters.js 的 {k} 沒有設定檔" for k in entries if k not in known]
        problems += [f"{config.display_path(p)} 沒有設定檔" for p in (config.PUBLIC_DIR / "characters").glob("*.png") if p.stem not in known]
    for line in skipped:
        print(f"略過 {line}")
    for problem in problems:
        print(f"不一致：{problem}")
    if problems:
        print(f"共 {len(problems)} 項不一致；重建：python -m tools.sprites <id>")
        if PIL.__version__ != PILLOW_VERSION:
            print(f"(Pillow 版本是 {PIL.__version__}，產出以 {PILLOW_VERSION} 為準，版本不同也會造成細微差異)")
        return 1
    print(f"檢查 {len(ids) - len(skipped)} 個角色，都一致")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m tools.sprites", description="角色精靈圖建置工具 (說明見 tools/sprites.py 開頭)")
    parser.add_argument("ids", nargs="*", help="角色 id (tools/characters/<id>.json)，或 template")
    parser.add_argument("--all", action="store_true", help="重建全部角色")
    parser.add_argument("--check", action="store_true", help="只檢查 public/ 的產出是否一致，不寫檔")
    args = parser.parse_args(argv)

    if args.ids == ["template"] and not (args.all or args.check):
        path = config.WORK_DIR / "sprites" / "template.png"
        write_template(path)
        print(f"寫入 {config.display_path(path)}")
        return 0
    if args.all and args.ids:
        parser.error("--all 不能同時指定角色 id")
    if PIL.__version__ != PILLOW_VERSION:
        print(f"注意：Pillow 是 {PIL.__version__}，產出以 {PILLOW_VERSION} 為準")
    if args.check:
        return check(args.ids or all_character_ids(), check_orphans=not args.ids)
    if args.all:
        return build(all_character_ids(), rebuild_all=True)
    if not args.ids:
        parser.error("請指定角色 id、--all、--check 或 template")
    return build(args.ids, rebuild_all=False)


if __name__ == "__main__":
    sys.exit(main())
