# 經驗紀錄（Lessons Learned）

文件類型：**經驗紀錄**。這裡記「發生過什麼」：實測數據、踩過的坑、試過但放棄的做法、每次改版的驗證結果。文件系統的分工見 [`README.md`](README.md)。

* **這裡不是規則**。規則與做法寫在 SOP（[`AGENTS.md`](../../AGENTS.md)、[`art_guide.md`](art_guide.md)、[`character_pipeline.md`](character_pipeline.md)）與設計文件（[`system_architecture.md`](system_architecture.md)）。要知道「現在該怎麼做」讀那些文件；想知道「為什麼這樣規定」「以前試過什麼」才讀這裡。
* **每一條經驗都要回寫**：學到的東西如果會改變做法，就同時修改對應的 SOP 或設計文件，並在下面的索引註明寫在哪裡。只記在這裡、沒有回寫的經驗，下一個 agent 不會照著做。
* **只往後加，不改寫舊紀錄**。舊紀錄後來被推翻時，在新的紀錄說明，舊的那筆加一句「已由 YYYY-MM-DD 的紀錄取代」。
* 寫法：一筆紀錄一個小標題（日期 + 主題），內容依序是情境、結果（盡量有數字）、原因、現在的做法與寫在哪裡。
* 2026-11-13 整理文件時，把原本散在各文件的紀錄搬到這裡，內文照原樣保留，所以**舊紀錄裡的節號是原文件當時的節號**：1.1～1.3 指當時的 `character_pipeline.md`（現在的節號不同），1.5～1.7 指 `art_guide.md`，第 2～5 節指 `system_architecture.md`。

## 索引：學到什麼、規則寫在哪裡

