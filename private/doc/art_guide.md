# 美術素材生成規範（給 Google Antigravity）

規範版本：2026-11-13 v5（正本只在 GitHub repo 的 `private/doc/art_guide.md`，Google Drive 不再放置副本）

文件類型：**SOP**。專案的其他文件都在 git repo 的 `private/doc/`：文件地圖 `README.md`、每個角色做到哪一步的 `work_plan.md`、原圖轉成遊戲檔案的 `character_pipeline.md`、實測紀錄 `lessons_learned.md`，以及各素材的需求單 `brief.md` 與生圖紀錄 `log.md`。

這份文件給負責畫圖的 AI agent（Google Antigravity）閱讀，也是維護者下指令時的依據。內容是《RPG 數學挑戰：木木島趣味練習場》的角色圖與背景圖要怎麼畫、存在哪裡、怎麼交接。

**說明用中文，生圖提示詞 (prompt) 一律用英文**。第 5～7 節的英文區塊是定稿的提示詞零件，使用時整段照抄，不要改寫、翻譯或濃縮。

## 1. 分工

| 誰 | 做什麼 | 不做什麼 |
|---|---|---|
| **Antigravity（美術與轉檔驗證）** | 依本文件編寫提示詞、生成或接收維護者由 Gemini App 生成的原圖，以 `tools/sprites.py` 檢查去背與切格，依 Folder ID 存到 Google Drive 的 `reference/`，並在 repo 更新 `log.md` | 原圖不去背、不裁切、不縮放、不壓縮；不把 `.md` 放進 Drive |
| **Claude Code／Antigravity（程式與轉檔）** | 把核可的原圖轉成遊戲用的檔案（去背、切格、對齊、縮放、壓縮）、寫遊戲程式 | |
| **維護者** | 提需求、在每個關卡挑圖與核可；必要時用 Gemini App 快速抽圖傳給 Antigravity 審核 | 不在本機 `G:\` 手動建資料夾或拖曳放檔（`G:\` 僅唯讀） |

原圖會由 `tools/sprites.py` 自動處理。**第 6 節的技術規則不是美感偏好，而是這個工具的輸入條件**：不符合時工具會切錯、留下綠邊，或把角色的一部分吃掉，那張圖就只能重畫。

遊戲裡的角色很小：在畫面上大約 **48 像素高**（原圖約 800 像素高，縮小 16 倍以上）。所有畫風規則都是為了「縮到 48 像素還看得清楚」。另外，**基準立繪會被轉成全身圖**，在選角色介面與角色面板上放大給玩家看（6.11 節），所以它的臉、手與服裝細節也要經得起放大。

## 2. 最重要的規則（先讀這裡）

1. 一次只做一個步驟（第 4 節），做完**停下來等維護者核可**，不要自己接著做下一步。
2. 每個步驟最多生成 2 張候選圖；不滿意要重畫時先說明原因，重畫最多 2 輪，仍不行就回報，不要一直重試。
3. 每個提示詞都由「任務 + 角色描述 + 畫風區塊 + 技術區塊」組成（5.1 節）。畫風區塊與技術區塊整段照抄。
4. 角色定稿之後，之後每一張圖都**附上定稿圖當參考**，並要求「完全相同的角色」。
5. 角色圖的背景是**一整片純綠 `#00FF00`**（角色有綠色時改用洋紅 `#FF00FF`），不要透明背景。
6. 角色圖不要有：地面陰影、發光、光暈、閃光、粒子、殘影、漸層背景、文字、外框、白色貼紙邊。
7. 角色全身都在畫面內、四周留空；面向**右**。
8. 存原始輸出的 PNG，不做任何後製。生成的圖都存到 Drive 該素材的 `drafts/`，檔名與資料夾照第 3 節，**不覆寫、不刪除**舊檔。
9. 每生成一張圖，就把完整提示詞記到 repo 內該素材的 `log.md`（第 9 節）。
10. 上傳前照第 8 節自我檢查，不合格的圖不要當成候選交出來（可以留著，但要在 `log.md` 註明哪一項不合格）。

## 3. Google Drive 與 repo 的資料夾與檔名

* **分工原則**：
    * **GitHub repo 放所有 `.md` 文件與紀錄**：包含本文件、需求單 `brief.md`、生圖紀錄 `log.md`，統一放在 `private/doc/`。**不在 Google Drive 放 `private/`、文件副本或任何 `.md`**（實測 Claude Code 讀不到 Antigravity 建立的 Drive 檔案，且雙邊放文件會不同步與撞名）。
    * **Google Drive 只放 `reference/` 圖片資產**：放不進 git 的大型原圖、候選圖與畫風基準圖（repo 的 `.gitignore` 已排除 `reference/`）。Drive 空間大，刪除就能釋出空間；git 歷史刪不掉。
