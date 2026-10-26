// 觸控操作：浮動搖桿、道具按鈕、遊戲區域與畫面方向 (手機只支援直向、平板只支援橫向)，以及電腦沒有觸控控制鍵 (原 private/test_touch.js)
// 以頁面中的 PointerEvent (pointerType 'touch') 模擬觸控，遊戲照常以 requestAnimationFrame 執行
const { test, expect } = require('@playwright/test');
const { routeSite, watchErrors, gameUrl } = require('./site');

const DEVICES = [
    { name: 'iPad mini 橫向', size: { width: 1133, height: 744 }, kind: 'tablet' },
    { name: 'iPad 第 10 代橫向', size: { width: 1180, height: 820 }, kind: 'tablet' },
    { name: '手機直向', size: { width: 375, height: 812 }, kind: 'phone' }
];

let errors = [];

// 每個測試開一個新的遊戲，並在頁面中放入模擬觸控的工具 (touchTest)
test.beforeEach(async ({ page }) => {
    errors = watchErrors(page);
    await routeSite(page);
    await page.goto(gameUrl('?newgame'));
    await page.waitForTimeout(500);
    await page.evaluate(() => {
        const canvasEl = document.getElementById('game');
        window.touchTest = {
            fire(type, id, x, y, target = canvasEl) {
                target.dispatchEvent(new PointerEvent(type, {
                    pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true
                }));
            },
            // 清空地圖內部與敵人，移動不會被擋住，也不會觸發題目
            clearField() {
                gameState.map = gameState.map.map((row, r) => row.map((v, c) =>
                    (r === 0 || c === 0 || r === gameState.rows - 1 || c === gameState.cols - 1) ? 1 : 0));
                gameState.enemies = [];
                gameState.bullets = [];
                gameState.x = Math.floor(gameState.cols / 2) * TILE_SIZE;
                gameState.y = Math.floor(gameState.rows / 2) * TILE_SIZE;
            },
            pos() {
                return { x: gameState.x, y: gameState.y };
            },
            // 遊戲區域中間 (按在畫布上)
            center() {
                const area = getPlayArea();
                return { x: area.x + area.width / 2, y: area.y + area.height / 2 };
            }
        };
    });
});

test.afterEach(() => {
    expect(errors).toEqual([]);
});

// 按下、往 (dx, dy) 拉、等 ms 毫秒後放開，回傳角色移動的距離
async function drag(page, id, dx, dy, ms) {
    return page.evaluate(async ({ id, dx, dy, ms }) => {
        const c = touchTest.center();
        const start = touchTest.pos();
        touchTest.fire('pointerdown', id, c.x, c.y);
        touchTest.fire('pointermove', id, c.x + dx, c.y + dy);
        await new Promise(resolve => setTimeout(resolve, ms));
        const end = touchTest.pos();
        touchTest.fire('pointerup', id, c.x + dx, c.y + dy);
        return { dx: end.x - start.x, dy: end.y - start.y };
    }, { id, dx, dy, ms });
}

