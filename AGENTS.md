# AGENTS.md

給 AI Agent（Claude Code、Jules 等）的專案工作指引。完整的系統設計請讀 [`private/doc/system_architecture.md`](private/doc/system_architecture.md)。

## 專案概要
* 《RPG 數學挑戰：木木島趣味練習場》：給兒童練習加、減、乘法的網頁 RPG，支援電腦（鍵盤）與手機、平板（觸控搖桿）。**手機只支援直向、平板只支援橫向**，方向不對時顯示旋轉提示並暫停。
* 純前端靜態網站：原生 HTML / CSS / JavaScript，沒有框架，也沒有打包 (build) 步驟。
* 正式網址 `https://mathrpg.mumuisland.com/`，由 Cloudflare Pages 部署 `public/` 資料夾。

## 目錄
* `public/`：部署資料夾。**放在這裡的每個檔案都會公開在網站上**，只放網站需要的檔案。
    * `script.js`：遊戲核心（地圖、碰撞、出題與答題、道具、選單、主迴圈）。
    * `js/`：依系統拆開的檔案，每個檔案開頭註明它用到其他檔案的哪些東西。
        * `save.js`：存檔（本局進度 + 永久資料）。
        * `experience.js`：經驗值與角色等級。
        * `currency.js`：金幣與鑽石。
        * `achievements.js`：答題統計與成就。
        * `shop.js`：商店。
        * `questions.js`：數學題目與錯誤選項（第 11 關起變難）。
        * `stages.js`：章節（每 10 關）、主題、每關的怪物組成與魔王。
        * `enemies.js`：怪物、寶箱、魔王的建立、移動、攻擊與繪製。
        * `touch.js`：觸控模式、浮動搖桿、道具按鈕、畫面方向、遊戲區域（地圖的繪製範圍）、`?debug`。
    * `index.html`、`style.css`、`Pal_test.png`（角色精靈圖）、`shop_bg.webp`（商店背景圖）、`screenshot.png`（社群分享圖 og:image）。
* `tools/`：本機開發工具，不部署（見「開發工具」）。`package.json`、`package-lock.json`（只有 `@playwright/test` 1.63.0）、`playwright.config.js`、`browser/`（瀏覽器測試與 `og-image.js`）；`node_modules/` 與工具輸出 `work/` 不進 git。
* `private/`：不部署。設計文件 `private/doc/`、`iframe.txt`（嵌入語法）。
* 根目錄：`AGENTS.md`（本檔）、`CLAUDE.md`、`README.md`、`.gitignore`。

## 本機執行與測試
手動試玩時啟動本機伺服器（根目錄必須是 `public/`，部分環境要用 `python3`）：
```bash
python -m http.server 8080 --directory public
```

瀏覽器測試 (`tools/`，Node + Playwright) 從 repo 根目錄執行。第一次要先安裝套件；在維護者的電腦上由維護者手動執行，agent 不要自己裝（見「開發工具」）：
```bash
npm --prefix tools ci
```

| 指令 | 內容 |
|---|---|
| `npm --prefix tools test` | 全部的瀏覽器測試 |
| `npm --prefix tools run test:spawn` | 第 1 關恰好 1 個寶箱，其餘為怪物 |
| `npm --prefix tools run test:csp` | 開啟遊戲時沒有 console error（包含 CSP 擋下的資源） |
| `npm --prefix tools run test:boss` | 強制進入第 5 關魔王關，截圖到 `tools/work/boss_level.png` |
| `npm --prefix tools run test:touch` | 觸控搖桿、道具按鈕、遊戲區域與畫面方向（手機直向、平板橫向、電腦） |
| `npm --prefix tools run og-image` | **覆寫 `public/screenshot.png`，也就是正式網站的社群分享圖**。只在要換分享圖時執行 |

* 測試不用架伺服器：`tools/browser/site.js` 的 `routeSite()` 直接從硬碟提供 `public/`，連到其他網站（Google Tag Manager 等）的請求一律回空內容，不連網。
* 報告在 `tools/work/playwright/report/index.html`，失敗截圖在 `tools/work/playwright/results/`。
* 網址加上 `?newgame` 可忽略並清除存檔（包含經驗值、金幣、鑽石、成就），從第 1 關開始。
* 網址加上 `?debug` 會顯示畫面尺寸資訊，並以紅框畫出畫布邊緣、黃框畫出遊戲區域，用來在手機、平板實機上找版面問題（架構文件 8.1）。

