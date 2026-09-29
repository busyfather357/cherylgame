// 遊戲核心：畫布、地圖、碰撞、出題與答題、道具、選單與主迴圈。
// 經驗值、貨幣、成就、商店、存檔、題目、章節設定、敵人行為放在 js/ 資料夾，index.html 會先載入它們再載入本檔。

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const TILE_SIZE = 50;
const MAX_HP = 3;
const FRAME_MS = 1000 / 60;          // 移動數值以 60fps 為基準
const MAX_DT = 3;                    // 單格畫面最多補 3 格 (避免切換分頁回來瞬移)
const POST_CHALLENGE_GRACE_MS = 1500; // 答題結束後的短暫保護時間
const SPAWN_SAFE_RADIUS = 2;         // 敵人不可生成在玩家周圍 N 格內
const ITEM_TYPES = ['potion', 'boots', 'scroll', 'shield'];
const ITEM_INFO = {
    potion: { icon: '🧪', name: '恢復藥水' },
    boots:  { icon: '🥾', name: '神速靴' },
    scroll: { icon: '📜', name: '提示卷軸' },
    shield: { icon: '🛡️', name: '無敵護盾' }
};

// --- 1. 初始化畫布 ---
let W = window.innerWidth;
let H = window.innerHeight;
let DPR = window.devicePixelRatio || 1;

function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = window.devicePixelRatio || 1;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = false;
}

let resizeTimer = null;
function handleResize() {
    resizeCanvas();
    // 關卡還沒發生任何碰撞時，依新視窗大小重建地圖；否則維持地圖、只縮放畫面
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const cols = Math.max(5, Math.floor(W / TILE_SIZE));
        const rows = Math.max(5, Math.floor(H / TILE_SIZE));
        const sizeChanged = cols !== gameState.cols || rows !== gameState.rows;
        if (sizeChanged && !gameState.levelTouched && !gameState.paused) {
            startLevel();
        }
    }, 250);
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);
resizeCanvas(); // Initial call


// --- 2. 遊戲設定 (關鍵修改區域) ---
const gameConfig = {
    frameWidth: 235.75, // Default/fallback
    frameHeight: 306.25,
    framesPerRow: 4,
    scale: 50 / 235.75, // 調整為約 50px 寬度
    showDebugBox: false
};

// 預先計算繪製尺寸以優化效能
gameConfig.drawWidth = gameConfig.frameWidth * gameConfig.scale;
gameConfig.drawHeight = gameConfig.frameHeight * gameConfig.scale;

const animations = {
    // [修正] 根據圖片一排 4 張的規則修改範圍
    // 第一排 (0-3): 待機 (Idle)
    idle: { start: 0, end: 3, speed: 6 },  
    // 第二排 (4-7): 跑步 (Run) - 原本寫到 9 會跑到下一排去
    run:  { start: 4, end: 7, speed: 12 }
};

function createEmptyInventory() {
    return Object.fromEntries(ITEM_TYPES.map(item => [item, 0]));
}

const gameState = {
    action: "idle",
    index: 0,
    lastFrameTime: 0,
    x: (W - gameConfig.drawWidth) / 2,
    y: (H - gameConfig.drawHeight) / 2,
    speed: 3,
    facingLeft: false,
    hp: 3,
    level: 1,
    paused: false,
    enemies: [],
    bullets: [],
    hazards: [],         // 機器人的炸彈 (js/enemies.js)
    bossHitsNeeded: 5,   // 魔王剩下的血量
    bossDamage: 1,       // 這一題答對時魔王扣幾格血 (碰到時決定)
    currentChallengeType: null,
    map: [],
    cols: 0,
    rows: 0,
    worldW: 0, // 地圖實際像素寬高 (與視窗大小脫鉤)
    worldH: 0,
    inventory: createEmptyInventory(),
    speedBoostUntil: 0,
    invincibleUntil: 0,
    graceUntil: 0,
    lastUpdateTime: 0,
    challengeSource: null,
    hintUsed: false,
    gameOver: false,
    levelTouched: false // 本關是否已觸發過題目
};

function checkMapConnectivity(map, startCol, startRow) {
    if (!map || map.length === 0 || map[startRow][startCol] !== 0) return false;

    let totalEmptySpaces = 0;
    const rows = map.length;
    const cols = map[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (map[r][c] === 0) totalEmptySpaces++;
        }
    }

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue = [{ c: startCol, r: startRow }];
    visited[startRow][startCol] = true;
    let reachableEmptySpaces = 0;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (queue.length > 0) {
        const { c, r } = queue.shift();
        reachableEmptySpaces++;

        for (const [dc, dr] of dirs) {
            const nc = c + dc;
            const nr = r + dr;

            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && map[nr][nc] === 0 && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push({ c: nc, r: nr });
            }
        }
    }

    return reachableEmptySpaces === totalEmptySpaces;
}

