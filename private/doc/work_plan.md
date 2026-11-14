# 工作計畫總表

文件類型：**計畫**。這裡是所有工作「做到哪裡、接下來做什麼、誰負責」的唯一總表。文件系統的分工見 [`README.md`](README.md)。

* **開始工作前先看這裡**，確認要做的事在哪一列、有沒有前置條件。
* **狀態改變時在同一個 PR 更新這裡**（完成一個步驟、發現新的待辦、維護者做了決定）。只改 Drive、沒有 PR 的工作（例如 Antigravity 交了一張新的原圖），由下一個開 PR 的 agent 或維護者補上。
* 這裡只記狀態與下一步，一列一兩句話。怎麼做寫在 SOP（[`art_guide.md`](art_guide.md)、[`character_pipeline.md`](character_pipeline.md)），做的過程與數據寫在 [`lessons_learned.md`](lessons_learned.md)。

最後更新：2026-11-14

| 圖例 | 意思 |
|---|---|
| ✅ | 完成 |
| 🔄 | 進行中，或已經有東西但還要修改 |
| ⬜ | 還沒開始 |
| ❓ | 這個環境無法確認，要維護者或讀得到 Drive 的 agent 確認 |
| — | 不需要 |

負責人：**維**＝維護者，**AG**＝Google Antigravity（畫圖、檢查原圖），**CC**＝Claude Code（程式、轉檔）。

## 1. 現在的重點

| 順序 | 工作 | 負責 | 前置條件 |
|---|---|---|---|
| 1 | 在 Drive 手動刪除本機建的重複 `private/`；確認騎士的兩張原圖 `Pal_test.png`、`knight_base_v01.png` 在同一個 `reference/characters/knight/`（2.2）；在本機執行 `python -m tools.sprites --check`，確認兩個角色的精靈圖與全身圖都找得到原圖、結果一致 | 維 | — |
| 2 | 在實機（iPad、手機）開啟遊戲，看選角色畫面的版面與操作（第 3 節；目前只在 Chromium 測過） | 維 | — |
| 3 | 決定遊俠、戰士的外觀，在 repo 建立需求單 `private/doc/characters/<id>/brief.md` | 維 | — |
| 4 | 遊俠、戰士的基準立繪 → 待機 → 跑步（全身圖由基準立繪轉出，不用另外畫） | AG、維 | 第 3 項 |
| 5 | 選角色畫面的後續：決定 New Game 時要不要再選一次、遊戲中要不要有換角色的入口（第 6 節）；角色到 3 個以上之前，把手機直向的版面改成兩排（第 3 節） | 維、CC | — |

## 2. 角色

### 2.1 總表

美術的每一步照 `art_guide.md` 4.1，圖片定稿依 `AGENTS.md` 登記的 Folder ID 放 Drive 的 `reference/characters/<id>/`；需求單與生圖紀錄放 repo 的 `private/doc/characters/<id>/`；轉檔照 `character_pipeline.md` 第 2 節。

| 角色 | `id` | 需求單 | 基準立繪 `base` | 待機 `idle` | 跑步 `run` | 設定檔 | 精靈圖 | 全身圖 | 遊戲裡可以選 |
|---|---|---|---|---|---|---|---|---|---|
| 騎士 | `knight` | —（對話指示，見 `log.md`） | ✅ `v01` | ✅ 沿用 `Pal_test.png` | ✅ 沿用 `Pal_test.png` | ✅ | ✅ 舊畫風 12.8 KB | ✅ 54.2 KB | ✅ 預設角色 |
| 牧師 | `cleric` | —（對話指示，見 `log.md`） | ✅ `v08` | ✅ `v01` | ✅ `v04` | ✅ | ✅ 74.1 KB | ✅ 53.4 KB | ✅ |
| 遊俠（弓箭手） | `ranger`（暫定） | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 戰士 | `warrior`（暫定） | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

