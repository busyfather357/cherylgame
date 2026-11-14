// 選角色畫面 (js/character_select.js)：每次開啟遊戲先顯示並暫停，列出 js/characters.js 的所有角色，視窗在畫面內、不用捲動；
// 選到的角色用在遊戲裡 (碰撞範圍不變) 並存進永久資料 profile.character，下次開啟時預先選好，New Game 也沿用；
// 舊版 (v2) 的存檔照常讀取、用預設角色，第 2 關以後的存檔選完角色才顯示歡迎回來；
// 存檔裡的角色不存在時用預設角色；還沒有全身圖的角色用精靈圖代替。
const { test, expect } = require('@playwright/test');
const { routeSite, watchErrors, gameUrl } = require('./site');

const SCREENS = [
    { name: '電腦', size: { width: 1280, height: 720 }, touch: false },
    { name: 'iPad mini 橫向', size: { width: 1133, height: 744 }, touch: true },
    { name: '手機直向', size: { width: 375, height: 812 }, touch: true },
    { name: '嵌入版的 iframe 大小', size: { width: 512, height: 288 }, touch: false }
];

let errors = [];

test.beforeEach(async ({ page }) => {
    errors = watchErrors(page);
    await routeSite(page);
});

test.afterEach(() => {
    expect(errors).toEqual([]);
});

// 放一份存檔再重新開啟遊戲 (先用 ?newgame 開一次，才有同一個網址來源的 localStorage 可以寫)
async function openWithSave(page, save) {
    await page.goto(gameUrl('?newgame'));
    await page.evaluate(data => localStorage.setItem(SAVE_KEY, JSON.stringify(data)), save);
    await page.goto(gameUrl());
}

function readSave(page) {
    return page.evaluate(() => JSON.parse(localStorage.getItem(SAVE_KEY)));
}

for (const screen of SCREENS) {
    test.describe(`${screen.name} ${screen.size.width}x${screen.size.height}`, () => {
        test.use({ viewport: screen.size, screen: screen.size, isMobile: screen.touch, hasTouch: screen.touch });

        test('開啟遊戲先顯示選角色畫面：列出所有角色，視窗在畫面內、不用捲動', async ({ page }) => {
            await page.goto(gameUrl('?newgame'));
            await page.waitForFunction(() => {
                const portraits = [...document.querySelectorAll('img.character-portrait')];
                return portraits.length > 0 && portraits.every(image => image.complete && image.naturalWidth > 0);
            });

            const info = await page.evaluate(() => {
                const rect = el => {
                    const r = el.getBoundingClientRect();
                    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
                };
                const modal = document.getElementById('character-modal');
                const cards = [...document.querySelectorAll('.character-card')];
                return {
                    overlay: getComputedStyle(document.getElementById('character-overlay')).display,
                    paused: gameState.paused,
                    ids: cards.map(card => card.dataset.character),
                    expectedIds: Object.keys(CHARACTERS),
                    names: cards.map(card => card.querySelector('.character-name').textContent),
                    expectedNames: cards.map(card => CHARACTERS[card.dataset.character].name),
                    images: cards.map(card => {
                        const image = card.querySelector('.character-portrait');
                        return { width: image.naturalWidth, height: image.naturalHeight };
                    }),
                    expectedImages: cards.map(card => {
                        const { width, height } = CHARACTERS[card.dataset.character].fullBody;
                        return { width, height };
                    }),
                    selected: cards.filter(card => card.classList.contains('selected')).map(card => card.dataset.character),
                    defaultId: DEFAULT_CHARACTER,
                    portraits: cards.map(card => rect(card.querySelector('.character-portrait'))),
                    modal: rect(modal),
                    scroll: { height: modal.scrollHeight - modal.clientHeight, width: modal.scrollWidth - modal.clientWidth },
                    start: rect(document.getElementById('character-start')),
                    W, H
                };
            });
            expect(info.overlay).toBe('flex');
            expect(info.paused, '選角色時遊戲暫停').toBe(true);
            expect([...info.ids].sort()).toEqual([...info.expectedIds].sort());
            expect(info.ids[0], '預設角色排第一個').toBe(info.defaultId);
            expect(info.names).toEqual(info.expectedNames);
            expect(info.images).toEqual(info.expectedImages);
            expect(info.selected, '預先選好預設角色').toEqual([info.defaultId]);
            for (const portrait of info.portraits) {
                expect.soft(portrait.width, `角色卡夠大 ${JSON.stringify(portrait)}`).toBeGreaterThanOrEqual(80);
                expect.soft(Math.abs(portrait.height / portrait.width - 1.5), `全身圖維持 2:3 ${JSON.stringify(portrait)}`).toBeLessThan(0.02);
            }
            const { modal, start } = info;
            expect.soft(modal.left >= 0 && modal.top >= 0 && modal.right <= info.W && modal.bottom <= info.H,
                `視窗在畫面內 ${JSON.stringify(modal)}`).toBe(true);
            expect.soft(info.scroll, '視窗不用捲動').toEqual({ height: 0, width: 0 });
            expect.soft(start.top >= modal.top && start.bottom <= modal.bottom && start.left >= modal.left && start.right <= modal.right,
                `Start 按鈕在視窗內 ${JSON.stringify(start)}`).toBe(true);
        });
    });
}

