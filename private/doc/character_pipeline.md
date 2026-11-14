# 角色轉檔流程（原圖 → 遊戲用的檔案）

文件類型：**SOP**。把核可的角色原圖轉成遊戲用的精靈圖與全身圖：要改哪些檔案、執行什麼指令、怎麼檢查。文件系統的分工見 [`README.md`](README.md)。

* 原圖怎麼畫是另一份 SOP：[`art_guide.md`](art_guide.md)。每個角色做到哪一步：[`work_plan.md`](work_plan.md) 第 2 節。
* 為什麼採用這個做法（2026-11-01 的實測與方案比較）、每次轉檔的實測數據：[`lessons_learned.md`](lessons_learned.md) 第 1 節。
* 工具的行為改變時要同步修改本文件；`art_guide.md` 的技術規則是從工具的處理方式推出來的，也要一起看。

## 1. 總覽

```text
需求單 brief.md (repo) ─→ 畫圖 (art_guide.md) ─→ 維護者核可，定稿放 Drive reference/characters/<id>/
                                                                    │
設定檔 tools/characters/<id>.json ─→ python -m tools.sprites <id> ─→ 看預覽與報告
                                                                    │
          public/characters/<id>.png、<id>_full.jpg、public/js/characters.js ─→ 測試 ─→ PR
```

| 東西 | 位置 | 進 git | 誰負責 |
|---|---|---|---|
| 需求單與生圖紀錄 | `private/doc/characters/<id>/brief.md`、`log.md` | 是 | 維護者／Claude Code 寫 `brief.md`，Antigravity 寫 `log.md` |
| 原圖（定稿與候選） | `reference/characters/<id>/`，正本在 Google Drive（僅放圖片） | 否 | Antigravity 畫並上傳，維護者核可 |
| 角色設定檔 | `tools/characters/<id>.json` | 是 | 做轉檔的 agent |
| 工具 | `tools/sprites.py`、`tools/config.py`、`tools/tests/` | 是 | Claude Code |
| 精靈圖、全身圖、角色設定 | `public/characters/<id>.png`、`<id>_full.jpg`、`public/js/characters.js` | 是（會部署） | 工具產生，**不手動修改** |
| 預覽與報告 | `tools/work/sprites/<id>/` | 否 | 工具產生 |