## 程式慣例
* 所有 `.js` 都是 classic script（不是 ES module），在 `index.html` 依序載入，頂層的 `const`／`let`／`function` 都是全域、可以跨檔案使用。測試透過 `page.evaluate` 直接存取 `gameState`、`profile`、`generateMap()`、`spawnEnemies()`、`updateHUD()` 等。**不要改成 module 或包進 IIFE**；改名或改參數時，同步修改 `tools/browser/*.spec.js`。
* **載入順序**：`js/` 的系統檔案先載入，`script.js` 最後。`script.js` 一執行就會讀檔並開始第 1 關，所以系統檔案在載入時不能呼叫 `script.js` 的函式或讀取 `gameState`，只能在函式裡使用；頂層常數也不能用到 `script.js` 的常數（例如 `TILE_SIZE`），距離直接寫像素。`achievements.js` 必須在 `save.js` 之前（`save.js` 載入時就呼叫 `createEmptyStats()`）。
* 註解使用繁體中文，風格跟現有程式一致。遊戲畫面上的 UI 文字目前是英文（道具與成就名稱是中文）。畫面上的關卡叫 `Stage`，角色等級叫 `Lv`；程式裡的 `gameState.level` 仍是關卡。
* 移動與速度數值以 60fps 為基準再乘上 `dt`；時效性道具效果用 `performance.now()` 計時。
* 玩家的移動方向一律經過 `getMoveVector()`（鍵盤與搖桿合成，長度最多 1）；新的輸入方式加在這裡，暫停與切換 App 時要在 `releaseAllInput()` 放開。
* 地圖格數依整個畫面計算，繪製時縮放到 `getPlayArea()`（`js/touch.js`）；觸控模式下控制鍵與 HUD 不會蓋住地圖。新增固定在畫面上的觸控按鈕時，要讓 `refreshTouchLayout()` 把它的位置從遊戲區域扣掉。
* **頂層執行順序 (TDZ)**：`script.js` 的 `hpDisplayCache`、`isAnswering` 等變數以 `let` 宣告。在宣告位置之前執行的頂層程式碼（例如第一次 `startLevel()`，它會呼叫 `recordStageReached()` 並可能跳出成就提示）不能碰到它們；要操作 HUD 或彈窗的初始化，放在 `script.js` 最末端。
* **`localStorage` 一律包 `try/catch`**（只在 `js/save.js` 存取）：遊戲可能在 sandbox iframe 中執行，此時連讀取 `window.localStorage` 都會丟出例外，沒攔截的話整個遊戲無法啟動。
* **存檔**分兩部分（見 `js/save.js` 開頭）：
    * 本局進度（關卡、HP、道具）只記錄「進關當下」：`saveProgress()` 只在 `startLevel()` 與進關時的商店呼叫。不要在關卡中途存道具，否則讀檔後寶箱重生，可被用來刷道具。
    * 永久資料 `profile`（經驗值、金幣、鑽石、答題統計、成就）改了就呼叫 `saveProfile()`，New Game 與從本關重來都不回溯。獎勵只能跟著「答對一題」給，不要讓寶箱等會隨讀檔重生的東西額外多給。
    * 存檔格式改變時要提高 `SAVE_VERSION`，**並在 `parseSave()` 加上舊版本的轉換**，否則現有玩家的進度會消失。
