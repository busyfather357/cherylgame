"""tools/config.py 的測試：參考素材 reference/ 要從哪裡讀 (Google Drive 的對照資料夾，或 repo 裡的)。"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools import config


class ReferenceDirTest(unittest.TestCase):
    def setUp(self) -> None:
        config.WORK_DIR.mkdir(parents=True, exist_ok=True)
        tmp = tempfile.TemporaryDirectory(dir=config.WORK_DIR, prefix="test-config-")
        self.addCleanup(tmp.cleanup)
        self.drive = Path(tmp.name) / "drive"
        self.repo = Path(tmp.name) / "repo"
        self.drive.mkdir()
        self.repo.mkdir()

    def test_drive_reference_is_used_when_present(self) -> None:
        (self.drive / "reference").mkdir()
        (self.repo / "reference").mkdir()
        self.assertEqual(config.pick_reference_dir(self.drive, self.repo), self.drive / "reference")

    def test_falls_back_to_repo_reference(self) -> None:
        # Drive 上沒有 reference/ (還沒建立)
        self.assertEqual(config.pick_reference_dir(self.drive, self.repo), self.repo / "reference")
        # Drive 沒有掛載
        self.assertEqual(config.pick_reference_dir(self.drive / "missing", self.repo), self.repo / "reference")

    def test_display_path(self) -> None:
        self.assertEqual(config.display_path(config.PUBLIC_DIR / "characters" / "knight.png"), "public/characters/knight.png")
        self.assertEqual(config.display_path(config.DRIVE_DIR / "reference" / "characters" / "knight" / "a.png"),
                         "Drive:reference/characters/knight/a.png")


if __name__ == "__main__":
    unittest.main()
