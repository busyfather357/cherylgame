"""所有 Python 工具共用的路徑，只在這裡改。"""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = REPO_ROOT / "public"
# 工具輸出 (預覽、報告、測試用的暫存檔)，不進 git
WORK_DIR = REPO_ROOT / "tools" / "work"
# 角色設定檔 tools/characters/<id>.json (進 git)
CHARACTERS_DIR = REPO_ROOT / "tools" / "characters"

# Google Drive 上對照 repo 根目錄的資料夾 (Antigravity_Data/cherylgame)：資料夾結構跟 repo 相同，
# 放不進 git 的大型檔案 (reference/)。預設是維護者電腦上 Drive 的掛載位置，可以用環境變數改。
DRIVE_DIR = Path(os.environ.get("CHERYLGAME_DRIVE_DIR") or r"G:\我的雲端硬碟\Antigravity_Data\cherylgame")


def pick_reference_dir(drive_dir: Path, repo_root: Path) -> Path:
    """參考素材 (AI 生成的原圖等，不進 git) 的位置：Drive 上有 reference/ 就直接讀它 (正本)，
    沒有 (Drive 沒掛載、雲端 agent 的環境) 才用 repo 裡的 reference/。"""
    drive_reference = drive_dir / "reference"
    return drive_reference if drive_reference.is_dir() else repo_root / "reference"


# 角色原圖在 reference/characters/<id>/
REFERENCE_DIR = pick_reference_dir(DRIVE_DIR, REPO_ROOT)


def display_path(path: Path) -> str:
    """相對於 repo 根目錄、以 / 分隔的路徑，報告在任何系統上都一樣。
    Drive 上的檔案顯示成 Drive:<相對路徑> (兩邊的資料夾結構相同)。"""
    resolved = path.resolve()
    # 先比對 Drive：在 Linux、macOS 上，預設的 Windows 路徑 (G:\...) 是相對路徑，解析後會落在目前的資料夾 (通常是 repo) 底下
    for prefix, base in (("Drive:", DRIVE_DIR.resolve()), ("", REPO_ROOT)):
        try:
            return prefix + resolved.relative_to(base).as_posix()
        except ValueError:
            pass
    return path.as_posix()