* **必須用 Folder ID 定位，禁止只憑名稱 `mkdir`**：Google Drive 的資料夾名稱不是絕對路徑，同一層可同時存在多個同名資料夾。操作 Drive 前必須先查 [`AGENTS.md`](../../AGENTS.md)「Google Drive 對照資料夾」的 **Folder ID 登錄表**，一律從登記好的 `FOLDER_ID` 進入：
    * 嚴禁對既有層級（`Antigravity_Data`、`cherylgame`、`reference`、`characters` 等）重新執行 `mkdir` 或只靠全域名稱搜尋。
    * 需要新建子資料夾（例如新角色 `<id>`、`drafts`、`backgrounds`）時，必須先執行 `gdrive readonly ls <PARENT_ID>` 確認不存在同名資料夾再建立，建完後於同一個 PR 將新 `FOLDER_ID` 補進 `AGENTS.md` 登錄表。
    * 更新既有圖片或替換檔案時，先查出 `fileId` 改用 `gdrive mutate update <FILE_ID>`，避免重複 `upload` 產生同名複本。
* **本機 `G:\` 唯讀（單一建立者原則）**：Antigravity 的 `gdrive` 外掛權限為 `drive.file`，看不到維護者從本機 `G:\` 或網頁版手動放入的檔案／資料夾。因此維護者本機 `G:\` 僅作唯讀讀取，所有圖片一律交由 Antigravity 透過 `gdrive` CLI 上傳。`Antigravity_Data/` 底下其他專案的資料夾不要碰。

```text
GitHub repo: private/doc/             # 所有文字與紀錄的正本
├── art_guide.md                      # 本文件
└── <characters|backgrounds>/<id>/
    ├── brief.md                      # 需求單 (維護者或 Claude Code 寫，見 9.1)
    └── log.md                        # 生圖紀錄 (Antigravity 寫，見 9.2)

Google Drive: Antigravity_Data/cherylgame/reference/   # 只放圖片 (Folder ID 見 AGENTS.md)
├── style/                            # 畫風基準圖：維護者核可後才放進來，之後生圖時附上當參考
│   └── character_style.png           # 角色畫風基準圖 (cleric_base_v08.png)
├── characters/
│   └── <id>/                         # 一個角色一個資料夾，例如 cleric
│       ├── <id>_base_v08.png         # 這一層只放「定稿」：轉檔工具讀的就是這一層。base 也是全身圖的原圖 (6.11)
│       ├── <id>_idle_v01.png
│       ├── <id>_run_v04.png
│       └── drafts/                   # 所有生成的圖 (候選、重畫、被淘汰的) 都先放這裡
│           ├── <id>_base_v01.png
│           └── <id>_base_v02.png
└── backgrounds/
    └── <id>/                         # 一張背景一個資料夾，例如 shop
        ├── <id>_v01.png              # 定稿
        └── drafts/
