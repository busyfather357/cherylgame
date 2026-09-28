# CherylGame (RPG Math Challenge) 系統架構與設計文件

本文件旨在作為系統最終概念的完整快照，方便未來建立新的 GitHub repo 或由其他 AI Agent（如 Jules）接手時，能快速且精準地掌握這套為木木公主設計、支援 PC 與手機雙平台的 RPG 數學挑戰遊戲的核心邏輯與架構。

## 1. 目錄與檔案結構

專案採用純前端靜態架構，搭配 Playwright 進行自動化測試驗證。

```text
cherylgame/
├── doc/
│   └── system_architecture.md  # 本系統架構與設計文件
├── index.html                  # 主入口文件，包含 HTML 結構、UI 容器與遊戲 Canvas
├── style.css                   # 遊戲樣式表，包含 HUD 狀態欄、虛擬搖桿 (D-Pad) 與數學挑戰彈跳視窗
├── script.js                   # 遊戲主邏輯核心 (地圖生成、物理碰撞、動畫、數學題庫、敵人 AI)
├── Pal_test.png                # 玩家角色精靈圖 (Sprite Sheet)
├── boss_level.png              # 測試產出：Boss 關卡 (Level 5) 畫面截圖
├── screenshot.png              # 測試產出：遊戲主畫面截圖
├── iframe.txt                  # 提供給外部網站嵌入用的 iframe 語法 (限制見第 5 節)
├── README.md                   # 專案基礎說明文件
├── package.json                # Node.js 依賴管理 (定義 Playwright 等測試套件)
├── package-lock.json           # 鎖定 npm 依賴版本
├── .gitignore                  # Git 忽略清單 (排除 node_modules 等)
├── server.log                  # 本地伺服器存取日誌紀錄
├── test_spawn.js               # Playwright 測試：驗證寶箱 (1個) 與怪物生成數量是否正確
├── verify.js                   # Playwright 測試：自動觸發 Level 5 Boss 關卡並截圖驗證
├── verify_csp.js               # Playwright 測試：驗證 CSP (內容安全策略) 與網頁載入有無 Console Error
└── test-results/               # 測試結果目錄
    └── .last-run.json
```

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
    * **答錯**：扣除 1 顆愛心 (HP)，觸發物理擊退效果 (Knockback)，強制玩家往後退一段距離避免連續碰撞。若 HP 歸零則觸發 Game Over 並重置進度（存檔機制實作後改為可從關卡起點重來，見 4.5）。

## 3. UI/UX 介面設計 (style.css & index.html)

* **HUD 狀態列**：位於畫面上方，顯示當前血量 (❤️)、關卡層數 (Level) 與分數 (Score)，使用文字陰影提升在各種底色下的可讀性。
* **Mobile-First 控制區**：透過 CSS 媒體查詢 `@media (hover: none) and (pointer: coarse)` 自動判斷裝置。若為觸控螢幕，則顯示左下角 D-Pad 與右下角 Action 按鈕。
* **數學題庫彈窗**：使用絕對定位覆蓋於 Canvas 之上，採防呆設計（`isAnswering` 狀態鎖），防止玩家連點造成重複計分或錯誤判定。

## 4. 存檔機制 (Save System)【規劃中，尚未實作】

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

### 4.4 程式整合點 (script.js)
* **寫入 `saveProgress()`**：放在 `startLevel()` 內。這一個位置就涵蓋所有呼叫端：
    * 初次啟動（檔案中第一次呼叫 `startLevel()`）
    * 過關（`update()` 中 `allCleared` 分支，`level += 1` 後）
    * Play Again／從頭開始（`resetGame()`）
    * 視窗縮放重建地圖（`handleResize()`）：只在本關尚未觸發題目時發生，數值與上次存檔相同，重存無害。
* **讀取 `loadProgress()`**：在檔案中**第一次呼叫 `startLevel()` 之前**，把存檔寫回 `gameState`。魔王關判斷（`spawnEnemies()` 的 `level % 5`）與地板配色（`drawWorld()`）才會一開始就用正確的關卡數。
* **UI 時序限制**：「歡迎回來」視窗與 `updateHUD()` 必須放在檔案最末端 HUD 初始化之後才執行。`hpDisplayCache`、`isAnswering` 等變數以 `let` 宣告在檔案中段，第一次 `startLevel()` 執行時它們還不能使用（TDZ），提早呼叫 `updateHUD()`／`updateHintButton()` 會丟出 `ReferenceError`，遊戲直接停止。
* 預估改動：`script.js` 約 60～80 行，不需新增檔案或改動架構。

### 4.5 玩家流程 (UX)
* **開場**：
    * 沒有存檔，或存檔在第 1 關 → 維持現狀，直接開始遊戲。
    * 存檔在第 2 關以上 → 暫停遊戲，借用數學題視窗（與 `showGameOver()` 相同做法）顯示「歡迎回來！」，提供兩個按鈕：「繼續第 N 關」、「從頭開始」（呼叫 `resetGame()`）。