| 日期 | 學到的事 | 現在的做法寫在 |
|---|---|---|
| 2026-09-25 | sandbox iframe 裡連讀取 `window.localStorage` 都會丟出例外，遊戲整個無法啟動 | `AGENTS.md`「程式慣例」；架構文件 4.3、第 5 節 |
| 2026-09-28 | 關卡中途存道具、讀檔時寶箱又重生，就能靠重新整理刷道具 | `AGENTS.md`「程式慣例」的存檔；架構文件 4.1 |
| 2026-09-28 | `script.js` 裡 `let` 變數宣告之前的頂層程式碰到它（TDZ），遊戲直接停止 | `AGENTS.md`「程式慣例」；架構文件 4.4 |
| 2026-09-28 | 瀏覽器窗格隱藏時 `requestAnimationFrame` 不執行，手動驗證要直接呼叫 `update()` | 本文件 3.1、4.1 |
| 2026-10-24 | 畫布與控制鍵的尺寸來源不一致時，畫面下半部會落在畫面外（實機原因仍未確認） | 架構文件 2.1、8.1；`?debug` |
| 2026-10-26 | 靠等待時間的測試在平行執行時不穩定，要直接把狀態設成要測的情況 | 本文件 5.2；架構文件 9.3 |
| 2026-11-01 | AI 一次畫整張精靈圖，格子不等分、角色位置晃動；去背、切格、對齊、縮放要在建置時做，不在遊戲執行期 | `character_pipeline.md` 第 3、4 節；`AGENTS.md`「角色圖」 |
| 2026-11-01 | 要求生圖模型畫「透明背景」會得到假的灰白格子；要畫純色背景，由工具去背 | `art_guide.md` 6.1 |
| 2026-11-12 | 提示詞裡的 `cute`、`chibi`、`glowing`、細描邊，造成畫風太幼、綠色光暈、縮小後輪廓不清楚 | `art_guide.md` 5.2、5.3、6.2 |
| 2026-11-13 | 法杖與裙擺圍出封閉的區域，會留下上萬個綠色像素 | `art_guide.md` 6.4、6.10 |
| 2026-11-13 | 動畫切格靠由上到下暢通的垂直空白帶；兩格一上一下沒碰到，只要水平位置重疊就會黏成一格。要重畫時開新對話、只附單人基準圖 | `art_guide.md` 6.4、6.8 |
| 2026-11-13 | Antigravity 內建生圖每 5 小時只有 2～3 張；它在 Drive 上只看得到自己上傳的檔案 | `art_guide.md` 4.4 |
| 2026-11-13 | 全身圖只縮小 3 倍，精靈圖用的去背會留下看得到的綠邊 | `character_pipeline.md` 4.2 第 10 步；`art_guide.md` 6.11 |
| 2026-11-13 | JPEG 沒有透明，全身圖的底色只能做進圖裡 | `character_pipeline.md` 3.1 |
| 2026-11-13 | 雲端的 Claude Code 照「不改 git 狀態」的規則做，變更出不了暫時的容器 | `AGENTS.md`「執行環境」「Git 與 PR 流程」；`CLAUDE.md` |
| 2026-11-13 | 雲端環境讀不到 Drive 上的原圖，只拿得到維護者在對話中附上的圖 | `python -m tools.sprites --full-body`；`character_pipeline.md` 第 1 節 |
| 2026-11-13 | 維護者在對話中附上的圖，通常是 Drive 上已經核可的定稿，不是新的原圖；沒問清楚就會多出不存在的檔名與步驟 | `AGENTS.md`「美術素材」；`character_pipeline.md` 第 1 節 |
| 2026-11-13 | 同一份原圖在不同作業系統重建，結果可能差幾個像素，`--check` 會誤報 | 全身圖用容許誤差比較（`character_pipeline.md` 4.2）；精靈圖尚未處理（[`work_plan.md`](work_plan.md) 第 4 節） |
| 2026-11-13 | Google Drive 用名稱認定位置會因 `drive.file` 盲區與同名允許機制重複建出資料夾（出現兩個 `private/`） | `AGENTS.md`「Google Drive 對照資料夾」（Folder ID 登錄表 + 本機 `G:\` 唯讀）；Drive 只放 `reference/` 圖片，`.md` 統一放 repo |
| 2026-11-13 | Claude Code 無法存取 Antigravity 建立的 Drive 檔案（本機桌機版 `G:\` 與雲端皆然） | `AGENTS.md`「執行環境」「Google Drive 對照資料夾」；`character_pipeline.md` 第 1 節 |

## 1. 美術素材與角色圖

### 1.1 2026-11-01：`Pal_test.png` 的實測問題與原型

改版前騎士的原圖，由 AI 一次畫出整張精靈圖。這次實測決定了「原圖 → 工具 → 遊戲用的檔案」的做法（`character_pipeline.md`）。

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

**1.1 原型的處理結果**
同一張圖改用「工具在建置時處理」的做法（第 4 節的流程），結果：

* 自動找到 5 排、20 格，不依賴等分格子；腳底不再被切、沒有鄰格雜點。
* 從圖片邊緣 flood fill 去背：只去掉跟外面相連的背景，角色內部的白色保留；再去掉一圈淺色反鋸齒，白邊消失。
* 以「腳底 + 上半身中心」對齊後，頭部晃動降到 idle 0.5px、run 1.0px。
* 只打包 8 格、每格 128×128（約畫面大小的 2 倍，高 DPR 螢幕也清楚）：PNG 95 KB、WebP 無損 72 KB、**64 色 PNG 13 KB（目視與全彩無差異）**。也就是 2 MB → 13 KB。
* 純 Python + Pillow，處理一張約 2.5 秒。

**結論：不論角色怎麼生成，「去背、切格、對齊、縮放、壓縮」都應該從遊戲執行期移到 `tools/` 的建置步驟。** 現在就能做，而且遊戲畫面幾乎不變、只有變乾淨。

### 1.2 2026-11-01：角色圖的方案比較

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

**建議**
1. 遊戲維持精靈圖（sprite sheet），但改成「工具產生的標準格式 + 角色設定檔」，每個動畫可以是 1～N 格。
2. 每個新角色先試 A（Gemini 畫 idle + run 各 4 格）；做不出可用的循環動作時，退回 B（單張立繪 + 程式動畫）。兩種角色在遊戲裡混用沒有問題。
3. 外觀變化從「配件掛點」開始做（第 5 節），它對 A、B 兩種角色都適用。

### 1.3 2026-11-01：遊戲改用工具產生的精靈圖（第 1 階段）

* `index.html`：在 `script.js` 之前載入 `js/characters.js`。
* `script.js`：
    * 第 2 段：刪除 `gameConfig` 的格子大小與 `animations`，改讀 `CHARACTERS.knight`；玩家方塊改用固定常數 `PLAYER_WIDTH`、`PLAYER_HEIGHT`（`getPlayerHitbox()`、`getPlayerTile()`、`applyKnockback()`、出生位置、邊界檢查）。
    * 第 4 段：刪除執行期去背，只載入圖片。
    * 繪製：以 `anchor` 對齊玩家方塊底部中心，開啟平滑處理（第 3 節）。之後的程式動畫、配件也加在這裡。
* `Pal_test.png` 已複製到 `reference/characters/knight/` 當騎士的原圖，並從 `public/` 刪除（維護者 commit 時一起提交這個刪除）。
    * 它仍留在 git 歷史裡（2 MB）。要從歷史清掉得改寫歷史、所有 clone 都要重新下載，2 MB 不值得；重點是之後的大型原圖都放 `reference/`。
* 新增 `tools/browser/character.spec.js`（`npm --prefix tools run test:character`）：所有角色圖都存在、玩家的精靈圖大小符合設定、碰撞範圍不變。
* `AGENTS.md` 與架構文件（2.1、5.2、9.6）已同步更新。驗證結果見架構文件 9.6。

### 1.4 2026-11-01～11-12：第一版生圖規範與後來的修正

第一版的生圖規範寫在 `character_pipeline.md`（原本的第 6 節），2026-11-12 由 `art_guide.md` 取代。完整的舊版在 git 歷史裡（`2f67d9c` 之前的 `private/doc/character_pipeline.md`）。後來改掉的地方：

| 第一版 | 現在（`art_guide.md`） | 原因 |
|---|---|---|
| 細的深色描邊（`thin dark outline`） | 粗的深色描邊 | 縮到 48 像素高時細描邊幾乎看不見（1.5） |
| Q 版比例（`chibi proportions`） | 6～7 頭身的奇幻動漫比例（等級 D），不再用 `chibi`、`cute` | 維護者覺得太可愛（1.5、1.6） |
| 待機與跑步畫在同一張（4 欄 × 2 排） | 分成兩張，各一橫排 4 格 | 每格的解析度比較高，也比較不會排錯 |
| 沒有提到發光、封閉的小洞 | TECH LOCK 明文禁止發光與半透明；手與道具貼近身體、留開放通道 | 去背後留下綠色（1.5、1.6） |

### 1.5 2026-11-12：`female_cleric_concept.png`（改用 `art_guide.md` 之前的測試圖）

提示詞（節錄）：`... a cute RPG female cleric ... chibi proportions ... expressive big eyes, warm friendly smile ... holding a small wooden healing staff with a glowing crystal. Thin dark clean outline ...`。1024×1024。以 `tools/sprites.py` 的去背與切格實際處理：

| 項目 | 結果 |
|---|---|
| 背景色 | 實際是 `#39CF3B`，不是 `#00FF00`；四邊最大色差 13，夠均勻，去背正常 |
| 切格 | 正確切出 1 格（423×811） |
| 水晶的光暈（`glowing`） | **不合格**：去背後水晶周圍留下一圈綠色，共 1168 個綠色像素 |
| 法杖與長袍之間的封閉小洞 | **不合格**：留下一小塊綠色 |
| 細描邊（`Thin`） | 縮到 48 像素高時幾乎看不見，在冰藍色地板上披風的輪廓不清楚 |
| 畫風 | 約 2.5 頭身、大眼睛、腮紅：維護者覺得太可愛 |
| 腳底、頭頂、面向、留空 | 合格 |

