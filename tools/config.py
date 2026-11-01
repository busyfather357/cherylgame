"""所有 Python 工具共用的路徑，只在這裡改。"""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = REPO_ROOT / "public"
# 工具輸出 (預覽、報告、測試用的暫存檔)，不進 git
WORK_DIR = REPO_ROOT / "tools" / "work"
# 角色設定檔 tools/characters/<id>.json (進 git)
CHARACTERS_DIR = REPO_ROOT / "tools" / "characters"
# 本機參考素材 (Gemini 原圖等)，不進 git；角色原圖在 reference/characters/<id>/
REFERENCE_DIR = REPO_ROOT / "reference"


def display_path(path: Path) -> str:
    """相對於 repo 根目錄、以 / 分隔的路徑，報告在任何系統上都一樣。"""
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()
