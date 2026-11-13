// 玩家角色：js/characters.js 列出的角色圖都存在，玩家的精靈圖載入成功、大小符合設定；
// 有全身圖 (fullBody) 的角色，全身圖載入成功、大小符合設定；
// 玩家方塊固定 50×52，碰撞範圍跟角色圖片無關 (換角色不影響遊戲平衡)。
// 角色圖與 characters.js 由 tools/sprites.py 產生 (private/doc/character_pipeline.md)
const { test, expect } = require('@playwright/test');
const { routeSite, watchErrors, gameUrl } = require('./site');

test('角色圖載入成功，玩家碰撞範圍不受角色圖影響', async ({ page }) => {
    const errors = watchErrors(page);
    await routeSite(page);
    await page.goto(gameUrl('?newgame'));
    await page.waitForFunction(() => spriteLoaded);

    const info = await page.evaluate(async () => {
        const anims = Object.values(playerCharacter.animations);
        const sheets = await Promise.all(Object.values(CHARACTERS).map(async c => (await fetch(c.sheet)).status));
        const withFullBody = Object.values(CHARACTERS).filter(c => c.fullBody);
        const fullBodies = await Promise.all(withFullBody.map(c => new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve({ image: c.fullBody.image, width: image.naturalWidth, height: image.naturalHeight });
            image.onerror = () => resolve({ image: c.fullBody.image, error: '載入失敗' });
            image.src = c.fullBody.image;
        })));
        return {
            sheets,
            fullBodies,
            expectedFullBodies: withFullBody.map(c => c.fullBody),
            sheet: { width: sprite.naturalWidth, height: sprite.naturalHeight },
            expected: {
                width: Math.max(...anims.map(a => a.frames)) * playerCharacter.cell,
                height: anims.length * playerCharacter.cell,
            },
            gameAnims: ['idle', 'run'].filter(name => name in playerCharacter.animations),
            hitbox: getPlayerHitbox(0, 0),
        };
    });
    expect(info.sheets.every(status => status === 200)).toBe(true);
    expect(info.fullBodies).toEqual(info.expectedFullBodies);
    expect(info.sheet).toEqual(info.expected);
    expect(info.gameAnims).toEqual(['idle', 'run']);
    expect(info.hitbox).toEqual({ x: 12.5, y: 13, width: 25, height: 26 });
    expect(errors).toEqual([]);
});