```

* `<id>`：英文小寫、數字、底線，例如 `cleric`、`ice_mage`、`shop`。它也是遊戲程式裡的名稱，定了就不要改。
* 檔名：`<id>_<種類>_v<兩位數版本>.png`。
    * 角色的種類：`base`（基準立繪）、`idle`（待機動畫）、`run`（跑步動畫）、`outfit_<名稱>`（造型變化）。
    * 背景沒有種類：`<id>_v01.png`。
    * 同一種類每生成一張就用下一個版本號（`v01`、`v02`…），不管它是候選還是重畫。**不覆寫舊檔**。
* 格式：PNG（不要 JPEG，壓縮雜訊會讓去背的邊緣變髒）。存生圖工具的原始輸出，不縮放、不裁切。
* 生成的圖一律先存到 `drafts/`。
* 定稿：維護者說「核可 `<檔名>`」時，把那個檔案從 `drafts/` **複製**到上一層（`<id>/`），檔名不變，`drafts/` 裡的原檔留著。上一層同一種類只留一個檔案；換定稿時刪掉上一層舊的那個（它在 `drafts/` 還有一份）。
* `drafts/` 裡的檔案由維護者決定什麼時候清理，美術 agent 不要自己刪。
* 改用本規範前的早期測試圖 `female_cleric_concept.png` 已移至垃圾桶（實測結果見 `lessons_learned.md` 1.5）。

## 4. 工作流程與核可關卡

### 4.1 角色

| 步驟 | 產出 | 參考圖 | 之後 |
|---|---|---|---|
| 1. 基準立繪 | `<id>_base_vNN.png`：一個角色、站姿、面向右 | `reference/style/` 的基準圖（有的話） | **停，等核可** |
| 2. 待機動畫 | `<id>_idle_vNN.png`：一橫排 4 格 | 核可的 base | **停，等核可** |
| 3. 跑步動畫 | `<id>_run_vNN.png`：一橫排 4 格 | 核可的 base | **停，等核可** |
| 4. 造型變化（有需求才做） | `<id>_outfit_<名稱>_vNN.png` | 核可的 base | 核可後，新造型重做 2、3 |

* 基準立繪是之後所有圖的依據，值得多花時間；它沒過關就不要畫動畫。
* 待機與跑步分成兩張圖畫，不要畫在同一張：每格的解析度比較高，也比較不會排錯。兩張圖的角色大小不需要相同（`tools/sprites.py` 會依各原圖第 1 格高度獨立計算縮放倍率）。
* 動畫是最容易失敗的步驟：動作不連貫、每格的服裝不一樣、排版不照要求。工具能修正位置與大小，**修不了動作本身**。重畫 2 輪還是不行就回報，維護者可以決定這個角色只用靜態立繪。
* 一次只改一件事：只改姿勢，或只改服裝，不要同時改。
* 全身圖不用另外畫：選角色介面與角色面板顯示的全身圖，由工具從核可的 base 轉出來（6.11）。

### 4.2 背景

一個步驟：依需求單與第 7 節生成 `<id>_vNN.png`，**停，等核可**。

### 4.3 回報格式

每個步驟做完，用下面的格式回報後停止：

```text
Asset: reference/characters/cleric — step 1 (base)
Files (in drafts/): cleric_base_v01.png, cleric_base_v02.png
Self-check: v01 pass; v02 fails rule 6.4 (cape tip below the feet)
Recommend: v01
Waiting for approval.
```

### 4.4 Gemini App + Antigravity 協作生圖流程（推薦）

實測發現兩個環境限制：
1. **Antigravity 內建生圖配額限制**：Antigravity 的 `generate_image`（`gemini-3.1-flash-image`）每 5 小時滾動視窗僅能生成約 **2～3 張圖**，且平行發送請求容易觸發 ~3 秒的 burst rate limit；而消費者端 **Gemini App（網頁／手機版）生圖幾乎無配額限制**。
2. **Google Drive `drive.file` 權限範圍**：Antigravity 連接 Google Drive 的 OAuth 權限為 `drive.file`，只能讀寫「由 Antigravity 自己建立與上傳的檔案」。維護者直接從 iPhone 或電腦 `G:\` 放進 Google Drive 資料夾的檔案，Antigravity 看不到（也會導致後續重複建出同名資料夾）。

因此最順暢的協作流程為：
1. **Antigravity 產出完整英文 Prompt**（或微調修正指令）。
2. **維護者在 Gemini App 貼上指令抽圖**，把滿意的圖片**直接附加在 Antigravity 對話視窗傳給 Agent**。
3. **Antigravity 自動驗證與歸檔**：
   * 收到圖片後立刻跑 `tools/sprites.py`（`key_background`、`find_frames`、產生預覽 GIF），精確檢查切出幾格、有無封閉綠洞、頭頂水平晃動幾像素。
   * 轉存為無損 `.png`、依第 3 節命名規則改名（例如 `cleric_run_v04.png`），並由 Antigravity 查 `AGENTS.md` 的 Folder ID 後透過 `gdrive` CLI 上傳至 `drafts/` 與定稿區（由 Antigravity 上傳的檔案，Drive 網頁版／本機 `G:\` 與 Antigravity 之間就都能共用），同時把生圖紀錄寫入 repo 的 `private/doc/<characters|backgrounds>/<id>/log.md`。

## 5. 畫風

### 5.1 提示詞的組成

```text
[任務]      這張圖要畫什麼 (各步驟的範本在 6.6～6.9、7.3)
[角色描述]  CHARACTER 區塊：這個角色的外觀，定稿後每次都照抄
[畫風]      STYLE LOCK：整段照抄
[技術]      TECH LOCK：整段照抄
```

長一點沒關係，不要為了精簡把區塊濃縮成關鍵字。重要的限制放在提示詞的最後。

### 5.2 角色的 STYLE LOCK（整段照抄）

目前角色採用維護者核可的**等級 D（日系奇幻動漫／寫實比例，6～7 頭身）**（基準圖為 `reference/style/character_style.png`，即 `cleric_base_v08.png`）：

```text
Art style: clean 2D anime and fantasy game character illustration for an all-ages adventure RPG.
Shading: clean cel shading with rich shadow tones on fabric folds, hair strands, and metallic gold trim. No soft airbrush blur on the outer silhouette.
Bold, clean, dark brown outline around the entire silhouette and between the main shapes. The outline must stay clearly visible when shrunk.
Proportions: 6 to 7 heads tall, slender and capable fantasy adventurer build, natural anatomy, clearly drawn hands and boots. Not chibi, not cartoon, not a toddler.
Face: refined and calm anime-style face with clear eyes, defined eyebrows, and a calm confident expression.
Design: clear color separation (4 to 6 main colors), strong light/dark contrast between neighbouring areas.
Not pixel art, not a 3D render, not photorealistic, not a sticker with a white border.
```

（若特定角色需求單指定採用 3～3.5 頭身卡通風格，則改用下表等級 B 的寫法。）

### 5.3 頭身比例與畫風等級

維護者覺得第一張測試圖（2.5 頭身 Q 版）「太可愛」。造成的原因是提示詞裡的 `cute`、`chibi`、`expressive big eyes`、`warm friendly smile`、`children's`，這些字**不要再用**。2026-11-12 實測牧師角色時，維護者進一步指定改用 **6～7 頭身的日系奇幻動漫寫實比例（下表 D）** 並定稿為預設風格：

| 等級 | Proportions / Face 的寫法 | 效果 |
|---|---|---|
| A. Q 版 | `about 2 to 2.5 heads tall, chibi` / `large round eyes, blush marks` | 第一張測試圖的樣子，太幼（不採用） |
| B. 冒險卡通 | `about 3 to 3.5 heads tall. Big readable head, compact sturdy body` / `Small-to-medium oval eyes with one small highlight` | 偏美式卡通少年風（`cleric_base_v01～v02`） |
| C. 英雄 | `about 4.5 heads tall, slim athletic build` / `small sharp eyes, serious determined expression` | 折衷頭身比 |
| **D. 奇幻動漫（預設）** | 5.2 節現在的寫法（`6 to 7 heads tall, slender and capable fantasy adventurer build`） | 成熟精緻的日系奇幻立繪（`cleric_base_v08`，已存為 `reference/style/character_style.png`） |

