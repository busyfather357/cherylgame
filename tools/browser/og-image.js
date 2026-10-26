// 更新社群分享圖 public/screenshot.png (index.html 的 og:image)：第 1 關剛開始的畫面，1280×720。
// 會覆寫 public/ 的檔案，只在要換分享圖時執行 (從 repo 根目錄)：npm --prefix tools run og-image
// 原本由 private/verify_csp.js 每次執行時順便覆寫，現在拆開，瀏覽器測試只檢查、不改檔案
const path = require('path');
const { chromium } = require('@playwright/test');
const { routeSite, gameUrl, PUBLIC_DIR } = require('./site');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await routeSite(page);
    await page.goto(gameUrl('?newgame'), { waitUntil: 'networkidle' });

    const file = path.join(PUBLIC_DIR, 'screenshot.png');
    await page.screenshot({ path: file });
    await browser.close();
    console.log(`Updated ${file}`);
})();
