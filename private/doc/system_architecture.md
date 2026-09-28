# CherylGame (RPG Math Challenge) 系統架構與設計文件

本文件旨在作為系統最終概念的完整快照，方便未來建立新的 GitHub repo 或由其他 AI Agent（如 Jules）接手時，能快速且精準地掌握這套為木木公主設計、支援 PC 與手機雙平台的 RPG 數學挑戰遊戲的核心邏輯與架構。

## 1. 目錄與檔案結構

專案採用純前端靜態架構，搭配 Playwright 進行自動化測試驗證。網站以 Cloudflare Pages 部署到 `https://mathrpg.mumuisland.com/`，部署資料夾為 `public/`；其餘檔案不會出現在網站上。

```text
cherylgame/
├── public/                     # 部署資料夾：只放網站需要的檔案
│   ├── index.html              # 主入口文件，包含 HTML 結構、UI 容器與遊戲 Canvas
│   ├── style.css               # 遊戲樣式表，包含 HUD 狀態欄、虛擬搖桿 (D-Pad) 與數學挑戰彈跳視窗
│   ├── script.js               # 遊戲主邏輯核心 (地圖生成、物理碰撞、動畫、數學題庫、敵人 AI)
│   ├── Pal_test.png            # 玩家角色精靈圖 (Sprite Sheet)
│   └── screenshot.png          # 社群分享預覽圖 (og:image)，由 private/verify_csp.js 產生
├── private/                    # 不部署：測試腳本與網站以外的檔案
│   ├── test_spawn.js           # Playwright 測試：驗證寶箱 (1個) 與怪物生成數量是否正確
│   ├── verify.js               # Playwright 測試：自動觸發 Level 5 Boss 關卡並截圖驗證
│   ├── verify_csp.js           # Playwright 測試：驗證 CSP (內容安全策略) 與網頁載入有無 Console Error
│   ├── boss_level.png          # 測試產出：Boss 關卡 (Level 5) 畫面截圖
│   ├── iframe.txt              # 提供給外部網站嵌入用的 iframe 語法 (限制見第 5 節)
│   └── doc/
│       ├── system_architecture.md  # 本系統架構與設計文件
│       └── item_system.md          # 道具系統設計文件
├── AGENTS.md                   # 給 AI Agent 的工作指引 (執行方式、程式慣例、注意事項)
├── README.md                   # 專案基礎說明文件
├── package.json                # Node.js 依賴管理 (定義 Playwright 等測試套件)
├── package-lock.json           # 鎖定 npm 依賴版本
├── .gitignore                  # Git 忽略清單 (排除 node_modules 等)
├── server.log                  # 本地伺服器存取日誌紀錄
└── test-results/               # 測試結果目錄
    └── .last-run.json
```

* **本機測試**：測試腳本連到 `localhost`，本機伺服器必須以 `public/` 為根目錄，例如 `python -m http.server 8080 --directory public`（`verify.js` 連的是 8000 埠）。

## 2. 核心系統架構 (script.js)

遊戲核心為基於 `requestAnimationFrame` 的自定義 Game Loop，不依賴大型遊戲引擎，確保極致的輕量化與靈活性。

### 2.1 畫面與渲染 (Canvas Rendering)
* **響應式畫布**：監聽 `resize` 與 `orientationchange` 事件，動態調整 Canvas 寬高，並支援高解析度螢幕 (DPR) 確保畫質清晰。
* **動態去背處理**：為了完美融合地圖底色（解決人物顯示白框的問題），系統使用 `Offscreen Canvas` 在背景載入 `Pal_test.png` 時，動態讀取像素資料 (ImageData)，將接近白色的網格背景 Alpha 值設為 0，實現自動去背。
* **Emoji 向量渲染**：將地圖物件 (🌲, 🌊, 🧱) 與敵人 (👾, 🐉, 🎁) 等 Emoji 透過 SVG 包裝並轉換為 Image 物件快取，確保在 Canvas 縮放時保持向量圖的清晰度。

### 2.2 關卡與地圖生成 (Map Generation)
* **網格系統 (Grid System)**：地圖切分為 `50x50` (TILE_SIZE) 的網格。
* **隨機與連通性**：中心點 3x3 區域保證為安全出生點。周圍隨機生成障礙物 (機率 15%)。生成後會執行 **BFS (廣度優先搜尋)** 演算法驗證地圖連通性 (Check Map Connectivity)，若有死胡同或無法到達的區域則重新生成，確保玩家絕對有路可走。
* **關卡變化**：地板顏色與障礙物外觀會隨 Level 變化（例如 Level 1 為草地森林，Level 2 為沙灘水域，Level 3 以上為深色地牢）。