* 工具只用 Pillow 12.3.0（系統 Python 已安裝的，不建 venv、不另外安裝），不連網。產出以這個版本為準。
* **Claude Code 無法讀取 Antigravity 建立的 Drive 檔案（本機與雲端皆然）**：`tools/config.py` 在維護者本機手動執行時可直接讀 `G:\`（本機 Drive 僅唯讀）；Claude Code 與雲端環境都讀不到 Drive，只能以 repo 裡的 `.md`（含 `private/doc/characters/<id>/log.md`）確認定稿檔名，需要原圖轉檔或檢查時請維護者在對話中附上那張圖。**先問清楚那張圖是 Drive 上的哪一個檔案**（通常就是已經核可的定稿，維護者只是重新傳一次），照 Drive 上的檔名放進本機／容器裡的 `reference/characters/<id>/`（不進 git）再建置；確定是 Drive 上還沒有的新圖時，才請維護者交給 Antigravity 上傳到 Drive（Folder ID 見 `AGENTS.md`）。

## 2. 新增或更新一個角色（步驟）

1. **確認原圖已經定稿**：在 `private/doc/characters/<id>/log.md` 與 Drive 的 `reference/characters/<id>/` 確認有核可的 `<id>_base_vNN.png`、`<id>_idle_vNN.png`、`<id>_run_vNN.png`（`art_guide.md` 第 3、4 節）。`<id>` 用英文小寫，定了就不要改。
2. **設定檔**：新角色複製 `tools/characters/cleric.json` 成 `tools/characters/<id>.json`，改 `name` 與各個 `source`（檔名含版本號；換定稿時檔名會變，要跟著改）。欄位說明在 `tools/sprites.py` 開頭。
    * 待機與跑步各一張原圖（`art_guide.md` 的做法）：兩個動畫各自加上 `"source"`，`frames` 都填 `[0, 1, 2, 3]`；最上層的 `source` 填待機那張。
    * 兩個動畫畫在同一張圖（4 欄 × 2 排）：`frames` 填 `[0, 1, 2, 3]`、`[4, 5, 6, 7]`。
    * 只有基準立繪、沒有動畫：`idle` 與 `run` 都用 `"frames": [0]`，角色是靜態的。
    * 全身圖：加上 `"fullBody": { "source": "<id>_base_vNN.png" }`，原圖就是核可的基準立繪。
        * 全身圖的細縫裡留下背景色（4.3）時，加上只給全身圖用的去背容許值，例如騎士的 `"fullBody": { "source": "knight_base_v01.png", "tolerance": 50 }`。不要為了全身圖去改最上層的 `tolerance`，精靈圖會跟著變。
    * 新的插畫風角色不要設 `colors`（全彩）。洋紅背景不用另外設定，工具會自己判斷背景色。
3. **建置**：`python -m tools.sprites <id>`。只拿得到基準立繪、沒有動畫原圖的環境，用 `python -m tools.sprites --full-body <id>`。
4. **看結果**，有問題照 4.3 調整後重建：
    * `tools/work/sprites/<id>/report.txt`：切出的格數對不對、有沒有「注意」。
    * `preview.png` 與各動畫的 GIF：有沒有綠邊、腳底是不是在同一條線、動作連不連貫、頭部晃動幾像素。
    * `public/characters/<id>_full.jpg`：邊緣有沒有綠邊、有沒有被放大而模糊。
5. **原圖本身有問題**（留下綠邊、切格錯誤、動作不連貫）：回報是 `art_guide.md` 的哪一條，由維護者或 Antigravity 重畫；不要手動修圖。規則不夠清楚就修改 `art_guide.md`。
6. **測試**：`python -m tools.sprites --check`、`python -m unittest discover -s tools/tests -t .`、`npm --prefix tools run test:character`、`npm --prefix tools run test:select`。
7. **在遊戲裡看效果**：開啟遊戲，在開場的選角色畫面選那個角色。選角色畫面依 `js/characters.js` 列出所有角色，新角色建置完就會出現，不用改遊戲程式（`system_architecture.md` 3.1）。
    * 角色一出現在 `characters.js`，玩家就選得到。還不想公開的角色不要合併進 `main`。
    * 手機直向一排放 2 個角色剛好，3 個以上要先改選角色畫面的版面（[`work_plan.md`](work_plan.md) 第 3 節）。
8. **更新文件並交付**：[`work_plan.md`](work_plan.md) 第 2 節的狀態、有新的實測經驗時寫進 [`lessons_learned.md`](lessons_learned.md)，再照 `AGENTS.md` 的「Git 與 PR 流程」交付。

## 3. 遊戲使用的格式

精靈圖與所有角色的設定，都由工具產生、不手動修改（全身圖見 3.1）：

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
* 角色是平滑插畫，畫角色時開啟 `imageSmoothingEnabled`（品質 `high`），`ctx.restore()` 時還原；地圖與 emoji 維持關閉。
* 去背在建置時完成，`script.js` 原本用 `getImageData` 去背的程式已刪除，tainted canvas 的問題也不會再出現。

### 3.1 全身圖（2026-11-13）

精靈圖在畫面上只有 48px 高。選角色介面與之後的角色面板需要看得清楚的大圖，所以每個角色另外有一張全身圖，同樣由工具產生、不手動修改：

* `public/characters/<id>_full.jpg`：512×768（2:3）。所有角色大小相同，介面排版不用依角色調整；角色四周留 6% 的空白，左右置中、腳底在同一個高度。
* **格式是 JPEG**（維護者決定）。牧師的全身圖實測：JPEG 53 KB、PNG 210 KB、WebP 29 KB。JPEG 沒有透明，所以工具去背後直接鋪上底色：預設是題目視窗的米色放射漸層（中央 `#FFF8DC`、四角 `#E6C992`），設定檔的 `fullBody.background` 可以換成單色或另外兩個顏色。
    * 底色是圖的一部分，介面不能再換。之後如果需要去背的全身圖（疊在其他背景上、把還沒解鎖的角色變成剪影），要改成有透明的 WebP：去背後的圖在 `compose_full_body()` 鋪底色之前就有了，改動不大。
* `characters.js` 多一個欄位；還沒有全身圖的角色沒有這個欄位，介面要能處理：

```js
        "fullBody": { "image": "characters/cleric_full.jpg", "width": 512, "height": 768 }
```

* **原圖就是核可的基準立繪** `reference/characters/<id>/<id>_base_vNN.png`（[`art_guide.md`](art_guide.md) 6.11 節），不用另外畫，也不是精靈圖的某一格：動畫原圖每格只有 400～500px 高，基準立繪是一整張圖畫一個角色，解析度高得多。`fullBody.source` 可以指向資料夾裡的任何一張定稿，維護者之後想換一張圖當全身圖時改這裡。
* 用在開場的選角色畫面（`system_architecture.md` 3.1），由畫面建立角色卡時載入；CSP 的 `img-src 'self'` 已經允許。之後的角色面板也一樣，介面打開時才載入。每張約 55 KB，角色變多時留意開場要下載的總量。