**之後所有角色的基準立繪都附上 `reference/style/character_style.png`**，並在任務的開頭加上：

```text
Match the art style of the attached style reference exactly (outline thickness, shading, proportions, face style). The style reference shows a DIFFERENT character: copy only the style, not the character.
```

### 5.4 角色設計上的限制

* 不要有字母、數字、徽章上的文字，或左右不對稱且有方向意義的符號：角色往左走時是把圖水平翻轉，文字會變成鏡像。
* 手上的道具（法杖、劍、盾）盡量短，貼近身體；不要橫著拿長武器、不要高舉過頭。
* 披風、長髮、裙擺的長度不超過腳踝。
* 不要翅膀、尾巴、飄浮的寵物或光球這類離身體很遠的東西；需要的話先在需求單註明，由維護者決定。
* 避免整身深色（遊戲有 3 種深色地板）。

## 6. 角色圖的技術規則

### 6.1 背景色

* 預設純綠 `#00FF00`。**角色身上有任何綠色**（衣服、頭髮、眼睛、寶石）時改用洋紅 `#FF00FF`，並把 TECH LOCK 裡的 `pure chroma green #00FF00` 換成 `pure magenta #FF00FF`、`No green` 換成 `No magenta, pink or purple`。
* 角色有綠色又有粉紫色時，先在需求單註明，不要自己挑別的顏色。
* 不要要求「透明背景」：生圖模型會畫出假的灰白格子。
* 生出來的綠不一定是精確的 `#00FF00`，沒關係；重點是**整片同一個顏色**，沒有漸層、暗角、紋理、地平線。

### 6.2 角色的 TECH LOCK（整段照抄，放在提示詞最後）

```text
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

### 6.3 視角與姿勢

每個角色提示詞都要有這一行：

```text
View: full body, body in side view facing RIGHT, head turned slightly toward the viewer (3/4 view) so both eyes are visible, both feet on the ground pointing right.
```

### 6.4 每條規則的原因

知道原因，遇到範本沒寫到的情況時才能判斷。

| 規則 | 工具怎麼處理，違反時會怎樣 |
|---|---|
| 整片單一背景色 | 工具取四邊像素的顏色當背景色，從圖的邊緣往內去掉相近的顏色。背景有漸層或紋理就去不乾淨 |
| 不要發光、光暈、半透明 | 光暈是角色色與背景色的混色，去背後會留下一圈綠色。實測第一張測試圖的水晶光暈留下 1100 多個綠色像素 |
| 角色身上沒有背景色 | 跟背景色相近、又連到角色外面的部分會被當成背景挖掉 |
| 手與道具貼近身體，法杖與裙擺之間保持開放通道 | 雖然 `tools/sprites.py`（2026-11-13 起）在綠幕／洋紅等高飽和度背景（`max(bg) - min(bg) > 100`）下，會一併清除角色內部與背景色接近的封閉小洞（如手肘彎曲處、雙腿邁開處），但若直立的法杖與飛揚的裙擺碰在一起圍成大面積封閉洞，內側的陰影與描邊反鋸齒仍可能殘留暗綠色。因此法杖底部與裙擺之間應保留開放的垂直通道（open vertical channel） |
| 沒有地面陰影；沒有東西低於鞋底 | 工具把最下緣當成腳底來對齊。陰影或垂到腳下的披風會讓角色浮在半空 |
| 沒有東西高過頭頂 | 工具把最上緣當成頭頂（之後放帽子等配件）。高舉的武器會讓配件飄在武器上；提示詞應明確要求法杖頂端低於下巴或兜帽頂端 |
| 一個角色是一整塊，沒有分離的小東西 | 分離的小塊會被當成另一格，後面的格子編號全部錯開 |
| 四周留空、不裁切 | 角色碰到圖的邊緣時，背景色的判斷與切格都會出錯 |
| 面向右 | 遊戲只存面向右的圖，往左走時水平翻轉 |
| 動畫每格之間留很寬的垂直空白帶（整條由上到下暢通） | 工具靠「垂直投影」的空白欄（至少連續 10 像素寬整欄全透明）切格。**前一格最右側的法杖頂端（在上方）與下一格最左側向後踢的靴子或裙擺（在下方）即使在畫面上一上一下沒有碰到，只要水平 `x` 座標重疊，就會被當成同一格** |
| 道具不要伸得太遠 | 每格是固定大小的正方形，寬度大約是角色站立身高的 1.3 倍。任何一格比這個寬，邊緣就會被裁掉；保守一點，每格的寬度不要超過站立的身高 |
| 上半身的輪廓每格一致 | 工具用頭與軀幹的位置做水平對齊。某一格突然多出一大塊（例如披風飛起來），角色會左右抖動 |

### 6.5 尺寸與畫面比例

| 圖 | 比例 | 角色大小 |
|---|---|---|
| 基準立繪 | 1:1 | 角色高度約畫面的 75%～85%，置中 |
| 動畫（一橫排 4 格） | 16:9 或更寬 | 每格角色等高，高度約畫面的 55%～65% |

* 有解析度選項時選最高的。動畫圖裡每個角色至少要 250 像素高（工具會縮到 96 像素，原圖太小會糊）。
* 生圖工具不能輸出寬的比例時，動畫改畫成 2×2（1:1），順序是左上、右上、左下、右下，並在 `log.md` 註明。

### 6.6 範本：基準立繪（步驟 1）

```text
A single game character, alone on the canvas: [CHARACTER].
View: full body, body in side view facing RIGHT, head turned slightly toward the viewer (3/4 view) so both eyes are visible, both feet on the ground pointing right.
Pose: relaxed neutral standing pose, arms down and close to the body, [what each hand holds, and how].
Canvas: square 1:1. The character is centered and about 80% of the canvas height.

