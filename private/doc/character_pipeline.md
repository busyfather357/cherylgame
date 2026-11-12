# 角色圖像生成流程評估（Gemini 概念圖 → 遊戲角色）

2026-11-01 評估。目標：用 Gemini 畫角色概念圖，再用 `tools/` 裡的 Python 工具轉成遊戲可用的角色圖，之後可以反覆用同一套流程增加角色，並保留換裝、配件等外觀變化的空間。維護者已經決定的事項見第 9 節。

**進度**：2026-11-01 完成第 1 階段（第 8 節）：工具 `tools/sprites.py` 已建立，騎士已轉換成新格式，遊戲改讀 `js/characters.js`。第 1、2 節是改版前的評估紀錄。

**2026-11-12**：畫圖改由 Google Antigravity 負責（Jules 已停用），生圖規則、提示詞範本、Google Drive 的資料夾與核可流程搬到 [`art_guide.md`](art_guide.md)，**第 6 節只留作紀錄，以 `art_guide.md` 為準**。`reference/` 整個改以 Google Drive 的對照資料夾 `Antigravity_Data/cherylgame/reference/` 為正本，工具直接讀那裡（架構文件 9.7）；下面提到「只在本機」的地方都是改版前的說法。

## 1. 現況：`Pal_test.png` 的實測問題

以 Pillow 寫原型實際處理現有的 `Pal_test.png`，量到的問題：

| 項目 | 實測 | 影響 |
|---|---|---|
| 檔案大小 | 943×1225、2,088 KB，佔整個 `public/`（2,488 KB）的 **84%** | 手機第一次開遊戲時大部分流量在下載這張圖，但角色在畫面上只有約 50px 寬 |
| 實際用到的格數 | 4×5 = 20 格，只用前 2 排 8 格（idle、run） | 後 3 排（揮劍等）白白下載 |
| 等分切格 | 943 / 4 = 235.75 不是整數；第 1 排角色實際在 y = 19～247，程式切在 245 | 待機時腳底被切掉；跑步時頭頂出現上一排腳尖的灰色雜點 |
| 角色在格子裡的位置 | 頭部水平位置在畫面上晃動 idle 2.1px、run 1.7px | 原地待機看起來在抖 |
| 執行期去背 | `script.js` 載入時用 `getImageData` 把接近白色的像素設為透明 | 留下淺色反鋸齒白邊（深色地牢地板上看得到）；角色內部的白色（例如後 3 排的白披風）也會被挖掉；每次載入在主執行緒跑 115 萬個像素；曾因 tainted canvas 失效（架構文件 5.2） |
| 動畫內容 | 「idle」那排其實是走路，第 4 格是衝刺；run 最後一格舉劍 | AI 一次畫整張 sheet 的典型問題，見第 2 節 |
| 換裝 | 每格都是重畫的，盔甲、頭的位置每格不同 | 沒有辦法在上面疊帽子或換衣服 |

背景是淺灰色的格線紙，很可能是要求 AI 畫「透明背景」時，它畫出了假的透明格子。Gemini 輸出的圖沒有透明通道，**要請它畫純色背景，再由工具去背**。

### 1.1 原型的處理結果
同一張圖改用「工具在建置時處理」的做法（第 4 節的流程），結果：

* 自動找到 5 排、20 格，不依賴等分格子；腳底不再被切、沒有鄰格雜點。
* 從圖片邊緣 flood fill 去背：只去掉跟外面相連的背景，角色內部的白色保留；再去掉一圈淺色反鋸齒，白邊消失。
* 以「腳底 + 上半身中心」對齊後，頭部晃動降到 idle 0.5px、run 1.0px。
* 只打包 8 格、每格 128×128（約畫面大小的 2 倍，高 DPR 螢幕也清楚）：PNG 95 KB、WebP 無損 72 KB、**64 色 PNG 13 KB（目視與全彩無差異）**。也就是 2 MB → 13 KB。
* 純 Python + Pillow，處理一張約 2.5 秒。

**結論：不論角色怎麼生成，「去背、切格、對齊、縮放、壓縮」都應該從遊戲執行期移到 `tools/` 的建置步驟。** 現在就能做，而且遊戲畫面幾乎不變、只有變乾淨。

## 2. 方案比較

角色在畫面上約 47px 高。評估的重點是：每多一個角色要花多少工夫、Gemini 能不能穩定做出來、之後能不能換裝。

