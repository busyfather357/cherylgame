const path = require('path');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
            console.error(`Console Error: ${msg.text()}`);
        }
    });

    page.on('pageerror', error => {
        errors.push(error.message);
        console.error(`Page Error: ${error.message}`);
    });

    console.log("Navigating to http://localhost:8080/index.html");
    await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle' });

    console.log("Taking screenshot");
    // screenshot.png 同時是 index.html 的 og:image，需放在部署資料夾 public/
    await page.screenshot({ path: path.join(__dirname, '..', 'public', 'screenshot.png') });

    await browser.close();

    if (errors.length > 0) {
        console.error("Found errors!");
        process.exit(1);
    } else {
        console.log("No errors found. Verification successful.");
        process.exit(0);
    }
})();
