# knight 生圖紀錄

## CHARACTER（定稿：`knight_base_v01.png`）

```text
a young adult male knight (paladin), slender and capable anime fantasy proportions, short swept golden-blonde hair with no helmet. He wears silver-grey steel plate chest armor and layered shoulder pauldrons with warm gold trim, over a dark brown long-sleeved leather tunic, a dark brown waist belt with a gold buckle, silver-grey steel gauntlets, dark charcoal-brown trousers, silver-grey knee guards, and sturdy dark brown leather boots. He carries a short silver broadsword with a gold crossguard and a compact plain steel heater shield with a gold border (no emblem or text).
```

## 需求指示（對話指示）
- 種類：角色 (`knight`)
- 要做的步驟：1（基準立繪 base stance，用來轉出全身圖；2026-11-14 維護者決定待機與跑步動畫先沿用現有 `Pal_test.png`）
- 外觀：沿用現有騎士精靈圖辨識特徵（金短髮無頭盔、銀灰配金邊胸甲與護肩、深棕內搭與長靴、短銀劍與無徽章金邊盾牌），參考牧師定稿風格（等級 D）
- 可愛程度：D（6～7 頭身成熟動漫奇幻風）
- 背景色：綠 (`#00FF00`)

## knight_base_v01.png
- 日期：2026-11-14
- 步驟：1 基準立繪
- 生圖工具／模型：Gemini App（維護者由 `IMG_2202.jpeg` 上傳，Antigravity 轉存無損 PNG 並歸檔至 Drive）
- 規範版本：2026-11-13 v5
- 附上的參考圖：`reference/style/character_style.png`（`cleric_base_v08.png`）
- Drive File ID：
  - `drafts/knight_base_v01.png`：`1ozvykarH_P5tSzYfdIk4pXkNMj0NDQ2N`
  - 定稿 `knight_base_v01.png`：`1MGDkdVT0vt5tXdNie51F1BLJ9yIW_0cP`
- 自我檢查：第 1～10 項通過，已獲維護者核可定稿
  - 原圖尺寸 `1024×1024`，背景均勻純綠 `#0CF802`。
  - `tools/sprites.py` 自動切出剛好 1 格（`box=(338, 64, 701, 1001)`，尺寸 `363×937`，全身圖去邊後 `361×934`），符合 6.11 大於 676px 高度要求，縮至 `512×768` 全身圖倍率為 `0.7238`（不需放大）。
  - 6～7 頭身比例、粗深棕描邊、面向右、劍尖高於鞋底、頭頂無突出物、無地面陰影與發光，縮至 96px 高依然清晰。
  - 去背實測備註：使用預設 `tolerance=40` 時，劍刃上方與大腿內側極細縫隙（`x: 170..175, y: 567..579`）因反鋸齒與 JPEG 壓縮混色，會殘留 59 個偏綠像素；將去背容許值調為 `tolerance=50` 或 `60` 後殘留綠色像素為 **0 個**，且完全不傷及角色輪廓。轉檔時需在 `fullBody` 單獨使用較高 `tolerance`（避免改動頂層 `tolerance` 影響 `Pal_test.png` 的精靈圖檢查）。
- 提示詞：

```text
Match the art style of the attached style reference exactly (outline thickness, shading, proportions, face style). The style reference shows a DIFFERENT character: copy only the style, not the character.

A single game character, alone on the canvas: a young adult male knight (paladin), slender and capable anime fantasy proportions, short swept golden-blonde hair with no helmet. He wears silver-grey steel plate chest armor and layered shoulder pauldrons with warm gold trim, over a dark brown long-sleeved leather tunic, a dark brown waist belt with a gold buckle, silver-grey steel gauntlets, dark charcoal-brown trousers, silver-grey knee guards, and sturdy dark brown leather boots. He carries a short silver broadsword with a gold crossguard and a compact plain steel heater shield with a gold border (no emblem or text).
View: full body, body in side view facing RIGHT, head turned slightly toward the viewer (3/4 view) so both eyes are visible, both feet on the ground pointing right.
Pose: relaxed neutral standing pose, arms down and close to the body, his right hand holding the short broadsword pointing downward close beside his right leg (sword tip well above his boot soles), and his left arm holding the compact shield close against his torso so arms and weapons overlap the body silhouette without leaving enclosed green gaps.
Canvas: square 1:1. The character is centered and about 80% of the canvas height.

Art style: clean 2D anime and fantasy game character illustration for an all-ages adventure RPG.
Shading: clean cel shading with rich shadow tones on fabric folds, hair strands, and metallic gold trim. No soft airbrush blur on the outer silhouette.
Bold, clean, dark brown outline around the entire silhouette and between the main shapes. The outline must stay clearly visible when shrunk.
Proportions: 6 to 7 heads tall, slender and capable fantasy adventurer build, natural anatomy, clearly drawn hands and boots. Not chibi, not cartoon, not a toddler.
Face: refined and calm anime-style face with clear eyes, defined eyebrows, and a calm confident expression.
Design: clear color separation (4 to 6 main colors), strong light/dark contrast between neighbouring areas.
Not pixel art, not a 3D render, not photorealistic, not a sticker with a white border.

Technical requirements (must all be followed):
Background: one single flat solid color, pure chroma green #00FF00, filling the whole canvas edge to edge. No gradient, no vignette, no texture, no grid, no floor, no horizon line.
No cast shadow, no ground shadow, no reflection under the feet.
No glow, halo, light rays, sparkles, particles, smoke, magic effects, motion lines, or any semi-transparent element. Crystals, gems and metal are drawn as solid flat shapes with a dark outline.
Each character is one solid connected shape. Nothing floats or is detached from the body.
No green anywhere on the character, and no green light reflected on the character.
Keep arms and held items close to or overlapping the body, so the background does not show through closed gaps or loops.
Nothing extends below the soles of the shoes: cape, hair, weapon and staff tips all end above the feet. Nothing rises above the top of the head or hat.
The whole body is inside the canvas with empty background margin on all four sides. Nothing is cropped.
No text, letters, numbers, logos, watermark, signature, borders, frames, labels or UI.
```
