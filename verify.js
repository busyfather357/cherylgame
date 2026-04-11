const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:8000');

    // Wait for the game canvas
    await page.waitForSelector('#game');

    // Override the level to 5 to trigger the boss
    await page.evaluate(() => {
        gameState.level = 5;
        generateMap(gameState.level);
        spawnEnemies(5);
        updateHUD();
    });

    // Wait briefly for drawing and possible spawning to happen
    await page.waitForTimeout(2000);

    // Take a screenshot to show the boss level is loaded
    await page.screenshot({ path: 'boss_level.png' });

    console.log("Screenshot taken.");

    await browser.close();
})();