本規範的 STYLE LOCK（粗描邊、不要腮紅）與 TECH LOCK（不要發光、手與道具貼近身體）就是針對這幾項寫的。

`art_guide.md` 的 STYLE LOCK（粗描邊、不要腮紅）與 TECH LOCK（不要發光、手與道具貼近身體）就是針對這幾項寫的。

### 1.6 2026-11-12～11-13：牧師（`cleric`）的生圖與轉檔

以「Antigravity 撰寫提示詞與執行 `tools/sprites.py` 檢查 ＋ 維護者用 Gemini App 生圖並貼回對話視窗」的雙人協作流程，完成第一個新角色 `cleric` 的基準立繪、待機動畫、跑步動畫與轉檔：

1. **畫風升級（等級 B → 等級 D）**：
    * `cleric_base_v01`～`v05` 為 Antigravity 依舊版 3～3.5 頭身（等級 B）生成的候選圖。維護者審核後決定改用 **6～7 頭身成熟動漫奇幻風（等級 D）**。
2. **基準立繪（`cleric_base_v06`～`v08`）的修正經驗**：
    * `v06`：維護者先在 Gemini App 生成正面偏左、裙擺寬大碰到法杖、法杖鑲綠寶石、且法杖高過頭頂的圖。經 `tools/sprites.py` 實測，法杖與裙擺圍出的封閉區留下 9,418 個綠色像素，綠寶石也被染色。
    * `v07`：提示詞改為面向右、天藍寶石、法杖低於兜帽，但裙擺右下角仍輕觸法杖底端，圍出封閉綠色三角形（11,698 個綠像素）。
    * `v08`（定稿）：在 Gemini App 對 `v07` 下局部修改指令「把裙擺右下角往左收、與法杖之間留出開放綠色通道」，一次通過檢查（切出 1 格，縮至 96px 後殘留綠色像素 = `0`），同時作為 `reference/style/character_style.png`。
3. **待機動畫（`cleric_idle_v01`）**：
    * 附上 `cleric_base_v08.png` 並使用 6.7 節範本，一次通過：`1376×768` 自動切出 4 格（寬 249～258、高 516～523），畫面水平晃動 `0.0px`。
4. **跑步動畫（`cleric_run_v01`～`v04`）與垂直投影切格的關鍵發現**：
    * `v01`、`v02`：使用舊版長袍提示詞（`The robe hem swings with each step`），Gemini 畫出大幅向外飛揚的裙擺與披風，導致 4 格水平相連（`find_frames` 只切出 1 格）。且發現**拿已經是 4 個人的失敗圖在同一個 Gemini 對話要求拉開間距時，Gemini 只會重畫細節、不會移動 4 個人的水平位置**。
    * `v03`：**開全新 Gemini 對話、只附上單人基準圖 `cleric_base_v08.png`**，並在提示詞強制要求「角色高度約 55%、裙擺與披風保持窄直不外飄（compact and narrow silhouette）、每格之間留極寬垂直綠幕通道」。結果第 1～2 格（間距 69px）、第 3～4 格（間距 63px）成功切開，只剩第 2 格最右側的法杖（`x=517`）與第 3 格向後踢的左腳靴跟（`x=518`）在垂直投影上重疊 1 像素。
    * `v04`（定稿）：對 `v03` 下局部修改指令「只把左起第 3 個角色往後伸的左腳靴子往身體下方收攏」，第 2、3 格之間立刻讓出 36px 寬的垂直通道，完美切出 4 格（寬 200～210、高 403～407），畫面水平晃動僅 `0.5px`。
