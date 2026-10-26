// tools/browser/ 的瀏覽器測試設定。從 repo 根目錄執行：npm --prefix tools test
// 不用架伺服器：tools/browser/site.js 的 routeSite() 直接從硬碟提供 public/ 的檔案，也不連網。
// 輸出 (HTML 報告、失敗截圖) 一律放在 tools/work/playwright/，不要改到別的地方。

const { defineConfig, devices } = require('@playwright/test');
const { SITE_ORIGIN } = require('./browser/site');

module.exports = defineConfig({
    testDir: './browser',
    outputDir: './work/playwright/results',
    fullyParallel: true,
    forbidOnly: true,
    retries: 0,
    reporter: [['list'], ['html', { outputFolder: './work/playwright/report', open: 'never' }]],
    use: {
        ...devices['Desktop Chrome'], // 1280×720，跟原本 private/*.js 的預設畫面相同
        baseURL: SITE_ORIGIN,
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium' }],
});