test('選牧師後開始：遊戲用牧師、碰撞範圍不變，存檔記住，下次開啟預先選好，New Game 也沿用', async ({ page }) => {
    await page.goto(gameUrl('?newgame'));
    await page.click('.character-card[data-character="cleric"]');
    expect(await page.evaluate(() => [...document.querySelectorAll('.character-card.selected')].map(card => card.dataset.character)))
        .toEqual(['cleric']);
    expect((await readSave(page)).profile.character, '按 Start 之前不存檔').toBe('knight');

    await page.click('#character-start');
    await page.waitForFunction(() => spriteLoaded);
    const playing = await page.evaluate(() => {
        const anims = Object.values(CHARACTERS.cleric.animations);
        return {
            overlay: getComputedStyle(document.getElementById('character-overlay')).display,
            paused: gameState.paused,
            isCleric: playerCharacter === CHARACTERS.cleric,
            sheet: new URL(sprite.src).pathname,
            sheetSize: { width: sprite.naturalWidth, height: sprite.naturalHeight },
            expectedSize: { width: Math.max(...anims.map(a => a.frames)) * CHARACTERS.cleric.cell, height: anims.length * CHARACTERS.cleric.cell },
            hitbox: getPlayerHitbox(0, 0),
            version: SAVE_VERSION
        };
    });
    expect(playing.overlay).toBe('none');
    expect(playing.paused, '第 1 關直接開始').toBe(false);
    expect(playing.isCleric).toBe(true);
    expect(playing.sheet).toBe('/characters/cleric.png');
    expect(playing.sheetSize).toEqual(playing.expectedSize);
    expect(playing.hitbox).toEqual({ x: 12.5, y: 13, width: 25, height: 26 });
    const save = await readSave(page);
    expect(save.v).toBe(playing.version);
    expect(save.profile.character).toBe('cleric');

    // 重新開啟 (不清除存檔)：預先選好牧師
    await page.goto(gameUrl());
    expect(await page.evaluate(() => ({ selected: selectedCharacterId, isCleric: playerCharacter === CHARACTERS.cleric, paused: gameState.paused })))
        .toEqual({ selected: 'cleric', isCleric: true, paused: true });
    await page.click('#character-start');
    const afterNewGame = await page.evaluate(() => {
        resetGame();
        return { isCleric: playerCharacter === CHARACTERS.cleric, character: profile.character, level: gameState.level };
    });
    expect(afterNewGame).toEqual({ isCleric: true, character: 'cleric', level: 1 });
});

test('鍵盤：左右鍵換角色，Enter 開始', async ({ page }) => {
    await page.goto(gameUrl('?newgame'));
    const ids = await page.evaluate(() => getCharacterIds());
    expect(await page.evaluate(() => selectedCharacterId)).toBe(ids[0]);
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => selectedCharacterId)).toBe(ids[1]);
    await page.keyboard.press('ArrowLeft');
    expect(await page.evaluate(() => selectedCharacterId)).toBe(ids[0]);
    await page.keyboard.press('ArrowLeft'); // 到底時繞回另一頭
    expect(await page.evaluate(() => selectedCharacterId)).toBe(ids[ids.length - 1]);

    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => ({
        overlay: getComputedStyle(document.getElementById('character-overlay')).display,
        paused: gameState.paused,
        character: profile.character
    }))).toEqual({ overlay: 'none', paused: false, character: ids[ids.length - 1] });
});

