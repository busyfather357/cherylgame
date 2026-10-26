# CherylGame (RPG Math Challenge) 系統架構與設計文件

本文件旨在作為系統最終概念的完整快照，方便未來建立新的 GitHub repo 或由其他 AI Agent（如 Jules）接手時，能快速且精準地掌握這套為木木公主設計、支援 PC 與手機雙平台的 RPG 數學挑戰遊戲的核心邏輯與架構。

## 1. 目錄與檔案結構

專案採用純前端靜態架構，搭配 Playwright 進行自動化測試驗證。網站以 Cloudflare Pages 部署到 `https://mathrpg.mumuisland.com/`，部署資料夾為 `public/`；其餘檔案不會出現在網站上。

```text
cherylgame/
├── public/                     # 部署資料夾：只放網站需要的檔案
│   ├── index.html              # 主入口文件，包含 HTML 結構、UI 容器與遊戲 Canvas
│   ├── style.css               # 遊戲樣式表，包含 HUD 狀態欄、觸控搖桿與道具按鈕、數學挑戰彈跳視窗與商店
│   ├── script.js               # 遊戲主邏輯核心 (地圖生成、物理碰撞、動畫、出題與答題、道具、選單、主迴圈)
│   ├── js/                     # 依系統拆開的檔案 (見第 6、7 節)，在 script.js 之前載入
│   │   ├── experience.js       # 經驗值與角色等級
│   │   ├── currency.js         # 金幣與鑽石
│   │   ├── achievements.js     # 答題統計與成就
│   │   ├── shop.js             # 商店
│   │   ├── save.js             # 存檔 (見第 4 節)
│   │   ├── questions.js        # 數學題目與錯誤選項 (見 7.4)
│   │   ├── stages.js           # 章節、主題與每關數值 (見 7.1)
│   │   ├── enemies.js          # 怪物、寶箱、魔王的建立、移動、攻擊與繪製 (見 7.2、7.3)
│   │   └── touch.js            # 觸控操作：浮動搖桿、道具按鈕、畫面方向、遊戲區域、?debug (見第 8 節)
│   ├── Pal_test.png            # 玩家角色精靈圖 (Sprite Sheet)
│   ├── shop_bg.webp            # 商店背景圖 (見第 3 節)
│   └── screenshot.png          # 社群分享預覽圖 (og:image)，由 tools/browser/og-image.js 產生
├── tools/                      # 不部署：本機開發工具 (見第 9 節)
│   ├── package.json            # 只有 @playwright/test 1.63.0 (版本寫死)
│   ├── package-lock.json       # 進 git；npm --prefix tools ci 照這份安裝
│   ├── .npmrc                  # save-exact=true
│   ├── playwright.config.js    # 瀏覽器測試設定：輸出到 tools/work/playwright/
│   ├── browser/
│   │   ├── site.js             # 共用：routeSite() 從硬碟提供 public/ (不用伺服器、不連網)、watchErrors()
│   │   ├── spawn.spec.js       # 第 1 關恰好 1 個寶箱，其餘是怪物
│   │   ├── csp.spec.js         # 開啟遊戲時沒有 console error (包含 CSP 擋下的資源)
│   │   ├── boss.spec.js        # 第 5 關是火龍魔王關，截圖到 tools/work/boss_level.png
│   │   ├── touch.spec.js       # 觸控搖桿、道具按鈕、遊戲區域與畫面方向 (見 8.6)
│   │   └── og-image.js         # 更新 public/screenshot.png (唯一會改 public/ 的工具)
│   ├── node_modules/           # 不進 git
│   └── work/                   # 不進 git：截圖、測試報告、失敗紀錄
├── private/                    # 不部署：設計文件與網站以外的檔案
│   ├── iframe.txt              # 提供給外部網站嵌入用的 iframe 語法 (限制見第 5 節)
│   └── doc/
│       ├── system_architecture.md  # 本系統架構與設計文件
│       └── item_system.md          # 道具系統設計文件
├── AGENTS.md                   # 給 AI Agent 的工作指引 (執行方式、程式慣例、開發工具、Git 規則)
├── CLAUDE.md                   # 指向 AGENTS.md，並提醒 Claude Code 不改 git 狀態、不自行安裝
├── README.md                   # 專案基礎說明文件
└── .gitignore                  # Git 忽略清單 (node_modules、tools/work/、本機設定等)
```

* **手動試玩**：本機伺服器必須以 `public/` 為根目錄，例如 `python -m http.server 8080 --directory public`。瀏覽器測試不需要伺服器（見第 9 節）。

## 2. 核心系統架構 (script.js)

遊戲核心為基於 `requestAnimationFrame` 的自定義 Game Loop，不依賴大型遊戲引擎，確保極致的輕量化與靈活性。

* **檔案拆分與載入順序**：所有 `.js` 都是 classic script，頂層宣告是全域、可跨檔案使用 (測試以 `page.evaluate` 直接存取)。`index.html` 依序載入 `js/experience.js` → `currency.js` → `achievements.js` → `shop.js` → `save.js` → `questions.js` → `stages.js` → `enemies.js` → `touch.js` → `script.js`。
    * `script.js` 最後載入，因為它一執行就會讀檔 (`loadProgress()`) 並開始第 1 關；系統檔案在載入時只定義常數與函式，不呼叫 `script.js`。
    * 系統檔案的**頂層**也不能用到 `script.js` 的常數（例如 `enemies.js` 不能寫 `const RANGE = 4 * TILE_SIZE`，載入時 `TILE_SIZE` 還不存在），所以距離直接寫像素；函式裡面可以用。
    * `achievements.js` 必須在 `save.js` 之前：`save.js` 載入時就用 `createEmptyStats()` 建立預設的 `profile`。
    * 每個系統檔案開頭都註明它用到其他檔案的哪些變數與函式。

### 2.1 畫面與渲染 (Canvas Rendering)
* **響應式畫布**：監聽 `resize`、`orientationchange` 與 `visualViewport` 的 `resize` 事件，動態調整 Canvas 寬高，並支援高解析度螢幕 (DPR) 確保畫質清晰。
    * 畫面大小只取一個來源：`getViewportSize()` 用 `visualViewport`（實際看得到的範圍，沒有時退回 `innerWidth/innerHeight`），畫布與 `<body>` 都設成這個大小；HUD、控制鍵、視窗都以 `<body>` 定位（`position: relative`），不會因為瀏覽器回報的高度不一致而跑到畫面外（見 8.1）。
    * 地圖格數依整個畫面決定；繪製時等比縮放並置中到「遊戲區域」`getPlayArea()`：觸控模式扣掉 HUD 與道具按鈕（見 8.3），其他情況是整個畫面。
* **動態去背處理**：為了完美融合地圖底色（解決人物顯示白框的問題），系統使用 `Offscreen Canvas` 在背景載入 `Pal_test.png` 時，動態讀取像素資料 (ImageData)，將接近白色的網格背景 Alpha 值設為 0，實現自動去背。
* **Emoji 向量渲染**：將地圖物件 (🌲, 🌊, 🧱) 與敵人 (👾, 🐉, 🎁) 等 Emoji 透過 SVG 包裝並轉換為 Image 物件快取，確保在 Canvas 縮放時保持向量圖的清晰度。

### 2.2 關卡與地圖生成 (Map Generation)
* **網格系統 (Grid System)**：地圖切分為 `50x50` (TILE_SIZE) 的網格。
* **隨機與連通性**：中心點 3x3 區域保證為安全出生點。周圍隨機生成障礙物 (機率 15%，第 11 關起逐章提高到 18%，見 7.1)。生成後會執行 **BFS (廣度優先搜尋)** 演算法驗證地圖連通性 (Check Map Connectivity)，若有死胡同或無法到達的區域則重新生成，確保玩家絕對有路可走。
* **關卡變化**：每 10 關一章，地板顏色、障礙物與一般怪物的外觀依章節變化（第 1 章：第 1 關森林、第 2 關沙灘、第 3 關以上地牢；第 11 關起見 7.1）。