### 2.3 實體與 AI (Entities & AI)
* **玩家控制**：
    * PC 端支援鍵盤 (WASD / 方向鍵)。
    * 手機端支援螢幕虛擬搖桿 (Touch Events)，利用 CSS `touch-action: none` 防止畫面滑動。
    * 自動偵測移動狀態來切換 Idle (待機) 與 Run (跑步) 的精靈圖動畫。
* **怪物 (Monsters)**：每關隨機生成，具備基礎的隨機方向反彈移動邏輯，並會微調速度方向。
* **魔王 (Boss)**：每 5 關 (Level 5, 10...) 出現。移動速度較快，且具備**追蹤射擊能力**。每隔 5 秒會鎖定玩家當前位置計算向量，發射火球 (🔥) 子彈。Boss 需要答對 5 次數學題才能擊敗。

### 2.4 碰撞與戰鬥觸發 (Collision)
* 採用 **AABB (Axis-Aligned Bounding Box)** 碰撞偵測機制。
* 玩家碰撞範圍經過縮小與置中微調，使操作手感更自然。
* 當玩家與怪物、Boss 或子彈發生重疊時，觸發 `gameState.paused = true` 暫停 Game Loop，並彈出數學挑戰視窗。

### 2.5 數學挑戰模組 (Math Challenge)
* 根據隨機運算子 (`+`, `-`, `*`) 動態生成題目：
    * 加法：10~59 的雙位數加法。
    * 減法：確保結果為正數的減法。
    * 乘法：九九乘法表範圍 (1~9)。
* **選項生成**：產生 1 個正確答案與 3 個隨機干擾選項，並洗牌打亂順序。
* **獎懲機制**：
    * **答對**：加 10 分，消滅該怪物（若是 Boss 則扣除其生命值並將其隨機傳送）。恢復遊戲。
    * **答錯**：扣除 1 顆愛心 (HP)，觸發物理擊退效果 (Knockback)，強制玩家往後退一段距離避免連續碰撞。若 HP 歸零則觸發 Game Over；第 2 關以後可選擇從本關起點重來或從頭開始（見 4.5）。

## 3. UI/UX 介面設計 (style.css & index.html)

* **HUD 狀態列**：位於畫面上方，顯示當前血量 (❤️)、關卡層數 (Level) 與分數 (Score)，使用文字陰影提升在各種底色下的可讀性。
* **Mobile-First 控制區**：透過 CSS 媒體查詢 `@media (hover: none) and (pointer: coarse)` 自動判斷裝置。若為觸控螢幕，則顯示左下角 D-Pad 與右下角 Action 按鈕。
* **數學題庫彈窗**：使用絕對定位覆蓋於 Canvas 之上，採防呆設計（`isAnswering` 狀態鎖），防止玩家連點造成重複計分或錯誤判定。同一個視窗也用來顯示 Game Over 與「歡迎回來」選單（見 4.5）。

## 4. 存檔機制 (Save System)

2026-09-28 實作於 `public/script.js` 的「存檔」區段（位於 `startLevel()` 之前）。

### 4.1 方案：關卡起點存檔 (Checkpoint)
* 每次**進入新關卡**時，把當下的 `level`、`score`、`hp`、`inventory` 寫入瀏覽器的 `localStorage`。
* 重新整理或下次開啟時，從該關**開頭**繼續；地圖與敵人照常重新隨機生成。
* 不採「完整快照」（連地圖、敵人位置、子彈、道具計時都存）：需要重建圖片物件、換算計時器、處理答題中的狀態，程式量約三倍且容易出錯；而且地圖大小依當時視窗決定，換裝置或旋轉手機後讀回會比例失調。
* **一致性原則**：存檔必須是「同一時間點」的完整狀態。不可以每答一題就存分數與道具，但讀檔時又重生整關的敵人，否則寶箱會重生，玩家可靠重新整理無限刷道具。

### 4.2 存檔欄位
| `gameState` 欄位 | 是否存檔 | 原因 |
|---|---|---|
| `level`、`score`、`hp`、`inventory` | 存 | 玩家進度本體 |
| `map`、`enemies`、`bullets`、`x`/`y`、`bossHitsNeeded` | 不存 | 每關本來就隨機生成，進關時由 `startLevel()` 重建 |
| `speedBoostUntil`、`invincibleUntil`、`graceUntil`、`lastFrameTime`、`lastUpdateTime` | 不存 | 以 `performance.now()` 為基準，頁面重新載入後從 0 起算，舊值無意義；道具效果只有 5 秒，進新關時直接清除 |
| `enemies[].spriteImg` | 不存 | `Image` 物件，轉 JSON 會變成 `{}` |
| `paused`、`currentChallengeType`、`currentEnemyIndex`、`challengeSource`、`hintUsed`、`gameOver`、`levelTouched` | 不存 | 答題與畫面的暫態；題目內容存在 DOM 與按鈕 closure 中，不在 `gameState` |