5. **`tools/sprites.py` 的同步強化**：
    * **高飽和度綠幕／洋紅背景自動清除內部封閉孔洞**：當背景色飽和度 `max(bg) - min(bg) > 100` 時，除了邊緣 flood fill 外，角色內部與背景色距離在 `tolerance` 內的像素也一併透明化並做溢色修正（因此跑步時雙腿邁開或手肘彎曲圍出的小綠洞會自動清乾淨，同時不影響 `Pal_test.png` 等灰白背景保留角色內部白色）。
    * **忽略 1～2px 邊緣壓縮雜訊線**：JPEG 轉檔偶爾在畫布最下緣留下 1px 雜訊線，`find_frames` 自動略過寬或高 ≤ 2px 的細線。
    * **不同原圖獨立計算縮放倍率**：`idle`（高 523px）與 `run`（高 407px）來自兩張不同原圖時，各自以該張原圖的第 1 格計算縮放倍率，確保打包進 `public/characters/cleric.png`（512×256，全彩 74.1 KB）時待機與跑步在畫面上都是 48px 高。

### 1.7 2026-11-13：牧師的全身圖

維護者決定每個角色除了精靈圖，還要有一張給選角色介面與角色面板顯示的全身圖（JPEG）。全身圖直接從核可的定稿圖轉出來，不另外畫。做這件事的雲端環境讀不到 Drive，維護者在對話中把牧師的定稿圖重新傳了一次（1792×2400 的 JPEG；正面 3/4 視角，法杖比人高），轉存成 PNG 後以 `tools/sprites.py` 處理：

| 項目 | 結果 |
|---|---|
| 背景色 | 實際是 `#06FD0B`，整片均勻，去背正常 |
| 切格 | 正確切出 1 格（922×2096） |
| 精靈圖用的去背 | **全身圖不夠用**：留下 15,673 個偏綠的像素，縮到成品大小後法杖右緣、袖口、靴子邊緣看得到一圈綠邊。原因是生圖模型的柔邊加上 JPEG 壓縮，綠色滲進輪廓好幾個像素；精靈圖縮小 16 倍看不出來，全身圖只縮小 3 倍 |
| 加上全身圖專用的去邊之後 | 偏綠的像素 0 個；角色 911×2088，縮放倍率 0.3238 |
| 成品 | `public/characters/cleric_full.jpg`，512×768，53.4 KB |

`art_guide.md` 6.11 與 `character_pipeline.md` 4.2 的第 10 步是從這次的結果整理出來的。騎士的全身圖等維護者重畫。一開始把這張圖誤認成另外畫的新圖，經過見 6.2。

### 1.8 2026-11-13：檢視牧師的產出時發現、還沒處理的事

* **精靈圖還有少量綠色殘留**：`public/characters/cleric.png` 有 10 個明顯偏綠的像素（綠色比紅、藍高出 40 以上），分散在待機第 1～3 格與跑步第 2、4 格，位置在靴子附近；放大到 4 倍看得到一個綠點，遊戲裡的大小（48 像素高）幾乎看不出來。`art_guide.md` 記的「殘留綠色像素 = 0」是基準立繪的檢查結果，不是打包後的精靈圖。待辦在 [`work_plan.md`](work_plan.md) 2.2。
* **`art_guide.md` 寫的牧師跟定稿不一樣**。維護者提供的定稿圖是銀灰色頭髮、木頭法杖、菱形的藍水晶、深色短靴，正面 3/4 視角，法杖比人高；精靈圖也是這個造型。但 `art_guide.md` 6.10 的範例提示詞寫的是栗色長髮、金色翼杖、天藍水晶球、面向右，1.6 的紀錄也說定稿是「面向右、法杖低於兜帽」。這個雲端環境讀不到 Drive 上的 `log.md`，無法確認文件是哪裡沒有跟上。影響：
    * 之後畫牧師的造型變化時，照 6.10 的文字會畫成另一個人。要以 Drive 上 `log.md` 最上面的 CHARACTER 區塊為準，並更正 6.10。
    * 定稿的法杖高過頭頂，工具把最上緣當成頭頂，所以 `characters.js` 裡牧師的頭頂掛點 `attach.head` 其實在法杖頂端的高度。做配件（帽子等）時要處理。
    * 待辦在 `work_plan.md` 2.2。

## 2. 存檔（`system_architecture.md` 第 4 節）

### 2.1 2026-09-28：存檔 v1 與 v2 的驗證

2026-09-28 以 headless Chrome 實測以下 28 項全部通過，過程中沒有未攔截的例外或 console error：
* 全新開始：第 1 關、不顯示歡迎視窗，寫入第 1 關存檔。
* 過關：存下進入第 2 關當下的分數、HP、道具；關卡中途的變化不會被存。
* 重新整理：顯示歡迎視窗並回到第 2 關起點；提示卷軸按鈕隱藏，按鍵 3 不會消耗卷軸；按 Continue 恢復遊戲。
* Game Over：第 2 關以上可從本關重來（恢復進關時的數值）或從頭開始；第 1 關只有 Play Again。
* 歡迎視窗按 New Game：回到第 1 關並覆蓋存檔。
* 不合法的存檔（非 JSON、版本不符、`level` 為 0 或字串、`hp` 為 0、`score` 為負）→ 視為無存檔，從第 1 關開始。
* `hp` 超過上限會被限制為 `MAX_HP`；負數、小數與不認識的道具欄位會被丟棄。
* `?newgame`：忽略既有存檔並從第 1 關開始。
* 讀到第 5 關存檔時正確生成魔王。
* `sandbox="allow-scripts"` iframe：遊戲正常啟動、無法存檔，但 Game Over 仍可用記憶體中的 `checkpoint` 從本關重來。