### 2.3 實體與 AI (Entities & AI)
* **玩家控制**：
    * PC 端支援鍵盤 (WASD / 方向鍵)。
    * 手機與平板支援浮動虛擬搖桿 (Pointer Events，`js/touch.js`，見第 8 節)，利用 CSS `touch-action: none` 防止畫面滑動。
    * 鍵盤與搖桿由 `getMoveVector()` 合成一個方向，長度最多 1：任何方向的速度都一樣（斜走不會比較快）。
    * X、Y 分開檢查牆壁碰撞：斜走碰到牆時會沿著牆滑動，不會整個卡住。
    * 切換 App 或分頁 (`blur`、`visibilitychange`)、答完題時放開所有按鍵與搖桿 (`releaseAllInput()`)，避免角色自己一直跑。
    * 自動偵測移動狀態來切換 Idle (待機) 與 Run (跑步) 的精靈圖動畫。
* **怪物 (Monsters)**：每關隨機生成，具備基礎的隨機方向反彈移動邏輯，並會微調速度方向。第 11 關起加入有特殊行為的新怪物（🐡🐍👻🛸，見 7.2）。
* **魔王 (Boss)**：尾數 5 的關卡固定是 🐉 火龍，10 的倍數是各章的魔王（第 10 關 👹 赤鬼，之後見 7.3）。🐉／👹 抖動 1 秒後朝玩家目前位置噴一發火球 (🔥)，約每 5 秒一次；答對 5 次才能擊敗。所有魔王頭上都有血條，血剩一半以下會生氣（紅色光圈與 💢，攻擊變快或變多）。
* 敵人的移動、攻擊與繪製都在 `js/enemies.js`，`script.js` 的主迴圈對每個敵人呼叫 `updateEnemy()`。

### 2.4 碰撞與戰鬥觸發 (Collision)
* 採用 **AABB (Axis-Aligned Bounding Box)** 碰撞偵測機制。
* 玩家碰撞範圍經過縮小與置中微調，使操作手感更自然。
* 當玩家與怪物、Boss 或子彈發生重疊時，觸發 `gameState.paused = true` 暫停 Game Loop，並彈出數學挑戰視窗。
* 碰到敵人算什麼由 `getContactType()` 依敵人當下的狀態決定：`monster`、`chest`、`boss` 是一般的題目；`bullet` 是被撞到（衝撞中的犀牛王），跟被子彈打到一樣；`null` 是碰不到（隱身的幽靈）。機器人炸彈的火焰也算 `bullet`。
* 無敵護盾擋得住怪物、子彈、衝撞與火焰，擋不住寶箱與魔王（那是玩家要主動去碰的）。

### 2.5 數學挑戰模組 (Math Challenge)
* 題目由 `js/questions.js` 的 `generateQuestion(level)` 產生，根據隨機運算子 (`+`, `-`, `*`) 動態生成（畫面上乘號顯示為 `×`）：
    * 加法：10~59 的雙位數加法。
    * 減法：20~69 減 1~(被減數 - 10)，答案至少 10。
    * 乘法：九九乘法表範圍 (1~9)。
* **選項生成**：產生 1 個正確答案與 3 個干擾選項，並洗牌打亂順序。第 10 關以前干擾選項是正確答案 ±10 以內隨機；第 11 關起範圍不變，但改用常見錯誤、加入填空題（見 7.4）。
* **獎懲機制**：
    * **答對**：消滅該怪物（🐡 河豚要答對 2 次；若是 Boss 則扣除其生命值並將其隨機傳送），獲得經驗值與金幣（數值見 6.1；子彈題沒有獎勵）。恢復遊戲。原本的分數 (Score) 已由經驗值取代。
    * **答錯**：扣除 1 顆愛心 (HP)，觸發物理擊退效果 (Knockback)，強制玩家往後退一段距離避免連續碰撞。不扣經驗值與金幣。若 HP 歸零則觸發 Game Over；第 2 關以後可選擇從本關起點重來或從頭開始（見 4.5）。
    * 每一題（包含子彈題）的對錯都會記錄到答題統計，供成就系統使用（見 6.3）。

## 3. UI/UX 介面設計 (style.css & index.html)

* **HUD 狀態列**：位於畫面上方，顯示當前血量 (❤️)、關卡 (`Stage N`)、角色等級與經驗值進度條 (`Lv N`，進度條上顯示累計經驗值)、金幣 (🪙) 與鑽石 (💎)，下一行是道具欄。使用文字陰影提升在各種底色下的可讀性；手機寬度不夠時會自動換行。
    * 畫面上關卡叫 Stage、角色等級叫 Lv，避免兩個「Level」混淆；程式裡的 `gameState.level` 仍是關卡。
    * 觸控模式隱藏道具欄（數量改顯示在道具按鈕上）；手機的 HUD 字級縮小為 18px。
* **觸控控制區**：浮動搖桿與道具按鈕，觸控模式 (`body.touch-mode`) 才顯示，見第 8 節。原本的 D-Pad 與 Action 按鈕（對應沒有用到的空白鍵）已移除。
* **數學題庫彈窗**：使用絕對定位覆蓋於 Canvas 之上，採防呆設計（`isAnswering` 狀態鎖），防止玩家連點造成重複計分或錯誤判定。答對時第二行顯示獲得的經驗值與金幣。同一個視窗也用 `showMenu()` 顯示 Game Over、「歡迎回來」與過關選單（見 4.5、6.4）。
    * 題目出現後 0.3 秒內 (`ANSWER_LOCK_MS`) 按答案不算：兒童碰到怪物時手指可能還在畫面上，避免視窗一跳出來就誤按扣血。選單按鈕不受影響。
    * 視窗設有 `max-height`，畫面矮時可以捲動，答案按鈕不會超出畫面。
    * 填空題的 □ 畫成方框 (`.blank`)：遊戲字型沒有 □，備用字型的 □ 很小。
    * 畫面寬度 480px 以下題目字級改為 38px，兩位數的題目與填空題才不會斷成兩行。
* **商店視窗** (`#shop-overlay`)：邊框與按鈕跟題目視窗相同，由 `js/shop.js` 控制（見 6.4）。
    * 背景是商店插圖 `shop_bg.webp`（不是題目視窗的半透明黑底）。視窗放在畫面中央的老闆娘旁邊、不擋住她：橫向畫面靠右（畫面寬度不到 1200px 時放大圖片並裁掉左邊），直向畫面靠下。圖片載入前或瀏覽器不支援 WebP 時顯示藍色底色。
    * 視窗盡量做矮，少擋住插圖：標題與持有金幣同一行；持有道具數量顯示在各商品按鈕右上角，沒有另外一行；畫面寬度 460px 以上時四個商品排成一列（手機直向維持 2×2）。手機橫向不用捲動。
    * 視窗底色是毛玻璃（半透明 + `backdrop-filter` 模糊），不支援模糊的瀏覽器只有半透明。買不起的按鈕用灰色表示，不用 `opacity`，否則底圖會從按鈕透出來。
    * 購買訊息 (`#shop-feedback`) 的行高等於預留的高度，出現文字時視窗不會長高；視窗靠下對齊，長高的話按鈕會往上移，連點時容易點錯。
    * 圖片只有在第一次打開商店時才會下載。原圖 2000×2000 JPG 約 420KB，縮成 1600×1600、WebP 品質 75（約 185KB）；換圖時也維持在 200KB 以內。