* `id` 是資料夾、檔名與程式裡的名稱，定了就不能改。`ranger`、`warrior` 是建議，維護者在需求單確認。
* 「設定檔」是 `tools/characters/<id>.json`；「精靈圖」`<id>.png` 與「全身圖」`<id>_full.jpg` 是 `public/characters/` 裡的產出。
* **全身圖不是另外一張原圖**：工具從核可的基準立繪轉出來（`art_guide.md` 6.11），所以基準立繪核可後就可以做。
* 「遊戲裡可以選」：選角色畫面依 `public/js/characters.js` 列出所有角色，角色建置完、合併進 `main` 就選得到（`character_pipeline.md` 第 2 節）。

### 2.2 各角色的備註與待辦

**騎士 `knight`**

* 2026-11-14 維護者參照 `character_style.png` 在 Gemini App 重畫基準立繪並核可 `knight_base_v01.png`（1024×1024，角色 361×934），已由 Antigravity 上傳至 Drive 的 `reference/characters/knight/`（Folder ID 見 `AGENTS.md`；原本機建立之 `knight/` 對 Antigravity 不可見，維護者可視需要清理）。
* 維護者決定（2026-11-14）：**只做這張基準立繪用來轉出全身圖（`knight_full.jpg`），待機與跑步動畫先沿用現有的 `Pal_test.png` 精靈圖**，暫不重畫動畫。
* 全身圖已轉檔（2026-11-14，雲端的 Claude Code，Pillow 12.3.0）：`tools/sprites.py` 新增 `fullBody.tolerance`，`tools/characters/knight.json` 設為 50（預設的 40 會在劍刃與大腿之間的細縫留下 59 個偏綠像素，50 與 60 的結果相同），執行 `python -m tools.sprites --full-body knight` 產生 `public/characters/knight_full.jpg`。原圖是維護者在對話中重新附上的定稿，尺寸、背景色、切格位置與殘留像素都跟 `log.md` 的紀錄相符（`lessons_learned.md` 1.9）。
* 精靈圖（遊戲裡走動的小圖）還是舊畫風的 `Pal_test.png`，跟選角色畫面上新畫風的全身圖不是同一個造型；要一致的話要重畫待機與跑步動畫（維護者 2026-11-14 決定先不重畫）。
* 待辦（維）：本機執行 `python -m tools.sprites --check`。工具要在同一個 `reference/characters/knight/` 讀到 `Pal_test.png`（精靈圖）與 `knight_base_v01.png`（全身圖）兩張原圖。Antigravity 建立的 `knight/`（Folder ID 見 `AGENTS.md`）放的是 `knight_base_v01.png`；`Pal_test.png` 如果只在本機建立的那個 `knight/` 裡，清掉它之前先把 `Pal_test.png` 交給 Antigravity 上傳到登記的 `knight/`（Claude Code 看不到 Drive，沒辦法確認現況）。
* 不要在 Pillow 非 12.3.0 的環境重建 `public/characters/knight.png`：在 Linux 上重建會跟現有的差幾個像素（`lessons_learned.md` 6.1）。

**牧師 `cleric`**