2026-09-28 改為 v2 後，以 Claude 內建瀏覽器 (Chromium) 實測以下項目，沒有未攔截的例外（唯一的 console error 是預覽環境連不到 Google Tag Manager）：
* 答對怪物 +10 XP +5 🪙；寶箱另得道具；子彈題沒有獎勵；答錯只扣血。答題統計（總數、各運算、連續答對）正確累計。
* 關卡中途的存檔：`profile` 已更新，`run` 仍是進關當下的 HP 與道具。
* 過關：顯示過關選單；進入商店購買後金幣扣除、道具增加，`run` 與 `checkpoint` 都包含買到的道具；買不起的商品按鈕停用；商店開著時按數字鍵 1 不會使用藥水。
* 重新整理：歡迎視窗顯示 Stage N，經驗值、金幣、鑽石、成就、道具都正確讀回。
* 暫停中（歡迎視窗）無法使用護盾；恢復後可以使用。
* 累計 50 XP 升到 Lv 2，顯示升級提示。
* Game Over 顯示經驗值；從本關重來會回到進關時的 HP 與道具，經驗值不回溯；New Game 回到第 1 關，經驗值、金幣、鑽石保留。
* 魔王：前 4 擊各 +10 XP +5 🪙，最後一擊 +60 XP +35 🪙，解鎖「第一次打倒魔王」。
* v1 存檔（第 12 關、320 分）：轉成 320 XP（Lv 4），道具與 HP 保留，並解鎖「抵達第 10 關」；隨即以 v2 格式寫回。
* 不合法的存檔：非 JSON、`v` 為 3、v1 的 `score` 為負或 `level` 為 0 → 無存檔；v2 的 `run` 不合格時只丟掉 `run`，`profile` 保留；`profile` 中的負數、字串、不認識的欄位與成就 id 被丟棄或改為預設值。
* 讓 `window.localStorage` 丟出 `SecurityError`（模擬 sandbox iframe）：讀檔、答題、過關、商店購買都正常，進度保留在記憶體中。
* 手機寬度 (375px)：HUD 換成三行，文字不重疊；商店四個商品排成 2×2，名稱不斷行；提示訊息顯示在 HUD 下方。
* Playwright 測試 (`private/*.js`) 本次沒有執行：這台電腦沒有安裝 `node_modules`。

## 3. 章節、新怪物、魔王與題目難度（`system_architecture.md` 第 7 節）

### 3.1 2026-09-28：驗證

2026-09-28 以 Claude 內建瀏覽器實測。瀏覽器窗格隱藏時 `requestAnimationFrame` 不會執行，所以在頁面中直接呼叫 `update()` 模擬時間。過程中沒有未攔截的例外（console error 只有預覽環境連不到 Google Tag Manager）：
* 第 1～100 關抽查：章節、主題、魔王、怪物組成與障礙物比例符合 7.1；第 1 關仍是 1 個寶箱 + 4 隻 👾。
* 新怪物：河豚答對 2 次才倒下，每次都有獎勵；眼鏡蛇只在 4 格內吐毒液；小幽靈隱身時碰不到，也不會在牆裡現身；飛碟會逃，獎勵 10 XP、10 金幣。
* 魔王：
    * 火龍第一發在開始移動 2.5 秒後，之後每 5 秒，生氣後 3.5 秒。
    * 章魚王平常 4 方向，生氣後 8 方向；★ 章魚王 8 格血、間隔 4.2 秒。
    * 犀牛王撞牆後暈倒，暈倒時答對顯示「Critical Hit! 💥」並扣 2 格；衝撞中碰到是子彈題（沒有獎勵）且護盾擋得住。
    * 幽靈王召喚上限 2 隻；倒下時小幽靈一起消失並過關。
    * 機器人的炸彈在預警時不觸發，爆炸時觸發子彈題，答錯被往炸彈反方向彈開；護盾擋得住。
* 題目各 20000 題：第 5 關與原本相同（71% 的加減法只看個位數就能選對）；第 15 關填空 20%、進位／借位／6～9 乘法 84%、只看個位數能選對 0%。選項不重複、非負、包含正確答案；約 4000 題填空全部驗算正確，其他選項填進去都不成立。
* 手機直向 (375×812，7×16 格)：第 11 關起少一隻怪物；章魚王生氣後十字、斜向輪流；幽靈王只召喚 1 隻；所有題目（包含填空題）在題目視窗中維持一行。
* 存檔在第 30 關時重新整理：歡迎視窗按 Continue 後才顯示「⚠️ Boss: 犀牛王」，魔王血量 6。
* Playwright 測試 (`private/*.js`) 本次沒有執行：這台電腦沒有安裝 `node_modules`。`verify.js` 已改為呼叫 `spawnEnemies()`（不再傳入數量）。

## 4. 觸控操作與畫面方向（`system_architecture.md` 第 8 節）

### 4.1 2026-10-25：驗證