* **提示訊息 (toast)**：升級與成就解鎖時，`showToast()` 在 HUD 下方顯示 2.5 秒，蓋在題目視窗與商店之上。
* **暫停中不能使用神速靴與無敵護盾**：它們是 5 秒的時效道具，在答題或選單畫面使用會白白耗掉；商店開著時數字鍵 1～4 完全不使用道具。

## 4. 存檔機制 (Save System)

2026-09-28 實作，目前格式為 v2（加入經驗值、貨幣與成就），程式在 `public/js/save.js`。

### 4.1 方案：本局進度 + 永久資料
存檔分成兩部分，放在同一個 `localStorage` key，每次整份一起寫入，不會只存到一半：

| | 本局進度 `run` | 永久資料 `profile` |
|---|---|---|
| 內容 | `level`、`hp`、`inventory` | `xp`、`gold`、`diamonds`、`stats`（答題統計）、`achievements` |
| 寫入時機 | 只在「進關當下」：`startLevel()`，以及進關時開放的商店 | 一有變動就寫入（`saveProfile()`），關卡中途也可以 |
| 重新整理 | 回到該關起點 | 保留 |
| 從本關重來 | 回到進關時的數值 | 保留，不回溯 |
| New Game | 重設為第 1 關 | 保留 |

* **本局進度採關卡起點存檔 (Checkpoint)**：重新整理或下次開啟時，從該關**開頭**繼續；地圖與敵人照常重新隨機生成。
    * 不採「完整快照」（連地圖、敵人位置、子彈、道具計時都存）：需要重建圖片物件、換算計時器、處理答題中的狀態，程式量約三倍且容易出錯；而且地圖大小依當時視窗決定，換裝置或旋轉手機後讀回會比例失調。
    * **一致性原則**：本局進度必須是「同一時間點」的完整狀態。不可以每答一題就存道具，但讀檔時又重生整關的敵人，否則寶箱會重生，玩家可靠重新整理無限刷道具。
* **永久資料為什麼可以立即寫入**：經驗值與金幣都是「每答對一題」才給，重新整理後重打怪物，拿到的速度跟正常往下玩一樣，只是多做了數學題，不構成漏洞。規則是**不要讓寶箱這類會隨讀檔重生的東西額外多給獎勵**；目前寶箱給的經驗值與金幣跟怪物相同，額外的道具屬於本局進度，會跟著 checkpoint 回溯。之後接上看廣告換鑽石時，也必須立即寫入，不能等到下一關。

### 4.2 存檔欄位
| 欄位 | 是否存檔 | 原因 |
|---|---|---|
| `gameState` 的 `level`、`hp`、`inventory` | 存 (`run`) | 本局進度本體 |
| `profile` 全部欄位 | 存 (`profile`) | 永久資料本體 (見第 6 節) |
| `map`、`enemies`、`bullets`、`hazards`、`x`/`y`、`bossHitsNeeded`、`bossDamage` | 不存 | 每關本來就隨機生成，進關時由 `startLevel()` 重建；章節、主題、魔王種類都由關卡數推算 (`getStageConfig()`) |
| `speedBoostUntil`、`invincibleUntil`、`graceUntil`、`lastFrameTime`、`lastUpdateTime` | 不存 | 以 `performance.now()` 為基準，頁面重新載入後從 0 起算，舊值無意義；道具效果只有 5 秒，進新關時直接清除 |
| `enemies[].spriteImg` | 不存 | `Image` 物件，轉 JSON 會變成 `{}` |
| `paused`、`currentChallengeType`、`currentEnemyIndex`、`challengeSource`、`hintUsed`、`gameOver`、`levelTouched` | 不存 | 答題與畫面的暫態；題目內容存在 DOM 與按鈕 closure 中，不在 `gameState` |

### 4.3 資料格式與讀取驗證
* `localStorage` key：`cherylgame.save`，內容：
    ```json
    {
      "v": 2,
      "run": { "level": 7, "hp": 2, "inventory": { "potion": 1, "boots": 0, "scroll": 2, "shield": 0 } },
      "profile": {
        "xp": 320, "gold": 45, "diamonds": 4,
        "stats": {
          "correct": 40, "wrong": 3, "streak": 5, "bestStreak": 12,
          "ops": { "+": { "correct": 15, "wrong": 1 }, "-": { "correct": 12, "wrong": 2 }, "*": { "correct": 13, "wrong": 0 } },
          "bossesDefeated": 1, "highestStage": 7
        },
        "achievements": { "first_correct": 1790587643022, "first_boss": 1790587700000 }
      }
    }
    ```
* `JSON.parse` 失敗、或 `v` 不是 1 或 2 → 無存檔，從第 1 關開始。
* **`run`** 任何必要欄位不合格就只丟掉 `run`（從第 1 關開始），**`profile` 照常讀取**，不會因為本局進度壞掉就清空經驗值與鑽石：
    * `level` 必須是正整數。
    * `hp` 必須是整數，限制在 `1`～`MAX_HP`（`hp <= 0` 視為無效）。
    * `inventory` 以空道具欄為底，只合併已知道具、非負整數的欄位；將來新增道具時，舊存檔不會壞掉。
* **`profile`** 以 `createEmptyProfile()` 為底，逐欄合併（`mergeCounts()`，巢狀的 `stats` 也逐層處理）：只取已知欄位中的非負整數，不合格的欄位用預設值，不認識的欄位丟棄。`achievements` 只保留 `ACHIEVEMENTS` 中存在的 id、值為正整數（解鎖時間）的項目。
* **v1 → v2 轉換** (`migrateV1()`)：v1 格式是 `{ "v": 1, "level", "score", "hp", "inventory" }`。`level`、`hp`、`inventory` 成為 `run`；分數與經驗值同樣是每答對一題 +10，所以 `score` 直接成為 `profile.xp`，其他永久資料從 0 開始。維持 v1 的規則，`score` 不是非負整數時視為無存檔。轉換後的第一次 `startLevel()` 就會以 v2 格式寫回。
* **存檔格式改變時要提高 `SAVE_VERSION`，並在 `parseSave()` 加上舊版本的轉換**；只提高版本號的話，`v` 不符會被當成無存檔，現有玩家的進度會全部消失。
* **所有 `localStorage` 存取都必須包在 `try/catch` 裡**（只在 `save.js` 的 `readSave()`、`clearSave()`、`writeSave()`）。在 sandbox iframe 中，連讀取 `window.localStorage` 這個屬性都會丟出 `SecurityError`（見第 5 節）；沒有攔截的話整個遊戲會無法啟動。失敗時靜默退化為「不存檔」模式，遊戲照常進行，`checkpoint` 與 `profile` 仍保留在記憶體中。

### 4.4 程式結構 (public/js/save.js)
| 名稱 | 作用 |
|---|---|
| `SAVE_KEY`、`SAVE_VERSION` | 檔案開頭的常數 |
| `checkpoint` | 記憶體中「最近一次進關時」的本局進度。`localStorage` 無法使用時（例如 sandbox iframe），Game Over 仍能用它從本關重來 |
| `profile` | 永久資料。各系統直接讀寫自己的欄位，改完呼叫 `saveProfile()` |
| `saveProgress()` | 更新 `checkpoint` 並存檔。只在 `startLevel()` 與商店購買 (`buyItem()`) 時呼叫 |
| `saveProfile()` | 永久資料有變動時呼叫。`run` 一律寫入 `checkpoint`，所以關卡中途呼叫也不會存到中途的道具 |
| `loadProgress()` | 處理 `?newgame`，讀取並套用存檔。在 `script.js` 第一次呼叫 `startLevel()` 之前執行 |
| `readSave()`、`parseSave()`、`parseRun()`、`parseProfile()`、`migrateV1()`、`clearSave()`、`writeSave()` | `localStorage` 存取（全部包 `try/catch`）與 4.3 的驗證、轉換規則 |
| `createEmptyProfile()`、`mergeCounts()` | 永久資料的預設值，以及「以預設值為底、只合併已知欄位」的驗證 |
| `applyProgress()` | 把本局進度寫回 `gameState`，道具欄會複製一份，避免遊戲中修改到 `checkpoint` |