[STYLE LOCK]

[TECH LOCK]
```

`[CHARACTER]` 的寫法：一段話，依序寫職業與性別年齡感、髮型髮色、上衣、下身、鞋、披風或帽子、道具，每樣都寫顏色。不寫個性、不寫故事、不用 5.3 節禁用的字。定稿後這段文字就是這個角色的 CHARACTER 區塊，記在 `log.md` 最上面，之後每次照抄。

### 6.7 範本：待機動畫（步驟 2）

附上核可的 `<id>_base` 圖。

```text
Use the attached image as the exact character reference: same face, hair, outfit, colors, proportions, outline thickness and art style. Do not redesign or add anything.
Character: [CHARACTER].
Create a sprite strip: ONE horizontal row of exactly 4 frames of this same character, on a wide 16:9 canvas.
Animation: idle breathing loop, very subtle.
Frame 1: the reference pose.
Frame 2: the body sinks slightly, knees bend a little, shoulders and head drop a little.
Frame 3: the reference pose again.
Frame 4: the body rises slightly, chest lifted, head a little higher.
In all 4 frames the feet stay planted in exactly the same position, and the held items stay in the same hands at the same angle.
View: full body, body in side view facing RIGHT, head turned slightly toward the viewer (3/4 view) so both eyes are visible, both feet on the ground pointing right.
Layout: all 4 characters are the same size, evenly spaced, with their feet on the same invisible horizontal line. Leave a wide gap of empty background between neighbouring frames, at least one third of the character's width. Frames never touch or overlap. No dividing lines, no frame numbers.

[STYLE LOCK]

[TECH LOCK]
```

### 6.8 範本：跑步動畫（步驟 3）

附上核可的 `<id>_base` 圖（**務必在全新對話只附上單人基準圖，不要拿已經畫成 4 人的失敗動畫圖做局部修改**，否則模型會鎖死原本擁擠的 4 人間距）。

```text
Use the attached single-character image as the exact character reference: same face, hair, outfit, colors, proportions, outline thickness and art style. Do not redesign or add anything.
Character: [CHARACTER].
Create a sprite strip: ONE horizontal row of exactly 4 frames of this same character running to the RIGHT, on a wide 16:9 canvas.
CRITICAL SPACING AND SILHOUETTE RULE:
1. Make each character slightly smaller (about 55% of the canvas height) so all 4 characters fit comfortably with HUGE wide vertical columns of empty pure green #00FF00 background between them (at least 100 pixels of empty green space between each character).
2. Keep the silhouette COMPACT and NARROW in every frame: the skirt/robe and cape must hang relatively straight down and NEVER flare or billow out wide to the left or right.
3. Nothing from Frame 1 (staff, hand, skirt, boots) may come anywhere near Frame 2. Nothing from Frame 2 may come anywhere near Frame 3. Nothing from Frame 3 may come anywhere near Frame 4. Every frame must have a completely clear, unbroken vertical strip of pure #00FF00 green from the top edge of the canvas to the bottom edge.
Animation: 4-frame run cycle that loops smoothly (frame 4 leads back into frame 1).
Frame 1: left leg stepping forward, right leg stepping back, body leaning slightly forward, skirt hem compact.
Frame 2: knees bent with legs passing directly under the body, both feet slightly off the ground, body at its highest point.
Frame 3: right leg stepping forward, left leg stepping back, skirt hem compact.
Frame 4: knees bent with the other leg passing under the body, both feet slightly off the ground, body at its highest point.
The free arm swings close to the torso. The staff stays held upright in the right hand, close in front of the body, with its top below the top of the hood and its bottom tip above the soles of the boots.
View: full body, body in side view facing RIGHT, head turned slightly toward the viewer (3/4 view) so both eyes are visible.
Layout: all 4 characters are the exact same size, evenly spaced horizontally across the 16:9 canvas, with the lowest foot of each frame on the same invisible horizontal line. No dividing lines, no frame numbers.

[STYLE LOCK]

[TECH LOCK]
```

### 6.9 範本：造型變化（步驟 4）

附上核可的 `<id>_base` 圖。只換服裝，姿勢、臉、髮型、比例不變。

```text
Use the attached image as the exact reference. Redraw the SAME character in the SAME pose, same face, same hair, same proportions, same size and position on the canvas, same outline thickness and art style.
Change only the outfit: [NEW OUTFIT, with colors].
Do not change anything else.