2026-10-25 以 Claude 內建瀏覽器實測。窗格隱藏時 `requestAnimationFrame` 不會執行，所以以 `PointerEvent`（`pointerType: 'touch'`）模擬觸控，並直接呼叫 `update()` 推進時間。遊戲本身沒有未攔截的例外：
* 手機直向 375×812：觸控模式、手機版面；地圖 7×16、每格約 42px，在 HUD 與道具按鈕之間；左下角顯示搖桿提示。
* 搖桿：往右上拉 10 格畫面移動 (21.3, −21.3)；放開、`pointercancel` 後停止；拉 6px 不移動；往左偏下約 9° 吸附成正左（Y 不變）；拉到 180px 外時底座跟到手指後方 60px。
* 鍵盤右下斜走 10 格畫面移動 (21.3, 21.3)，與搖桿斜走相同。
* 正上方一排牆、往右上拉：沿著牆往右移動，Y 不變。
* 一指按住搖桿時另一指按神速靴：道具使用、搖桿仍按住；數量標籤變成 x0 並變灰。
* 出題時搖桿放開；0.3 秒內按正確答案沒有反應，之後按才算；恢復遊戲後原本那一指繼續拉不會移動，重新按下才會。
* 手機轉成橫向：顯示旋轉提示，按方向鍵也不移動；關卡已觸發題目，地圖不重建。轉回直向後恢復，保護時間 1.5 秒。
* iPad mini 橫向 1133×670（模擬時沒有觸控媒體查詢，第一次觸控才切換）：平板版面；地圖 22×13、每格約 47.5px，道具按鈕在右側且不重疊。轉成直向 744×1060：顯示旋轉提示。
* 平板直向開啟、存檔在第 3 關：歡迎回來視窗與旋轉提示；轉成橫向後歡迎回來視窗還開著，地圖重建成 22×13。
* 電腦 1024×768：不是觸控模式，沒有控制鍵，HUD 道具欄照常，地圖畫在整個畫面。`?debug` 顯示資訊與紅、黃框。
* 嵌入版（手機上 355×288 的 iframe）：不顯示旋轉提示，遊戲區域 355×147。
* Playwright（1.63.0，headless Chromium）：`test_touch.js` 在 iPad mini 橫向 1133×744、iPad 第 10 代橫向 1180×820、手機直向 375×812 各 17 項，加上電腦 1280×800 的 3 項，全部通過；`test_spawn.js`、`verify_csp.js`（沒有 console error）、`verify.js`（第 5 關魔王截圖）也都通過。`verify_csp.js` 覆寫的 `public/screenshot.png` 已還原成原本的分享圖。
    * 本專案沒有自己的 `node_modules`；這次借用 `C:\GitHub\readbible` 已安裝的 Playwright（PowerShell：`$env:NODE_PATH = 'C:\GitHub\readbible\node_modules'`），沒有另外安裝。
    * 2026-10-26 起這些測試搬到 `tools/browser/`（`test_touch.js` 改寫成 `touch.spec.js`，見第 9 節）。
* **尚未在 iPad mini 實機上驗證**，畫面下半部被截斷的原因也還沒確認（見 8.1）。

## 5. 開發工具（`system_architecture.md` 第 9 節）

### 5.1 2026-10-26：測試檔搬到 `tools/`

| 原本 | 現在 |
|---|---|
| `private/test_spawn.js` | `tools/browser/spawn.spec.js` |
| `private/verify_csp.js` | 檢查：`tools/browser/csp.spec.js`；覆寫分享圖：`tools/browser/og-image.js` |
| `private/verify.js`（8000 埠） | `tools/browser/boss.spec.js`；截圖改存 `tools/work/boss_level.png`（不進 git） |
| `private/test_touch.js` | `tools/browser/touch.spec.js` |
| 根目錄 `package.json`、`package-lock.json`（playwright 1.59.1，從來沒有安裝過） | `tools/package.json`、`tools/package-lock.json`（`@playwright/test` 1.63.0） |
| `private/boss_level.png`、`server.log`、`test-results/` | 刪除（測試產物）。`.gitignore` 加上 `*.log`、`test-results/`、`tools/node_modules/`、`tools/work/`、`.claude/launch.json` 等 |

`private/` 只剩設計文件與 `iframe.txt`。

`private/` 只剩設計文件與 `iframe.txt`。

### 5.2 2026-10-26：瀏覽器測試的驗證

2026-10-26，`tools/node_modules/` 的 `@playwright/test` 1.63.0（headless Chromium，8 個 worker 平行執行）：
* `npm --prefix tools test` 共 25 項：spawn、csp、boss 各 1 項，touch 22 項（3 種觸控裝置各 7 項，加上電腦 1 項）。
* 第一次執行 24 項通過、1 項失敗：iPad 第 10 代的「斜走碰到牆會沿著牆滑動」原本先拉 200ms 讓角色走到牆邊，平行執行時畫面更新次數不夠，角色還沒碰到牆。改成用 `isWallCollision()` 直接把角色貼到牆下，不靠等待時間。這是測試寫法的問題，遊戲本身沒有改。
* 修正後以 `--repeat-each=3` 執行 75 項全部通過（38.8 秒）；「沿著牆滑動」單獨重複 5 次（15 項）也全部通過。
* 測試前後 `public/` 所有檔案的 hash 相同，瀏覽器測試沒有改到網站檔案。
* `og-image` 產生 1280×720 的第 1 關畫面；驗證完已把 `public/screenshot.png` 還原成原本的分享圖。
* `boss.spec.js` 的截圖在 `tools/work/boss_level.png`。git 確認 `tools/node_modules/`、`tools/work/`、`.claude/launch.json` 被忽略，`tools/package.json`、`tools/package-lock.json`、`.npmrc`、設定檔與 spec 檔會進 git。

