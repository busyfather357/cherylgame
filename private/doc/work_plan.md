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
| 1 | 在 Drive 手動刪除本機建的重複 `private/`（以及視需要清掉本機建的 `reference/characters/knight/`）；在本機執行 `python -m tools.sprites --check`，確認牧師的全身圖找得到原圖（2.2） | 維 | — |
| 2 | 騎士全身圖轉檔：支援 `fullBody.tolerance`（或單獨指定 `tolerance=50～60`），在 Pillow 12.3.0 環境將 `knight_base_v01.png` 轉為 `public/characters/knight_full.jpg`（2.2） | CC、維 | — |
| 3 | 決定遊俠、戰士的外觀，在 repo 建立需求單 `private/doc/characters/<id>/brief.md` | 維 | — |
| 4 | 遊俠、戰士的基準立繪 → 待機 → 跑步（全身圖由基準立繪轉出，不用另外畫） | AG、維 | 第 3 項 |
| 5 | 選角色介面的設計與實作（第 3 節） | AG 規劃中、CC | 至少兩個角色的全身圖（第 2 項完成即具備） |

## 2. 角色

### 2.1 總表

美術的每一步照 `art_guide.md` 4.1，圖片定稿依 `AGENTS.md` 登記的 Folder ID 放 Drive 的 `reference/characters/<id>/`；需求單與生圖紀錄放 repo 的 `private/doc/characters/<id>/`；轉檔照 `character_pipeline.md` 第 2 節。

| 角色 | `id` | 需求單 | 基準立繪 `base` | 待機 `idle` | 跑步 `run` | 設定檔 | 精靈圖 | 全身圖 | 遊戲裡可以選 |
|---|---|---|---|---|---|---|---|---|---|
| 騎士 | `knight` | —（對話指示，見 `log.md`） | ✅ `v01` | ✅ 沿用 `Pal_test.png` | ✅ 沿用 `Pal_test.png` | ✅ | ✅ 舊畫風 12.8 KB | 🔄 待轉檔（`v01` 已定稿） | ✅ 目前唯一的角色 |
| 牧師 | `cleric` | —（對話指示，見 `log.md`） | ✅ `v08` | ✅ `v01` | ✅ `v04` | ✅ | ✅ 74.1 KB | ✅ 53.4 KB | ⬜ 等選角色介面 |
| 遊俠（弓箭手） | `ranger`（暫定） | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 戰士 | `warrior`（暫定） | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

* `id` 是資料夾、檔名與程式裡的名稱，定了就不能改。`ranger`、`warrior` 是建議，維護者在需求單確認。
* 「設定檔」是 `tools/characters/<id>.json`；「精靈圖」`<id>.png` 與「全身圖」`<id>_full.jpg` 是 `public/characters/` 裡的產出。
* **全身圖不是另外一張原圖**：工具從核可的基準立繪轉出來（`art_guide.md` 6.11），所以基準立繪核可後就可以做。

### 2.2 各角色的備註與待辦

**騎士 `knight`**

* 2026-11-14 維護者參照 `character_style.png` 在 Gemini App 重畫基準立繪並核可 `knight_base_v01.png`（1024×1024，角色 361×934），已由 Antigravity 上傳至 Drive 的 `reference/characters/knight/`（Folder ID 見 `AGENTS.md`；原本機建立之 `knight/` 對 Antigravity 不可見，維護者可視需要清理）。
* 維護者決定（2026-11-14）：**只做這張基準立繪用來轉出全身圖（`knight_full.jpg`），待機與跑步動畫先沿用現有的 `Pal_test.png` 精靈圖**，暫不重畫動畫。
* 待辦（CC、維）：實測 `knight_base_v01.png` 用預設 `tolerance=40` 去背時，劍刃上方與大腿內側極細縫隙會殘留 59 個偏綠像素；調為 `tolerance=50～60` 可降為 0 個。因精靈圖仍沿用 `Pal_test.png`，不宜直接修改頂層 `tolerance`（以免影響 `Pal_test.png`），建議由 CC 在 `tools/sprites.py` 支援 `fullBody.tolerance` 後，於 `tools/characters/knight.json` 加上 `fullBody` 並在 Pillow 12.3.0 環境執行 `python -m tools.sprites --full-body knight`。
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
| 每個角色一張全身圖 | 🔄 | 工具完成；牧師完成，騎士基準立繪 `v01` 已定稿、待轉檔 | `character_pipeline.md` 3.1 |
| 選角色介面 | 🔄 AG 規劃中 | 開始畫面或商店裡選角色，顯示全身圖。選到的角色存進永久資料 `profile`（要提高 `SAVE_VERSION` 並加舊版轉換）。待決定的事見第 6 節 | 設計定案後寫進 `system_architecture.md` |
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

## 6. 等維護者決定

| 事項 | 影響 |
|---|---|
| 之後的基準立繪要照 `art_guide.md` 6.3 畫成側面朝右，還是比照牧師的定稿用正面 3/4 視角 | 基準立繪現在也是全身圖；正面比較適合給玩家看，側面朝右比較適合當動畫的參考。牧師的定稿是正面 3/4，跟 6.3 寫的不同 |
| 遊俠、戰士的外觀與 `id` | 第 2 節的需求單 |
| 選角色的時機與入口：第一次開遊戲時選、每次 New Game 選，還是隨時可以換 | 選角色介面的設計、存檔格式 |
| 角色要不要解鎖（成就、等級或鑽石），還是一開始全部可以選 | 鑽石的用途、存檔格式 |
| 各角色只有外觀不同，還是能力也不同 | 目前碰撞與速度跟角色無關（玩家方塊固定 50×52）；能力不同會影響難度，屬於設計決策 |
| 全身圖需不需要透明（疊在其他背景上、未解鎖的角色顯示成剪影） | 需要的話全身圖要從 JPEG 改成 WebP（`character_pipeline.md` 3.1） |