* 全身圖用的是已經核可的定稿圖（維護者 2026-11-13 在對話中重新提供，Drive 上本來就有，**不用再上傳**）。
* 待辦（維）：本機執行 `python -m tools.sprites --check` 確認全身圖產出一致。Antigravity 已於 Drive（`1sSI_6ws5rsygalfxIs_Pbs7AwfOXNQcB`）確認定稿檔名確實為 `cleric_base_v08.png`、`cleric_idle_v01.png`、`cleric_run_v04.png`，與 `tools/characters/cleric.json` 一致；若本機 `--check` 顯示全身圖不一致再執行 `python -m tools.sprites cleric` 重建。
* 待辦（AG 或維）：`art_guide.md` 寫的牧師跟定稿不一樣。6.10 的範例提示詞是栗色長髮、金色翼杖、面向右；定稿是銀灰色頭髮、木頭法杖、正面 3/4 視角（`lessons_learned.md` 1.8）。`log.md` 已遷回 repo 的 [`private/doc/characters/cleric/log.md`](characters/cleric/log.md)（其中 `log.md` 頂端的 `CHARACTER` 區塊仍是早期棕髮草稿文字，而 `cleric_idle_v01.png` 提示詞已改為銀灰髮、木頭法杖），待一併更正 `log.md` 頂端與 `art_guide.md` 6.10，之後畫造型變化才不會畫成另一個人。
* 之後做配件時要注意：定稿的法杖高過頭頂，牧師的頭頂掛點實際上在法杖頂端的高度（`lessons_learned.md` 1.8）。
* 待辦（CC，需要原圖時請維護者在對話中提供）：精靈圖有 10 個綠色殘留的像素，在靴子附近（`lessons_learned.md` 1.8）。遊戲裡的大小幾乎看不出來，優先度低。

**遊俠（弓箭手）`ranger`**、**戰士 `warrior`**

* 還沒開始。外觀（性別年齡感、髮型、服裝、主色、武器）是設計決策，由維護者寫在需求單。
* 寫需求單與畫圖時要注意 `art_guide.md` 的限制：
    * **弓是長武器**：5.4 要求手上的道具短、貼近身體，不要橫著拿、不要高舉過頭。弓要直著拿貼在身側，或背在背上；箭筒背在背後、不超過頭頂。跑步動畫的弓不能伸到相鄰的格子（6.4）。
    * **遊俠如果穿綠色**：身上有任何綠色，背景就要改用洋紅 `#FF00FF`（6.1）。
    * **戰士要跟騎士分得出來**：兩個都是近戰、穿盔甲，縮到 48 像素高時主要靠輪廓與主色分辨。需求單要寫清楚差別（例如武器、盔甲的多寡、主色）。
    * 避免整身深色（5.4）；每個角色的主色最好不一樣，選角色介面並排時才分得出來。
* 每個角色的順序：需求單 → 基準立繪（附 `reference/style/character_style.png`）→ 待機 → 跑步，每一步核可後才做下一步。基準立繪核可後就可以先轉出全身圖，不用等動畫。

## 3. 遊戲功能

| 功能 | 狀態 | 說明 | 細節寫在 |
|---|---|---|---|
| 角色精靈圖改由工具產生 | ✅ 2026-11-01 | 騎士轉成新格式，遊戲改讀 `js/characters.js` | `character_pipeline.md` 第 3 節 |
| 第一個新角色（牧師） | ✅ 2026-11-13 | 精靈圖與全身圖 | 第 2 節 |
| 每個角色一張全身圖 | ✅ 2026-11-14 | 工具完成；牧師、騎士都有全身圖。之後的角色在基準立繪核可後轉出 | `character_pipeline.md` 3.1 |
| 選角色畫面 | ✅ 2026-11-14 | 每次開啟遊戲先顯示，列出所有角色的全身圖，選到的角色存進永久資料 `profile.character`（存檔 v3，v2 的存檔照常讀取）。騎士、牧師一開始都可以選 | `system_architecture.md` 3.1、4.3 |
| 選角色畫面：3 個以上的角色 | ⬜ | 手機直向一排放 2 個剛好（每張約 150×224），3 個以上會縮得太小，要改成兩排；電腦與平板一排可以放 4 個 | `system_architecture.md` 3.1 |
| 換角色的入口 | ⬜ 待決定 | 目前只有開啟遊戲時可以選，遊戲中要換就重新開啟。要不要在 New Game、過關選單或角色面板加入口，見第 6 節 | `system_architecture.md` 3.1 |
| 角色面板 | ⬜ | 玩家隨時可以打開，顯示全身圖、等級等 | 同上 |
| 角色配件（帽子等） | ⬜ | 工具已經算出每格的頭頂掛點 | `character_pipeline.md` 第 5 節 |
| 換色、整套造型 | ⬜ | 排在配件之後 | `character_pipeline.md` 第 5 節；`art_guide.md` 6.9 |
| 鑽石的用途 | ⬜ | 目前只從成就取得、沒有用途；建議只用於外觀 | `system_architecture.md` 6.5 |
| 成就清單畫面 | ⬜ | 現在只有解鎖時的提示 | `system_architecture.md` 6.3 |
| 怪物、魔王、地圖、道具改用圖片 | ⬜ | 目前是 emoji 與色塊；維護者要求時才做，規格要先定 | `art_guide.md` 10.1 |
| 標題畫面、章節過場 | ⬜ | 沒有 | `art_guide.md` 10.1 |
| iPad mini 實機驗證 | ⬜ | 用 `?debug` 截圖，確認下半部被截斷的原因已排除 | `system_architecture.md` 8.1、8.7 |
| 加到主畫面 (PWA) | ⬜ 暫不實作 | | `system_architecture.md` 8.7 |
| iframe 嵌入高度 288px 太小 | ⬜ | 要請各網站改嵌入語法 | `system_architecture.md` 5.3 |
| 獎勵廣告換鑽石 | ⬜ 只評估過 | 兒童政策、CSP、存檔都要先處理 | `system_architecture.md` 6.6 |

