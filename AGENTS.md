# AGENTS.md

給 AI Agent（Claude Code、Google Antigravity 等）的專案工作指引：規則與每個人都要知道的做法。其他文件見下面的「文件」；**開始工作前先看 [`private/doc/work_plan.md`](private/doc/work_plan.md)（工作計畫總表）**。

## 專案概要
* 《RPG 數學挑戰：木木島趣味練習場》：給兒童練習加、減、乘法的網頁 RPG，支援電腦（鍵盤）與手機、平板（觸控搖桿）。**手機只支援直向、平板只支援橫向**，方向不對時顯示旋轉提示並暫停。
* 純前端靜態網站：原生 HTML / CSS / JavaScript，沒有框架，也沒有打包 (build) 步驟。
* 正式網址 `https://mathrpg.mumuisland.com/`，由 Cloudflare Pages 部署 `public/` 資料夾。

## 執行環境（先確認你在哪裡）
能不能改 git 狀態、能不能安裝東西，依你在哪裡執行而定：

| | 本機 | 雲端 |
|---|---|---|
| 是什麼 | 維護者的電腦：Windows，repo 在 `C:\GitHub\cherylgame`，Google Drive 掛載在 `G:\` | 平台提供的容器或 VM（通常是 Linux）：**Google Antigravity**、**Claude Code 的雲端工作階段**（claude.ai/code，從網頁、手機或桌面 App 開的遠端工作階段） |
| 工作目錄 | 維護者直接看得到，會自己檢查 diff | 暫時的，工作階段結束就消失，維護者看不到 |
| git | **不改 git 狀態**：只改檔案，由維護者 commit | **用 PR 交付**：在自己的分支 commit、push、開 PR（見「Git 與 PR 流程」） |
| 安裝 | **不自行安裝**：把指令交給維護者 | 可以照 lock 檔安裝 `tools/` 的套件（見「開發工具」） |
| Google Drive 的 `reference/` | 讀得到 | Antigravity 讀得到自己上傳的檔案；Claude Code 讀不到，只拿得到維護者在對話中附上的圖 |

* 同一個 agent 在兩種環境的規則不同：Claude Code 在維護者的電腦上是本機，在 claude.ai/code 的雲端工作階段是雲端。
* 分不出來時當成本機，並詢問維護者。

## 文件
文件分成規則、SOP、設計、計畫、經驗紀錄五種，各自放在不同的檔案。完整的文件地圖與「新的內容要寫在哪裡」見 [`private/doc/README.md`](private/doc/README.md)。

| 文件 | 類型 | 什麼時候讀 |
|---|---|---|
| `AGENTS.md`（本檔） | 規則 + SOP | 每次 |
| [`private/doc/work_plan.md`](private/doc/work_plan.md) | 計畫 | **每次開始前**：每個角色、功能、工具做到哪裡，已決定與待決定的事 |
| [`private/doc/system_architecture.md`](private/doc/system_architecture.md) | 設計 | 改遊戲程式之前 |
| [`private/doc/character_pipeline.md`](private/doc/character_pipeline.md) | SOP | 把角色原圖轉成遊戲用的檔案 |
| [`private/doc/art_guide.md`](private/doc/art_guide.md) | SOP | 畫圖、檢查原圖、寫需求單 |
| [`private/doc/lessons_learned.md`](private/doc/lessons_learned.md) | 經驗紀錄 | 想知道為什麼這樣規定、以前試過什麼 |

* **每次工作結束前更新文件**，跟程式放在同一個 PR（本機是同一次修改）：
    * 狀態改變（完成一個步驟、發現新的待辦、維護者做了決定）：`work_plan.md`。
    * 行為或架構改變：`system_architecture.md`；工具或轉檔的做法改變：`character_pipeline.md`；畫圖的規則改變：`art_guide.md`。
    * 測試結果、實測數據、踩到的坑：`lessons_learned.md`。會改變做法的經驗要同時寫進規則或 SOP，只記在經驗紀錄的話下一個 agent 不會照著做。
* SOP 與設計只寫現在的做法，不放流水帳；節號被其他文件與程式註解引用，不要重新編號。
* `private/iframe.txt` 的 `sandbox` 必須保留 `allow-same-origin`，拿掉會讓嵌入版無法存檔；也不要把這段 iframe 放在 `mathrpg.mumuisland.com` 自己的頁面裡。原因見架構文件第 5 節。

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
        * `characters.js`：角色的精靈圖、動畫設定與全身圖。**由 `tools/sprites.py` 產生，不要手動修改**。
    * `characters/`：角色的精靈圖 `<id>.png` 與全身圖 `<id>_full.jpg`（選角色介面、角色面板用），由 `tools/sprites.py` 產生。
    * `index.html`、`style.css`、`shop_bg.webp`（商店背景圖）、`screenshot.png`（社群分享圖 og:image）。
* `tools/`：本機開發工具，不部署（見「開發工具」）。
    * Node + Playwright：`package.json`、`package-lock.json`（只有 `@playwright/test` 1.63.0）、`playwright.config.js`、`browser/`（瀏覽器測試與 `og-image.js`）。
    * Python：`config.py`（共用路徑）、`sprites.py`（角色精靈圖建置）、`characters/`（每個角色的設定檔）、`tests/`（unittest）。
    * `node_modules/` 與工具輸出 `work/` 不進 git。
* `private/`：不部署。文件 `private/doc/`（見「文件」）、`iframe.txt`（嵌入語法）。
* `reference/`：參考素材（AI 生成的原圖、候選圖、畫風基準圖），**不進 git**（`.gitignore`），也不部署。**正本在 Google Drive**，不在 repo 裡（見「Google Drive 對照資料夾」）。repo 盡量維持輕量，大型原圖放這裡，不要放進 `public/` 或 `private/`。角色原圖在 `reference/characters/<id>/`，背景原圖在 `reference/backgrounds/<id>/`。
* 根目錄：`AGENTS.md`（本檔）、`CLAUDE.md`、`README.md`、`.gitignore`、`.github/pull_request_template.md`（PR 說明的固定段落）。

## 本機執行與測試
手動試玩時啟動本機伺服器（根目錄必須是 `public/`，部分環境要用 `python3`）：
```bash
python -m http.server 8080 --directory public
```

瀏覽器測試 (`tools/`，Node + Playwright) 從 repo 根目錄執行。第一次要先安裝套件；本機由維護者手動執行，agent 不要自己裝，雲端 agent 可以自己執行（見「開發工具」）：
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
| `npm --prefix tools run test:character` | 角色圖載入成功，玩家碰撞範圍不受角色圖影響 |
| `npm --prefix tools run og-image` | **覆寫 `public/screenshot.png`，也就是正式網站的社群分享圖**。只在要換分享圖時執行 |

角色精靈圖（Python，使用系統 Python 已安裝的 Pillow 12.3.0，不另外安裝）。工具的流程見 [`private/doc/character_pipeline.md`](private/doc/character_pipeline.md)，原圖怎麼畫見 [`private/doc/art_guide.md`](private/doc/art_guide.md)：

| 指令 | 內容 |
|---|---|
| `python -m tools.sprites <id>` | 依 `tools/characters/<id>.json` 與原圖 `reference/characters/<id>/` 重建角色：**寫入 `public/characters/<id>.png`、全身圖 `<id>_full.jpg`（設定檔有 `fullBody` 時）與 `public/js/characters.js`**，預覽與報告在 `tools/work/sprites/<id>/` |
| `python -m tools.sprites --all` | 重建全部角色 |
| `python -m tools.sprites --full-body <id>` | 只重建全身圖 `public/characters/<id>_full.jpg` 與 `characters.js` 裡的 `fullBody`，精靈圖不動。只需要全身圖的原圖（雲端環境沒有精靈圖原圖時用） |
| `python -m tools.sprites --check` | 檢查 `public/` 的角色圖是否跟原圖與設定一致，不寫檔（讀不到原圖的角色略過） |
| `python -m tools.sprites template` | 產生給生圖模型參考的版面圖 `tools/work/sprites/template.png` |
| `python -m unittest discover -s tools/tests -t .` | Python 工具的測試（離線、不需要原圖） |

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
* **角色圖**：去背、切格、對齊、縮放都在 `tools/sprites.py` 建置時完成，遊戲只讀 `js/characters.js` 與 `characters/<id>.png` 直接繪製，不在執行期處理像素。要改角色就改 `tools/characters/<id>.json` 或原圖再重建，不要手動改產出。全身圖 `characters/<id>_full.jpg`（512×768 的 JPEG，沒有透明、底色已經鋪好）只給介面顯示，路徑與大小在 `CHARACTERS[id].fullBody`；還沒有全身圖的角色沒有這個欄位，用到的介面要能處理。玩家方塊固定為 `PLAYER_WIDTH`×`PLAYER_HEIGHT`（50×52），碰撞、出生位置、擊退都以它為準，跟角色圖片無關；角色圖以腳底中心對齊方塊底部中心。
* **CSP**：`index.html` 以 `<meta>` 設定 CSP，只允許本站與 Google Analytics／Tag Manager。不要引入外部 CDN、字型或腳本；確實需要時同步修改 CSP 並執行 `npm --prefix tools run test:csp`。

## 開發工具 (`tools/`)
* 開發用的程式碼只放在 `tools/`（Node + Playwright 的瀏覽器測試、Python 工具），根目錄不放零散的腳本。`public/` 不能連結、載入或依賴 `tools/` 的任何東西。
* 瀏覽器測試一個檔案一項檢查：`tools/browser/<name>.spec.js`，檔案開頭註明檢查什麼；共用的程式放在 `tools/browser/site.js`。開頁面前先呼叫 `routeSite(page)`。
* Python 工具一個工具一個模組，從 repo 根目錄以 `python -m tools.<module>` 執行，共用路徑放 `tools/config.py`，測試放 `tools/tests/test_<module>.py`（unittest）。只用維護者電腦系統 Python 已安裝的 Pillow 12.3.0，不建 venv、不另外安裝。
* 瀏覽器測試只檢查、不改 `public/`。會改 `public/` 的只有 `og-image`（覆寫 `public/screenshot.png`）與 `tools.sprites`（角色圖與 `js/characters.js`）。
* 截圖、報告等輸出一律放 `tools/work/`（不進 git），不要寫到 `public/`、`private/` 或根目錄。
* **本機（維護者的電腦）不要自行安裝任何程式、套件或瀏覽器**（`npm install`、`npm ci`、`npx playwright install`、`pip install` 等），也不要用會自動下載的指令（例如沒加 `--no-install` 的 `npx`）。需要安裝時，把指令交給維護者手動執行。
* **雲端 agent**（Google Antigravity、Claude Code 的雲端工作階段）可以在自己的環境用 `npm --prefix tools ci` 照 lock 檔安裝；只裝 lock 檔裡的東西，不新增、不升級套件。環境沒有瀏覽器時再執行 `npm --prefix tools exec -- playwright install --with-deps chromium`；已經內建相符的瀏覽器時不要再下載（Claude Code 的雲端環境內建 Playwright 1.63.0 用的 chromium-1243）。Python 只用環境已有的 Pillow，版本不是 12.3.0 時不要重建角色圖（產出會有差異）。
* 新增或升級套件（npm 或 Python）要先經維護者同意，版本一律寫死（`tools/.npmrc` 是 `save-exact=true`）。Playwright 1.63.0 用的 chromium-1243 已經在維護者電腦的 `%LOCALAPPDATA%\ms-playwright`，升級 Playwright 要重新下載數百 MB 的瀏覽器，詢問時要說明。

## Git 與 PR 流程
* **本機 agent（在維護者電腦上執行的 Claude Code 等）不改 git 狀態**：不 commit、不建 branch、不 push、不開 PR，也不用 `git mv`、`git rm`。只修改工作目錄的檔案，完成後回報改了哪些檔案、做了哪些驗證，由維護者檢查後 commit。唯讀的指令（`status`、`diff`、`log`、`ls-files`、`check-ignore`）可以用。
* **雲端 agent（Google Antigravity、Claude Code 的雲端工作階段）用 PR 交付**，由維護者在 GitHub 審查後合併。工作完成就開 PR，這是維護者的常設指示，不用每次再問。
* `main` 是正式網站的來源（Cloudflare Pages 部署 `public/`）。**不直接 push `main`、不自行合併 PR、不 force push 別人的分支**。

雲端 agent 的步驟：

1. **分支**：從最新的 `main` 開始。平台指定分支名稱時用它（Claude Code 的雲端工作階段是 `claude/...`）；沒有指定時用 `<類型>/<簡短英文描述>`，例如 `feat/ranger-character`、`fix/touch-layout`、`docs/work-plan`。一個 PR 一個主題，不混進無關的修改。
2. **修改**，同一個 PR 更新文件（見「文件」）；`private/doc/work_plan.md` 的狀態每次都要看一次。
3. **驗證**：改了什麼就跑什麼，結果寫進 PR。跑不了的（例如讀不到 Drive 上的原圖）要寫出來並說明原因。

    | 改了 | 要跑 |
    |---|---|
    | `public/` 的任何檔案 | `npm --prefix tools test` |
    | `tools/` 的 Python、角色設定檔 | `python -m unittest discover -s tools/tests -t .`、`python -m tools.sprites --check` |
    | 角色圖 | 上面三項，並看 `tools/work/sprites/<id>/` 的預覽與產出的圖 |
    | 只改文件 | 連結打得開、引用的節號對得上 |

4. **Commit**：訊息是 `<類型>(<範圍>): <中文摘要>`，例如 `feat(character): 新增牧師的全身圖`；內文寫為什麼改、改了什麼。類型：`feat` 新功能、`fix` 修正、`docs` 文件、`tools` 開發工具、`art` 只有美術產出、`refactor` 不改行為的整理。工具產出的檔案（`public/characters/`、`public/js/characters.js`）跟造成它改變的設定檔放在同一個 commit。
5. **Push** 到自己的分支。
6. **開 PR**，base 是 `main`。標題跟 commit 訊息同一個格式；說明照 [`.github/pull_request_template.md`](.github/pull_request_template.md) 的段落填：摘要、改了什麼、驗證、合併後維護者要做的事、待決定的事。
    * 「合併後維護者要做的事」寫 agent 做不到、但不做就不完整的事：把新的原圖放到 Google Drive、把改過的 `art_guide.md` 複製到 Drive、在實機上測試等。
7. **回報**：把 PR 的連結與「合併後維護者要做的事」告訴維護者。審查意見的修改 push 到同一個分支，不另外開 PR。
8. **合併之後**的下一件工作，從最新的 `main` 重新開分支，不要接著已經合併的分支繼續做。

## Google Drive 對照資料夾
* Google Drive 的 `Antigravity_Data/cherylgame/` **對照 repo 的根目錄**，資料夾結構跟 repo 完全相同：同一個相對路徑在兩邊是同一個東西。維護者的電腦上 Drive 掛載在 `G:\我的雲端硬碟\`，所以它是 `G:\我的雲端硬碟\Antigravity_Data\cherylgame\`。新增要放 Drive 的東西時照 repo 的路徑放，不要另外發明結構。
* 分工：**git 管程式、設定、文件；Drive 放不適合進 git 的大型檔案**。GitHub 的空間有限，檔案刪除後仍留在歷史裡；Drive 空間大，刪除就能釋出。
* **`reference/` 整個以 Drive 為正本**（`.gitignore` 排除它）。`tools/config.py` 的 `REFERENCE_DIR` 在 Drive 有掛載時直接讀 Drive 的 `reference/`，讀不到才用 repo 裡的 `reference/`；位置可以用環境變數 `CHERYLGAME_DRIVE_DIR` 改。repo 裡不需要另外留一份。
* 除了 `reference/`，Drive 上只放美術 agent 需要讀的文件副本（目前是 `private/doc/art_guide.md`）；正本在 git，修改後複製過去。程式與其他文件不要備份到 Drive（已經有 git）。
* Claude Code 在 Drive 上：可以讀 `reference/`、更新文件副本、寫需求單 `brief.md`；**美術 agent 產生的圖與紀錄不修改、不刪除**，`Antigravity_Data/` 底下其他專案的資料夾不要碰。

## 美術素材
* 分工（2026-11-12 起）：**Google Antigravity 負責畫圖**（角色、背景的原圖），**Claude Code 負責程式與轉檔**（原圖 → 遊戲用的檔案）。Jules 已停用。
* 每個角色做到哪一步、接下來要畫誰：[`private/doc/work_plan.md`](private/doc/work_plan.md) 第 2 節。美術的工作以需求單 `brief.md` 交接（`art_guide.md` 9.1），畫完或核可後更新總表。
* 畫圖的規則、提示詞範本、資料夾與檔名、核可流程都在 [`private/doc/art_guide.md`](private/doc/art_guide.md)。這份文件要能單獨閱讀（Antigravity 讀的是 Drive 上同一個路徑的副本）；修改後提高文件開頭的規範版本，並把新版複製到 Drive。
* 美術 agent 生成的圖先放 `reference/<characters|backgrounds>/<id>/drafts/`，維護者核可的定稿複製到上一層 `reference/<characters|backgrounds>/<id>/`；轉檔工具只讀定稿那一層。
* 美術 agent 只交原圖：不去背、不裁切、不縮放，也不寫入 repo 的 `public/`。去背、切格、對齊、縮放、壓縮都由 `tools/` 的工具在建置時完成。
* 原圖不符合規則（留下綠邊、切格錯誤、動作不連貫）時回報並重畫，不要手動修圖；規則不夠清楚就修改 `art_guide.md`。
* 畫風（頭身比例、可愛程度）屬於設計決策，調整前先與維護者確認。

## 設計原則
* 玩家是兒童。題目範圍（加法 10～59、減法結果為正、乘法 1～9）、難度與懲罰機制屬於設計決策，調整前先與維護者確認。經驗值、金幣、商店價格、成就與鑽石的數值和用途也一樣。章節、新怪物、魔王與題目難度的設計見 `private/doc/system_architecture.md` 第 7 節。