`script.js` 中與存檔相關的函式：
| 名稱 | 作用 |
|---|---|
| `restartFrom(progress)` | 從指定本局進度重新開始一關：套用進度 → 清除道具計時 → `startLevel()` → `resumeGame()`。`resetGame()` 與「從本關重來」共用；兩者都不動 `profile` |
| `showMenu()`、`showMenuButtons()` | 借用數學題視窗顯示選單：`showWelcomeBack()`、`showStageClear()`、`showGameOver()` 共用 |

* **本局進度的寫入時機**：`saveProgress()` 放在 `startLevel()` 內，這一個位置就涵蓋所有進關的情況：
    * 初次啟動（`script.js` 中第一次呼叫 `startLevel()`）
    * 過關（`update()` 中 `allCleared` 分支，`level += 1` 後）
    * 從頭開始／從本關重來（`restartFrom()`）
    * 視窗縮放重建地圖（`handleResize()`）：只在本關尚未觸發題目時發生，數值與上次存檔相同，重存無害。
    * 另外，商店只在進關時（`levelTouched` 為 false）開放，購買後的道具視同進關時就有，所以 `buyItem()` 也呼叫 `saveProgress()`。
* **讀取時機**：`loadProgress()` 必須在第一次 `startLevel()` 之前，關卡設定（`getStageConfig()`：魔王、怪物組成、障礙物比例）與地板配色（`drawWorld()`）才會一開始就用正確的關卡數。
* **UI 時序限制**：`showWelcomeBack()` 放在 `script.js` 最末端 `updateHUD()` 初始化之後。`hpDisplayCache`、`isAnswering` 等變數以 `let` 宣告在 `script.js` 中段，第一次 `startLevel()` 執行時它們還不能使用（TDZ），提早呼叫 `updateHUD()`／`updateHintButton()` 會丟出 `ReferenceError`，遊戲直接停止。第一次 `startLevel()` 會呼叫 `recordStageReached()`，可能解鎖成就並顯示提示，所以 `showToast()` 與各系統更新 HUD 的函式都直接操作 DOM，不使用 `script.js` 的 `let` 變數。

### 4.5 玩家流程 (UX)
* **開場**：
    * 沒有存檔，或存檔在第 1 關 → 直接開始遊戲。
    * 存檔在第 2 關以上 → 暫停遊戲，顯示「Welcome Back! / Stage N」與兩個按鈕：`Continue ▶️`（`resumeGame()`）、`New Game 🔄`（`resetGame()`）。
    * 選單沒有題目，所以 `showMenu()` 會停用提示卷軸（設 `hintUsed = true`，下次出題時重設），避免按鍵 3 把選單按鈕當成錯誤答案隱藏。
* **過關**：暫停並顯示「Stage N Clear! 🎉」與目前金幣，按鈕 `Stage N+1 ▶️`（直接開始）與 `Shop 🛒`（見 6.4）。
* **Game Over**：**不清除存檔**，畫面顯示累計經驗值。
    * 第 2 關以上：顯示 `Retry Stage N 🔁`（`restartFrom(checkpoint)`）與 `New Game 🔄`。
    * 第 1 關：只顯示 `Play Again 🔄`。
    * 理由：本遊戲以兒童練習數學為目的，從關卡起點重來比整個歸零的挫折感低。
* **New Game** 只重設本局進度；經驗值、金幣、鑽石、答題統計、成就都保留。
* **已知取捨**：
    * 關卡中途重新整理頁面，會回到該關起點，HP 與道具也回到進關時的數值；經驗值與金幣保留。對兒童遊戲可接受，不另外防範。
    * 從本關重來時，HP 是進關時的數值；若進關時只剩 1 顆心，重來也只有 1 顆心。
* **開發測試用**：網址加上 `?newgame` 時，忽略並清除整份存檔（包含永久資料）。Playwright 測試每次都使用全新的瀏覽器環境，不受存檔影響。
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

### 4.7 存檔的限制
* 存檔只存在「該瀏覽器 + 該網址來源 (origin)」。換裝置、換瀏覽器、無痕模式都不會帶過去。
* 正式網址只有 `https://mathrpg.mumuisland.com/`（Cloudflare Pages）。舊的 `https://busyfather357.github.io/cherylgame/` 將關閉，不需考慮兩個網域之間的存檔同步。
* iOS Safari：若 7 天內沒有造訪本網站，可能會清除 `localStorage`（加到主畫面的 Web App 不受此限）。
* 以上限制同樣適用於經驗值、金幣、鑽石與成就。目前鑽石沒有用途，影響不大；之後若鑽石來自看廣告，玩家因此失去鑽石的觀感會差很多，屆時需要考慮存檔碼匯出／匯入或雲端存檔（見 6.6）。
* 資料都在前端，玩家可以用開發者工具修改數值。單機、沒有排行榜、鑽石不能花錢買的情況下可以接受。

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
地圖只有 5 列（上下是牆，可走 3 列），HUD 會蓋住最上排；答題視窗超出 iframe 高度，標題與答題回饋文字被裁切。屬於版面問題，與存檔無關。加入經驗值與貨幣後，過關選單同樣會被裁切；商店視窗最高為畫面的 90%，超出時可以捲動。
* 2026-10-25 起題目視窗也有 `max-height`，超出時可以捲動，但畫面仍然很擠。
* 嵌入版的形狀由外層網頁決定，所以不檢查畫面方向（見 8.2）；但在手機上，288px 扣掉 HUD 與下方的道具按鈕後，地圖只剩約 150px 高。建議把嵌入高度改大。

### 5.4 各種開啟方式的存檔行為
以 `localhost` / `127.0.0.1` 模擬同站與跨站嵌入，於 Chrome 實測：

| 玩家開啟方式 | 存檔 | 與直連版共用存檔 |
|---|---|---|
| 直接開 `mathrpg.mumuisland.com` | 正常 | — |
| 以現行語法嵌在自家網站（`*.mumuisland.com`，同站） | 正常 | 是 |
| 以現行語法嵌在別人的網站（跨站） | 正常 | 否。瀏覽器依外層網站分開存放，每個網站各一份；Safari 的限制可能更嚴格 |
| 仍使用舊語法 `sandbox="allow-scripts"` 的網站 | 無法保留（自動停用）；同一次遊玩中 Game Over 仍可從本關重來 | — |

## 6. 經驗值、貨幣、商店與成就

2026-09-28 實作。每個系統一個檔案，放在 `public/js/`；永久資料的存檔規則見第 4 節。

| 檔案 | 內容 | 可調整的數值 |
|---|---|---|
| `experience.js` | 經驗值、角色等級、HUD 的等級與進度條 | `XP_REWARDS`、`xpForLevel()` |
| `currency.js` | 金幣、鑽石、HUD 的金幣與鑽石 | `GOLD_REWARDS` |
| `achievements.js` | 答題統計、成就定義與解鎖 | `ACHIEVEMENTS` |
| `shop.js` | 商店視窗與購買 | `SHOP_PRICES` |