## 4. 工具 (`tools/sprites.py`)

一個工具一個模組、共用路徑放 `tools/config.py`、測試放 `tools/tests/test_sprites.py`（用程式合成的綠幕原圖，不需要真實原圖）。去背 AI 模型（rembg 等）要另外下載數百 MB，不採用；原圖照 `art_guide.md` 畫成純色背景就不需要。

### 4.1 指令
| 指令 | 內容 |
|---|---|
| `python -m tools.sprites knight` | 重建一個角色：寫入 `public/characters/knight.png`、更新 `public/js/characters.js`、產生預覽 |
| `python -m tools.sprites --all` | 重建全部角色 |
| `python -m tools.sprites --check` | 只檢查 `public/` 的產出是否跟原圖與設定一致，不寫檔（原圖不在本機的角色略過） |
| `python -m tools.sprites --full-body cleric` | 只重建全身圖 `public/characters/cleric_full.jpg` 與 `characters.js` 的 `fullBody`，精靈圖不動；只需要 `fullBody.source` 那一張原圖 |
| `python -m tools.sprites template` | 產生給生圖模型參考的版面圖 `tools/work/sprites/template.png`（4 欄 × 2 排、每格有腳底基準線、純綠背景） |
| `python -m unittest discover -s tools/tests -t .` | 工具的測試 |

### 4.2 處理流程
每一步是一個獨立函式，可以單獨測試；設定檔可以修正自動判斷的結果。

1. **背景色**：取圖片邊框像素的中位數，不用指定。
2. **去背**：從邊緣 flood fill 去掉相連的背景（角色內部的白色保留）；若背景為高飽和度的綠幕或洋紅（`max(bg) - min(bg) > 100`），角色內部與背景色距離在 `tolerance` 內的封閉小洞（例如彎曲手肘、邁開雙腿之間）也會一併去掉 → 去掉兩圈跟背景混色的反鋸齒邊 → 鮮豔背景的邊緣三圈做溢色修正（despill）→ 去掉面積很小的雜點。
3. **切格**：找橫向、直向的空白帶分出每一格（忽略寬或高 ≤ 2px 的邊緣壓縮雜訊線），不假設格子等分；Gemini 排得不整齊也能切。分離的劍尖等小塊會被當成一格，報告會提醒。
4. **對應動畫**：`"idle": { "frames": [0, 1, 2, 3] }` 指定用自動找到的第幾格，可以重新排序、去掉畫壞的格子；不同動畫可以來自不同張原圖。
5. **對齊**：腳底 = 角色最下緣；水平 = 上半身（頭與軀幹）像素的中位數，不受劍、披風、腿影響。個別格子可以手動加偏移。
6. **縮放**：同一張原圖的所有格子用同一個倍率（以該張原圖採用的第 1 格縮到指定身高，預設 96px）；當 `idle` 與 `run` 來自不同張原圖且原圖角色高度不同時，各自以該張原圖的第 1 格計算倍率，確保每個動畫在畫面上都是相同的身高。用高品質縮小 (Lanczos)，適合平滑插畫；不做像素風專用的處理。
7. **掛點**：估算每格頭頂的位置（頭部上方 20% 的水平中心、最上緣），寫入 `attach.head`。
8. **打包與壓縮**：排成每排一個動畫。色數在設定檔指定：插畫的漸層限制色數容易出現色帶，預設全彩（約 70～95 KB，仍比改版前小 20 倍以上）；騎士這類色塊分明的圖設 64 色（12.8 KB）。看預覽沒有色帶再降。
9. **預覽與報告**（`tools/work/sprites/<id>/`）：`preview.png` 把精靈圖放在森林、地牢兩種地板上，畫出碰撞範圍、腳底、頭頂掛點；各動畫以遊戲大小放大 3 倍播放的 GIF；`report.txt` 列出切出的每一格在原圖的位置、晃動量、檔案大小與警告。
10. **全身圖**（設定檔有 `fullBody` 時，3.1 節）：全身圖的原圖用同樣的方式去背，取最大的一塊當角色（切出不只一塊時報告會提醒）→ 去邊 → 等比例縮放到 512×768 的畫面裡 → 鋪上底色 → 存成 JPEG（品質 85、色度不抽樣、漸進式）。
    * 去邊 (`clean_edges()`)：精靈圖縮小 16 倍以上，第 2 步留下的幾像素綠邊看不出來；全身圖只縮小 2～3 倍，生圖模型的柔邊與 JPEG 壓縮滲進輪廓的背景色會變成一圈明顯的綠邊。所以由外往內最多再剝 8 圈「還帶著背景色」的像素（背景的主色比其他色版高出 24 以上），乾淨的像素留著；剩下的邊緣 16 圈再做溢色修正。只處理綠幕、洋紅背景。牧師的原圖去邊前有 15,673 個偏綠的像素，去邊後 0 個。
    * 原圖裡的角色不到 676px 高時會被放大，報告會提醒。
    * 去背的容許值預設跟精靈圖相同（最上層的 `tolerance`）；設定檔有 `fullBody.tolerance` 時全身圖的原圖改用它，報告會註明。同一張原圖同時是精靈圖與全身圖的原圖時，兩種容許值各自處理。
    * `--check` 對全身圖不是逐位元組比較：大小相同，而且色差超過 8 的像素不到千分之一就算一致。JPEG 是有損壓縮，同一份原圖與設定在不同作業系統上的結果可能有極小的差異。