### 5.3 2026-11-01、2026-11-13：`tools/sprites.py` 的驗證

* 驗證（2026-11-01 騎士、2026-11-13 牧師）：
    * 騎士（`knight`）：從 `Pal_test.png` 自動切出 20 格，取前 8 格；頭部水平晃動 idle 0px、run 1px（畫面上）；精靈圖 512×256、64 色、12.8 KB。處理約 1.6 秒，`--check` 一致。
    * 牧師（`cleric`）：由兩張 16:9 綠幕原圖 `cleric_idle_v01.png`（1376×768）與 `cleric_run_v04.png`（1376×768）各切出 4 格，依各原圖第 1 格身高（523px 與 407px）獨立計算倍率縮至 96px 高；頭部水平晃動 idle 0.0px、run 0.5px（畫面上）；精靈圖 `public/characters/cleric.png` 512×256、全彩、74.1 KB，`--check` 一致。
    * `python -m unittest discover -s tools/tests -t .` 19 項通過（`test_sprites.py` 17 項 + `test_config.py` 2 項）：包含綠幕內部封閉孔洞自動清除（同時保留灰白背景角色內部白色）、不同原圖獨立縮放倍率、切格順序、對齊、手動偏移、設定檔檢查與 `characters.js` 的讀寫。
    * `npm --prefix tools test` 26 項通過（`character.spec.js` 自動驗證 `CHARACTERS` 內含 `cleric` 與 `knight` 的所有圖片載入與尺寸）。
* 全身圖（2026-11-13）：牧師的定稿圖（1792×2400，背景色 `#06FD0B`）切出 1 格，去邊後角色 911×2088，縮放倍率 0.3238，`public/characters/cleric_full.jpg` 53.4 KB；去邊前有 15,673 個偏綠的像素（法杖、袖口、靴子邊緣看得到綠邊），去邊後 0 個。`python -m unittest discover -s tools/tests -t .` 36 項通過；`npm --prefix tools test` 26 項通過（`character.spec.js` 檢查全身圖載入成功、大小符合 `fullBody`）。

## 6. 協作與流程

### 6.1 2026-11-13：雲端的 Claude Code 第一次改這個 repo

情境：維護者在 claude.ai/code 的雲端工作階段請 Claude Code 加上全身圖。之前 Claude Code 只在維護者的電腦上執行。

* **提交被擋下兩次**。`CLAUDE.md` 寫的是「不要執行 `git add`、`git commit`、`git push`，由維護者檢查 diff 後手動 commit」，這條規則是為維護者的電腦寫的；但雲端的容器是暫時的，維護者看不到裡面的工作目錄，不推送的話變更就消失。`AGENTS.md` 的「Git」其實已經區分本機與雲端，但只舉了 Antigravity 當例子，`CLAUDE.md` 的那一句又沒有分環境。當時改用 patch 檔與附件把變更交給維護者。
    * 現在的做法：`AGENTS.md` 新增「執行環境」，把雲端的 Claude Code 明列為雲端 agent；`CLAUDE.md` 的提醒依環境分開；PR 的步驟寫在「Git 與 PR 流程」。
* **安裝也被擋下**（`npm --prefix tools ci`，同一個原因）。那次沒有安裝，改用環境內建的 Playwright 1.63.0 與 chromium-1243 執行（`NODE_PATH` 指向內建的套件，並在暫存資料夾放一個把 `@playwright/test` 轉到 `playwright/test` 的轉接檔），26 項全部通過。版本剛好跟 `tools/package.json` 寫死的相同才能這樣做。
* **讀不到 Drive**：雲端環境沒有 `reference/`。騎士的原圖 `Pal_test.png` 還在 git 歷史裡（`39075a1:public/Pal_test.png`），可以取回來測試工具；牧師的動畫原圖拿不到，所以加了 `--full-body`，只用維護者在對話中重新附上的那一張定稿就能建置。
* **`--check` 在 Linux 上對騎士報不一致**：重建的 `knight.png` 跟 repo 裡的（在維護者的 Windows 電腦上建置）差 8 個像素（共 131,072 個），`characters.js` 的設定完全相同。原因沒有查明，推測是限制 64 色時的些微差異。那次沒有覆寫 `knight.png`。全身圖的檢查因此改成容許極小的差異；精靈圖還是逐像素比較。
* **`tools/config.py` 的 `display_path()` 在 Linux 上判斷錯誤**：預設的 Drive 位置是 Windows 路徑（`G:\...`），在 Linux 上是相對路徑，解析後落在 repo 底下，被當成 repo 裡的檔案。`test_display_path` 因此在 Linux 上一直失敗。已改成先比對 Drive 再比對 repo。

### 6.2 2026-11-13：把維護者重新傳來的定稿圖當成新的原圖