維護者決定（2026-09-28）：
* 分數 (Score) 由經驗值取代。
* 角色等級目前只是記錄，不給任何能力加成。
* 商店販售道具會讓遊戲變簡單，可以接受，之後再調整價格與功能。
* 鑽石目前沒有用途，先建立成就系統的架構。
* New Game 保留經驗值、金幣、鑽石與成就。

### 6.1 獎勵數值
「答對一題」才給獎勵，答錯不扣經驗值與金幣。`checkAnswer()` 依題目來源決定獎勵類型，再從兩張表取值：

| 題目來源 | 獎勵類型 | 經驗值 | 金幣 |
|---|---|---|---|
| 怪物（包含 🐡🐍👻；河豚每答對一次都給） | `monster` | 10 | 5 |
| 🛸 飛碟（會逃跑） | `ufo` | 10 | 10 |
| 寶箱（另得 1 個隨機道具） | `chest` | 10 | 5 |
| 魔王，還沒倒下的每一擊（犀牛王暈倒時一次扣 2 格血，獎勵仍是一擊） | `bossHit` | 10 | 5 |
| 魔王，最後一擊 | `bossDefeat` | 60 | 35 |
| 子彈、衝撞、炸彈火焰 | 無 | 0 | 0 |

* 答對時的獎勵類型存在敵人的 `reward` 欄位（`js/enemies.js` 建立敵人時決定）。
* 第 1 章一般關卡（4 隻怪物 + 1 個寶箱）約得 50 經驗值、25 金幣；魔王關約得 100 經驗值、55 金幣。第 11 關起怪物變多、河豚要答對 2 次、魔王血量較多，每關得到的也跟著變多。

### 6.2 經驗值與角色等級 (experience.js)
* 存檔只存累計經驗值 `profile.xp`，等級由 `getPlayerLevel()` 換算，不會出現兩者不一致。
* 升到第 L 級需要累計 `xpForLevel(L) = 25 × L × (L − 1)`：每升一級所需比上一級多 50（Lv2: 50、Lv3: 150、Lv4: 300、Lv5: 500、Lv10: 2250）。
* 升級時顯示提示「⭐ Level Up! Lv N」。
* HUD 顯示 `Lv N` 與升級進度條，進度條上是累計經驗值；滑鼠停在上面會顯示還差多少經驗值升級。

### 6.3 貨幣與成就 (currency.js、achievements.js)
* **金幣**：`addGold()`、`spendGold()`（不夠時不扣款並回傳 false）。
* **鑽石**：只能從成就取得，目前沒有用途。所有鑽石來源都經過 `addDiamonds()`；之後接上獎勵廣告時也從這裡發放。
* **答題統計** `profile.stats`：總答對／答錯、目前與最長連續答對、各運算（`+`、`-`、`*`）的答對／答錯、打倒魔王次數、到達的最高關卡。由 `recordAnswer()`、`recordBossDefeated()`、`recordStageReached()` 累計；連續答對跨局保留，答錯才歸零。
* **成就**：`ACHIEVEMENTS` 每一筆有 `id`、`name`、`diamonds` 與 `isDone(stats)`。每次統計變動後 `checkAchievements()` 檢查所有未解鎖的成就，達成時記錄解鎖時間、給鑽石、顯示「🏆 名稱 +N 💎」。目前的成就：

| id | 名稱 | 鑽石 |
|---|---|---|
| `first_correct` | 第一次答對 | 1 |
| `correct_100` | 累計答對 100 題 | 3 |
| `streak_10` | 連續答對 10 題 | 2 |
| `multiply_50` | 乘法答對 50 題 | 3 |
| `first_boss` | 第一次打倒魔王 | 3 |
| `stage_10` | 抵達第 10 關 | 3 |

* 新增成就只要在 `ACHIEVEMENTS` 加一筆。需要新的統計時，在 `createEmptyStats()` 加欄位並在 record 函式中累計；舊存檔會自動補上預設值。**`id` 存在存檔裡，上線後不要改名。**
* 從 v1 存檔轉換的玩家統計從 0 開始；讀到第 10 關以上的存檔時，第一次 `startLevel()` 就會解鎖「抵達第 10 關」。
* 還沒有成就清單畫面。

### 6.4 過關選單與商店 (shop.js)
* 過關後 `update()` 先進入下一關（`startLevel()` 會存下進關當下的進度），再呼叫 `showStageClear()` 暫停並顯示過關選單。
* 按 `Shop 🛒` 開啟商店：顯示持有金幣，四種道具各一個購買按鈕（右上角是持有數量），買不起的按鈕停用；按 `Stage N ▶️` 離開商店並開始本關。版面見第 3 節。
* **只在進關時開放**（`openShop()` 檢查 `levelTouched`）：購買後的道具會寫進 `checkpoint`，從本關重來時仍然保留。如果關卡中途也能買，重新整理或從本關重來就會出現「金幣扣了、道具沒了」或「用掉的道具又回來」的情況。
* 商店開著時 `shopOpen` 為 true，`useItem()` 不作用，避免玩家按數字鍵以為是在購買。

| 道具 | 價格 |
|---|---|
| 恢復藥水 | 40 |
| 神速靴 | 20 |
| 提示卷軸 | 30 |
| 無敵護盾 | 30 |

### 6.5 設計原則
* 鑽石不能換取「跳過數學」的能力（例如提示卷軸、復活），否則之後接上廣告時會變成「看廣告就能少做題目」，與遊戲目的相反。建議鑽石之後只用於外觀（例如用 emoji 做寵物、帽子、地圖主題）。
* 獎勵只跟著「答對一題」給。寶箱會隨讀檔重生，不要額外多給經驗值或金幣（見 4.1）。

### 6.6 之後：獎勵廣告換鑽石（尚未實作）
2026-09-28 評估時整理的注意事項：
* **管道**：網頁遊戲的獎勵廣告主要是 Google AdSense 的 H5 Games Ads（Ad Placement API，`adBreak({ type: 'reward' })`），需另外申請；或上架到 Poki、CrazyGames 等遊戲平台，改用它們的 SDK。
* **兒童政策**：本站以兒童為對象，Google 要求標記為兒童導向，只能放非個人化廣告；美國 COPPA、歐盟 GDPR 兒童條款等要先確認。建議看廣告前加家長確認、設每日次數上限，且只在廣告確實看完（`adViewed`）時才呼叫 `addDiamonds()`。
* **CSP**：目前 `default-src 'self'`，需要開放廣告網域的 script、frame、img、connect，並執行 `npm --prefix tools run test:csp`。
* **iframe 嵌入版**：現行嵌入語法沒有 `allow-popups`，廣告點擊會失效；嵌入版（`window.self !== window.top`）建議不顯示看廣告按鈕。
* **存檔**：看廣告換到的鑽石必須立即存檔（`addDiamonds()` 已經會）。`localStorage` 可能被清除（見 4.7），可考慮不需帳號的存檔碼匯出／匯入。

## 7. 章節、新怪物、新魔王與題目難度

2026-09-28 實作。原本第 3 關以後內容都一樣、每個魔王也都一樣，第 10 關之後玩家看不到新東西。維護者決定：
* 每 10 關一章，第 11 關起提高普通關卡難度。
* 尾數 5 的關卡固定是 🐉 火龍，10 的倍數是各章的魔王。
* 題目範圍不變，第 11 關起套用 7.4 的 A～C。
* 暫不實作「打倒魔王後 HP 回滿」：HP 仍然跨關保留，只有藥水能回血。