### 4.3 看報告與調整

| 現象 | 做法 |
|---|---|
| 格子編號不對（例如多切出劍尖、雜點） | 依 `report.txt` 列出的每一格改 `frames` |
| 某一格位置怪怪的 | 用 `offsets` 微調那一格 |
| 角色太大、邊緣被裁掉，或太小 | 改 `charHeight`（或加大 `cell`） |
| 背景沒去乾淨，或角色被吃掉 | 調整 `tolerance` |
| 只有全身圖的細縫（手臂、武器與身體之間）留下一小塊背景色 | 加上 `fullBody.tolerance`，從 50 開始試，用去得乾淨的最小值；精靈圖不受影響。去邊只處理輪廓，碰不到角色內部的細縫 |
| 全身圖切出不只一格 | 工具只用最大的一格；其他部分是不是應該連在角色身上，回頭看原圖 |
| 全身圖被放大而模糊 | 原圖裡的角色不到 676px 高，要重畫比較大的 |
| 全身圖的底色要換 | `fullBody` 加上 `"background"`：`"#RRGGBB"`，或 `["中央", "四角"]` 兩個顏色 |
| `--check` 報不一致 | 原圖或設定改過就重建；沒改過的話看 Pillow 版本是不是 12.3.0。不同作業系統重建的精靈圖可能差幾個像素（`lessons_learned.md` 6.1），不要因此覆寫沒有改過的角色 |

## 5. 外觀變化（道具、服裝；之後的設計）

還沒有實作，排在 [`work_plan.md`](work_plan.md) 第 3 節。由簡單到複雜分成 4 層（表裡的 A、B、C 是 2026-11-01 比較過的方案，見 [`lessons_learned.md`](lessons_learned.md) 1.2：A 逐格精靈圖、B 單張立繪加程式動畫、C 部件拆分）。第 1 層需要的頭頂掛點，工具已經寫進 `characters.js`；其他層等要做時再擴充格式：

| 層級 | 例子 | 做法 | 限制 |
|---|---|---|---|
| 1. 配件 | 帽子、眼鏡、頭上的小寵物、光環 | 小圖或 emoji（跟敵人一樣用 `getEmojiSprite()`）畫在每格的 `head` 掛點 | A、B 角色都適用。**建議第一個做** |
| 2. 換色 | 盔甲改成紅色 | 工具在建置時把指定色域換色，輸出另一張圖 | 只能改顏色 |
| 3. 整套造型 | 騎士 → 冬季騎士 | 讓 Gemini 以原角色圖編輯（「同一個角色、同樣姿勢、換成冬裝」），用同一套流程處理成另一張圖，掛點重新估算 | 一套一張圖，不能自由混搭 |
| 4. 分層紙娃娃 | 上衣、褲子、帽子自由混搭 | 每層要跟身體逐像素對齊 | AI 逐格重畫做不到；只有單張立繪 (B) 或手繪可行。未來再評估，或改用方案 C |

* 繪製順序：背後配件（披風、翅膀）→ 角色本體 → 頭部配件 → 手持配件 → 狀態效果（護盾、加速的圓圈，已有）。
* 擁有與穿戴中的外觀屬於永久資料 `profile`，要提高 `SAVE_VERSION` 並在 `parseSave()` 加舊版轉換。
* 架構文件 6 節建議鑽石之後只用於外觀，配件剛好可以接上；價格與取得方式屬於設計決策，要先確認。
