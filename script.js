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

// --- 2. 遊戲設定 (關鍵修改區域) ---
const gameConfig = {
    // ⚠️ 如果紅框比人太大，請試著把這裡改成 32, 48 或 60
    frameWidth: 234,     
    frameHeight: 245,    
    framesPerRow: 4,    // 圖片一排固定是 4 張
    scale: 2,           // 放大倍率
    showDebugBox: true  // [新增] 開啟這個可以看到紅框，調整完後改成 false
};

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
    x: (W - 64 * 2) / 2,
    y: (H - 64 * 2) / 2,
    speed: 3,
    facingLeft: false,
    hp: 3,
    score: 0,
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
        gameState.enemies.push({
            x: Math.random() * (W - 100) + 50,
            y: Math.random() * (H - 100) + 50,
            width: 50,
            height: 50,
            type: Math.random() > 0.5 ? 'monster' : 'chest',
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
sprite.onload = () => {
    spriteLoaded = true;
    console.log("圖片載入成功！");
};

// --- 5. 遊戲主迴圈 ---
function loop(timestamp) {
    if (!gameState.lastFrameTime) gameState.lastFrameTime = timestamp;

    if (gameState.paused) {
        draw();
        requestAnimationFrame(loop);
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
    const charSize = gameConfig.frameWidth * gameConfig.scale;
    if (gameState.x < -charSize/2) gameState.x = -charSize/2;
    if (gameState.x > W - charSize/2) gameState.x = W - charSize/2;
    if (gameState.y < -charSize/2) gameState.y = -charSize/2;
    if (gameState.y > H - charSize/2) gameState.y = H - charSize/2;

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
        x: gameState.x + (charSize / 4), // 縮小並置中碰撞範圍使其更自然
        y: gameState.y + (charSize / 4),
        width: charSize / 2,
        height: charSize / 2
    };

    for (let i = 0; i < gameState.enemies.length; i++) {
        let enemy = gameState.enemies[i];
        if (enemy.active && checkCollision(playerRect, enemy)) {
            gameState.paused = true;
            gameState.currentEnemyIndex = i;
            triggerMathChallenge();
            break;
        }
    }

    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.fillStyle = "#87CEEB"; 
    ctx.fillRect(0, 0, W, H);

    // 畫出敵人
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let enemy of gameState.enemies) {
        if (enemy.active) {
            // 用 emoji 代表敵人與寶箱
            const icon = enemy.type === 'monster' ? '👾' : '🎁';
            ctx.fillText(icon, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

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

    const drawW = gameConfig.frameWidth * gameConfig.scale;
    const drawH = gameConfig.frameHeight * gameConfig.scale;
    
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
        sprite,
        sx, sy, gameConfig.frameWidth, gameConfig.frameHeight,
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

function updateHUD() {
    // Update HP
    const hpDisplay = document.getElementById("hp-display");
    hpDisplay.innerHTML = "";
    for (let i = 0; i < 3; i++) {
        const heart = document.createElement("span");
        heart.className = "heart";
        heart.textContent = i < gameState.hp ? "❤️" : "🖤";
        hpDisplay.appendChild(heart);
    }
    // Update Score
    document.getElementById("score-display").textContent = `Score: ${gameState.score}`;
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
        const charSize = gameConfig.frameWidth * gameConfig.scale;
        if (gameState.y > H - charSize/2) gameState.y = H - charSize/2;

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