這個遊戲碰到怪物就是出題，是玩家主動要去碰的；真正要「躲」的只有子彈這類沒有獎勵、答錯扣血的東西。所以難度來自：要躲的東西（毒液、墨汁、衝撞、炸彈）、每關題數（怪物變多、河豚、魔王血量）、題目本身，而不是單純讓怪物變快。

### 7.1 章節 (js/stages.js)
| 章 | 關卡 | 主題（障礙物） | 一般怪物 | 新怪物 | 怪物數 | 其中新怪物 | 障礙物 | 10 的倍數的魔王 |
|---|---|---|---|---|---|---|---|---|
| 1 | 1–10 | 森林 🌲 → 沙灘 🌊🪨 → 地牢 🧱 | 👾🦀🦈 | — | 4 | 0 | 15% | 👹 赤鬼 |
| 2 | 11–20 | 冰海 🧊⛄ | 🐧🦈🐳 | 🐡 河豚 | 5 | 1–2 | 16% | 🐙 章魚王 |
| 3 | 21–30 | 沙漠 🌵🪨 | 🦂🦎🐪 | 🐍 眼鏡蛇 | 5 | 2 | 17% | 🦏 犀牛王 |
| 4 | 31–40 | 鬼屋 🎃🕸️ | 🦇🦉🐺 | 👻 小幽靈 | 6 | 2–3 | 18% | 👻 幽靈王 |
| 5 | 41–50 | 太空 🪐☄️ | 👽👾 | 🛸 飛碟 | 6 | 3 | 18% | 🤖 機器人 |
| 6 起 | 51– | 輪流使用第 2～5 章 | 同主題 | 全部混合 | 6 | 3 | 18% | 輪流出現，★ 強化 |

* 怪物數不含寶箱，寶箱每關 1 個。本章的新怪物至少一隻，其餘從已經出現過的新怪物中挑。
* **小地圖**（外牆以內少於 100 格，例如手機直向 7×16 格）：第 2 章起少放 1 隻怪物；章魚王生氣後十字、斜向輪流；幽靈王的小幽靈最多 1 隻。第 1 章維持原本的數量。
* **進關提示**：魔王關顯示「⚠️ Boss: 名稱」；新怪物在每次開啟遊戲後第一次出現時顯示提示（例如「🐡 河豚: Hit it twice!」）。進關時通常還停在過關選單或商店，所以 `queueStageAnnouncements()` 先記下來，等玩家開始移動 (`update()` 沒有暫停時) 才由 `flushStageAnnouncements()` 顯示。
* 所有設定由 `getStageConfig(level)` 從關卡數推算，存檔格式不變。

### 7.2 新怪物 (js/enemies.js 的 `MONSTER_KINDS`)
| 怪物 | 行為 |
|---|---|
| 🐡 河豚 | 要答對 2 次；第一次答對後消氣變小 (36px)，並把玩家彈開，避免保護時間結束後馬上又碰到 |
| 🐍 眼鏡蛇 | 玩家在 4 格內時，停下抖 1 秒，再朝玩家吐一發毒液 🟢（速度 2.5，比玩家慢），之後冷卻 4 秒 |
| 👻 小幽靈 | 現身 3 秒、隱身 2 秒輪流；隱身時碰不到、可以穿牆。該現身時如果在牆裡，會等穿出來再現身 |
| 🛸 飛碟 | 玩家在 3 格內就往反方向逃（速度 2.2，比玩家慢，追到牆角就抓得到）；答對金幣 10 |

### 7.3 魔王 (js/enemies.js 的 `BOSS_TYPES`)
* 碰撞範圍 50px，畫成 75px（才不會卡在一格寬的走道）；頭上有血條，一格是一次答對。
* 開始移動 1.5 秒後才第一次攻擊；每個攻擊前都有預警（抖動、鼓起、紅色路線或紅色區域）。答對後魔王傳送到別處，攻擊重新計時。
* 血剩一半以下生氣：紅色光圈與 💢。
* ★ 強化（第 51 關以後 10 的倍數的魔王）：血量 +2、攻擊間隔 ×0.8。

| 關卡 | 魔王 | 血量 | 招式 | 生氣後 |
|---|---|---|---|---|
| 尾數 5 | 🐉 火龍 | 5 | 抖動 1 秒後朝玩家噴 🔥（速度 4），每 5 秒一次 | 每 3.5 秒 |
| 10 | 👹 赤鬼 | 5 | 同火龍 | 同火龍 |
| 20 | 🐙 章魚王 | 6 | 停下鼓起 1 秒後往上下左右噴墨 💧（速度 3），每 5 秒一次 | 8 個方向（小地圖十字、斜向輪流） |
| 30 | 🦏 犀牛王 | 6 | 跺腳 1 秒並在地上畫出紅色路線，再直線衝向玩家（速度 7），撞牆暈倒 3 秒 💫。衝撞中碰到算被撞（沒有獎勵、答錯扣血，護盾擋得住）；**暈倒時答對一次扣 2 格血** | 衝撞速度 8，間隔變短 |
| 40 | 👻 幽靈王 | 7 | 現身 4 秒、隱身 2.5 秒；隱身時碰不到、可以穿牆。現身時抖 1 秒叫出一隻小幽靈（最多 2 隻，小地圖 1 隻），小幽靈算一般怪物、有獎勵，魔王倒下時一起消失 | 移動變快、召喚變頻繁 |
| 50 | 🤖 機器人 | 8 | 在腳下放 💣，十字範圍（各方向 3 格，被牆擋住）先閃紅色 1.5 秒，再爆炸 0.5 秒；站在火焰裡算被打中 | 每 2.5 秒放一顆（平常 4 秒） |

* 幽靈王沒有會打人的攻擊，挑戰在於等它現身，以及要答對 7 題。試玩後如果太簡單，可以再加攻擊方式。

### 7.4 題目難度 (js/questions.js)
第 11 關起（`HARD_QUESTION_STAGE`），題目範圍不變：
* **A. 錯誤選項用常見錯誤**：分組挑選，加減法一定同時有「個位數相同」與「十位數相同」的錯誤選項，只看個位數或十位數都選不出答案。
    * 加法：差 10（忘記進位）、差 1 或 2。
    * 減法：同上，需要借位時再加上「個位數大減小」（52 − 27 算成 35）。
    * 乘法：九九乘法表相鄰的積（7 × 8 → 49、63、48、64）。
    * 填空題：把題目上的兩個數直接相加或相減（□ + 23 = 51 答成 74）、差 10、差 1 或 2；乘法填空是差 1 或 2，不放 0。
* **B. 填空題**：20%（`FILL_IN_RATE`），空格在第一個或第二個數。
* **C. 較難的題目**：70%（`HARD_PROBLEM_RATE`）強制是需要進位／借位的加減法，或一個數是 6～9、另一個是 2～9 的乘法。
* 答題統計仍依 `+`、`-`、`*` 分類，填空題依它的運算。

### 7.5 驗證方式
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

## 8. 觸控操作與畫面方向 (js/touch.js)

2026-10-25 實作。起因：維護者在 iPad mini 上遊玩，畫面下半部被截斷、無法操控。維護者決定：
* 改成一般手遊的浮動虛擬搖桿：手指按住往某個方向拉，角色就一直往那個方向跑。移除 D-pad 與 Action 按鈕。
* 降低要支援的畫面組合：**手機只支援直向、平板只支援橫向**；電腦不限。
* 地圖格數維持依整個畫面計算，只縮小繪製比例，難度不變。
* 搖桿超過死區就全速；鍵盤斜走速度統一成跟直走一樣。
* 題目出現後 0.3 秒內按答案不算（見第 3 節）。
* 加到主畫面 (PWA) 暫不實作（見 8.7）。