* **Game Over**：**不清除存檔**。Game Over 視窗提供「從第 N 關重來」與「從頭開始」兩個按鈕（N = 1 時只顯示原本的 Play Again）。
    * 新增 `restartFromCheckpoint()`：讀回存檔 → 清除道具計時 → `startLevel()` → `resumeGame()`。
    * 理由：本遊戲以兒童練習數學為目的，從關卡起點重來比整個歸零的挫折感低。
* **已知取捨**：關卡中途重新整理頁面，會回到該關起點，HP 也回到進關時的數值。對兒童遊戲可接受，不另外防範。
* **開發測試用**：網址加上 `?newgame` 時，忽略並清除存檔。Playwright 測試每次都使用全新的瀏覽器環境，不受存檔影響。

### 4.6 驗證方式
* 直接開啟：玩到第 2 關以上 → 重新整理 → 出現「歡迎回來」並能回到同一關，分數、HP、道具一致。
* 在 `sandbox="allow-scripts"` 的 iframe 中開啟：遊戲能正常啟動、Console 沒有未攔截的例外（存檔功能停用）。
* 手動把 `localStorage` 內容改成亂碼或不合法的數值 → 遊戲視為無存檔、正常從第 1 關開始。

### 4.7 存檔的限制
* 存檔只存在「該瀏覽器 + 該網址來源 (origin)」。換裝置、換瀏覽器、無痕模式都不會帶過去。
* `https://busyfather357.github.io/cherylgame/` 與 `https://mathrpg.mumuisland.com/` 是兩個獨立來源（2026-09-25 實測 github.io 直接回應 200，不會轉址到專屬網域），兩邊的存檔互不相通。
* iOS Safari：若 7 天內沒有造訪本網站，可能會清除 `localStorage`（加到主畫面的 Web App 不受此限）。

## 5. iframe 嵌入 (iframe.txt) 與限制

### 5.1 現行語法
```html
<iframe
  src="https://busyfather357.github.io/cherylgame/"
  style="width:100%; height:288px; border:0;"
  scrolling="no"
  sandbox="allow-scripts">
</iframe>
```

### 5.2 問題點（2026-09-25 以 Chrome 實測）
`sandbox="allow-scripts"` 沒有搭配 `allow-same-origin`，瀏覽器會把 iframe 裡的遊戲當成「沒有來源」的頁面（`self.origin === "null"`），即使網址就是遊戲自己的網域。這跟放在哪個網域無關，只要用這段語法嵌入就會發生：
1. **無法存檔**：讀取 `window.localStorage` 直接丟出 `SecurityError`（訊息：*The document is sandboxed and lacks the 'allow-same-origin' flag*）。若沒有依 4.3 包 `try/catch`，整個遊戲會無法啟動。
2. **現存 bug — 角色去背失效，出現白框**：對「沒有來源」的頁面來說，`Pal_test.png` 屬於跨來源圖片；畫到 canvas 後 canvas 被標記為 tainted，`getImageData` 丟出 `SecurityError`，程式進入 fallback 直接使用未去背的原圖。直接開網址時正常，只有嵌入版會出現白框。
3. **src 指向 github.io 而非專屬網域**：嵌入版與直連版的存檔、Google Analytics 數據分散在兩個網域。
4. **高度 288px 太小**：地圖只有 5 列（上下是牆，可走 3 列），HUD 會蓋住最上排；答題視窗超出 iframe 高度，標題與答題回饋文字被裁切。

### 5.3 建議語法
```html
<iframe
  src="https://mathrpg.mumuisland.com/"
  style="width:100%; height:288px; border:0;"
  scrolling="no"
  sandbox="allow-scripts allow-same-origin">
</iframe>
```
* 加上 `allow-same-origin` 後，存檔與角色去背都恢復正常（已實測）。
* **安全性**：Chrome 會對 `allow-scripts` + `allow-same-origin` 顯示警告（*can escape its sandboxing*）。這只在「遊戲頁面與外層頁面同源」時成立，因為此時遊戲可以經由 `parent.document` 移除自己的 `sandbox` 屬性。只要外層頁面不是 `mathrpg.mumuisland.com` 本身（例如 `www.mumuisland.com` 或其他人的部落格），瀏覽器的同源政策會阻止遊戲碰觸外層頁面；sandbox 其餘的限制（禁止把外層頁面導走、禁止彈出視窗、禁止送出表單）照樣有效。**規則：不要把這段 iframe 放在 `mathrpg.mumuisland.com` 自己的頁面裡。**
* 高度建議另外調整（至少讓答題視窗完整顯示），屬於版面問題，與存檔無關。

### 5.4 加上 `allow-same-origin` 後的存檔行為
以 `localhost` / `127.0.0.1` 模擬同站與跨站嵌入，於 Chrome 實測：

| 玩家開啟方式 | 存檔 | 與直連版共用存檔 |
|---|---|---|
| 直接開 `mathrpg.mumuisland.com` | 正常 | — |
| 嵌在自家網站（`*.mumuisland.com`，同站） | 正常 | 是 |
| 嵌在別人的網站（跨站） | 正常 | 否。瀏覽器依外層網站分開存放，每個網站各一份；Safari 的限制可能更嚴格 |
| 維持現行 `sandbox="allow-scripts"` | 無法存檔（依 4.3 自動停用） | — |