### 4.3 資料格式與讀取驗證
* `localStorage` key：`cherylgame.save`，內容：
    ```json
    { "v": 1, "level": 7, "score": 320, "hp": 2, "inventory": { "potion": 1, "boots": 0, "scroll": 2, "shield": 0 } }
    ```
* 讀取時逐項驗證，任何一項不合格就視為「沒有存檔」：
    * `JSON.parse` 失敗或 `v` 不符 → 無存檔。
    * `level` 必須是正整數；`score` 必須是非負整數。
    * `hp` 必須是整數，限制在 `1`～`MAX_HP`（`hp <= 0` 視為無效）。
    * `inventory` 以預設值 `{ potion: 0, boots: 0, scroll: 0, shield: 0 }` 為底，只合併已知道具、非負整數的欄位；將來新增道具時，舊存檔不會壞掉。
* **所有 `localStorage` 存取都必須包在 `try/catch` 裡。** 在 sandbox iframe 中，連讀取 `window.localStorage` 這個屬性都會丟出 `SecurityError`（見第 5 節）；`script.js` 在最外層直接執行，沒有攔截的話整個遊戲會無法啟動。失敗時靜默退化為「不存檔」模式，遊戲照常進行。

### 4.4 程式結構 (public/script.js)
| 名稱 | 作用 |
|---|---|
| `ITEM_TYPES`、`SAVE_KEY`、`SAVE_VERSION` | 檔案開頭的常數。`ITEM_TYPES` 同時用於空道具欄、存檔驗證與寶箱掉落，新增道具只需改這裡 |
| `checkpoint` | 記憶體中「最近一次進關時」的進度。`localStorage` 無法使用時（例如 sandbox iframe），Game Over 仍能用它從本關重來 |
| `saveProgress()` | 更新 `checkpoint` 並寫入 `localStorage`。只在 `startLevel()` 內呼叫 |
| `loadProgress()` | 處理 `?newgame`，讀取並套用存檔。在檔案中第一次呼叫 `startLevel()` 之前執行 |
| `readSave()`、`parseSave()`、`clearSave()` | `localStorage` 存取（全部包 `try/catch`）與 4.3 的驗證規則 |
| `applyProgress()` | 把進度寫回 `gameState`，道具欄會複製一份，避免遊戲中修改到 `checkpoint` |
| `restartFrom(progress)` | 從指定進度重新開始一關：套用進度 → 清除道具計時 → `startLevel()` → `resumeGame()`。`resetGame()` 與「從本關重來」共用 |
| `showWelcomeBack()`、`showMenuButtons()` | 借用數學題視窗顯示選單；`showGameOver()` 也改用 `showMenuButtons()` |

* **寫入時機**：`saveProgress()` 放在 `startLevel()` 內，這一個位置就涵蓋所有呼叫端：
    * 初次啟動（檔案中第一次呼叫 `startLevel()`）
    * 過關（`update()` 中 `allCleared` 分支，`level += 1` 後）
    * 從頭開始／從本關重來（`restartFrom()`）
    * 視窗縮放重建地圖（`handleResize()`）：只在本關尚未觸發題目時發生，數值與上次存檔相同，重存無害。
* **讀取時機**：`loadProgress()` 必須在第一次 `startLevel()` 之前，魔王關判斷（`spawnEnemies()` 的 `level % 5`）與地板配色（`drawWorld()`）才會一開始就用正確的關卡數。
* **UI 時序限制**：`showWelcomeBack()` 放在檔案最末端 `updateHUD()` 初始化之後。`hpDisplayCache`、`isAnswering` 等變數以 `let` 宣告在檔案中段，第一次 `startLevel()` 執行時它們還不能使用（TDZ），提早呼叫 `updateHUD()`／`updateHintButton()` 會丟出 `ReferenceError`，遊戲直接停止。同理，`checkpoint` 必須宣告在第一次 `startLevel()` 之前。

### 4.5 玩家流程 (UX)
* **開場**：
    * 沒有存檔，或存檔在第 1 關 → 維持原樣，直接開始遊戲（第 1 關的存檔必定是 0 分、滿血、無道具，等同新遊戲）。
    * 存檔在第 2 關以上 → 暫停遊戲，顯示「Welcome Back! / Level N」與兩個按鈕：`Continue ▶️`（`resumeGame()`）、`New Game 🔄`（`resetGame()`）。
    * 歡迎視窗沒有題目，所以會停用提示卷軸（設 `hintUsed = true`，下次出題時重設），避免按鍵 3 把選單按鈕當成錯誤答案隱藏。
* **Game Over**：**不清除存檔**。
    * 第 2 關以上：顯示 `Retry Level N 🔁`（`restartFrom(checkpoint)`）與 `New Game 🔄`。
    * 第 1 關：只顯示原本的 `Play Again 🔄`。
    * 理由：本遊戲以兒童練習數學為目的，從關卡起點重來比整個歸零的挫折感低。