function generateMap(level) {
    // 地圖大小只在產生關卡時依視窗決定，之後視窗縮放只改變繪製比例
    gameState.cols = Math.max(5, Math.floor(W / TILE_SIZE));
    gameState.rows = Math.max(5, Math.floor(H / TILE_SIZE));
    gameState.worldW = gameState.cols * TILE_SIZE;
    gameState.worldH = gameState.rows * TILE_SIZE;

    // Center spawn point
    const centerX = Math.floor(gameState.cols / 2);
    const centerY = Math.floor(gameState.rows / 2);
    const obstacleRate = getStageConfig(level).obstacleRate;

    while (true) {
        gameState.map = [];
        for (let r = 0; r < gameState.rows; r++) {
            const row = [];
            for (let c = 0; c < gameState.cols; c++) {
                // Borders are walls
                if (r === 0 || r === gameState.rows - 1 || c === 0 || c === gameState.cols - 1) {
                    row.push(1);
                }
                // Center 3x3 is floor
                else if (Math.abs(r - centerY) <= 1 && Math.abs(c - centerX) <= 1) {
                    row.push(0);
                }
                // Random obstacles
                else {
                    row.push(Math.random() < obstacleRate ? 1 : 0);
                }
            }
            gameState.map.push(row);
        }

        if (checkMapConnectivity(gameState.map, centerX, centerY)) {
            break;
        }
    }

    gameState.x = centerX * TILE_SIZE;
    gameState.y = centerY * TILE_SIZE;
}

function getPlayerTile() {
    return {
        c: Math.floor((gameState.x + gameConfig.drawWidth / 2) / TILE_SIZE),
        r: Math.floor((gameState.y + gameConfig.drawHeight / 2) / TILE_SIZE)
    };
}

// 找一個可生成的地板格；優先避開玩家周圍，地圖太小找不到時才放寬限制
function findSpawnTile() {
    const player = getPlayerTile();
    for (const safeRadius of [SPAWN_SAFE_RADIUS, 0]) {
        for (let attempts = 0; attempts < 100; attempts++) {
            const r = Math.floor(Math.random() * (gameState.rows - 2)) + 1;
            const c = Math.floor(Math.random() * (gameState.cols - 2)) + 1;
            const nearPlayer = Math.abs(r - player.r) <= safeRadius && Math.abs(c - player.c) <= safeRadius;
            if (gameState.map[r] && gameState.map[r][c] === 0 && !nearPlayer) {
                return { x: c * TILE_SIZE, y: r * TILE_SIZE };
            }
        }
    }
    return null;
}

const keys = {};
window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code === 'Digit1') useItem('potion');
    if (e.code === 'Digit2') useItem('boots');
    if (e.code === 'Digit3') useItem('scroll');
    if (e.code === 'Digit4') useItem('shield');
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

// 綁定虛擬按鍵
const bindTouch = (id, keyCode) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("touchstart", (e) => { e.preventDefault(); keys[keyCode] = true; });
    btn.addEventListener("touchend", (e) => { e.preventDefault(); keys[keyCode] = false; });
};
bindTouch("btn-up", "ArrowUp");
bindTouch("btn-down", "ArrowDown");
bindTouch("btn-left", "ArrowLeft");
bindTouch("btn-right", "ArrowRight");
bindTouch("btn-action", "Space"); // Optional action button

const bindItemTouch = (id, itemName) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        useItem(itemName);
    });
};
bindItemTouch("btn-item-1", "potion");
bindItemTouch("btn-item-2", "boots");
bindItemTouch("btn-item-3", "scroll");
bindItemTouch("btn-item-4", "shield");

// 題目視窗內的提示卷軸按鈕 (手機的道具列會被視窗遮住，所以放在視窗裡)
document.getElementById("hint-btn").addEventListener("click", () => useItem('scroll'));

function updateHintButton() {
    const hintBtn = document.getElementById("hint-btn");
    const canUse = !gameState.gameOver && !isAnswering && !gameState.hintUsed && gameState.inventory.scroll > 0;
    hintBtn.style.display = canUse ? "" : "none";
    hintBtn.textContent = `📜 Hint Scroll (x${gameState.inventory.scroll})`;
}