| 方案 | 每個新角色的工作 | 動畫 | 換裝空間 | 遊戲端改動 |
|---|---|---|---|---|
| **A. 逐格精靈圖**（現行做法標準化）：Gemini 依參考圖畫整張 sheet，工具清理 | 1 張參考圖 + 1 張 sheet，通常要重畫幾次挑最好的 | 最生動；但 AI 畫的循環動作常不連貫，工具修不了 | 每格姿勢不同：配件要靠每格的掛點；整套換裝要重畫整張 sheet | 小 |
| **B. 單張立繪 + 程式動畫**：一張側面站姿，程式加上彈跳、壓縮伸展、傾斜 | 1 張圖，幾乎一次成功 | 較單調，跑步時腳不會動（可加 2 格踏步改善，就變成 A 的 2 格版） | 最容易：只有一個姿勢，配件位置固定，換裝只要讓 Gemini 改同一張圖 | 小 |
| C. 部件拆分（頭、身體、手腳分開，用骨架擺動） | 要請 Gemini 分別畫出各部件（含被遮住的部分），每個角色手動設定關節位置 | 平順，但有「紙偶」感 | 最自由，可以只換帽子、只換上衣 | 中：要寫骨架動畫 |
| D. 3D（圖轉 3D 模型 → 綁骨 → 算繪成精靈圖，或用 three.js） | 多個外部工具，部分要手動操作 | 最一致 | 好 | three.js 要放進 `public/` 並改 CSP；預先算繪則遊戲端不變 |

* **D 不建議**：工具鏈太重（Blender、自動綁骨服務），對畫面上 47px 的角色效益太低。
* **C 先不做**：換裝最自由，但每個角色都要人工拆部件、設關節，跟「反覆、快速增加角色」的目標相反。等外觀系統真的需要自由混搭時再評估，到時在第 3 節的格式加上圖層欄位。
* **A 與 B 用同一套格式**：B 就是每個動畫只有 1 格的 A，再加上程式動畫。

### 建議
1. 遊戲維持精靈圖（sprite sheet），但改成「工具產生的標準格式 + 角色設定檔」，每個動畫可以是 1～N 格。
2. 每個新角色先試 A（Gemini 畫 idle + run 各 4 格）；做不出可用的循環動作時，退回 B（單張立繪 + 程式動畫）。兩種角色在遊戲裡混用沒有問題。
3. 外觀變化從「配件掛點」開始做（第 5 節），它對 A、B 兩種角色都適用。

## 3. 遊戲使用的格式

每個角色兩個產出，都由工具產生、不手動修改：

* `public/characters/<id>.png`：打包後的精靈圖。每格固定大小（預設 128×128），每排一個動畫，角色腳底中心固定在格子的同一點。
* `public/js/characters.js`：所有角色的設定（classic script，全域 `const CHARACTERS`，跟其他系統檔案一樣在 `script.js` 之前載入；不用 `fetch`，CSP 不用改）。

騎士實際產生的內容（節錄）：

```js
// 此檔由 tools/sprites.py 產生，請勿手動修改 (見 private/doc/character_pipeline.md)
const CHARACTERS = {
    "knight": {
        "name": "騎士",
        "sheet": "characters/knight.png",
        "cell": 128,
        "drawScale": 0.5,
        "anchor": [64, 120],
        "animations": {
            "idle": { "row": 0, "frames": 4, "fps": 6 },
            "run": { "row": 1, "frames": 4, "fps": 12 }
        },
        "attach": {
            "head": {
                "idle": [[67, 24], [67, 24], [67, 22], [67, 22]],
                "run": [[67, 28], [68, 28], [68, 28], [66, 28]]
            }
        }
    }
};
```

* `cell`：每格 128×128；`drawScale`：畫到畫面上是 64×64；`anchor`：格子裡的腳底中心。
* `attach.head`：每格的頭頂掛點（格子座標），工具自動估算，給之後的配件用（第 5 節），遊戲目前還沒用到。
* 單張立繪的程式動畫 (`motion`) 與分層紙娃娃 (`layers`) 等到真的需要時再加欄位。
* **碰撞框與圖片脫鉤**：改版前玩家的碰撞範圍由 `gameConfig.drawWidth/drawHeight`（圖片繪製大小，約 50×52）推算，換角色就會跟著變。現在是固定常數 `PLAYER_WIDTH`×`PLAYER_HEIGHT`（50×52），圖片以 `anchor` 對齊玩家方塊底部中心繪製，換角色不影響遊戲平衡與觸控測試。
* 精靈圖都畫成面向右，面向左時沿用 `ctx.scale(-1, 1)` 翻轉，掛點跟著一起翻。
* 角色是平滑插畫（第 9 節），畫角色時開啟 `imageSmoothingEnabled`（品質 `high`），`ctx.restore()` 時還原；地圖與 emoji 維持關閉。
* 去背在建置時完成，`script.js` 原本用 `getImageData` 去背的程式已刪除，tainted canvas 的問題也不會再出現。

