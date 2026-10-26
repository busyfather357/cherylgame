// 強制進入第 5 關：只有 🐉 火龍一隻魔王，截圖到 tools/work/boss_level.png (原 private/verify.js)
const path = require('path');
const { test, expect } = require('@playwright/test');
const { routeSite, watchErrors, gameUrl, WORK_DIR } = require('./site');

test('第 5 關是火龍魔王關', async ({ page }) => {
    const errors = watchErrors(page);
    await routeSite(page);
    await page.goto(gameUrl('?newgame'));

    const enemies = await page.evaluate(() => {
        gameState.level = 5;
        generateMap(gameState.level);
        spawnEnemies();
        updateHUD();
        return gameState.enemies.map(enemy => ({ type: enemy.type, kind: enemy.kind }));
    });
    expect(enemies).toEqual([{ type: 'boss', kind: 'dragon' }]);

    // 等魔王登場提示與畫面更新後再截圖
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(WORK_DIR, 'boss_level.png') });
    expect(errors).toEqual([]);
});
