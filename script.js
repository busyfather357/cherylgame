const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const TILE_SIZE = 50;
const MAX_HP = 3;
const FRAME_MS = 1000 / 60;          // 移動數值以 60fps 為基準
const MAX_DT = 3;                    // 單格畫面最多補 3 格 (避免切換分頁回來瞬移)
const POST_CHALLENGE_GRACE_MS = 1500; // 答題結束後的短暫保護時間
const SPAWN_SAFE_RADIUS = 2;         // 敵人不可生成在玩家周圍 N 格內

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

const gameState = {
    action: "idle",
    index: 0,
    lastFrameTime: 0,
    x: (W - gameConfig.drawWidth) / 2,
    y: (H - gameConfig.drawHeight) / 2,
    speed: 3,
    facingLeft: false,
    hp: 3,
    score: 0,
    level: 1,
    paused: false,
    enemies: [],
    bullets: [],
    bossHitsNeeded: 5,
    currentChallengeType: null,
    map: [],
    cols: 0,
    rows: 0,
    worldW: 0, // 地圖實際像素寬高 (與視窗大小脫鉤)
    worldH: 0,
    inventory: { potion: 0, boots: 0, scroll: 0, shield: 0 },
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
                    row.push(Math.random() < 0.15 ? 1 : 0);
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
    if (gameState.gameOver || gameState.inventory[itemName] <= 0) return;

    const timestamp = performance.now();
    let used = false;

    if (itemName === 'potion' && gameState.hp < MAX_HP) {
        gameState.hp += 1;
        used = true;
    } else if (itemName === 'boots') {
        gameState.speedBoostUntil = timestamp + 5000;
        used = true;
    } else if (itemName === 'shield') {
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

function spawnEnemies(count) {
    gameState.enemies = [];
    gameState.bullets = [];

    const isBossLevel = gameState.level % 5 === 0;

    if (isBossLevel) {
        gameState.bossHitsNeeded = 5;
        const spawn = findSpawnTile();

        if (spawn) {
            const icon = Math.random() > 0.5 ? '🐉' : '👹';
            const vx = (Math.random() * 3) - 1.5;
            const vy = (Math.random() * 3) - 1.5;

            gameState.enemies.push({
                x: spawn.x,
                y: spawn.y,
                width: 50,
                height: 50,
                type: 'boss',
                icon: icon,
                spriteImg: getEmojiSprite(icon),
                vx: vx,
                vy: vy,
                active: true,
                lastShotTime: 0
            });
        }
    } else {
        for (let i = 0; i < count; i++) {
            let isMonster = i !== 0; // Fix: Only 1 chest, others are monsters
            let type = isMonster ? 'monster' : 'chest';
            let icon = '🎁';
            let vx = 0;
            let vy = 0;

            if (isMonster) {
                vx = (Math.random() * 2) - 1; // between -1 and 1
                vy = (Math.random() * 2) - 1;

                if (gameState.level === 1) {
                    icon = '👾';
                } else if (gameState.level === 2) {
                    icon = Math.random() > 0.5 ? '🦀' : '🦈';
                } else {
                    const icons = ['👾', '🦀', '🦈'];
                    icon = icons[Math.floor(Math.random() * icons.length)];
                }
            }

            const spawn = findSpawnTile();

            if (spawn) {
                gameState.enemies.push({
                    x: spawn.x,
                    y: spawn.y,
                    width: 50,
                    height: 50,
                    type: type,
                    icon: icon,
                    spriteImg: getEmojiSprite(icon), // 新增這行：預先產生並儲存圖片物件
                    vx: vx,
                    vy: vy,
                    active: true
                });
            }
        }
    }
}
function startLevel() {
    generateMap(gameState.level);
    spawnEnemies(5);
    gameState.levelTouched = false;
}
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

    for (let i = 0; i < gameState.enemies.length; i++) {
        let enemy = gameState.enemies[i];

        if (enemy.active) {
            // 怪物或魔王自主移動
            if (enemy.type === 'monster' || enemy.type === 'boss') {
                const maxSpeed = enemy.type === 'boss' ? 2.5 : 1.5;

                // X 軸移動與碰撞
                const moveX = enemy.vx * dt;
                enemy.x += moveX;
                if (isWallCollision(enemy) || enemy.x <= 0 || enemy.x + enemy.width >= worldW) {
                    enemy.x -= moveX;
                    enemy.vx *= -1;
                }

                // Y 軸移動與碰撞
                const moveY = enemy.vy * dt;
                enemy.y += moveY;
                if (isWallCollision(enemy) || enemy.y <= 0 || enemy.y + enemy.height >= worldH) {
                    enemy.y -= moveY;
                    enemy.vy *= -1;
                }

                // 偶爾隨機微調速度方向
                if (Math.random() < 0.02 * dt) {
                    enemy.vx += (Math.random() * 0.5) - 0.25;
                    enemy.vy += (Math.random() * 0.5) - 0.25;

                    // 限制最大速度
                    enemy.vx = Math.max(-maxSpeed, Math.min(maxSpeed, enemy.vx));
                    enemy.vy = Math.max(-maxSpeed, Math.min(maxSpeed, enemy.vy));
                }

                // 魔王發射子彈 (間隔改為 5000ms)
                if (enemy.type === 'boss' && (!enemy.lastShotTime || timestamp - enemy.lastShotTime > 5000)) {
                    enemy.lastShotTime = timestamp;

                    const bossCenterX = enemy.x + enemy.width / 2;
                    const bossCenterY = enemy.y + enemy.height / 2;
                    const playerCenterX = playerRect.x + playerRect.width / 2;
                    const playerCenterY = playerRect.y + playerRect.height / 2;

                    const dx = playerCenterX - bossCenterX;
                    const dy = playerCenterY - bossCenterY;
                    const dist = Math.hypot(dx, dy);

                    const bulletSpeed = 4;

                    gameState.bullets.push({
                        x: bossCenterX - 15, // center 30x30 bullet
                        y: bossCenterY - 15,
                        width: 30,
                        height: 30,
                        vx: (dx / dist) * bulletSpeed,
                        vy: (dy / dist) * bulletSpeed,
                        active: true
                    });
                }
            }

            if (checkCollision(playerRect, enemy)) {
                if (inGracePeriod || (isInvincible && enemy.type === 'monster')) {
                    // Skip collision
                } else {
                    gameState.paused = true;
                    gameState.currentEnemyIndex = i;
                    gameState.currentChallengeType = enemy.type;
                    gameState.challengeSource = {
                        x: enemy.x + enemy.width / 2,
                        y: enemy.y + enemy.height / 2
                    };
                    triggerMathChallenge();
                    break;
                }
            }
        }
    }

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
    // 繪製地圖網格與障礙物
    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            const tileX = c * TILE_SIZE;
            const tileY = r * TILE_SIZE;

            // 地板顏色
            if (gameState.level === 1) {
                ctx.fillStyle = '#4CAF50';
            } else if (gameState.level === 2) {
                ctx.fillStyle = '#F5DEB3';
            } else {
                ctx.fillStyle = '#2F4F4F';
            }
            ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);

            if (gameState.map[r] && gameState.map[r][c] === 1) {
                let obstacleIcon = '🌲';
                if (gameState.level === 2) {
                    obstacleIcon = (r + c) % 2 === 0 ? '🌊' : '🪨';
                } else if (gameState.level > 2) {
                    obstacleIcon = '🧱';
                }
                const obstacleSprite = getEmojiSprite(obstacleIcon);
                if (obstacleSprite && obstacleSprite.complete) {
                    ctx.drawImage(obstacleSprite, tileX, tileY, TILE_SIZE, TILE_SIZE);
                }
            }

            // Draw floor checkerboard pattern slightly to give depth
            if (gameState.map[r] && gameState.map[r][c] === 0) {
                if (gameState.level === 1) {
                    ctx.fillStyle = '#45a049';
                } else if (gameState.level === 2) {
                    ctx.fillStyle = '#E6C280';
                } else {
                    ctx.fillStyle = '#3F5F5F';
                }
                if ((r + c) % 2 === 0) {
                   ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    // 畫出敵人
    for (let enemy of gameState.enemies) {
        if (enemy.active) {
            // 改用 drawImage 繪製已經轉換好的 SVG Emoji 圖片
            if (enemy.spriteImg && enemy.spriteImg.complete) {
                ctx.drawImage(enemy.spriteImg, Math.floor(enemy.x), Math.floor(enemy.y), Math.floor(enemy.width), Math.floor(enemy.height));
            }

            // 繪製敵人紅框 (除錯用)
            if (gameConfig.showDebugBox) {
                ctx.strokeStyle = "blue";
                ctx.lineWidth = 2;
                ctx.strokeRect(Math.floor(enemy.x), Math.floor(enemy.y), Math.floor(enemy.width), Math.floor(enemy.height));
            }
        }
    }

    // 畫出子彈
    for (let bullet of gameState.bullets) {
        if (bullet.active) {
            const bulletSprite = getEmojiSprite('🔥');
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

    const timestamp = performance.now();

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

    // Generate Question
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let num1, num2, correctAnswer;

    if (op === '+') {
        num1 = Math.floor(Math.random() * 50) + 10;
        num2 = Math.floor(Math.random() * 50) + 10;
        correctAnswer = num1 + num2;
    } else if (op === '-') {
        num1 = Math.floor(Math.random() * 50) + 20;
        num2 = Math.floor(Math.random() * (num1 - 10)) + 1; // Ensure positive result
        correctAnswer = num1 - num2;
    } else {
        num1 = Math.floor(Math.random() * 9) + 1;
        num2 = Math.floor(Math.random() * 9) + 1;
        correctAnswer = num1 * num2;
    }

    questionEl.textContent = `${num1} ${op} ${num2} = ?`;

    // Generate Answers
    let answers = [correctAnswer];
    while (answers.length < 4) {
        let wrongAnswer = correctAnswer + (Math.floor(Math.random() * 21) - 10);
        if (wrongAnswer !== correctAnswer && !answers.includes(wrongAnswer) && wrongAnswer >= 0) {
            answers.push(wrongAnswer);
        }
    }

    // Shuffle answers
    answers.sort(() => Math.random() - 0.5);

    // Render answer buttons
    answersContainer.innerHTML = '';
    answers.forEach(ans => {
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.textContent = ans;
        if (ans === correctAnswer) {
            btn.dataset.correct = "true";
        }
        btn.onclick = () => checkAnswer(ans, correctAnswer);
        answersContainer.appendChild(btn);
    });

    updateHintButton();

    // Show modal
    modalOverlay.style.display = "flex";
}

// Cache DOM elements for HUD to avoid querying and recreating every time
let hpDisplayCache = null;
let scoreDisplayCache = null;
let levelDisplayCache = null;
let heartElementsCache = [];

function updateHUD() {
    // Update HP
    if (!hpDisplayCache) {
        hpDisplayCache = document.getElementById("hp-display");
        scoreDisplayCache = document.getElementById("score-display");
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

    // Update Level
    const expectedLevel = `Level: ${gameState.level}`;
    if (levelDisplayCache && levelDisplayCache.textContent !== expectedLevel) {
        levelDisplayCache.textContent = expectedLevel;
    }

    // Update Score
    const expectedScore = `Score: ${gameState.score}`;
    if (scoreDisplayCache.textContent !== expectedScore) {
        scoreDisplayCache.textContent = expectedScore;
    }

    // Update Inventory
    const invPotion = document.getElementById("inv-potion");
    const invBoots = document.getElementById("inv-boots");
    const invScroll = document.getElementById("inv-scroll");
    const invShield = document.getElementById("inv-shield");

    if (invPotion) invPotion.textContent = `🧪 x${gameState.inventory.potion}`;
    if (invBoots) invBoots.textContent = `🥾 x${gameState.inventory.boots}`;
    if (invScroll) invScroll.textContent = `📜 x${gameState.inventory.scroll}`;
    if (invShield) invShield.textContent = `🛡️ x${gameState.inventory.shield}`;
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

function showGameOver() {
    gameState.gameOver = true;
    isAnswering = false;
    document.getElementById("math-title").textContent = "Game Over";
    document.getElementById("math-question").textContent = `Score: ${gameState.score}`;
    document.getElementById("math-feedback").textContent = "";
    updateHintButton();
    updateHUD();

    const answersContainer = document.getElementById("answers-container");
    answersContainer.innerHTML = '';
    const restartBtn = document.createElement("button");
    restartBtn.className = "answer-btn restart-btn";
    restartBtn.textContent = "Play Again 🔄";
    restartBtn.onclick = resetGame;
    answersContainer.appendChild(restartBtn);
    restartBtn.focus();
}

function resetGame() {
    gameState.hp = MAX_HP;
    gameState.score = 0;
    gameState.level = 1;
    gameState.inventory = { potion: 0, boots: 0, scroll: 0, shield: 0 };
    gameState.speedBoostUntil = 0;
    gameState.invincibleUntil = 0;
    gameState.gameOver = false;
    startLevel();
    resumeGame();
}

function checkAnswer(selected, correct) {
    if (isAnswering) return; // Prevent spam clicking
    isAnswering = true;
    updateHintButton();

    const feedbackEl = document.getElementById("math-feedback");

    if (selected === correct) {
        feedbackEl.style.color = "green";
        feedbackEl.textContent = "Correct! ✨";

        if (gameState.currentChallengeType === 'bullet') {
            // No score change
        } else if (gameState.currentChallengeType === 'boss') {
            gameState.score += 10;
            gameState.bossHitsNeeded -= 1;

            if (gameState.bossHitsNeeded > 0) {
                // Teleport boss (避開玩家周圍)
                const boss = gameState.enemies[gameState.currentEnemyIndex];
                const spawn = findSpawnTile();
                if (spawn) {
                    boss.x = spawn.x;
                    boss.y = spawn.y;
                }
            } else {
                gameState.enemies[gameState.currentEnemyIndex].active = false;
            }
        } else {
            gameState.score += 10;
            gameState.enemies[gameState.currentEnemyIndex].active = false;

            if (gameState.currentChallengeType === 'chest') {
                const items = ['potion', 'boots', 'scroll', 'shield'];
                const itemNames = { 'potion': '恢復藥水', 'boots': '神速靴', 'scroll': '提示卷軸', 'shield': '無敵護盾' };
                const drop = items[Math.floor(Math.random() * items.length)];
                gameState.inventory[drop] += 1;
                feedbackEl.textContent = `Correct! ✨ Obtained 1x ${itemNames[drop]}`;
            }
        }

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

requestAnimationFrame(loop);