## 4. 工具設計 (`tools/sprites.py`)

照架構文件 9.3 節的 Python 工具慣例（與 mumuisland-web 相同）：一個工具一個模組、共用路徑放 `tools/config.py`、測試放 `tools/tests/`。

```
tools/
    config.py                 # 共用路徑
    sprites.py                # 工具本體；設定檔欄位的說明在檔案開頭
    characters/<id>.json      # 每個角色的設定：原圖、動畫用哪幾格、輸出大小、手動修正（進 git）
    tests/test_sprites.py     # 用程式合成的綠幕原圖測試，不需要真實原圖
reference/characters/<id>/    # Gemini 原圖（只在本機，不進 git）
public/characters/<id>.png、public/js/characters.js   # 產出（進 git、會部署）
tools/work/sprites/<id>/      # 預覽與報告（不進 git）
```

* **原圖放 `reference/`，不進 git**（`.gitignore` 的 `/reference/`），讓 repo 維持輕量。設定檔是小小的文字檔，放在 `tools/characters/` 進 git：之後改參數或改流程時，只要本機有原圖，就能用同一份設定重建所有角色。
    * 2026-11-12 起，`reference/` 的正本在 Google Drive 的 `Antigravity_Data/cherylgame/reference/`（資料夾結構跟 repo 相同），騎士的原圖也放在那裡。Drive 有掛載時工具直接讀它。
    * 讀不到 Drive、repo 裡也沒有 `reference/` 的環境不能重建角色。
* **Python 使用維護者電腦的系統 Python 與已安裝的 Pillow 12.3.0**，不建 venv、不另外安裝任何套件。原型證明純 Pillow 就夠用。去背 AI 模型（rembg 等）要另外下載數百 MB，不採用；Gemini 依第 6 節畫出純色背景就不需要。

### 4.1 指令
| 指令 | 內容 |
|---|---|
| `python -m tools.sprites knight` | 重建一個角色：寫入 `public/characters/knight.png`、更新 `public/js/characters.js`、產生預覽 |
| `python -m tools.sprites --all` | 重建全部角色 |
| `python -m tools.sprites --check` | 只檢查 `public/` 的產出是否跟原圖與設定一致，不寫檔（原圖不在本機的角色略過） |
| `python -m tools.sprites template` | 產生給 Gemini 參考的版面圖 `tools/work/sprites/template.png`（4 欄 × 2 排、每格有腳底基準線、純綠背景） |
| `python -m unittest discover -s tools/tests -t .` | 工具的測試 |

### 4.2 處理流程
每一步是一個獨立函式，可以單獨測試；設定檔可以修正自動判斷的結果。

1. **背景色**：取圖片邊框像素的中位數，不用指定。
2. **去背**：從邊緣 flood fill 去掉相連的背景（角色內部的白色保留）→ 去掉兩圈跟背景混色的反鋸齒邊 → 鮮豔背景（綠幕等）的邊緣三圈做溢色修正（despill）→ 去掉面積很小的雜點。
3. **切格**：找橫向、直向的空白帶分出每一格，不假設格子等分；Gemini 排得不整齊也能切。分離的劍尖等小塊會被當成一格，報告會提醒。
4. **對應動畫**：`"idle": { "frames": [0, 1, 2, 3] }` 指定用自動找到的第幾格，可以重新排序、去掉畫壞的格子；不同動畫可以來自不同張原圖。
5. **對齊**：腳底 = 角色最下緣；水平 = 上半身（頭與軀幹）像素的中位數，不受劍、披風、腿影響。個別格子可以手動加偏移。
6. **縮放**：所有格子用同一個倍率（以 idle 第 1 格縮到指定身高，預設 96px），角色不會忽大忽小。用高品質縮小 (Lanczos)，適合平滑插畫；不做像素風專用的處理（第 9 節）。
7. **掛點**：估算每格頭頂的位置（頭部上方 20% 的水平中心、最上緣），寫入 `attach.head`。
8. **打包與壓縮**：排成每排一個動畫。色數在設定檔指定：插畫的漸層限制色數容易出現色帶，預設全彩（約 70～95 KB，仍比改版前小 20 倍以上）；騎士這類色塊分明的圖設 64 色（12.8 KB）。看預覽沒有色帶再降。
9. **預覽與報告**（`tools/work/sprites/<id>/`）：`preview.png` 把精靈圖放在森林、地牢兩種地板上，畫出碰撞範圍、腳底、頭頂掛點；各動畫以遊戲大小放大 3 倍播放的 GIF；`report.txt` 列出切出的每一格在原圖的位置、晃動量、檔案大小與警告。

