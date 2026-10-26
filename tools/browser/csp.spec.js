// 開啟遊戲時沒有 console error 與未攔截的例外，包含 CSP 擋下的資源 (原 private/verify_csp.js 的檢查部分)
// 只檢查、不改檔案。更新社群分享圖 public/screenshot.png 改用：npm --prefix tools run og-image
const { test, expect } = require('@playwright/test');
const { routeSite, watchErrors, gameUrl } = require('./site');

test('開啟遊戲時沒有 console error', async ({ page }) => {
    const errors = watchErrors(page);
    await routeSite(page);
    await page.goto(gameUrl(), { waitUntil: 'networkidle' });
    expect(errors).toEqual([]);
});