### 8.1 原本的問題與「下半部被截斷」
2026-10-24 以內建瀏覽器 (Chromium) 模擬 iPad mini 的 Safari 可視區域（直向 744×1060、橫向 1133×670）實測：
| 問題 | 原因 |
|---|---|
| 直向時 D-pad 與道具按鈕蓋住地圖最下面 3.4 列，寶箱可能藏在按鈕底下 | 地圖放滿整個畫面，控制鍵疊在上面 |
| D-pad 不能滑動換方向、不能斜走 | 觸控事件只送給手指一開始按的按鈕 |
| 角色可能停不下來 | 沒有處理 `touchcancel` |
| Action 按鈕沒有作用 | 對應的空白鍵遊戲沒有用到 |
| 斜走貼牆整個停住 | X、Y 一起檢查碰撞 |
| 接上滑鼠的 iPad、觸控筆電沒有控制鍵 | 只用 `(hover: none) and (pointer: coarse)` 判斷 |

**下半部被截斷在 Chromium 重現不出來**，是 Safari 或 App 內建瀏覽器特有的問題，尚未在實機確認原因。原本畫布用 `innerWidth/innerHeight`、控制鍵用 `height: 100%` 的底部定位，兩個尺寸來源只要不一致，下半部（包含控制鍵）就會落在畫面外。可能的情況：
1. 從 LINE、Facebook 等 App 內建瀏覽器開啟：網頁延伸到 App 工具列底下。
2. iPadOS Safari 的桌面版瀏覽模式：Apple 在 WWDC19 說明，版面比 iPad 寬的網站會忽略 `width=device-width` 並縮放，建議加上 `shrink-to-fit=no`。
3. iOS／iPadOS 26 Safari 的浮動工具列：有開發者回報 `position: fixed` 的內容無法顯示在工具列下方、`visualViewport` 高度與 `innerHeight` 不一致。

對策：畫布與 `<body>` 都用 `visualViewport` 的大小（2.1），viewport 加上 `viewport-fit=cover, shrink-to-fit=no`，控制鍵用 `env(safe-area-inset-*)` 避開 Home 指示條。**網址加上 `?debug`** 會在畫面中段顯示 `innerWidth/innerHeight`、`documentElement.clientWidth/clientHeight`、`visualViewport`、`screen`、`devicePixelRatio`、safe-area、媒體查詢結果、User Agent，並以紅框畫出畫布邊緣、黃框畫出遊戲區域（看不到下方的紅框就是畫布超出畫面）。在實機上用當初的開啟方式截圖，就能確認是哪一種情況。

### 8.2 觸控模式與畫面方向
* **觸控模式** (`body.touch-mode`)：主要輸入是觸控的裝置 (`(hover: none) and (pointer: coarse)`) 一開始就是；其他裝置（接上滑鼠的 iPad、觸控筆電）第一次用手指或觸控筆按畫布時才切換。觸控模式才顯示搖桿與道具按鈕；用滑鼠不會切換。
* **裝置種類**：螢幕短邊 (`screen`，CSS px) 小於 600 (`PHONE_MAX_SHORT_SIDE`) 是手機 (`touch-phone`)，其餘是平板 (`touch-tablet`)。iPad mini 短邊 744，算平板。
* **方向不對**（手機橫向、平板直向）時 `orientationBlocked` 為 true：
    * 蓋上「Please turn your phone upright / tablet sideways」與旋轉的 📱 動畫（`#rotate-overlay`，z-index 40，蓋在題目視窗與商店之上），不能操作選單。
    * `update()` 停止，搖桿放開。神速靴、無敵護盾照樣計時，跟答題暫停時一樣。
    * 轉回正確方向時給 1.5 秒保護時間 (`POST_CHALLENGE_GRACE_MS`)，跟答完題一樣。
* **嵌入版** (`window.self !== window.top`) 不檢查方向：iframe 的形狀由外層網頁決定（見 5.3）。
* **地圖重建**：關卡還沒觸發題目時，視窗大小改變就依新大小重建地圖；停在歡迎回來、過關選單或商店時也會重建（原本暫停中不重建）。否則平板直向開啟（先顯示旋轉提示）再轉成橫向時，地圖會是直向的形狀。

### 8.3 版面
* **道具按鈕**：手機 56px 排成一列放在右下角；平板 64px 排成一行放在右側中間。右上角顯示持有數量（跟商店按鈕的數量標籤一樣），數量 0 時變灰。按下 (`pointerdown`) 就使用，可以一指拉搖桿、另一指按道具。提示卷軸照舊在題目視窗裡使用（道具按鈕被題目視窗蓋住）。
* **遊戲區域** (`getPlayArea()`)：HUD 下方，扣掉道具按鈕那一條（手機扣下方、平板扣右側）。地圖格數不變，等比縮放置中到遊戲區域，所以控制鍵與 HUD 都不會蓋住地圖。HUD 高度改變（換行）時以 `ResizeObserver` 重新計算。

| 畫面 | 格數（與原本相同） | 每格畫出來的大小 |
|---|---|---|
| 手機直向 375×812 | 7×16 | 約 42px |
| iPad mini 橫向（Safari 可視區域 1133×670） | 22×13 | 約 47.5px |
| 電腦（非觸控模式） | 依視窗 | 50px（不變） |

* 手機 375px 寬時 HUD 是兩行（金幣與鑽石換到第二行），遊戲區域從第二行下方開始。
* `body` 設定 `user-select: none`、`-webkit-touch-callout: none`：按住搖桿時不會選取文字，也不會跳出 iOS 的放大鏡或選單。

### 8.4 搖桿
| 項目 | 設計 |
|---|---|
| 開始位置 | 手指按在畫布上任何地方（按鈕以外，包括 HUD 上面）就在那裡出現底座 |
| 提示 | 每次開啟遊戲後還沒用過搖桿時，在遊戲區域左下角顯示半透明的搖桿 (`.hint`)；第一次按下後就不再顯示 |
| 尺寸 | 底座直徑 120px (`JOYSTICK_RADIUS` 60)，搖桿頭 56px |
| 死區 | 10px (`JOYSTICK_DEAD_ZONE`) 以內不移動，超過就全速（與鍵盤相同，3；神速靴 6） |
| 方向 | 任意角度；接近上下左右 ±20° (`JOYSTICK_SNAP_RAD`) 時吸附成正方向，比較容易走進一格寬的通道 |
| 跟隨 | 拉超過底座半徑時，底座跟著手指移動 |
| 多指 | 以 `pointerId` 追蹤搖桿那一指，其他手指不影響 |
| 放開 | `pointerup`、`pointercancel`（iOS 的手勢、通知）、切換 App 或分頁都停止 |
| 暫停 | 出題、選單、商店、方向不對時放開；恢復後手指沒放開也不會移動，要重新按下 |

### 8.5 程式結構
| 名稱 | 位置 | 作用 |
|---|---|---|
| `touchMode`、`enableTouchMode()` | touch.js | 觸控模式與裝置種類的 `body` class |
| `refreshTouchLayout()` | touch.js | 更新畫面方向、遊戲區域、搖桿提示位置。`resizeCanvas()` 與 HUD 的 `ResizeObserver` 呼叫 |
| `orientationBlocked` | touch.js | 方向不對；`update()` 檢查 |
| `getPlayArea()` | touch.js | 地圖的繪製範圍；`draw()` 使用 |
| `getTouchMoveVector()`、`resetTouchInput()` | touch.js | 搖桿方向（長度 1 或 null）、放開搖桿 |
| `drawDebugInfo()`、`DEBUG_VIEWPORT` | touch.js | `?debug` 的資訊與紅、黃框；`draw()` 呼叫 |
| `getViewportSize()` | script.js | `visualViewport` 的大小（2.1） |
| `getMoveVector()`、`getPlayerHitbox()` | script.js | 鍵盤與搖桿合成的方向；玩家碰撞範圍（移動、碰撞、擊退共用） |
| `releaseAllInput()` | script.js | 放開所有按鍵與搖桿 |