### 4.3 新增一個角色
1. 照 [`art_guide.md`](art_guide.md) 請 Antigravity 畫圖，核可的定稿會放在 Drive 的 `reference/characters/<id>/`（`<id>` 用英文小寫，例如 `princess`）。
2. 複製 `tools/characters/knight.json` 成 `tools/characters/<id>.json`，改 `name`、`source`。新的插畫風角色把 `colors` 拿掉（全彩）。
    * 待機與跑步各一張原圖（`art_guide.md` 的做法）：兩個動畫各自加上 `"source"`，`frames` 都填 `[0, 1, 2, 3]`。
    * 兩個動畫畫在同一張圖（4 欄 × 2 排）：`frames` 填 `[0, 1, 2, 3]`、`[4, 5, 6, 7]`。
3. 執行 `python -m tools.sprites <id>`，看 `tools/work/sprites/<id>/` 的 `report.txt`、`preview.png` 與 GIF：
    * 格子編號不對（例如多切出劍尖）：依報告改 `frames`。
    * 某一格位置怪怪的：用 `offsets` 微調；大小不對：改 `charHeight`。
    * 背景沒去乾淨或角色被吃掉：調整 `tolerance`。
4. 遊戲目前固定使用騎士 (`playerCharacter = CHARACTERS.knight`)，選角色的介面還沒做（第 8 節第 3 階段）。想在遊戲裡先看效果，可以暫時改這一行，看完改回來。

## 5. 外觀變化（道具、服裝）

由簡單到複雜分成 4 層。第 1 層需要的頭頂掛點，工具已經寫進 `characters.js`；其他層等要做時再擴充格式：

| 層級 | 例子 | 做法 | 限制 |
|---|---|---|---|
| 1. 配件 | 帽子、眼鏡、頭上的小寵物、光環 | 小圖或 emoji（跟敵人一樣用 `getEmojiSprite()`）畫在每格的 `head` 掛點 | A、B 角色都適用。**建議第一個做** |
| 2. 換色 | 盔甲改成紅色 | 工具在建置時把指定色域換色，輸出另一張圖 | 只能改顏色 |
| 3. 整套造型 | 騎士 → 冬季騎士 | 讓 Gemini 以原角色圖編輯（「同一個角色、同樣姿勢、換成冬裝」），用同一套流程處理成另一張圖，掛點重新估算 | 一套一張圖，不能自由混搭 |
| 4. 分層紙娃娃 | 上衣、褲子、帽子自由混搭 | 每層要跟身體逐像素對齊 | AI 逐格重畫做不到；只有單張立繪 (B) 或手繪可行。未來再評估，或改用方案 C |

* 繪製順序：背後配件（披風、翅膀）→ 角色本體 → 頭部配件 → 手持配件 → 狀態效果（護盾、加速的圓圈，已有）。
* 擁有與穿戴中的外觀屬於永久資料 `profile`，要提高 `SAVE_VERSION` 並在 `parseSave()` 加舊版轉換。
* 架構文件 6 節建議鑽石之後只用於外觀，配件剛好可以接上；價格與取得方式屬於設計決策，要先確認。

## 6. Gemini 生圖規範

> 2026-11-12：本節已由 [`art_guide.md`](art_guide.md) 取代，以下只留作紀錄。主要的差異：描邊從「細」改成「粗」、不再用 `chibi`、待機與跑步分成兩張圖、增加不要發光與封閉小洞等規則。

固定的步驟，每一步都用上一步的圖當參考，角色才會一致：

1. **概念圖**（正面，確認造型）：自由發揮。
2. **側面站姿**（之後所有圖的參考）：面向右、全身、純色背景。這張也可以直接當方案 B 的角色。
3. **精靈圖**：附上第 2 步的圖（和 `template` 產生的版面圖），要求 idle 4 格 + run 4 格。
4. **（之後）造型變化**：附上第 2、3 步的圖，只改服裝。

每張圖都要遵守：