function useItem(itemName) {
    // 商店開著時數字鍵不使用道具，避免玩家以為是在購買
    if (gameState.gameOver || shopOpen || gameState.inventory[itemName] <= 0) return;

    const timestamp = performance.now();
    let used = false;

    // 靴子與護盾是 5 秒的時效道具，暫停中 (答題、選單) 使用的話效果會在暫停時白白耗掉
    if (itemName === 'potion' && gameState.hp < MAX_HP) {
        gameState.hp += 1;
        used = true;
    } else if (itemName === 'boots' && !gameState.paused) {
        gameState.speedBoostUntil = timestamp + 5000;
        used = true;
    } else if (itemName === 'shield' && !gameState.paused) {
        gameState.invincibleUntil = timestamp + 5000;
        used = true;
    } else if (itemName === 'scroll' && gameState.paused && !isAnswering && !gameState.hintUsed) {
        const modalOverlay = document.getElementById("math-modal-overlay");
        if (modalOverlay.style.display === "flex") {
            const answersContainer = document.getElementById("answers-container");
            const btns = answersContainer.getElementsByClassName("answer-btn");

            // Find correct answer from feedback context or parse from buttons
            // Here we can find wrong buttons and disable 2 of them
            let wrongBtns = [];
            for (let btn of btns) {
                // To identify correct answer safely, we could parse the question but simple string eval is tricky
                // Alternatively, we can inject a data-correct attribute when generating answers
                if (btn.dataset.correct !== "true" && btn.style.visibility !== "hidden") {
                    wrongBtns.push(btn);
                }
            }

            // Hide up to 2 wrong answers
            wrongBtns.sort(() => Math.random() - 0.5);
            for (let i = 0; i < Math.min(2, wrongBtns.length); i++) {
                wrongBtns[i].style.visibility = "hidden";
            }
            gameState.hintUsed = true; // 每題限用一次，避免浪費卷軸
            used = true;
        }
    }

    if (used) {
        gameState.inventory[itemName] -= 1;
        updateHUD();
        updateHintButton();
    }
}

// --- 3. 敵人與碰撞邏輯 ---

const emojiImageCache = {};

