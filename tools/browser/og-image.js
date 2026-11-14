// 更新社群分享圖 public/screenshot.png (index.html 的 og:image)：第 1 關剛開始的畫面，1280×720。
// 會覆寫 public/ 的檔案，只在要換分享圖時執行 (從 repo 根目錄)：npm --prefix tools run og-image
// 原本由 private/verify_csp.js 每次執行時順便覆寫，現在拆開，瀏覽器測試只檢查、不改檔案
const path = require('path');
const { chromium } = require('@playwright/test');
const { routeSite, startGame, PUBLIC_DIR } = require('./site');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await routeSite(page);
    await startGame(page); // 開場的選角色畫面用預設的騎士開始
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => spriteLoaded);
    // 停在剛開始的畫面：敵人不動，角色也不會因為開始後的保護時間而閃爍。等畫面重畫後再截圖
    await page.evaluate(() => { gameState.paused = true; });
    await page.waitForTimeout(200);

    const file = path.join(PUBLIC_DIR, 'screenshot.png');
    await page.screenshot({ path: file });
    await browser.close();
    console.log(`Updated ${file}`);
})();
