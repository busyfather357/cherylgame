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
├── iframe.txt                  # 提供給外部網站嵌入用的 iframe 語法
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
    * **答錯**：扣除 1 顆愛心 (HP)，觸發物理擊退效果 (Knockback)，強制玩家往後退一段距離避免連續碰撞。若 HP 歸零則觸發 Game Over 並重置進度。

## 3. UI/UX 介面設計 (style.css & index.html)

* **HUD 狀態列**：位於畫面上方，顯示當前血量 (❤️)、關卡層數 (Level) 與分數 (Score)，使用文字陰影提升在各種底色下的可讀性。
* **Mobile-First 控制區**：透過 CSS 媒體查詢 `@media (hover: none) and (pointer: coarse)` 自動判斷裝置。若為觸控螢幕，則顯示左下角 D-Pad 與右下角 Action 按鈕。
* **數學題庫彈窗**：使用絕對定位覆蓋於 Canvas 之上，採防呆設計（`isAnswering` 狀態鎖），防止玩家連點造成重複計分或錯誤判定。