test('v2 的存檔：進度與永久資料保留、用預設角色，選完角色後顯示歡迎回來', async ({ page }) => {
    await openWithSave(page, {
        v: 2,
        run: { level: 3, hp: 2, inventory: { potion: 1, boots: 0, scroll: 2, shield: 0 } },
        profile: {
            xp: 120, gold: 45, diamonds: 2,
            stats: { correct: 12, wrong: 1, streak: 4, bestStreak: 9, bossesDefeated: 0, highestStage: 3 },
            achievements: { first_correct: 1790587643022 }
        }
    });
    const loaded = await page.evaluate(() => ({
        level: gameState.level,
        hp: gameState.hp,
        inventory: gameState.inventory,
        xp: profile.xp,
        gold: profile.gold,
        diamonds: profile.diamonds,
        correct: profile.stats.correct,
        achievements: Object.keys(profile.achievements),
        character: profile.character,
        selected: selectedCharacterId,
        overlay: getComputedStyle(document.getElementById('character-overlay')).display,
        menu: getComputedStyle(document.getElementById('math-modal-overlay')).display
    }));
    expect(loaded).toEqual({
        level: 3, hp: 2, inventory: { potion: 1, boots: 0, scroll: 2, shield: 0 },
        xp: 120, gold: 45, diamonds: 2, correct: 12, achievements: ['first_correct'],
        character: 'knight', selected: 'knight', overlay: 'flex', menu: 'none'
    });

    await page.click('#character-start');
    const menu = await page.evaluate(() => ({
        title: document.getElementById('math-title').textContent,
        menu: getComputedStyle(document.getElementById('math-modal-overlay')).display,
        paused: gameState.paused
    }));
    expect(menu).toEqual({ title: 'Welcome Back!', menu: 'flex', paused: true });
    await page.click('#answers-container .answer-btn >> nth=0'); // Continue
    expect(await page.evaluate(() => ({ paused: gameState.paused, level: gameState.level }))).toEqual({ paused: false, level: 3 });

    // 第一次進關時就以新的版本寫回，舊資料都還在
    const save = await readSave(page);
    expect(save.v).toBe(await page.evaluate(() => SAVE_VERSION));
    expect(save.run.level).toBe(3);
    expect(save.profile).toMatchObject({ xp: 120, gold: 45, diamonds: 2, character: 'knight' });
});

test('存檔裡的角色不存在時用預設角色', async ({ page }) => {
    for (const character of ['dragon', 'toString', 7, null]) {
        await openWithSave(page, {
            v: 3,
            run: { level: 1, hp: 3, inventory: {} },
            profile: { xp: 50, character }
        });
        const loaded = await page.evaluate(() => ({
            xp: profile.xp,
            character: profile.character,
            selected: selectedCharacterId,
            isKnight: playerCharacter === CHARACTERS.knight
        }));
        expect(loaded, `character: ${JSON.stringify(character)}`).toEqual({ xp: 50, character: 'knight', selected: 'knight', isKnight: true });
    }
});

test('還沒有全身圖的角色用精靈圖代替，一樣可以選', async ({ page }) => {
    await page.goto(gameUrl('?newgame'));
    await page.evaluate(() => {
        delete CHARACTERS.knight.fullBody;
        showCharacterSelect(resumeGame);
    });
    // 等精靈圖畫到 canvas 上
    await page.waitForFunction(() => {
        const canvas = document.querySelector('.character-card[data-character="knight"] canvas.character-portrait');
        if (!canvas) return false;
        const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
        return false;
    });
    const portraits = await page.evaluate(() => [...document.querySelectorAll('.character-card')].map(card => {
        const portrait = card.querySelector('.character-portrait');
        const r = portrait.getBoundingClientRect();
        return { id: card.dataset.character, tag: portrait.tagName, width: Math.round(r.width), height: Math.round(r.height) };
    }));
    const knight = portraits.find(p => p.id === 'knight');
    const cleric = portraits.find(p => p.id === 'cleric');
    expect(knight.tag).toBe('CANVAS');
    expect(cleric.tag).toBe('IMG');
    expect({ width: knight.width, height: knight.height }, '跟全身圖一樣大').toEqual({ width: cleric.width, height: cleric.height });

    await page.click('#character-start');
    expect(await page.evaluate(() => ({ paused: gameState.paused, isKnight: playerCharacter === CHARACTERS.knight })))
        .toEqual({ paused: false, isKnight: true });
});
