const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

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

function createBackgroundPattern(level) {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 50;
    bgCanvas.height = 50;
    const bgCtx = bgCanvas.getContext('2d');

    if (level === 1) {
        // Level 1: Grass
        bgCtx.fillStyle = '#4CAF50'; // Base green
        bgCtx.fillRect(0, 0, 50, 50);

        bgCtx.fillStyle = '#45a049'; // Darker green
        bgCtx.fillRect(0, 0, 25, 25);
        bgCtx.fillRect(25, 25, 25, 25);

        // Add some simple pixel texture dots
        bgCtx.fillStyle = '#388E3C';
        bgCtx.fillRect(5, 5, 2, 2);
        bgCtx.fillRect(35, 10, 2, 2);
        bgCtx.fillRect(15, 35, 2, 2);
        bgCtx.fillRect(40, 40, 2, 2);
    } else if (level === 2) {
        // Level 2: Beach/Ocean
        bgCtx.fillStyle = '#F5DEB3'; // Light sand
        bgCtx.fillRect(0, 0, 50, 50);

        bgCtx.fillStyle = '#87CEEB'; // Light blue ocean
        bgCtx.fillRect(0, 0, 25, 25);
        bgCtx.fillRect(25, 25, 25, 25);

        // Add wave dots
        bgCtx.fillStyle = '#4682B4';
        bgCtx.fillRect(5, 5, 2, 2);
        bgCtx.fillRect(35, 10, 2, 2);
        bgCtx.fillRect(15, 35, 2, 2);
        bgCtx.fillRect(40, 40, 2, 2);
    } else {
        // Level 3+: Dungeon/Volcano
        bgCtx.fillStyle = '#2F4F4F'; // Dark slate gray
        bgCtx.fillRect(0, 0, 50, 50);

        bgCtx.fillStyle = '#8B0000'; // Dark red
        bgCtx.fillRect(0, 0, 25, 25);
        bgCtx.fillRect(25, 25, 25, 25);

        // Add texture dots
        bgCtx.fillStyle = '#556B2F';
        bgCtx.fillRect(5, 5, 2, 2);
        bgCtx.fillRect(35, 10, 2, 2);
        bgCtx.fillRect(15, 35, 2, 2);
        bgCtx.fillRect(40, 40, 2, 2);
    }

    return ctx.createPattern(bgCanvas, 'repeat');
}

let bgPattern = createBackgroundPattern(1);

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
    enemies: []
};

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
function spawnEnemies(count) {
    gameState.enemies = [];
    for (let i = 0; i < count; i++) {
        let isMonster = Math.random() > 0.5;
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

        gameState.enemies.push({
            x: Math.random() * (W - 100) + 50,
            y: Math.random() * (H - 100) + 50,
            width: 50,
            height: 50,
            type: type,
            icon: icon,
            vx: vx,
            vy: vy,
            active: true
        });
    }
}
spawnEnemies(5); // Spawn initial enemies

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

    // 移動邏輯
    if (keys["ArrowRight"] || keys["KeyD"]) {
        gameState.x += gameState.speed;
        isMoving = true;
        gameState.facingLeft = false;
    }
    if (keys["ArrowLeft"] || keys["KeyA"]) {
        gameState.x -= gameState.speed;
        isMoving = true;
        gameState.facingLeft = true; 
    }
    if (keys["ArrowUp"] || keys["KeyW"]) {
        gameState.y -= gameState.speed;
        isMoving = true;
    }
    if (keys["ArrowDown"] || keys["KeyS"]) {
        gameState.y += gameState.speed;
        isMoving = true;
    }

    // 邊界檢查
    const drawW = gameConfig.drawWidth;
    const drawH = gameConfig.drawHeight;
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
            // 怪物自主移動
            if (enemy.type === 'monster') {
                enemy.x += enemy.vx;
                enemy.y += enemy.vy;

                // 邊界碰撞反彈
                if (enemy.x <= 0 || enemy.x + enemy.width >= W) {
                    enemy.vx *= -1;
                }
                if (enemy.y <= 0 || enemy.y + enemy.height >= H) {
                    enemy.vy *= -1;
                }

                // 偶爾隨機微調速度方向
                if (Math.random() < 0.02) {
                    enemy.vx += (Math.random() * 0.5) - 0.25;
                    enemy.vy += (Math.random() * 0.5) - 0.25;

                    // 限制最大速度
                    enemy.vx = Math.max(-1.5, Math.min(1.5, enemy.vx));
                    enemy.vy = Math.max(-1.5, Math.min(1.5, enemy.vy));
                }
            }

            if (checkCollision(playerRect, enemy)) {
                gameState.paused = true;
                gameState.currentEnemyIndex = i;
                triggerMathChallenge();
                break;
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
        bgPattern = createBackgroundPattern(gameState.level);
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
    ctx.fillStyle = bgPattern;
    ctx.fillRect(0, 0, W, H);

    // 畫出敵人
    ctx.font = "40px 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', 'Android Emoji', EmojiSymbols, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let enemy of gameState.enemies) {
        if (enemy.active) {
            ctx.fillText(enemy.icon, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

            // 繪製敵人紅框 (除錯用)
            if (gameConfig.showDebugBox) {
                ctx.strokeStyle = "blue";
                ctx.lineWidth = 2;
                ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
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
    ctx.translate(dx + drawW / 2, dy + drawH / 2);
    if (gameState.facingLeft) {
        ctx.scale(-1, 1);
    }

    // 在中心點繪製（需往回位移半個寬高）
    ctx.drawImage(
        processedSpriteCanvas || sprite,
        Math.floor(sx), Math.floor(sy), Math.floor(gameConfig.frameWidth), Math.floor(gameConfig.frameHeight),
        -drawW / 2, -drawH / 2, drawW, drawH
    );

    // 繪製紅框 (除錯用)
    if (gameConfig.showDebugBox) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.strokeRect(-drawW / 2, -drawH / 2, drawW, drawH);
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
        gameState.score += 10;
        gameState.enemies[gameState.currentEnemyIndex].active = false;

        setTimeout(() => {
            modalOverlay.style.display = "none";
            gameState.paused = false;
            isAnswering = false;
            updateHUD();
        }, 1000);
    } else {
        feedbackEl.style.color = "red";
        feedbackEl.textContent = "Oops! Try again later.";
        gameState.hp -= 1;

        // Knockback logic
        gameState.y += 100; // Bounce down

        // Ensure within bounds after knockback
        const drawH = gameConfig.drawHeight;
        if (gameState.y > H - drawH/2) gameState.y = H - drawH/2;

        setTimeout(() => {
            modalOverlay.style.display = "none";
            gameState.paused = false;
            isAnswering = false;
            updateHUD();

            if (gameState.hp <= 0) {
                alert("Game Over! Restarting...");
                gameState.hp = 3;
                gameState.score = 0;
                gameState.x = (W - 128) / 2;
                gameState.y = (H - 128) / 2;
                spawnEnemies(5);
                updateHUD();
            }
        }, 1000);
    }
}

updateHUD(); // Initialize HUD

requestAnimationFrame(loop);