## 4. 工具與文件

| 工作 | 狀態 | 負責 | 說明 |
|---|---|---|---|
| `art_guide.md` v4 複製到 Drive | ✅ 改由單一正本取代（2026-11-13） | — | 不再在 Drive 放 `private/` 與 `art_guide.md` 副本；所有 `.md`（含 `brief.md`、`log.md`）統一放 GitHub repo，Drive 只留 `reference/` 圖片並以 Folder ID 定位 |
| `art_guide.md` 6.10 的牧師範例跟定稿不符 | ⬜ | AG、維 | 見 2.2（`log.md` 頂端 `CHARACTER` 區塊需一併對齊） |
| 精靈圖的 `--check` 跨作業系統會誤報 | ⬜ | CC | 全身圖已經改成容許極小的差異；精靈圖還是逐像素比較（`lessons_learned.md` 6.1）。要不要比照處理待決定 |
| `--check` 在只有基準立繪的環境檢查不到全身圖 | ⬜ | CC | 缺精靈圖的原圖時整個角色略過，全身圖也沒有比對。雲端環境通常只拿得到維護者附上的基準立繪；可以改成原圖在的部分照樣檢查 |
| 背景圖的轉檔工具 | ⬜ | CC | 縮成 1600×1600、WebP、200 KB 以內，目前手動（`system_architecture.md` 9.7） |
| 靜態立繪的程式動畫 | ⬜ | CC | 只有基準立繪、沒有動畫的角色目前是靜止的（`character_pipeline.md` 第 2 節） |
| 文件系統重整 | ✅ 2026-11-13 | CC | SOP、設計、計畫、經驗紀錄分開；新增本表、`README.md`、`lessons_learned.md` |

## 5. 已決定的事

維護者做過的決定。要改之前先跟維護者確認。

