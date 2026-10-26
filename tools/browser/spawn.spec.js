// 第 1 關的敵人：恰好 1 個寶箱，其餘都是怪物 (原 private/test_spawn.js)
// 敵人的 type 維持 'monster'／'chest'／'boss'，種類放在 kind (AGENTS.md)
const { test, expect } = require('@playwright/test');
const { routeSite, watchErrors, gameUrl } = require('./site');

test('第 1 關恰好 1 個寶箱，其餘是怪物', async ({ page }) => {
    const errors = watchErrors(page);
    await routeSite(page);
    await page.goto(gameUrl('?newgame'));

    const types = await page.evaluate(() => gameState.enemies.map(enemy => enemy.type));
    expect(types.filter(type => type === 'chest')).toHaveLength(1);
    expect(types.filter(type => type !== 'chest' && type !== 'monster')).toEqual([]);
    expect(types.length).toBeGreaterThan(1);
    expect(errors).toEqual([]);
});