[STYLE LOCK]

[TECH LOCK]
```

新造型核可後，它就是那個造型的 base，再照 6.7、6.8 畫動畫。

### 6.10 完整範例：牧師的基準立繪（等級 D 成熟動漫奇幻比例）

```text
A single game character, alone on the canvas: a graceful young adult female cleric (healer), slender and tall anime fantasy proportions, long flowing chestnut-brown hair. She wears an ornate white and royal-blue liturgical bodice with gold trim, a layered white pleated skirt with blue and gold borders, a royal-blue hooded capelet draped over her shoulders with the hood up, and white and blue knee-high boots with gold accents. She holds a golden winged healing staff topped with a solid sky-blue crystal sphere.
View: full body, body in side view facing RIGHT, head turned slightly toward the viewer (3/4 view) so both eyes are visible, both feet on the ground pointing right.
Pose: graceful standing pose facing RIGHT, left hand resting gently near her chest, right hand holding the golden staff upright in front of her body with a clear open gap of green background between the staff shaft and her skirt (the skirt hem must NOT touch the staff), the lower tip of the staff resting above the level of her boot soles, and the top of the staff staying slightly below the top of her hood.
Canvas: square 1:1. The character is centered and about 80% of the canvas height.

Art style: refined 2D anime fantasy game character illustration, sleek and heroic aesthetic.
Clean cel shading: crisp base colors with clean, well-defined shadow planes. No noisy painterly texture, no airbrush blur, no soft outer glow.
Clear, consistent dark brown or charcoal outline around the entire silhouette and major forms so the character remains readable when scaled down to 96 pixels tall.
Proportions: 6 to 7 heads tall, slender and graceful anime/fantasy adventure proportions (like Granblue Fantasy, Fire Emblem Heroes, or classic JRPG character art). Mature, poised adventurer look — NOT chibi, NOT super-deformed, NOT big-headed cartoon, NOT toddler-like.
Face: expressive anime-style eyes with clean highlights, poised and gentle confident expression, clean nose and mouth lines.
Design: clear color separation (4 to 6 main colors) with high contrast between outfit sections so the silhouette and limbs remain distinct at game size.
Not pixel art, not a 3D render, not photorealistic, not a sticker with a white border.

Technical requirements (must all be followed):
Background: one single flat solid color, pure chroma green #00FF00, filling the whole canvas edge to edge. No gradient, no vignette, no texture, no grid, no floor, no horizon line.
No cast shadow, no ground shadow, no reflection under the feet.
No glow, halo, light rays, sparkles, particles, smoke, magic effects, motion lines, or any semi-transparent element. Crystals, gems and metal are drawn as solid flat shapes with a dark outline.
Each character is one solid connected shape. Nothing floats or is detached from the body.
No green anywhere on the character (no green gems, no green trim, no green eyes), and no green light reflected on the character.
Do not form any enclosed green loops between the staff and the skirt: leave an open vertical channel of green background between the bottom of the staff and the boots/skirt so the green background outside flows freely around the staff.
Nothing extends below the soles of the shoes: cape, hair, weapon and staff tips all end above the feet. Nothing rises above the top of the head or hat.
The whole body is inside the canvas with empty background margin on all four sides. Nothing is cropped.
No text, letters, numbers, logos, watermark, signature, borders, frames, labels or UI.
```

### 6.11 全身圖：用的就是基準立繪

選角色介面與角色面板顯示的全身圖，由 `tools/sprites.py` 直接從**核可的基準立繪**轉出來：去背、縮小到 512×768（角色約 676 像素高）、鋪上底色，存成 `public/characters/<id>_full.jpg`。**不用另外畫一張**，也沒有另外的檔名種類。

所以基準立繪有兩個用途：畫動畫時的參考圖，以及玩家會放大看的圖。挑基準立繪時多注意：

* **用原本的大小檢查**（第 8 節第 10 項）。精靈圖縮小 16 倍以上，小瑕疵看不出來；全身圖只縮小 2～3 倍，畫壞的臉、手指、道具都看得到。
* **解析度選最高的**。角色至少 700 像素高，1500 像素以上更好；不到 676 像素高會被放大而模糊，工具會提醒。
* **角色是一整塊**。工具只取最大的一塊，飄在旁邊的東西不會出現在全身圖。
* 工具對全身圖會多做一道去邊，柔邊與 JPEG 壓縮滲進輪廓的背景色大多清得掉；發光、半透明、角色身上的背景色一樣救不回來。
* 底色由工具鋪上（預設是遊戲介面的米色），不要自己畫場景或底色。

維護者之後想讓某個角色用另一張圖當全身圖時（例如更生動的姿勢），先在需求單寫明；那張圖照基準立繪的技術規則畫，轉檔時把設定檔的 `fullBody.source` 指向它。

## 7. 背景圖

背景圖是鋪滿整個畫面的插圖，上面會蓋一個半透明的介面視窗（例如商店）。它不經過 `tools/sprites.py`，所以第 6 節的綠幕規則**不適用**；要注意的是構圖。

目前遊戲裡用到背景圖的只有商店（`shop`）。關卡地圖是程式畫的色塊，不是圖片（見第 10 節）。

### 7.1 規格

* 1:1 正方形，解析度選最高的（至少 2000×2000 為佳）。PNG。
* 同一張圖要用在手機直向、平板橫向、電腦橫向：直向會裁掉左右、橫向會裁掉下方，介面視窗還會再蓋住一部分。

| 區域（佔整張圖的比例） | 內容 |
|---|---|
| **安全區**：水平 30%～75%、垂直 5%～60% | 所有裝置都看得到。主角（例如老闆娘）的臉與上半身放在這裡，中心在水平 45%～55%，頭部在垂直 15%～30% |
| 左側 0%～30%、右側 75%～100% | 手機直向看不到；橫向時右側會被介面視窗蓋住。只放次要的場景 |
| 下方 60%～100% | 橫向看不到；直向時被介面視窗蓋住。只放次要的場景（地板、桌面、箱子） |
| 最上方 0%～5% | 可能被裁掉，不放重要的東西 |

需求單有另外指定安全區時，以需求單為準。

* 不要有可讀的文字、招牌上的字、數字、商標、介面元素、外框。
* 畫面整體亮度中等、不要太花：上面要疊半透明的介面與文字。次要區域的細節與對比低一點。

### 7.2 背景的 STYLE LOCK（整段照抄）

畫風以現有的商店背景為基準（`reference/style/background_style.png`，由維護者放入）。有這張圖時附上當畫風參考。

```text
Art style: warm storybook fantasy illustration for an all-ages adventure game. Clean dark-brown line art with soft cel shading, warm golden interior or daylight lighting, rich but harmonious colors, gentle depth with a slightly softer background.
People, if any, have natural proportions and friendly, calm expressions.
No text, letters, numbers, readable signs, logos, watermark, signature, UI elements, borders or frames.
Not pixel art, not a 3D render, not a photograph.
```

### 7.3 範本：背景

```text
Square 1:1 full-bleed scene illustration: [SCENE: place, time of day, mood, main subject and what it is doing].
Composition: the main subject is in the horizontal center of the image and in the upper half, with the head at about 20% to 25% from the top and the upper body ending above the vertical middle. The outer quarter on the left and on the right, and the bottom 40% of the image, contain only secondary scenery with lower detail and contrast, because those parts will be cropped or covered by a game menu. Nothing important touches the top edge.

