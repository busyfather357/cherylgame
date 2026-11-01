// 此檔由 tools/sprites.py 產生，請勿手動修改 (見 private/doc/character_pipeline.md)
const CHARACTERS = {
    "knight": {
        "name": "騎士",
        "sheet": "characters/knight.png",
        "cell": 128,
        "drawScale": 0.5,
        "anchor": [64, 120],
        "animations": {
            "idle": {
                "row": 0,
                "frames": 4,
                "fps": 6
            },
            "run": {
                "row": 1,
                "frames": 4,
                "fps": 12
            }
        },
        "attach": {
            "head": {
                "idle": [[67, 24], [67, 24], [67, 22], [67, 22]],
                "run": [[67, 28], [68, 28], [68, 28], [66, 28]]
            }
        }
    }
};
