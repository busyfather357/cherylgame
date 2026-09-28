const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Listen for any console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // Expose gameState to window during execution if it isn't already exposed
    await page.addInitScript(() => {
        // Wait for script.js to load, or we can just access it if it's declared globally
    });

    await page.goto('http://localhost:8080');

    // Wait for a moment to let the game initialize and draw
    await page.waitForTimeout(1000);

    // Get the enemies from the game state.
    // In script.js, `gameState` is declared with `const`. It is not attached to `window`.
    // Since this is a browser environment, `const` at top-level scope isn't attached to window.
    // We can evaluate code in the page context. If it's not a module, we can just access it.
    const enemies = await page.evaluate(() => {
        return gameState.enemies.map(e => ({ type: e.type, icon: e.icon }));
    });

    console.log('Enemies:', enemies);

    const chestCount = enemies.filter(e => e.type === 'chest').length;
    const monsterCount = enemies.filter(e => e.type === 'monster').length;

    console.log(`Chests: ${chestCount}, Monsters: ${monsterCount}`);

    if (chestCount === 1 && monsterCount === enemies.length - 1) {
        console.log('SUCCESS: Exactly 1 chest and rest are monsters.');
    } else {
        console.log('FAILED: Incorrect counts.');
        process.exit(1);
    }

    await browser.close();
})();