* 新增道具：先更新 `ITEM_TYPES`、`ITEM_INFO`、`SHOP_PRICES`（`js/shop.js`），再搜尋既有道具名稱（例如 `shield`）找出 `useItem()`、`index.html` 道具欄與觸控道具按鈕（`data-item`）等需要一起改的地方。
* 獎勵數值：經驗值 `XP_REWARDS`（`js/experience.js`）、金幣 `GOLD_REWARDS`（`js/currency.js`）、道具價格 `SHOP_PRICES`（`js/shop.js`）、成就與鑽石 `ACHIEVEMENTS`（`js/achievements.js`）。鑽石目前只從成就取得、沒有用途；所有鑽石來源都要經過 `addDiamonds()`。
* 難度數值：章節與每關的怪物數、障礙物比例 `CHAPTERS`（`js/stages.js`）；新怪物 `MONSTER_KINDS`、魔王 `BOSS_TYPES` 與攻擊間隔（`js/enemies.js`）；題目範圍與第 11 關起的難度（`js/questions.js`）。關卡相關的設定都由關卡數推算，不要存進存檔。
* 新增怪物或魔王：敵人的 `type` 維持 `'monster'`／`'chest'`／`'boss'`，種類放在 `kind`（`tools/browser/spawn.spec.js` 依 `type` 檢查寶箱數）；碰到時算什麼由 `getContactType()` 決定，答對的獎勵類型放在敵人的 `reward`。每個攻擊前都要有預警。
* **CSP**：`index.html` 以 `<meta>` 設定 CSP，只允許本站與 Google Analytics／Tag Manager。不要引入外部 CDN、字型或腳本；確實需要時同步修改 CSP 並執行 `npm --prefix tools run test:csp`。

## 開發工具 (`tools/`)
* 開發用的程式碼只放在 `tools/`（目前是 Node + Playwright 的瀏覽器測試，之後的 Python 工具也放這裡），根目錄不放零散的腳本。`public/` 不能連結、載入或依賴 `tools/` 的任何東西。
* 瀏覽器測試一個檔案一項檢查：`tools/browser/<name>.spec.js`，檔案開頭註明檢查什麼；共用的程式放在 `tools/browser/site.js`。開頁面前先呼叫 `routeSite(page)`。
* 瀏覽器測試只檢查、不改 `public/`。唯一會改 `public/` 的是 `og-image`（覆寫 `public/screenshot.png`）。
* 截圖、報告等輸出一律放 `tools/work/`（不進 git），不要寫到 `public/`、`private/` 或根目錄。
* **在維護者的電腦上不要自行安裝任何程式、套件或瀏覽器**（`npm install`、`npm ci`、`npx playwright install`、`pip install` 等），也不要用會自動下載的指令（例如沒加 `--no-install` 的 `npx`）。需要安裝時，把指令交給維護者手動執行。雲端 agent（例如 Jules）可以在自己的環境用 `npm --prefix tools ci` 照 lock 檔安裝，沒有瀏覽器時再執行 `npm --prefix tools exec -- playwright install --with-deps chromium`。
* 新增或升級套件（npm 或 Python）要先經維護者同意，版本一律寫死（`tools/.npmrc` 是 `save-exact=true`）。Playwright 1.63.0 用的 chromium-1243 已經在維護者電腦的 `%LOCALAPPDATA%\ms-playwright`，升級 Playwright 要重新下載數百 MB 的瀏覽器，詢問時要說明。

## Git
* **本機的 CLI agent（例如在維護者電腦上執行的 Claude Code）不改 git 狀態**：不 commit、不建 branch、不 push、不開 PR，也不用 `git mv`、`git rm`。只修改工作目錄的檔案，完成後回報改了哪些檔案、做了哪些驗證，由維護者檢查後 commit。唯讀的指令（`status`、`diff`、`log`、`ls-files`、`check-ignore`）可以用。
* 雲端 agent（例如 Jules）照一般的 PR 流程。

## 設計原則
* 玩家是兒童。題目範圍（加法 10～59、減法結果為正、乘法 1～9）、難度與懲罰機制屬於設計決策，調整前先與維護者確認。經驗值、金幣、商店價格、成就與鑽石的數值和用途也一樣。章節、新怪物、魔王與題目難度的設計見 `private/doc/system_architecture.md` 第 7 節。

## 文件
* 行為或架構改變時，同步更新 `private/doc/system_architecture.md`。
* `private/iframe.txt` 的 `sandbox` 必須保留 `allow-same-origin`，拿掉會讓嵌入版無法存檔、角色出現白框；也不要把這段 iframe 放在 `mathrpg.mumuisland.com` 自己的頁面裡。原因見架構文件第 5 節。