[背景的 STYLE LOCK]
```

## 8. 上傳前自我檢查

生成後把圖打開來看，逐項檢查。任何一項不合格，就不是合格的候選圖。

**角色圖（base、idle、run、outfit）**

1. 背景是不是整片同一個綠色（或洋紅），沒有漸層、暗角、紋理、格線？
2. 有沒有地面陰影、發光、光暈、閃光、粒子、動作線？
3. 角色身上有沒有跟背景相近的顏色（例如法杖上的綠寶石）？
4. 全身是不是都在畫面內，四邊都留空？
5. 是不是面向右？
6. 有沒有東西低於鞋底，或高過頭頂（法杖頂端有沒有超過兜帽／頭頂）？
7. 有沒有文字、浮水印、外框、白色貼紙邊？
8. 描邊夠不夠粗？把圖縮到約 100 像素高來看，輪廓、臉、主要色塊還分得出來嗎？
9. 比例是不是符合需求單指定的畫風等級（預設等級 D 為 6～7 頭身成熟動漫奇幻比例）？

**基準立繪再加上**（它會被轉成全身圖放大顯示，見 6.11）

10. 用原本的大小看：臉、手指、道具有沒有畫壞？角色是不是一整塊，沒有飄在旁邊的東西？

**動畫圖再加上**

11. 是不是剛好 4 格、排成一橫排？
12. 相鄰兩格之間有沒有**由上到下完全暢通的垂直空白帶**（前一格上方的法杖與下一格下方的後腳靴子在水平 `x` 座標上沒有重疊）？
13. 每格的角色是不是一樣大、腳在同一條水平線上？
14. 每格的臉、髮型、服裝、顏色、道具跟 base 一樣嗎？道具有沒有換手？
15. 待機：腳的位置每格都一樣嗎？跑步：4 格的腿是不是前後交替、能接回第 1 格？

**背景圖**

16. 主角的臉與上半身在安全區內嗎？
17. 有沒有可讀的文字、商標、介面元素？
18. 左右與下方是不是只有次要的場景？

## 9. 需求單與生圖紀錄

### 9.1 `brief.md`（維護者或 Claude Code 寫，放 repo `private/doc/<characters|backgrounds>/<id>/brief.md`）

```markdown
# cleric（牧師）
- 種類：角色
- 要做的步驟：1（基準立繪）
- 外觀：女牧師，白藍配金邊禮服與百褶裙，皇家藍連帽披肩，金翼天藍水晶法杖（水晶不要發光）
- 可愛程度：D（6～7 頭身成熟動漫奇幻風）
- 背景色：綠（角色沒有綠色）
- 備註：
```

沒有 `brief.md`、只有對話中的指示時，照指示做，並把指示內容記在 `log.md`。

### 9.2 `log.md`（Antigravity 寫，放 repo `private/doc/<characters|backgrounds>/<id>/log.md`，只往後加，不改舊的）

最上面是定稿的 CHARACTER 區塊（還沒定稿時寫目前使用的）。之後每生成一張圖加一段：

```markdown
## cleric_base_v01.png
- 日期：2026-11-12
- 步驟：1 基準立繪
- 生圖工具／模型：（名稱與版本）
- 規範版本：2026-11-13 v5
- 附上的參考圖：無
- 自我檢查：通過／第 N 項不合格（說明）
- 提示詞：