function getEmojiSprite(emoji) {
    if (emojiImageCache[emoji]) return emojiImageCache[emoji];

    // 利用 SVG 強制系統使用原生字型渲染 Emoji
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">
        <text x="25" y="38" font-size="40" text-anchor="middle" font-family="'Apple Color Emoji', 'Segoe UI Emoji', sans-serif">${emoji}</text>
    </svg>`;

    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    emojiImageCache[emoji] = img;

    return img;
}

// 依關卡設定 (js/stages.js) 生成敵人：魔王關只有魔王；其他關卡 1 個寶箱，其餘是怪物。需要在 generateMap() 之後呼叫
function spawnEnemies() {
    gameState.enemies = [];
    gameState.bullets = [];
    gameState.hazards = [];

    const stage = getStageConfig(gameState.level);

    if (stage.boss) {
        const spawn = findSpawnTile();
        if (spawn) {
            const boss = createBoss(stage.boss, stage.bossStars, spawn.x, spawn.y);
            gameState.bossHitsNeeded = boss.maxHp;
            gameState.enemies.push(boss);
        }
    } else {
        const chestSpawn = findSpawnTile();
        if (chestSpawn) gameState.enemies.push(createChest(chestSpawn.x, chestSpawn.y));

        for (const kind of pickMonsterKinds(stage)) {
            const spawn = findSpawnTile();
            if (spawn) gameState.enemies.push(createMonster(kind, stage.theme, spawn.x, spawn.y));
        }
    }

    queueStageAnnouncements(stage, gameState.enemies);
}

// 存檔在 js/save.js。loadProgress() 必須在第一次 startLevel() 之前執行，關卡設定與地板配色才會用到存檔的關卡數
function startLevel() {
    generateMap(gameState.level);
    spawnEnemies();
    gameState.levelTouched = false;
    saveProgress(); // 過關、重新開始、縮放重建地圖都會經過這裡
    recordStageReached(gameState.level);
}
loadProgress();
startLevel(); // Spawn initial map and enemies

function isWallCollision(rect) {
    const margin = 3;
    const leftCol = Math.floor((rect.x + margin) / TILE_SIZE);
    const rightCol = Math.floor((rect.x + rect.width - margin) / TILE_SIZE);
    const topRow = Math.floor((rect.y + margin) / TILE_SIZE);
    const bottomRow = Math.floor((rect.y + rect.height - margin) / TILE_SIZE);

    for (let r = topRow; r <= bottomRow; r++) {
        for (let c = leftCol; c <= rightCol; c++) {
            if (r < 0 || r >= gameState.rows || c < 0 || c >= gameState.cols || gameState.map[r][c] === 1) {
                return true;
            }
        }
    }
    return false;
}

function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// --- 4. 載入圖片 ---
const sprite = new Image();
sprite.src = "Pal_test.png"; 

let spriteLoaded = false;
let processedSpriteCanvas = null;

sprite.onload = () => {
    // 根據圖片實際大小自動計算精靈圖各幀的寬高，確保整數避免破圖
    gameConfig.frameWidth = Math.floor(sprite.width / 4);
    gameConfig.frameHeight = Math.floor(sprite.height / 5);

    // 設定 scale，使角色繪製的寬度接近 50px (與 Emoji 一致)
    gameConfig.scale = 50 / gameConfig.frameWidth;

    // 重新計算 drawWidth 和 drawHeight
    gameConfig.drawWidth = gameConfig.frameWidth * gameConfig.scale;
    gameConfig.drawHeight = gameConfig.frameHeight * gameConfig.scale;

    try {
        // 建立離線畫布 (Offscreen Canvas) 進行去背
        const offCanvas = document.createElement('canvas');
        offCanvas.width = sprite.width;
        offCanvas.height = sprite.height;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        offCtx.imageSmoothingEnabled = false;

        // 將原圖畫上離線畫布
        offCtx.drawImage(sprite, 0, 0);

        // 取得像素資料
        const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        const data = imageData.data;

        // 遍歷所有像素，將接近白色的背景（淺色網格）的 Alpha 設為 0
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // 假設背景是白色或淺灰色 (可依實際情況調整閾值)
            if (r > 210 && g > 210 && b > 210 &&
                Math.abs(r - g) < 20 && Math.abs(r - b) < 20 && Math.abs(g - b) < 20) {
                data[i + 3] = 0; // Alpha = 0 (透明)
            }
        }

        // 將處理後的資料放回離線畫布
        offCtx.putImageData(imageData, 0, 0);

        // 儲存去背後的 Canvas
        processedSpriteCanvas = offCanvas;
        console.log("圖片載入成功且去背完成！", "自動計算 frameWidth:", gameConfig.frameWidth, "frameHeight:", gameConfig.frameHeight);
    } catch (e) {
        console.warn(e);
        processedSpriteCanvas = sprite;
    }

    spriteLoaded = true;
};

// --- 5. 遊戲主迴圈 ---
function update(timestamp) {
    if (!gameState.lastFrameTime) gameState.lastFrameTime = timestamp;

    // dt = 以 60fps 為 1 的時間倍率，讓高更新率螢幕的遊戲速度一致
    const dt = gameState.lastUpdateTime
        ? Math.min((timestamp - gameState.lastUpdateTime) / FRAME_MS, MAX_DT)
        : 1;
    gameState.lastUpdateTime = timestamp;

    if (gameState.paused) {
        return;
    }

    flushStageAnnouncements(); // 魔王登場、新怪物提示 (js/stages.js)

    if (timestamp < gameState.speedBoostUntil) {
        gameState.speed = 6;
    } else {
        gameState.speed = 3;
    }

    const isInvincible = timestamp < gameState.invincibleUntil;
    const inGracePeriod = timestamp < gameState.graceUntil;
    const worldW = gameState.worldW;
    const worldH = gameState.worldH;

    let isMoving = false;
    let nextX = gameState.x;
    let nextY = gameState.y;
    const step = gameState.speed * dt;

    // 移動邏輯
    if (keys["ArrowRight"] || keys["KeyD"]) {
        nextX += step;
        isMoving = true;
        gameState.facingLeft = false;
    }
    if (keys["ArrowLeft"] || keys["KeyA"]) {
        nextX -= step;
        isMoving = true;
        gameState.facingLeft = true;
    }
    if (keys["ArrowUp"] || keys["KeyW"]) {
        nextY -= step;
        isMoving = true;
    }
    if (keys["ArrowDown"] || keys["KeyS"]) {
        nextY += step;
        isMoving = true;
    }

    const drawW = gameConfig.drawWidth;
    const drawH = gameConfig.drawHeight;

    // 碰撞偵測 (玩家與牆壁)
    if (isMoving) {
        const testRect = {
            x: nextX + (drawW / 4),
            y: nextY + (drawH / 4),
            width: drawW / 2,
            height: drawH / 2
        };

        if (!isWallCollision(testRect)) {
            gameState.x = nextX;
            gameState.y = nextY;
        }
    }

    // 邊界檢查 (維持作為備用保護)
    if (gameState.x < -drawW/2) gameState.x = -drawW/2;
    if (gameState.x > worldW - drawW/2) gameState.x = worldW - drawW/2;
    if (gameState.y < -drawH/2) gameState.y = -drawH/2;
    if (gameState.y > worldH - drawH/2) gameState.y = worldH - drawH/2;

    // 自動切換動畫狀態
    if (isMoving && gameState.action !== "run") {
        gameState.action = "run";
        gameState.index = 0; 
    } else if (!isMoving && gameState.action === "run") {
        gameState.action = "idle";
        gameState.index = 0;
    }

    // 動畫播放邏輯
    const currentAnim = animations[gameState.action];
    if (timestamp - gameState.lastFrameTime > (1000 / currentAnim.speed)) {
        gameState.index++;
        const animLength = currentAnim.end - currentAnim.start + 1;
        if (gameState.index >= animLength) {
            gameState.index = 0;
        }
        gameState.lastFrameTime = timestamp;
    }

    // 碰撞偵測
    const playerRect = {
        x: gameState.x + (drawW / 4), // 縮小並置中碰撞範圍使其更自然
        y: gameState.y + (drawH / 4),
        width: drawW / 2,
        height: drawH / 2
    };

    // 敵人的移動與攻擊在 js/enemies.js
    const frame = {
        now: timestamp,
        dt,
        worldW,
        worldH,
        player: { x: playerRect.x + playerRect.width / 2, y: playerRect.y + playerRect.height / 2 }
    };

    for (let i = 0; i < gameState.enemies.length; i++) {
        const enemy = gameState.enemies[i];
        if (!enemy.active) continue;

        updateEnemy(enemy, frame);

        // 碰到算什麼由敵人當下的狀態決定：出題、被撞 (跟子彈一樣)，或碰不到 (隱身)
        const contact = getContactType(enemy);
        if (!contact || !checkCollision(playerRect, enemy)) continue;
        // 護盾擋得住怪物與衝撞，擋不住寶箱與魔王 (那是玩家要去碰的)
        if (inGracePeriod || (isInvincible && (contact === 'monster' || contact === 'bullet'))) continue;

        gameState.paused = true;
        gameState.currentEnemyIndex = i;
        gameState.currentChallengeType = contact;
        gameState.bossDamage = contact === 'boss' ? getBossDamage(enemy) : 0;
        gameState.challengeSource = {
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height / 2
        };
        if (contact === 'bullet') resetBossState(enemy); // 犀牛王撞到玩家就停下來
        triggerMathChallenge();
        break;
    }
    if (gameState.paused) return;

    // 更新子彈位置與碰撞
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        let bullet = gameState.bullets[i];
        if (bullet.active) {
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;

            // 飛出邊界移除
            if (bullet.x < 0 || bullet.x > worldW || bullet.y < 0 || bullet.y > worldH || isWallCollision(bullet)) {
                gameState.bullets.splice(i, 1);
                continue;
            }

            if (checkCollision(playerRect, bullet)) {
                if (!isInvincible && !inGracePeriod) {
                    gameState.bullets.splice(i, 1);
                    gameState.paused = true;
                    gameState.currentChallengeType = 'bullet';
                    // 以子彈飛來的方向作為擊退來源
                    gameState.challengeSource = {
                        x: bullet.x + bullet.width / 2 - bullet.vx * 10,
                        y: bullet.y + bullet.height / 2 - bullet.vy * 10
                    };
                    triggerMathChallenge();
                    break; // One bullet collision at a time
                }
            }
        }
    }
    if (gameState.paused) return;

    // 機器人的炸彈：碰到爆炸中的火焰跟被子彈打到一樣
    updateHazards(timestamp);
    const blastSource = findBlastHit(playerRect, timestamp);
    if (blastSource && !isInvincible && !inGracePeriod) {
        gameState.paused = true;
        gameState.currentChallengeType = 'bullet';
        gameState.challengeSource = blastSource;
        triggerMathChallenge();
        return;
    }

    // 檢查過關邏輯
    let allCleared = true;
    for (let i = 0; i < gameState.enemies.length; i++) {
        if (gameState.enemies[i].active) {
            allCleared = false;
            break;
        }
    }

    if (allCleared && gameState.enemies.length > 0) {
        gameState.level += 1;
        startLevel();
        updateHUD();
        showStageClear();
    }
}

function loop(timestamp) {
    update(timestamp);
    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!gameState.worldW || !gameState.worldH) return;

    // 將固定大小的地圖等比縮放並置中到目前視窗 (旋轉手機或縮放視窗時不會裁切)
    const viewScale = Math.min(W / gameState.worldW, H / gameState.worldH);
    const offsetX = (W - gameState.worldW * viewScale) / 2;
    const offsetY = (H - gameState.worldH * viewScale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(viewScale, viewScale);
    drawWorld();
    ctx.restore();
}

function drawWorld() {
    const timestamp = performance.now();
    const theme = getStageConfig(gameState.level).theme; // 地板與障礙物的外觀 (js/stages.js)

    // 繪製地圖網格與障礙物
    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            const tileX = c * TILE_SIZE;
            const tileY = r * TILE_SIZE;

            // 地板顏色
            ctx.fillStyle = theme.floor;
            ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);

            if (gameState.map[r] && gameState.map[r][c] === 1) {
                const obstacleIcon = theme.obstacles[(r + c) % theme.obstacles.length];
                const obstacleSprite = getEmojiSprite(obstacleIcon);
                if (obstacleSprite && obstacleSprite.complete) {
                    ctx.drawImage(obstacleSprite, tileX, tileY, TILE_SIZE, TILE_SIZE);
                }
            }

            // Draw floor checkerboard pattern slightly to give depth
            if (gameState.map[r] && gameState.map[r][c] === 0 && (r + c) % 2 === 0) {
                ctx.fillStyle = theme.checker;
                ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    drawHazards(timestamp);

    // 畫出敵人 (js/enemies.js)
    for (let enemy of gameState.enemies) {
        if (enemy.active) {
            drawEnemy(enemy, timestamp);

            // 繪製敵人紅框 (除錯用)
            if (gameConfig.showDebugBox) {
                ctx.strokeStyle = "blue";
                ctx.lineWidth = 2;
                ctx.strokeRect(Math.floor(enemy.x), Math.floor(enemy.y), Math.floor(enemy.width), Math.floor(enemy.height));
            }
        }
    }

    // 畫出子彈 (火球、墨汁、毒液)
    for (let bullet of gameState.bullets) {
        if (bullet.active) {
            const bulletSprite = getEmojiSprite(bullet.icon || '🔥');
            if (bulletSprite && bulletSprite.complete) {
                ctx.drawImage(bulletSprite, Math.floor(bullet.x), Math.floor(bullet.y), Math.floor(bullet.width), Math.floor(bullet.height));
            }
        }
    }

    if (!spriteLoaded) return;

    const currentAnim = animations[gameState.action];
    const spriteIndex = currentAnim.start + gameState.index;
    
    // 計算在原圖中的位置
    const col = spriteIndex % gameConfig.framesPerRow;
    const row = Math.floor(spriteIndex / gameConfig.framesPerRow);

    const sx = col * gameConfig.frameWidth;
    const sy = row * gameConfig.frameHeight;

    const drawW = gameConfig.drawWidth;
    const drawH = gameConfig.drawHeight;
    
    const dx = gameState.x;
    const dy = gameState.y;

    ctx.save();

    // 將座標系統原點移至角色中心，以便翻轉
    ctx.translate(Math.floor(dx + drawW / 2), Math.floor(dy + drawH / 2));
    if (gameState.facingLeft) {
        ctx.scale(-1, 1);
    }

    // 答題後的保護時間內角色閃爍
    if (!gameState.paused && timestamp < gameState.graceUntil && Math.floor(timestamp / 100) % 2 === 0) {
        ctx.globalAlpha = 0.35;
    }

    // 在中心點繪製（需往回位移半個寬高）
    ctx.drawImage(
        processedSpriteCanvas || sprite,
        Math.floor(sx), Math.floor(sy), Math.floor(gameConfig.frameWidth), Math.floor(gameConfig.frameHeight),
        Math.floor(-drawW / 2), Math.floor(-drawH / 2), Math.floor(drawW), Math.floor(drawH)
    );
    ctx.globalAlpha = 1;

    if (timestamp < gameState.invincibleUntil) {
        ctx.strokeStyle = "gold";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, Math.floor(drawW / 1.5), 0, Math.PI * 2);
        ctx.stroke();
    } else if (timestamp < gameState.speedBoostUntil) {
        ctx.strokeStyle = "cyan";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, Math.floor(drawW / 1.5), 0, Math.PI * 2);
        ctx.stroke();
    }

    // 繪製紅框 (除錯用)
    if (gameConfig.showDebugBox) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.strokeRect(Math.floor(-drawW / 2), Math.floor(-drawH / 2), Math.floor(drawW), Math.floor(drawH));
    }
    
    ctx.restore();
}

// --- 6. Math Challenge Logic ---
function triggerMathChallenge() {
    const modalOverlay = document.getElementById("math-modal-overlay");
    const questionEl = document.getElementById("math-question");
    const answersContainer = document.getElementById("answers-container");
    const feedbackEl = document.getElementById("math-feedback");

    // Reset feedback
    feedbackEl.textContent = "";
    document.getElementById("math-title").textContent = "Math Challenge!";
    gameState.hintUsed = false;
    gameState.levelTouched = true;

    // 題目與選項 (js/questions.js)，第 11 關起變難
    const { op, text, answer: correctAnswer, choices } = generateQuestion(gameState.level);
    // 填空題的 □ 畫成方框 (遊戲字型沒有 □，備用字型的 □ 很小)
    const [beforeBlank, afterBlank] = text.split('□');
    questionEl.textContent = beforeBlank;
    if (afterBlank !== undefined) {
        const blank = document.createElement("span");
        blank.className = "blank";
        questionEl.append(blank, afterBlank);
    }

    // Render answer buttons
    answersContainer.innerHTML = '';
    choices.forEach(ans => {
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.textContent = ans;
        if (ans === correctAnswer) {
            btn.dataset.correct = "true";
        }
        btn.onclick = () => checkAnswer(ans, correctAnswer, op);
        answersContainer.appendChild(btn);
    });

    updateHintButton();

    // Show modal
    modalOverlay.style.display = "flex";
}

// Cache DOM elements for HUD to avoid querying and recreating every time
let hpDisplayCache = null;
let levelDisplayCache = null;
let heartElementsCache = [];

function updateHUD() {
    // Update HP
    if (!hpDisplayCache) {
        hpDisplayCache = document.getElementById("hp-display");
        levelDisplayCache = document.getElementById("level-display");
        heartElementsCache = Array.from(hpDisplayCache.getElementsByClassName("heart"));

        // Fallback if not initially present
        if (heartElementsCache.length === 0) {
            hpDisplayCache.innerHTML = "";
            for (let i = 0; i < MAX_HP; i++) {
                const heart = document.createElement("span");
                heart.className = "heart";
                hpDisplayCache.appendChild(heart);
                heartElementsCache.push(heart);
            }
        }
    }

    for (let i = 0; i < MAX_HP; i++) {
        const expectedText = i < gameState.hp ? "❤️" : "🖤";
        if (heartElementsCache[i].textContent !== expectedText) {
            heartElementsCache[i].textContent = expectedText;
        }
    }

    // 關卡 (Stage)；角色等級 (Lv) 由 js/experience.js 更新
    const expectedLevel = `Stage ${gameState.level}`;
    if (levelDisplayCache && levelDisplayCache.textContent !== expectedLevel) {
        levelDisplayCache.textContent = expectedLevel;
    }

    updateXpHUD();
    updateWalletHUD();

    // Update Inventory
    for (const item of ITEM_TYPES) {
        const invEl = document.getElementById(`inv-${item}`);
        if (invEl) invEl.textContent = `${ITEM_INFO[item].icon} x${gameState.inventory[item]}`;
    }
}

// 在畫面上方短暫顯示提示 (升級、成就解鎖)，會蓋在題目視窗之上
// 第一次 startLevel() 時就可能被呼叫，所以不能用到本檔以 let 宣告的變數 (TDZ)
function showToast(text) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = text;
    document.getElementById("toast-container").appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

let isAnswering = false;

// 關閉題目視窗並恢復遊戲，同時給予短暫保護時間避免立刻再次碰撞
function resumeGame() {
    document.getElementById("math-modal-overlay").style.display = "none";
    for (let key in keys) {
        keys[key] = false;
    }
    gameState.paused = false;
    gameState.challengeSource = null;
    gameState.graceUntil = performance.now() + POST_CHALLENGE_GRACE_MS;
    isAnswering = false;
    updateHUD();
}

// 將玩家往遠離碰撞來源的方向擊退；斜向被牆擋住時改沿單一軸滑動
function applyKnockback(source) {
    const drawW = gameConfig.drawWidth;
    const drawH = gameConfig.drawHeight;
    const hitbox = (x, y) => ({ x: x + drawW / 4, y: y + drawH / 4, width: drawW / 2, height: drawH / 2 });

    let dirX = 0;
    let dirY = 1; // 沒有來源資訊時維持往下彈
    if (source) {
        const dx = (gameState.x + drawW / 2) - source.x;
        const dy = (gameState.y + drawH / 2) - source.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.001) {
            dirX = dx / dist;
            dirY = dy / dist;
        }
    }

    const knockbackDist = 100;
    const step = 5;
    for (let moved = 0; moved < knockbackDist; moved += step) {
        const nextX = gameState.x + dirX * step;
        const nextY = gameState.y + dirY * step;
        if (!isWallCollision(hitbox(nextX, nextY))) {
            gameState.x = nextX;
            gameState.y = nextY;
        } else if (dirX !== 0 && !isWallCollision(hitbox(nextX, gameState.y))) {
            gameState.x = nextX;
        } else if (dirY !== 0 && !isWallCollision(hitbox(gameState.x, nextY))) {
            gameState.y = nextY;
        } else {
            break; // 撞到牆壁，立刻停止擊退
        }
    }
}

// 借用題目視窗的答案區顯示選單按鈕，視窗需已顯示才能設定焦點
function showMenuButtons(buttons) {
    const answersContainer = document.getElementById("answers-container");
    answersContainer.innerHTML = '';
    buttons.forEach(({ label, onClick }) => {
        const btn = document.createElement("button");
        btn.className = "answer-btn restart-btn";
        btn.textContent = label;
        btn.onclick = onClick;
        answersContainer.appendChild(btn);
    });
    answersContainer.firstChild.focus();
}

// 借用題目視窗顯示選單 (歡迎回來、過關、Game Over 共用)
function showMenu(title, message, buttons) {
    gameState.paused = true;
    gameState.hintUsed = true; // 選單沒有題目，停用提示卷軸 (下次出題時會重設)
    document.getElementById("math-title").textContent = title;
    document.getElementById("math-question").textContent = message;
    document.getElementById("math-feedback").textContent = "";
    updateHintButton();
    document.getElementById("math-modal-overlay").style.display = "flex";
    showMenuButtons(buttons);
}

function showGameOver() {
    gameState.gameOver = true;
    isAnswering = false;
    updateHUD();

    // 存檔不清除：第 2 關以後可以從本關起點重來
    if (checkpoint && checkpoint.level > 1) {
        showMenu("Game Over", `XP: ${profile.xp}`, [
            { label: `Retry Stage ${checkpoint.level} 🔁`, onClick: () => restartFrom(checkpoint) },
            { label: "New Game 🔄", onClick: resetGame }
        ]);
    } else {
        showMenu("Game Over", `XP: ${profile.xp}`, [{ label: "Play Again 🔄", onClick: resetGame }]);
    }
}

// 讀到第 2 關以後的存檔時，先暫停並讓玩家選擇繼續或從頭開始
function showWelcomeBack() {
    showMenu("Welcome Back!", `Stage ${gameState.level}`, [
        { label: "Continue ▶️", onClick: resumeGame },
        { label: "New Game 🔄", onClick: resetGame }
    ]);
}

// 過關後 (已進入下一關、還沒開始移動) 暫停，讓玩家選擇直接開始或先去商店
function showStageClear() {
    showMenu(`Stage ${gameState.level - 1} Clear! 🎉`, `🪙 ${profile.gold}`, [
        { label: `Stage ${gameState.level} ▶️`, onClick: resumeGame },
        { label: "Shop 🛒", onClick: openShop }
    ]);
}

// 從指定進度重新開始一關 (從頭開始、從本關起點重來共用)
function restartFrom(progress) {
    applyProgress(progress);
    gameState.speedBoostUntil = 0;
    gameState.invincibleUntil = 0;
    gameState.gameOver = false;
    startLevel();
    resumeGame();
}

// New Game 只重設本局進度；經驗值、金幣、鑽石、成就 (profile) 都保留
function resetGame() {
    restartFrom({ level: 1, hp: MAX_HP, inventory: createEmptyInventory() });
}

function checkAnswer(selected, correct, op) {
    if (isAnswering) return; // Prevent spam clicking
    isAnswering = true;
    updateHintButton();

    const feedbackEl = document.getElementById("math-feedback");
    recordAnswer(op, selected === correct);

    if (selected === correct) {
        feedbackEl.style.color = "green";
        let message = "Correct! ✨";
        let rewardType = null; // XP_REWARDS / GOLD_REWARDS 的鍵；子彈題沒有獎勵

        if (gameState.currentChallengeType === 'bullet') {
            // 子彈題答對只是避免扣血
        } else if (gameState.currentChallengeType === 'boss') {
            const boss = gameState.enemies[gameState.currentEnemyIndex];
            gameState.bossHitsNeeded = Math.max(0, gameState.bossHitsNeeded - gameState.bossDamage);
            if (gameState.bossDamage > 1) message = "Critical Hit! 💥"; // 犀牛王暈倒時算 2 下

            if (gameState.bossHitsNeeded > 0) {
                rewardType = 'bossHit';
                teleportBoss(boss); // 避開玩家周圍
            } else {
                rewardType = 'bossDefeat';
                defeatBoss(boss);
                recordBossDefeated();
            }
        } else {
            const enemy = gameState.enemies[gameState.currentEnemyIndex];
            rewardType = enemy.reward; // 'monster'、'chest' 或 'ufo'

            if (!hitMonster(enemy)) {
                // 河豚還要再答對一次：把玩家彈開，避免保護時間結束後馬上又碰到
                applyKnockback(gameState.challengeSource);
                message = "Correct! ✨ One more time!";
            } else if (gameState.currentChallengeType === 'chest') {
                const drop = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
                gameState.inventory[drop] += 1;
                message = `Correct! ✨ Obtained 1x ${ITEM_INFO[drop].name}`;
            }
        }

        if (rewardType) {
            const xp = XP_REWARDS[rewardType];
            const gold = GOLD_REWARDS[rewardType];
            gainXp(xp);
            addGold(gold);
            message += `\n+${xp} XP  +${gold} 🪙`;
        }
        feedbackEl.textContent = message;

        setTimeout(resumeGame, 1000);
    } else {
        feedbackEl.style.color = "red";
        feedbackEl.textContent = "Oops! Try again later.";
        gameState.hp -= 1;

        applyKnockback(gameState.challengeSource);

        setTimeout(() => {
            if (gameState.hp <= 0) {
                showGameOver(); // 維持暫停，等玩家按下重新開始
            } else {
                resumeGame();
            }
        }, 1000);
    }
}

updateHUD(); // Initialize HUD

// 歡迎回來視窗會用到上方以 let 宣告的 HUD 快取與 isAnswering，必須放在這裡而不是 loadProgress() 旁邊
// 第 1 關的存檔等同新遊戲，直接開始
if (gameState.level > 1) showWelcomeBack();

requestAnimationFrame(loop);