* **情境**：做全身圖時，Claude Code 回報「這個雲端環境讀不到 Drive 上的牧師原圖」。維護者接著在對話中附上一張圖，說「用這張圖當參考圖」。
* **誤會**：那張圖就是 Drive 上已經核可的牧師定稿圖，維護者只是因為 Claude Code 看不到那個資料夾，才重新傳一次。Claude Code 卻把它當成另外畫的新圖，接連做了這些多餘的事：
    * 取了一個 Drive 上不存在的檔名 `cleric_full_v01.png`，設定檔也指向它。
    * 在 `art_guide.md` 新增種類 `full`、「步驟 5 全身圖」，還寫了一個沒有實測過的提示詞範本。
    * 在 PR 與工作計畫總表請維護者「把這張原圖上傳到 Drive」，並把「每個角色都要另外畫一張全身圖」排進之後的工作。
* **原因**：沒有問那張圖是什麼、對應 Drive 上的哪一個檔案，就照自己的推測做下去。「參考圖」在這個專案指的是 `reference/` 裡的圖，被解讀成「新的參考」。
* **更正**（同一個 PR，合併之前）：全身圖的原圖就是核可的基準立繪，不用另外畫；拿掉種類 `full`、步驟 5 與提示詞範本；設定檔的 `fullBody.source` 改成定稿的檔名。成品 `cleric_full.jpg` 沒有變（同一張圖）。
* **現在的做法**：雲端環境收到維護者附上的圖時，先確認它是 Drive 上的哪一個檔案，還是 Drive 上還沒有的新圖；照 Drive 上的檔名放進 repo 的 `reference/`，不自己取檔名、不新增種類或步驟。寫在 `AGENTS.md`「美術素材」與 `character_pipeline.md` 第 1 節。
* **還沒確認的事**：設定檔填的 `cleric_base_v08.png` 是文件記載的定稿檔名，Claude Code 沒有親眼看到 Drive 上的檔名。待辦在 `work_plan.md` 2.2。

### 6.3 2026-11-13：Google Drive 資料夾同名衝突與跨 Agent 權限邊界

* **情境與現象**：維護者在 Google Drive 的 `Antigravity_Data/cherylgame/` 下發現出現**兩個 `private` 資料夾**。以 `gdrive` CLI 檢查時，Antigravity 只看得到其中一個由它自己於 `2026-11-13T09:03:26Z` 建立的 `private/`（ID `1JnwSZg1hvxHXh10tWDunddQqf3Z0S1o5`，內含過時的 `art_guide.md` v3）；另外一個 `private/`（由本機 Claude Code 放入）以及先前放在 `reference/characters/knight/` 的檔案，在 Antigravity 這端完全看不到。同時維護者確認：Antigravity 建立的 Drive 檔案，Claude Code 即使在本機電腦透過桌機版 Google Drive（`G:\`）也同樣看不到，只有維護者本人看得到。
* **原因**：
    1. **`drive.file` 單向權限盲區**：Antigravity 的 `gdrive` 外掛只有 `drive.file` 權限，只看得到同一個外掛建立與上傳的項目。只要另一方（本機 Claude Code 或維護者）在 `G:\` 建立資料夾或放入檔案，Antigravity 就完全看不到，進而誤判資料夾不存在而重複 `mkdir`。
    2. **Claude Code 無法跨邊界讀取 Drive**：實測無論是雲端工作階段或本機桌機版 `G:\`，Claude Code 都無法存取 Antigravity 建立的 Google Drive 檔案。把 `brief.md`、`log.md` 或 `art_guide.md` 副本放在 Drive，不僅造成兩邊版本落差，也讓 Claude Code 看不到需求單與生圖紀錄。
    3. **Google Drive 是 ID 制而非路徑制**：Drive 允許同一個父資料夾底下存在多個同名或近似名稱的資料夾（各自有不同的 `folderId`），且 `gdrive mutate mkdir` 與 `upload` 都不會阻止同名建立或自動覆寫；僅靠文字路徑名稱認定擺放位置必然產生混淆。
* **現在的做法（已寫回規則與 SOP）**：
    * **文字歸 GitHub、圖片歸 Drive**：Drive 的 `Antigravity_Data/cherylgame/` 只保留 `reference/` 裡的圖片素材；移除 Drive 上的 `private/`（含 `art_guide.md` 副本）與早期測試圖 `female_cleric_concept.png`，並將 `cleric` 的 `log.md` 遷回 repo 的 `private/doc/characters/cleric/log.md`。之後所有 `.md`、`brief.md`、`log.md` 統一在 GitHub repo 維護。
    * **以 Folder ID 登錄表取代名稱定位**：在 `AGENTS.md`「Google Drive 對照資料夾」列出各層級的唯一 `FOLDER_ID`，規定 Antigravity 必須從登記好的 ID 進入、更新檔案改用 `mutate update <FILE_ID>`、建新子資料夾前先 `ls <PARENT_ID>` 並把新 ID 補進登錄表。
    * **維護者本機 `G:\` 唯讀**：維護者不在 `G:\` 手動建資料夾或拖曳放檔（只供自己本機執行工具讀取），需進 Drive 的圖片一律透過對話交給 Antigravity 上傳。
    * **明確寫定 Claude Code 邊界**：在 `AGENTS.md` 與 `character_pipeline.md` 註明 Claude Code（本機與雲端皆然）無法存取 Antigravity 建立的 Drive 檔案，一律以 repo 的 `.md` 與程式碼確認資訊，需要圖片時請維護者直接提供。