| 日期 | 決定 | 細節寫在 |
|---|---|---|
| 2026-09-28 | 分數由經驗值取代；角色等級只記錄、不加能力；New Game 保留經驗值、金幣、鑽石、成就 | `system_architecture.md` 第 6 節 |
| 2026-09-28 | 每 10 關一章；尾數 5 是火龍、10 的倍數是各章魔王；題目範圍不變，第 11 關起變難 | `system_architecture.md` 第 7 節 |
| 2026-10-25 | 觸控改成浮動搖桿；手機只支援直向、平板只支援橫向 | `system_architecture.md` 第 8 節 |
| 2026-10-26 | 開發工具集中在 `tools/`；本機 agent 不改 git 狀態、不自行安裝 | `AGENTS.md`；`system_architecture.md` 第 9 節 |
| 2026-11-01 | 角色圖由工具在建置時產生；Python 只用系統已安裝的 Pillow 12.3.0 | `character_pipeline.md` |
| 2026-11-01 | 原圖放 Google Drive、不進 git，repo 維持輕量 | `AGENTS.md`「Google Drive 對照資料夾」 |
| 2026-11-01 | 騎士維持現在的 8 格，選角色介面完成前是預設角色（2026-11-13 改為要重畫，見 2.2） | 第 2 節 |
| 2026-11-12 | Antigravity 負責畫圖，Claude Code 負責程式與轉檔；Jules 停用 | `AGENTS.md`「美術素材」 |
| 2026-11-12 | 角色畫風是等級 D：6～7 頭身的日系奇幻動漫，平滑插畫、不是像素風 | `art_guide.md` 5.2、5.3 |
| 2026-11-13 | 每個角色除了精靈圖還要有一張全身圖，格式是 JPEG；原圖用核可的定稿（基準立繪），不另外畫 | `character_pipeline.md` 3.1；`art_guide.md` 6.11 |
| 2026-11-13 | 之後要加入遊俠（弓箭手）與戰士 | 第 2 節 |
| 2026-11-13 | 雲端的 Claude Code 跟 Antigravity 一樣照 PR 流程，由維護者在 GitHub 審查與合併 | `AGENTS.md`「執行環境」「Git 與 PR 流程」 |
| 2026-11-13 | Google Drive 只放 `reference/` 圖片並一律依 Folder ID 操作；所有 `.md`（含 `art_guide.md`、`brief.md`、`log.md`）放 GitHub repo；維護者本機 `G:\` 唯讀；Claude Code 無法存取 Antigravity 建立的 Drive 檔案（本機與雲端皆然），以 repo `.md` 為主、圖片由維護者提供 | `AGENTS.md`「執行環境」「Google Drive 對照資料夾」；`art_guide.md` 第 3、9、10 節 |
| 2026-11-14 | 騎士只重畫基準立繪（`knight_base_v01.png`）用來轉出全身圖；待機與跑步動畫先沿用現有的 `Pal_test.png` | 第 2 節 |
| 2026-11-14 | 開始遊戲時先跳出選角色畫面，列出角色的全身圖讓玩家選；目前提供騎士與牧師，一開始就都可以選 | `system_architecture.md` 3.1 |

## 6. 等維護者決定

| 事項 | 影響 |
|---|---|
| 之後的基準立繪要照 `art_guide.md` 6.3 畫成側面朝右，還是比照牧師的定稿用正面 3/4 視角 | 基準立繪現在也是全身圖；正面比較適合給玩家看，側面朝右比較適合當動畫的參考。牧師的定稿是正面 3/4，跟 6.3 寫的不同 |
| 遊俠、戰士的外觀與 `id` | 第 2 節的需求單 |
| 選角色的時機還要不要增加：現在是每次開啟遊戲都先選（預先選好上次的角色），New Game、從本關重來不會再問。要不要在 New Game 時再選一次、或在遊戲中加換角色的入口（過關選單、之後的角色面板） | 選角色畫面的流程（`system_architecture.md` 3.1）。現在的做法是 Claude Code 照「開始遊戲時先選」做的最小範圍 |
| 之後的角色（遊俠、戰士）要不要解鎖（成就、等級或鑽石），還是一開始全部可以選。騎士與牧師已決定一開始就可以選 | 鑽石的用途、存檔格式 |
| 各角色只有外觀不同，還是能力也不同。現在只有外觀不同 | 碰撞與速度跟角色無關（玩家方塊固定 50×52）；能力不同會影響難度，屬於設計決策 |
| 全身圖需不需要透明（疊在其他背景上、未解鎖的角色顯示成剪影） | 需要的話全身圖要從 JPEG 改成 WebP（`character_pipeline.md` 3.1） |