* **畫風**：平滑的 2D 卡通插畫、Q 版比例、外圍有一圈深色細描邊，不要像素風。描邊讓去背的邊緣乾淨，角色在任何顏色的地板上都看得清楚。
* **純色背景，不要透明**：用純綠 `#00FF00`；角色本身有綠色時改用洋紅 `#FF00FF`。不要格線、地面陰影、文字、外框。
* 全身、側面、面向右；每格角色大小相同、腳底在同一條線上、格子之間留空。
* 一次只改一件事（只改姿勢，或只改服裝），不要同時改。

精靈圖的提示詞範本（英文對圖片模型比較穩定；實際試過有效的版本回寫到這裡）：

```
Use the attached character as the exact reference (same face, hair, outfit, colors, proportions).
Create a 2D game sprite sheet: 4 columns x 2 rows, side view, character facing right, full body.
Style: clean smooth 2D cartoon illustration, chibi proportions, thin dark outline. Not pixel art.
Row 1: idle loop, 4 frames, subtle breathing, feet do not move.
Row 2: run loop, 4 frames, frame 4 connects smoothly back to frame 1.
Same character size in every frame, feet on the same baseline, clear empty space between frames.
Solid flat #00FF00 background. No grid, no shadow, no text, no borders.
```

Gemini 的已知限制，流程上要預期：循環動作常常不連貫、會偷改服裝細節、不一定照版面排。工具能修正位置、大小、背景，**修不了動作本身**，所以每張 sheet 都要看工具產生的預覽 GIF 再決定要不要用；不行就重畫，或退回方案 B。

## 7. 遊戲端的改動（第 1 階段，2026-11-01 完成）

* `index.html`：在 `script.js` 之前載入 `js/characters.js`。
* `script.js`：
    * 第 2 段：刪除 `gameConfig` 的格子大小與 `animations`，改讀 `CHARACTERS.knight`；玩家方塊改用固定常數 `PLAYER_WIDTH`、`PLAYER_HEIGHT`（`getPlayerHitbox()`、`getPlayerTile()`、`applyKnockback()`、出生位置、邊界檢查）。
    * 第 4 段：刪除執行期去背，只載入圖片。
    * 繪製：以 `anchor` 對齊玩家方塊底部中心，開啟平滑處理（第 3 節）。之後的程式動畫、配件也加在這裡。
* `Pal_test.png` 已複製到 `reference/characters/knight/` 當騎士的原圖，並從 `public/` 刪除（維護者 commit 時一起提交這個刪除）。
    * 它仍留在 git 歷史裡（2 MB）。要從歷史清掉得改寫歷史、所有 clone 都要重新下載，2 MB 不值得；重點是之後的大型原圖都放 `reference/`。
* 新增 `tools/browser/character.spec.js`（`npm --prefix tools run test:character`）：所有角色圖都存在、玩家的精靈圖大小符合設定、碰撞範圍不變。
* `AGENTS.md` 與架構文件（2.1、5.2、9.6）已同步更新。驗證結果見架構文件 9.6。

## 8. 分階段

1. **（2026-11-01 完成）工具 + 騎士轉換**：`tools/sprites.py`，把 `Pal_test.png` 當第一個角色的原圖跑一次，維持原本的 8 格；遊戲改讀新格式。畫面幾乎不變，但沒有白邊與晃動，`public/` 從 2,488 KB 降到 411 KB。
2. **第一個 Gemini 新角色**：照第 6 節畫、照 4.3 節處理，驗證提示詞與工具，把有效的提示詞回寫到第 6 節。
    * 騎士原本是像素風，跟之後的插畫風角色放在一起會不一致。可以用 `Pal_test.png` 當參考，請 Gemini 以插畫風重畫騎士，順便當作第一個測試角色。
3. **選角色**：要有選擇角色的介面（開始畫面或商店），屬於設計決策。
4. **配件**：掛點 + 配件道具，接上鑽石或成就獎勵。
5. （之後）換色、整套造型。

## 9. 決定事項（2026-11-01 維護者決定）

1. **畫風：平滑插畫**。跟 emoji 敵人一致，Gemini 也比較擅長。工具只做高品質縮小，不做像素風處理；遊戲畫角色時開啟平滑處理；提示詞指定插畫風。
2. **Python：用系統 Python 已安裝的 Pillow 12.3.0**，不建 venv、不另外安裝。
3. **原圖放本機 `reference/`，不進 git**（已加入 `.gitignore`），repo 盡量維持輕量。角色設定檔進 git（第 4 節）。
4. **騎士維持現在的 8 格**。
5. 選角色、配件是否接鑽石與價格：之後再討論（照 `AGENTS.md` 屬於設計決策）。