* touch.js 在 script.js 之前載入，載入時只綁定事件；用到 script.js 的 `W`、`H`、`gameState` 等都在函式裡，第一次呼叫是 script.js 頂層的 `resizeCanvas()`（此時 `gameState` 還沒宣告，所以 `refreshTouchLayout()` 只有在「方向從不對變成正確」時才寫入 `gameState`，第一次呼叫不會發生）。

### 8.6 驗證方式
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

### 8.7 尚未處理與已知限制
* 實機驗證：iPad mini 的 Safari（以及平常開啟的方式，例如 LINE）用 `?debug` 截圖，確認 8.1 的原因已排除。
* **加到主畫面 (PWA)**：`manifest.webmanifest`、圖示、`apple-mobile-web-app-capable`。從主畫面開啟時沒有 Safari 工具列，可以避開 8.1 的第 3 種情況，也不受 Safari 7 天清除 `localStorage` 的限制（見 4.7）。manifest 是同網域檔案，不用改 CSP。
* **iOS 邊緣滑動返回**：在 Safari 從畫面左邊緣往右滑會回到上一頁，網頁無法阻止；直接開網址（沒有上一頁）時不受影響。
* iPad 的分割畫面、台前調度：方向依視窗形狀判斷，視窗比較窄時會被當成直向而顯示旋轉提示。
* 搖桿使用 Pointer Events（iOS 13 以上）；`ResizeObserver` 需要 iOS 13.4 以上，更舊的版本 HUD 換行時遊戲區域不會重新計算（旋轉或縮放視窗時仍會）。

## 9. 開發工具 (tools/)

2026-10-26 整理。參考 `C:\GitHub\mumuisland-web` 的架構，把開發工具集中到 `tools/`。規則摘要在 AGENTS.md 的「開發工具」與「Git」，本節是細節。維護者決定：
* 瀏覽器測試改寫成 `@playwright/test` 的 spec 檔，跟 mumuisland-web 一樣不用架伺服器。
* 社群分享圖 `public/screenshot.png` 改成獨立的 `og-image` 指令；瀏覽器測試只檢查、不改檔案。
* 工具的規則寫在 AGENTS.md 與本節，不像 mumuisland-web 另外建立 `private/rules/dev-tools.md` 與工具總表（專案小，一份設計文件就夠）。
* AGENTS.md 加上「agent 在維護者電腦上不自行安裝」與「本機 agent 不改 git 狀態」兩條規則，並新增 `CLAUDE.md`。

### 9.1 搬移與刪除
| 原本 | 現在 |
|---|---|
| `private/test_spawn.js` | `tools/browser/spawn.spec.js` |
| `private/verify_csp.js` | 檢查：`tools/browser/csp.spec.js`；覆寫分享圖：`tools/browser/og-image.js` |
| `private/verify.js`（8000 埠） | `tools/browser/boss.spec.js`；截圖改存 `tools/work/boss_level.png`（不進 git） |
| `private/test_touch.js` | `tools/browser/touch.spec.js` |
| 根目錄 `package.json`、`package-lock.json`（playwright 1.59.1，從來沒有安裝過） | `tools/package.json`、`tools/package-lock.json`（`@playwright/test` 1.63.0） |
| `private/boss_level.png`、`server.log`、`test-results/` | 刪除（測試產物）。`.gitignore` 加上 `*.log`、`test-results/`、`tools/node_modules/`、`tools/work/`、`.claude/launch.json` 等 |

`private/` 只剩設計文件與 `iframe.txt`。

### 9.2 執行方式
從 repo 根目錄執行，指令表在 AGENTS.md 的「本機執行與測試」：
* `npm --prefix tools test`：全部的瀏覽器測試；`npm --prefix tools run test:touch` 等只跑一個檔案。
* `npm --prefix tools run og-image`：覆寫 `public/screenshot.png`。只在要換分享圖時執行。
* 報告：`tools/work/playwright/report/index.html`；失敗截圖：`tools/work/playwright/results/`。

### 9.3 寫法
* CommonJS（`require`、`module.exports`），由 Playwright 直接執行，沒有 TypeScript 或打包。註解用繁體中文，跟遊戲程式一致。
* **`routeSite(page)`**（`tools/browser/site.js`）：開頁面前呼叫。網址用保留給測試的 `http://cherylgame.test`，本站的請求比照 Cloudflare Pages 從硬碟讀 `public/`（大小寫要相同、`/` 對到 `index.html`），找不到回 404；其他網站（Google Tag Manager 等）一律回空內容。不用架伺服器、不佔連接埠，也不連網；GTM 的 script 是空的，所以不會送出 GA 資料。
* **`watchErrors(page)`**：收集未攔截的例外與 console error（包含 CSP 擋下的資源），每個測試最後檢查是空的。
* `touch.spec.js` 每一項行為是一個測試，每個測試開新的頁面；裝置以 `test.use({ viewport, screen, isMobile, hasTouch })` 設定。
* `og-image.js` 以 1280×720 開啟第 1 關剛開始的畫面，跟原本 `verify_csp.js` 產生的分享圖大小相同。
* **Python**：目前沒有 Python 工具。之後新增時照 mumuisland-web 的做法：`tools/__init__.py`、`tools/config.py`（共用路徑）、一個工具一個模組（`python -m tools.<module>`）、`tools/tests/` 的 `unittest`。`.gitignore` 已先忽略 `.venv/`、`__pycache__/` 與根目錄的 `/*.py`。

### 9.4 安裝
* 由維護者手動執行（agent 不自行安裝，見 AGENTS.md）。2026-10-26 維護者已執行 `npm --prefix tools install`，產生 `tools/package-lock.json`；之後在新環境用 `npm --prefix tools ci` 照 lock 檔安裝。
* Playwright 1.63.0 用的 chromium-1243 已經在 `%LOCALAPPDATA%\ms-playwright`（所有專案共用），不用再下載瀏覽器。

### 9.5 驗證方式
2026-10-26，`tools/node_modules/` 的 `@playwright/test` 1.63.0（headless Chromium，8 個 worker 平行執行）：
* `npm --prefix tools test` 共 25 項：spawn、csp、boss 各 1 項，touch 22 項（3 種觸控裝置各 7 項，加上電腦 1 項）。
* 第一次執行 24 項通過、1 項失敗：iPad 第 10 代的「斜走碰到牆會沿著牆滑動」原本先拉 200ms 讓角色走到牆邊，平行執行時畫面更新次數不夠，角色還沒碰到牆。改成用 `isWallCollision()` 直接把角色貼到牆下，不靠等待時間。這是測試寫法的問題，遊戲本身沒有改。
* 修正後以 `--repeat-each=3` 執行 75 項全部通過（38.8 秒）；「沿著牆滑動」單獨重複 5 次（15 項）也全部通過。
* 測試前後 `public/` 所有檔案的 hash 相同，瀏覽器測試沒有改到網站檔案。
* `og-image` 產生 1280×720 的第 1 關畫面；驗證完已把 `public/screenshot.png` 還原成原本的分享圖。
* `boss.spec.js` 的截圖在 `tools/work/boss_level.png`。git 確認 `tools/node_modules/`、`tools/work/`、`.claude/launch.json` 被忽略，`tools/package.json`、`tools/package-lock.json`、`.npmrc`、設定檔與 spec 檔會進 git。