* **已知取捨**：
    * 關卡中途重新整理頁面，會回到該關起點，HP 也回到進關時的數值。對兒童遊戲可接受，不另外防範。
    * 從本關重來時，HP 是進關時的數值；若進關時只剩 1 顆心，重來也只有 1 顆心。
* **開發測試用**：網址加上 `?newgame` 時，忽略並清除存檔。Playwright 測試每次都使用全新的瀏覽器環境，不受存檔影響。
* 選單文字沿用現有 UI 的英文風格（Math Challenge!、Game Over、Play Again）。

### 4.6 驗證方式
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

### 4.7 存檔的限制
* 存檔只存在「該瀏覽器 + 該網址來源 (origin)」。換裝置、換瀏覽器、無痕模式都不會帶過去。
* 正式網址只有 `https://mathrpg.mumuisland.com/`（Cloudflare Pages）。舊的 `https://busyfather357.github.io/cherylgame/` 將關閉，不需考慮兩個網域之間的存檔同步。
* iOS Safari：若 7 天內沒有造訪本網站，可能會清除 `localStorage`（加到主畫面的 Web App 不受此限）。

## 5. iframe 嵌入 (private/iframe.txt) 與限制

### 5.1 現行語法（2026-09-28 起）
```html
<iframe
  src="https://mathrpg.mumuisland.com/"
  style="width:100%; height:288px; border:0;"
  scrolling="no"
  sandbox="allow-scripts allow-same-origin">
</iframe>
```
* **安全性**：Chrome 會對 `allow-scripts` + `allow-same-origin` 顯示警告（*can escape its sandboxing*）。這只在「遊戲頁面與外層頁面同源」時成立，因為此時遊戲可以經由 `parent.document` 移除自己的 `sandbox` 屬性。只要外層頁面不是 `mathrpg.mumuisland.com` 本身（例如 `www.mumuisland.com` 或其他人的部落格），瀏覽器的同源政策會阻止遊戲碰觸外層頁面；sandbox 其餘的限制（禁止把外層頁面導走、禁止彈出視窗、禁止送出表單）照樣有效。**規則：不要把這段 iframe 放在 `mathrpg.mumuisland.com` 自己的頁面裡。**
* 已經貼在其他網站上的舊語法不會自動更新，需要到各網站手動換成新語法。

### 5.2 舊語法 `sandbox="allow-scripts"` 的問題（2026-09-25 以 Chrome 實測）
舊語法沒有搭配 `allow-same-origin`，瀏覽器會把 iframe 裡的遊戲當成「沒有來源」的頁面（`self.origin === "null"`），即使網址就是遊戲自己的網域。這跟放在哪個網域無關，只要用舊語法嵌入就會發生：
1. **（2026-09-28 已修正）無法存檔**：讀取 `window.localStorage` 直接丟出 `SecurityError`（訊息：*The document is sandboxed and lacks the 'allow-same-origin' flag*）。存檔程式已依 4.3 全部包 `try/catch`，所以仍使用舊語法的網站也能正常啟動遊戲，只是關掉頁面後進度不會保留。
2. **（2026-09-28 已修正）角色去背失效，出現白框**：對「沒有來源」的頁面來說，`Pal_test.png` 屬於跨來源圖片；畫到 canvas 後 canvas 被標記為 tainted，`getImageData` 丟出 `SecurityError`，程式進入 fallback 直接使用未去背的原圖。
3. **（2026-09-28 已修正）src 指向 github.io 而非專屬網域**：嵌入版與直連版的存檔、Google Analytics 數據分散在兩個網域。已改為 `https://mathrpg.mumuisland.com/`。

### 5.3 尚未處理：高度 288px 太小
地圖只有 5 列（上下是牆，可走 3 列），HUD 會蓋住最上排；答題視窗超出 iframe 高度，標題與答題回饋文字被裁切。屬於版面問題，與存檔無關。

### 5.4 各種開啟方式的存檔行為
以 `localhost` / `127.0.0.1` 模擬同站與跨站嵌入，於 Chrome 實測：

| 玩家開啟方式 | 存檔 | 與直連版共用存檔 |
|---|---|---|
| 直接開 `mathrpg.mumuisland.com` | 正常 | — |
| 以現行語法嵌在自家網站（`*.mumuisland.com`，同站） | 正常 | 是 |
| 以現行語法嵌在別人的網站（跨站） | 正常 | 否。瀏覽器依外層網站分開存放，每個網站各一份；Safari 的限制可能更嚴格 |
| 仍使用舊語法 `sandbox="allow-scripts"` 的網站 | 無法保留（自動停用）；同一次遊玩中 Game Over 仍可從本關重來 | — |