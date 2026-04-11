const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const TILE_SIZE = 50;

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

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
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
    rows: 0
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
    gameState.cols = Math.ceil(W / TILE_SIZE);
    gameState.rows = Math.ceil(H / TILE_SIZE);

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

const keys = {};
window.addEventListener("keydown", (e) => { keys[e.code] = true; });
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
        let spawnX, spawnY;
        let attempts = 0;
        let placed = false;
        while (!placed && attempts < 100) {
            const r = Math.floor(Math.random() * (gameState.rows - 2)) + 1;
            const c = Math.floor(Math.random() * (gameState.cols - 2)) + 1;

            if (gameState.map[r] && gameState.map[r][c] === 0) {
                spawnX = c * TILE_SIZE;
                spawnY = r * TILE_SIZE;
                placed = true;
            }
            attempts++;
        }

        if (placed) {
            const icon = Math.random() > 0.5 ? '🐉' : '👹';
            const vx = (Math.random() * 3) - 1.5;
            const vy = (Math.random() * 3) - 1.5;

            gameState.enemies.push({
                x: spawnX,
                y: spawnY,
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

            let spawnX, spawnY;
            let attempts = 0;
            let placed = false;
            while (!placed && attempts < 100) {
                const r = Math.floor(Math.random() * (gameState.rows - 2)) + 1;
                const c = Math.floor(Math.random() * (gameState.cols - 2)) + 1;

                if (gameState.map[r] && gameState.map[r][c] === 0) {
                    spawnX = c * TILE_SIZE;
                    spawnY = r * TILE_SIZE;
                    placed = true;
                }
                attempts++;
            }

            if (placed) {
                gameState.enemies.push({
                    x: spawnX,
                    y: spawnY,
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
generateMap(gameState.level);
spawnEnemies(5); // Spawn initial enemies

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
            if (r > 245 && g > 245 && b > 245) {
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

    if (gameState.paused) {
        return;
    }

    let isMoving = false;
    let nextX = gameState.x;
    let nextY = gameState.y;

    // 移動邏輯
    if (keys["ArrowRight"] || keys["KeyD"]) {
        nextX += gameState.speed;
        isMoving = true;
        gameState.facingLeft = false;
    }
    if (keys["ArrowLeft"] || keys["KeyA"]) {
        nextX -= gameState.speed;
        isMoving = true;
        gameState.facingLeft = true; 
    }
    if (keys["ArrowUp"] || keys["KeyW"]) {
        nextY -= gameState.speed;
        isMoving = true;
    }
    if (keys["ArrowDown"] || keys["KeyS"]) {
        nextY += gameState.speed;
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
    if (gameState.x > W - drawW/2) gameState.x = W - drawW/2;
    if (gameState.y < -drawH/2) gameState.y = -drawH/2;
    if (gameState.y > H - drawH/2) gameState.y = H - drawH/2;

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
                enemy.x += enemy.vx;
                if (isWallCollision(enemy) || enemy.x <= 0 || enemy.x + enemy.width >= W) {
                    enemy.x -= enemy.vx;
                    enemy.vx *= -1;
                }

                // Y 軸移動與碰撞
                enemy.y += enemy.vy;
                if (isWallCollision(enemy) || enemy.y <= 0 || enemy.y + enemy.height >= H) {
                    enemy.y -= enemy.vy;
                    enemy.vy *= -1;
                }

                // 偶爾隨機微調速度方向
                if (Math.random() < 0.02) {
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
                gameState.paused = true;
                gameState.currentEnemyIndex = i;
                gameState.currentChallengeType = enemy.type;
                triggerMathChallenge();
                break;
            }
        }
    }

    // 更新子彈位置與碰撞
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        let bullet = gameState.bullets[i];
        if (bullet.active) {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // 飛出邊界移除
            if (bullet.x < 0 || bullet.x > W || bullet.y < 0 || bullet.y > H || isWallCollision(bullet)) {
                gameState.bullets.splice(i, 1);
                continue;
            }

            if (checkCollision(playerRect, bullet)) {
                gameState.bullets.splice(i, 1);
                gameState.paused = true;
                gameState.currentChallengeType = 'bullet';
                triggerMathChallenge();
                break; // One bullet collision at a time
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
        generateMap(gameState.level);
        spawnEnemies(5);
        updateHUD();
    }
}

function loop(timestamp) {
    update(timestamp);
    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

    ctx.save();
    
    // 將座標系統原點移至角色中心，以便翻轉
    ctx.translate(Math.floor(dx + drawW / 2), Math.floor(dy + drawH / 2));
    if (gameState.facingLeft) {
        ctx.scale(-1, 1);
    }

    // 在中心點繪製（需往回位移半個寬高）
    ctx.drawImage(
        processedSpriteCanvas || sprite,
        Math.floor(sx), Math.floor(sy), Math.floor(gameConfig.frameWidth), Math.floor(gameConfig.frameHeight),
        Math.floor(-drawW / 2), Math.floor(-drawH / 2), Math.floor(drawW), Math.floor(drawH)
    );

    // 繪製紅框 (除錯用)
    if (gameConfig.showDebugBox) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.strokeRect(Math.floor(-drawW / 2), Math.floor(-drawH / 2), Math.floor(drawW), Math.floor(drawH));
    }
    
    ctx.restore();

    // 文字說明
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.fillText("紅框應剛好包住角色", 10, 20);
    ctx.fillText("若不合，請調整 frameWidth", 10, 40);
}

// --- 6. Math Challenge Logic ---
function triggerMathChallenge() {
    const modalOverlay = document.getElementById("math-modal-overlay");
    const questionEl = document.getElementById("math-question");
    const answersContainer = document.getElementById("answers-container");
    const feedbackEl = document.getElementById("math-feedback");

    // Reset feedback
    feedbackEl.textContent = "";

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
        btn.onclick = () => checkAnswer(ans, correctAnswer);
        answersContainer.appendChild(btn);
    });

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
            for (let i = 0; i < 3; i++) {
                const heart = document.createElement("span");
                heart.className = "heart";
                hpDisplayCache.appendChild(heart);
                heartElementsCache.push(heart);
            }
        }
    }

    for (let i = 0; i < 3; i++) {
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
}

let isAnswering = false;

function checkAnswer(selected, correct) {
    if (isAnswering) return; // Prevent spam clicking
    isAnswering = true;

    const feedbackEl = document.getElementById("math-feedback");
    const modalOverlay = document.getElementById("math-modal-overlay");

    if (selected === correct) {
        feedbackEl.style.color = "green";
        feedbackEl.textContent = "Correct! ✨";

        if (gameState.currentChallengeType === 'bullet') {
            // No score change
        } else if (gameState.currentChallengeType === 'boss') {
            gameState.score += 10;
            gameState.bossHitsNeeded -= 1;

            if (gameState.bossHitsNeeded > 0) {
                // Teleport boss
                let boss = gameState.enemies[gameState.currentEnemyIndex];
                let placed = false;
                let attempts = 0;
                while (!placed && attempts < 100) {
                    const r = Math.floor(Math.random() * (gameState.rows - 2)) + 1;
                    const c = Math.floor(Math.random() * (gameState.cols - 2)) + 1;
                    if (gameState.map[r] && gameState.map[r][c] === 0) {
                        boss.x = c * TILE_SIZE;
                        boss.y = r * TILE_SIZE;
                        placed = true;
                    }
                    attempts++;
                }
            } else {
                gameState.enemies[gameState.currentEnemyIndex].active = false;
            }
        } else {
            gameState.score += 10;
            gameState.enemies[gameState.currentEnemyIndex].active = false;
        }

        setTimeout(() => {
            modalOverlay.style.display = "none";
            for (let key in keys) {
                keys[key] = false;
            }
            gameState.paused = false;
            isAnswering = false;
            updateHUD();
        }, 1000);
    } else {
        feedbackEl.style.color = "red";
        feedbackEl.textContent = "Oops! Try again later.";
        gameState.hp -= 1;

        // Knockback logic - for bullet or general knockback, we can just bounce down
        // If it was a monster/boss, we could bounce relative to them, but bounce down is the current existing behavior
        const drawW = gameConfig.drawWidth;
        const drawH = gameConfig.drawHeight;

        let knockbackDist = 100;
        let step = 5;
        for (let i = 0; i < knockbackDist; i += step) {
            let testRect = {
                x: gameState.x + (drawW / 4),
                y: gameState.y + step + (drawH / 4),
                width: drawW / 2,
                height: drawH / 2
            };
            if (!isWallCollision(testRect)) {
                gameState.y += step;
            } else {
                break; // 撞到牆壁，立刻停止擊退
            }
        }

        // Ensure within bounds after knockback
        if (gameState.y > H - drawH/2) gameState.y = H - drawH/2;

        setTimeout(() => {
            modalOverlay.style.display = "none";
            for (let key in keys) {
                keys[key] = false;
            }
            gameState.paused = false;
            isAnswering = false;
            updateHUD();

            if (gameState.hp <= 0) {
                alert("Game Over! Restarting...");
                gameState.hp = 3;
                gameState.score = 0;
                gameState.x = Math.floor(gameState.cols / 2) * TILE_SIZE;
                gameState.y = Math.floor(gameState.rows / 2) * TILE_SIZE;
                gameState.level = 1;
                spawnEnemies(5);
                updateHUD();
            }
        }, 1000);
    }
}

updateHUD(); // Initialize HUD

requestAnimationFrame(loop);