（完整的提示詞，一字不漏）
```

提示詞跟範本不同的地方（例如為了修正某個問題加了一句），在這裡說明加了什麼、為什麼。有效的修改會由維護者回寫到本文件。

## 10. 給 Claude Code／Antigravity：轉檔與交接

* **Claude Code 無法存取 Antigravity 建立的 Drive 檔案（本機與雲端皆然）**：實測即使在本機電腦透過桌機版 Google Drive（`G:\我的雲端硬碟\Antigravity_Data\cherylgame\`），Claude Code 也看不到 Antigravity 建立的檔案。因此 **Claude Code 一律以 GitHub repo 的 `.md`（`brief.md`、`log.md`、`work_plan.md`）與程式碼為準**；轉檔或檢查需要原圖時，請維護者在對話中附上圖片並確認對應的定稿檔名。
* 維護者本人電腦上掛載的 `G:\我的雲端硬碟\Antigravity_Data\cherylgame\` 僅作**唯讀讀取**（讓維護者自行跑 `tools/sprites.py` 時由 `tools/config.py` 直接讀 Drive 的 `reference/`）；不在 `G:\` 手動建資料夾或拖曳放檔。
* **角色**：圖片定稿放在 Drive 的 `reference/characters/<id>/`（Folder ID 見 `AGENTS.md`），定稿檔名記在 repo 的 `private/doc/characters/<id>/log.md`。建立 `tools/characters/<id>.json`，執行 `python -m tools.sprites <id>`，看 `tools/work/sprites/<id>/` 的預覽與報告。步驟見 [`character_pipeline.md`](character_pipeline.md) 第 2 節。
    * `source` 填定稿的檔名（含版本號，例如 `cleric_idle_v01.png`）。換定稿時檔名會變，要跟著改設定檔。
    * 待機與跑步是兩張原圖：`animations` 裡各自用 `"source"` 指定，例如 `"idle": { "source": "cleric_idle_v01.png", "frames": [0, 1, 2, 3], "fps": 6 }`。設定檔最上層的 `source` 填 idle 那張。`tools/sprites.py` 會依每張原圖各自的第 1 格身高分別計算縮放倍率，確保不同原圖的角色縮到相同的 `charHeight`（預設 96px）。
    * 只有基準立繪、沒有動畫的角色：`idle` 與 `run` 都用 `"frames": [0]`，角色是靜態的（程式動畫還沒做）。
    * 不用洋紅背景另外設定，工具會自己判斷背景色。
    * 全身圖：設定檔加上 `"fullBody": { "source": "<id>_base_vNN.png" }`（核可的基準立繪），重建後看 `public/characters/<id>_full.jpg`。只拿得到基準立繪、沒有動畫原圖的環境，用 `python -m tools.sprites --full-body <id>` 只重建全身圖。底色預設是米色，要換時加 `"background"`（見 `tools/sprites.py` 開頭）。
* **背景**：把 `reference/backgrounds/<id>/` 的定稿縮成 1600×1600、WebP 品質 75、200 KB 以內，放到 `public/`（目前沒有專用工具；商店背景的版面見架構文件第 3 節）。
* 轉檔時發現原圖不符合規則（留下綠邊、切格錯誤、動作不連貫），回報是哪一條，由維護者或 Antigravity 依規則重畫或局部修整；不要用手動 P 圖補救。規則本身不夠清楚時，修改本文件並提高規範版本。
* 本文件修改後只需提高開頭的規範版本並隨 PR 合併，不再複製到 Drive。

### 10.1 目前遊戲還不支援的素材

下面這些目前是 emoji 或程式畫的色塊，**遊戲程式還沒有對應的功能**。維護者要求時才畫；規格要先由 Claude Code 決定並補進本文件，不要先畫一批。

| 素材 | 現況 |
|---|---|
| 怪物、魔王 | emoji（👾🐉 等） |
| 關卡地圖的地板、障礙物 | 純色棋盤格 + emoji（🌲🧱 等），7 種主題 |
| 道具圖示 | emoji |
| 角色配件（帽子等） | 還沒做；工具已經會算頭頂的位置 |
| 標題畫面、章節過場 | 沒有 |

## 11. 實測紀錄

本文件只放規則與做法。每次生圖、轉檔的實測結果（哪個提示詞造成什麼問題、量到的數字、怎麼修正）記在 git repo 的 [`lessons_learned.md`](lessons_learned.md) 第 1 節；從實測學到、會改變做法的事，已經寫進本文件對應的規則。

* 每張圖的完整提示詞與自我檢查結果，照 9.2 記在 repo 內該素材的 `log.md`（`private/doc/<characters|backgrounds>/<id>/log.md`）。
* 發現規則不夠清楚或漏掉情況時：修改本文件並提高規範版本，把經過寫進 `lessons_learned.md`。