for (const device of DEVICES) {
    test.describe(`${device.name} ${device.size.width}x${device.size.height}`, () => {
        test.use({ viewport: device.size, screen: device.size, isMobile: true, hasTouch: true });

        test('觸控模式與版面：道具按鈕不蓋住地圖、地圖在 HUD 下方', async ({ page }) => {
            const layout = await page.evaluate(() => {
                const area = getPlayArea();
                const scale = Math.min(area.width / gameState.worldW, area.height / gameState.worldH);
                const left = area.x + (area.width - gameState.worldW * scale) / 2;
                const top = area.y + (area.height - gameState.worldH * scale) / 2;
                const items = document.getElementById('touch-items').getBoundingClientRect();
                return {
                    W, H,
                    body: document.body.className,
                    blocked: orientationBlocked,
                    tilePx: 50 * scale,
                    map: { left, top, right: left + gameState.worldW * scale, bottom: top + gameState.worldH * scale },
                    items: { left: items.left, top: items.top, right: items.right, bottom: items.bottom },
                    hudBottom: document.getElementById('hud').getBoundingClientRect().bottom
                };
            });
            const { map, items } = layout;
            const overlap = !(items.left >= map.right || items.right <= map.left || items.top >= map.bottom || items.bottom <= map.top);
            expect.soft(layout.body).toContain('touch-mode');
            expect.soft(layout.body).toContain(`touch-${device.kind}`);
            expect.soft(layout.blocked, '方向正確時不擋住').toBe(false);
            expect.soft(overlap, `道具按鈕不蓋住地圖 ${JSON.stringify({ map, items })}`).toBe(false);
            expect.soft(items.left >= 0 && items.top >= 0 && items.right <= layout.W && items.bottom <= layout.H,
                `道具按鈕在畫面內 ${JSON.stringify(items)}`).toBe(true);
            expect.soft(map.top, '地圖在 HUD 下方').toBeGreaterThanOrEqual(layout.hudBottom);
            test.info().annotations.push({ type: 'tile', description: `每格約 ${layout.tilePx.toFixed(1)}px` });
        });

        test('往右上拉就往右上跑，放開就停止', async ({ page }) => {
            await page.evaluate(() => touchTest.clearField());
            const diag = await drag(page, 1, 40, -40, 400);
            expect(diag.dx).toBeGreaterThan(10);
            expect(diag.dy).toBeLessThan(-10);
            expect(Math.abs(diag.dx + diag.dy), '45° 時 X、Y 移動一樣多').toBeLessThan(3);

            const afterUp = await page.evaluate(async () => {
                const start = touchTest.pos();
                await new Promise(resolve => setTimeout(resolve, 200));
                return { dx: gameState.x - start.x, dy: gameState.y - start.y };
            });
            expect(afterUp).toEqual({ dx: 0, dy: 0 });
        });

        test('死區內不移動，接近水平時吸附成水平', async ({ page }) => {
            await page.evaluate(() => touchTest.clearField());
            const dead = await drag(page, 2, 6, 0, 300);
            expect(dead, '拉 6px 不移動').toEqual({ dx: 0, dy: 0 });
            const snap = await drag(page, 3, -60, 10, 300);
            expect(snap.dx).toBeLessThan(-10);
            expect(snap.dy, '往左偏下約 9° 吸附成正左').toBe(0);
        });

        test('斜走碰到牆會沿著牆滑動', async ({ page }) => {
            await page.evaluate(() => {
                touchTest.clearField();
                const tile = getPlayerTile();
                for (let c = 1; c < gameState.cols - 1; c++) gameState.map[tile.r - 1][c] = 1;
                gameState.x = TILE_SIZE;
                // 直接貼到牆下 (不靠等待時間：平行執行時畫面更新次數不固定)
                while (!isWallCollision(getPlayerHitbox(gameState.x, gameState.y - 1))) gameState.y -= 1;
            });
            const slide = await drag(page, 5, 40, -40, 300);
            expect(slide.dx).toBeGreaterThan(10);
            expect(slide.dy).toBe(0);
        });

        test('一指拉搖桿時，另一指可以用道具', async ({ page }) => {
            const multi = await page.evaluate(async () => {
                touchTest.clearField();
                gameState.inventory.boots = 1;
                updateHUD();
                const c = touchTest.center();
                touchTest.fire('pointerdown', 6, c.x, c.y);
                touchTest.fire('pointermove', 6, c.x + 40, c.y);
                const btn = document.querySelector('.item-btn[data-item="boots"]');
                const r = btn.getBoundingClientRect();
                touchTest.fire('pointerdown', 7, r.x + r.width / 2, r.y + r.height / 2, btn);
                touchTest.fire('pointerup', 7, r.x + r.width / 2, r.y + r.height / 2, btn);
                const result = {
                    boots: gameState.inventory.boots,
                    boosted: gameState.speedBoostUntil > performance.now(),
                    joystickHeld: joystick.pointerId === 6,
                    badge: btn.querySelector('.item-count').textContent,
                    empty: btn.classList.contains('empty')
                };
                touchTest.fire('pointerup', 6, c.x + 40, c.y);
                return result;
            });
            expect(multi).toEqual({ boots: 0, boosted: true, joystickHeld: true, badge: 'x0', empty: true });
        });

        test('出題：視窗在畫面內、0.3 秒內按答案不算、答完題要重新按下才會移動', async ({ page }) => {
            const modal = await page.evaluate(async () => {
                touchTest.clearField();
                const c = touchTest.center();
                touchTest.fire('pointerdown', 8, c.x, c.y);
                touchTest.fire('pointermove', 8, c.x + 40, c.y);
                await new Promise(resolve => setTimeout(resolve, 100));
                gameState.paused = true;
                gameState.currentChallengeType = 'bullet';
                triggerMathChallenge();
                await new Promise(resolve => setTimeout(resolve, 50));
                const rect = document.getElementById('math-modal').getBoundingClientRect();
                const correct = document.querySelector('#answers-container .answer-btn[data-correct="true"]');
                correct.click();
                const lockedFeedback = document.getElementById('math-feedback').textContent;
                await new Promise(resolve => setTimeout(resolve, ANSWER_LOCK_MS + 50));
                correct.click();
                const feedback = document.getElementById('math-feedback').textContent;
                await new Promise(resolve => setTimeout(resolve, 1200)); // 答對 1 秒後恢復遊戲
                const start = touchTest.pos();
                touchTest.fire('pointermove', 8, c.x + 60, c.y);
                await new Promise(resolve => setTimeout(resolve, 200));
                const moved = Math.abs(gameState.x - start.x) + Math.abs(gameState.y - start.y);
                touchTest.fire('pointerup', 8, c.x + 60, c.y);
                return { rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }, lockedFeedback, feedback, paused: gameState.paused, moved };
            });
            const { rect } = modal;
            expect.soft(rect.top >= 0 && rect.left >= 0 && rect.bottom <= device.size.height && rect.right <= device.size.width,
                `題目視窗在畫面內 ${JSON.stringify(rect)}`).toBe(true);
            expect.soft(modal.lockedFeedback, '0.3 秒內按答案不算').toBe('');
            expect.soft(modal.feedback).toMatch(/^Correct/);
            expect.soft(modal.paused, '答完題恢復遊戲').toBe(false);
            expect.soft(modal.moved, '原本那一指繼續拉不會移動').toBe(0);
        });

        test('方向不對時顯示提示並停止，轉回來恢復並給保護時間', async ({ page }) => {
            await page.setViewportSize({ width: device.size.height, height: device.size.width });
            await page.waitForTimeout(500);
            const rotated = await page.evaluate(async () => {
                const start = touchTest.pos();
                const c = touchTest.center();
                touchTest.fire('pointerdown', 9, c.x, c.y);
                touchTest.fire('pointermove', 9, c.x + 40, c.y);
                await new Promise(resolve => setTimeout(resolve, 300));
                touchTest.fire('pointerup', 9, c.x + 40, c.y);
                return {
                    blocked: orientationBlocked,
                    overlay: getComputedStyle(document.getElementById('rotate-overlay')).display,
                    moved: Math.abs(gameState.x - start.x) + Math.abs(gameState.y - start.y)
                };
            });
            expect(rotated).toEqual({ blocked: true, overlay: 'flex', moved: 0 });

            await page.setViewportSize(device.size);
            await page.waitForTimeout(500);
            const restored = await page.evaluate(() => ({ blocked: orientationBlocked, graceLeft: gameState.graceUntil - performance.now() }));
            expect(restored.blocked).toBe(false);
            expect(restored.graceLeft, '轉回來後有保護時間').toBeGreaterThan(0);
        });
    });
}

test.describe('電腦 1280x800 (無觸控)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('不是觸控模式、沒有控制鍵，地圖畫在整個畫面', async ({ page }) => {
        const state = await page.evaluate(() => ({
            touchMode,
            area: getPlayArea(),
            W, H,
            controls: getComputedStyle(document.getElementById('mobile-controls')).display,
            inventoryBar: getComputedStyle(document.getElementById('inventory-bar')).display
        }));
        expect(state.touchMode).toBe(false);
        expect(state.controls).toBe('none');
        expect(state.inventoryBar).not.toBe('none');
        expect(state.area).toEqual({ x: 0, y: 0, width: state.W, height: state.H });
    });
});
