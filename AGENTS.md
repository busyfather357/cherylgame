# AGENTS.md

給 AI Agent（Claude Code、Jules 等）的專案工作指引。完整的系統設計請讀 [`private/doc/system_architecture.md`](private/doc/system_architecture.md)。

## 專案概要
* 《RPG 數學挑戰：木木島趣味練習場》：給兒童練習加、減、乘法的網頁 RPG，支援電腦（鍵盤）與手機（觸控）。
* 純前端靜態網站：原生 HTML / CSS / JavaScript，沒有框架，也沒有打包 (build) 步驟。
* 正式網址 `https://mathrpg.mumuisland.com/`，由 Cloudflare Pages 部署 `public/` 資料夾。

## 目錄
* `public/`：部署資料夾。**放在這裡的每個檔案都會公開在網站上**，只放網站需要的檔案。
    * `script.js`：遊戲核心（地圖、碰撞、敵人、數學題、道具、選單、主迴圈）。
    * `js/`：依系統拆開的檔案，每個檔案開頭註明它用到其他檔案的哪些東西。
        * `save.js`：存檔（本局進度 + 永久資料）。
        * `experience.js`：經驗值與角色等級。
        * `currency.js`：金幣與鑽石。
        * `achievements.js`：答題統計與成就。
        * `shop.js`：商店。
    * `index.html`、`style.css`、`Pal_test.png`（角色精靈圖）、`screenshot.png`（社群分享圖 og:image）。
* `private/`：不部署。Playwright 測試腳本、`iframe.txt`（嵌入語法）、設計文件 `private/doc/`。
* 根目錄：`package.json`（只有 Playwright 依賴）、`README.md`、本檔。

## 本機執行與測試
啟動本機伺服器（根目錄必須是 `public/`，部分環境要用 `python3`）：
```bash
python -m http.server 8080 --directory public
```

測試需要先安裝 Playwright：
```bash
npm install
npx playwright install chromium
```

| 指令 | 連線埠 | 內容 |
|---|---|---|
| `node private/test_spawn.js` | 8080 | 每關恰好 1 個寶箱，其餘為怪物 |
| `node private/verify_csp.js` | 8080 | 載入時沒有 console error。**會覆寫 `public/screenshot.png`，也就是正式網站的社群分享圖** |
| `node private/verify.js` | **8000** | 強制進入第 5 關魔王關，截圖到 `private/boss_level.png` |

* 網址加上 `?newgame` 可忽略並清除存檔（包含經驗值、金幣、鑽石、成就），從第 1 關開始。

## 程式慣例
* 所有 `.js` 都是 classic script（不是 ES module），在 `index.html` 依序載入，頂層的 `const`／`let`／`function` 都是全域、可以跨檔案使用。測試透過 `page.evaluate` 直接存取 `gameState`、`profile`、`generateMap()`、`spawnEnemies()`、`updateHUD()` 等。**不要改成 module 或包進 IIFE**；改名或改參數時，同步修改 `private/*.js`。
* **載入順序**：`js/` 的系統檔案先載入，`script.js` 最後。`script.js` 一執行就會讀檔並開始第 1 關，所以系統檔案在載入時不能呼叫 `script.js` 的函式或讀取 `gameState`，只能在函式裡使用。`achievements.js` 必須在 `save.js` 之前（`save.js` 載入時就呼叫 `createEmptyStats()`）。
* 註解使用繁體中文，風格跟現有程式一致。遊戲畫面上的 UI 文字目前是英文（道具與成就名稱是中文）。畫面上的關卡叫 `Stage`，角色等級叫 `Lv`；程式裡的 `gameState.level` 仍是關卡。
* 移動與速度數值以 60fps 為基準再乘上 `dt`；時效性道具效果用 `performance.now()` 計時。
* **頂層執行順序 (TDZ)**：`script.js` 的 `hpDisplayCache`、`isAnswering` 等變數以 `let` 宣告。在宣告位置之前執行的頂層程式碼（例如第一次 `startLevel()`，它會呼叫 `recordStageReached()` 並可能跳出成就提示）不能碰到它們；要操作 HUD 或彈窗的初始化，放在 `script.js` 最末端。
* **`localStorage` 一律包 `try/catch`**（只在 `js/save.js` 存取）：遊戲可能在 sandbox iframe 中執行，此時連讀取 `window.localStorage` 都會丟出例外，沒攔截的話整個遊戲無法啟動。
* **存檔**分兩部分（見 `js/save.js` 開頭）：
    * 本局進度（關卡、HP、道具）只記錄「進關當下」：`saveProgress()` 只在 `startLevel()` 與進關時的商店呼叫。不要在關卡中途存道具，否則讀檔後寶箱重生，可被用來刷道具。
    * 永久資料 `profile`（經驗值、金幣、鑽石、答題統計、成就）改了就呼叫 `saveProfile()`，New Game 與從本關重來都不回溯。獎勵只能跟著「答對一題」給，不要讓寶箱等會隨讀檔重生的東西額外多給。
    * 存檔格式改變時要提高 `SAVE_VERSION`，**並在 `parseSave()` 加上舊版本的轉換**，否則現有玩家的進度會消失。
* 新增道具：先更新 `ITEM_TYPES`、`ITEM_INFO`、`SHOP_PRICES`（`js/shop.js`），再搜尋既有道具名稱（例如 `shield`）找出 `useItem()`、`index.html` 道具欄與手機按鈕等需要一起改的地方。
* 獎勵數值：經驗值 `XP_REWARDS`（`js/experience.js`）、金幣 `GOLD_REWARDS`（`js/currency.js`）、道具價格 `SHOP_PRICES`（`js/shop.js`）、成就與鑽石 `ACHIEVEMENTS`（`js/achievements.js`）。鑽石目前只從成就取得、沒有用途；所有鑽石來源都要經過 `addDiamonds()`。
* **CSP**：`index.html` 以 `<meta>` 設定 CSP，只允許本站與 Google Analytics／Tag Manager。不要引入外部 CDN、字型或腳本；確實需要時同步修改 CSP 並執行 `verify_csp.js`。

## 設計原則
* 玩家是兒童。題目範圍（加法 10～59、減法結果為正、乘法 1～9）、難度與懲罰機制屬於設計決策，調整前先與維護者確認。經驗值、金幣、商店價格、成就與鑽石的數值和用途也一樣。

## 文件
* 行為或架構改變時，同步更新 `private/doc/system_architecture.md`。
* `private/iframe.txt` 的 `sandbox` 必須保留 `allow-same-origin`，拿掉會讓嵌入版無法存檔、角色出現白框；也不要把這段 iframe 放在 `mathrpg.mumuisland.com` 自己的頁面裡。原因見架構文件第 5 節。
