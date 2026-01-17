const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- 1. 初始化畫布 ---
const W = 1024;
const H = 1024;
canvas.style.width = W + "px";
canvas.style.height = H + "px";
const DPR = window.devicePixelRatio || 1;
canvas.width = Math.floor(W * DPR);
canvas.height = Math.floor(H * DPR);
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

ctx.imageSmoothingEnabled = false;

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
    facingLeft: false
};

const keys = {};
window.addEventListener("keydown", (e) => { keys[e.code] = true; });
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

// --- 3. 載入圖片 ---
const sprite = new Image();
sprite.src = "Pal_test.png"; 

let spriteLoaded = false;
sprite.onload = () => {
    spriteLoaded = true;
    console.log("圖片載入成功！");
};

// --- 4. 遊戲主迴圈 ---
function loop(timestamp) {
    if (!gameState.lastFrameTime) gameState.lastFrameTime = timestamp;

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

    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.fillStyle = "#87CEEB"; 
    ctx.fillRect(0, 0, W, H);

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
    
    // 處理翻轉
    if (gameState.facingLeft) {
        ctx.translate(dx + drawW / 2, dy + drawH / 2);
        ctx.scale(-1, 1);
        ctx.drawImage(
            sprite,
            sx, sy, gameConfig.frameWidth, gameConfig.frameHeight,
            -drawW / 2, -drawH / 2, drawW, drawH 
        );
        
        // 繪製紅框 (除錯用) - 翻轉狀態
        if (gameConfig.showDebugBox) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.strokeRect(-drawW / 2, -drawH / 2, drawW, drawH);
        }

    } else {
        ctx.drawImage(
            sprite,
            sx, sy, gameConfig.frameWidth, gameConfig.frameHeight,
            dx, dy, drawW, drawH
        );

        // 繪製紅框 (除錯用) - 正常狀態
        if (gameConfig.showDebugBox) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.strokeRect(dx, dy, drawW, drawH);
        }
    }
    
    ctx.restore();

    // 文字說明
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.fillText("紅框應剛好包住角色", 10, 20);
    ctx.fillText("若不合，請調整 frameWidth", 10, 40);
}

requestAnimationFrame(loop);