const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- 1. 初始化畫布 ---
const W = 256;
const H = 256;
canvas.style.width = W + "px";
canvas.style.height = H + "px";
const DPR = window.devicePixelRatio || 1;
canvas.width = Math.floor(W * DPR);
canvas.height = Math.floor(H * DPR);
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

// --- 2. 關鍵設定：關閉模糊，保留像素風格 ---
ctx.imageSmoothingEnabled = false;

// --- 3. 遊戲設定與狀態 ---
const gameConfig = {
    frameWidth: 64,     // 騎士每一格的寬度 (如果圖片跑版，請調整這裡)
    frameHeight: 64,    // 騎士每一格的高度
    framesPerRow: 4,    // 圖片一排有幾隻騎士 (根據原圖看是 4 隻)
    scale: 2            // 放大倍率
};

// 定義動作的範圍 (根據圖片下方的說明：Idle是0-3, Run是4-9)
const animations = {
    idle: { start: 0, end: 3, speed: 6 },  // 待機：第 0 格到第 3 格
    run:  { start: 4, end: 9, speed: 12 }  // 跑步：第 4 格到第 9 格 (速度快一點)
};

const gameState = {
    action: "idle",     // 目前動作：一開始是 'idle'
    index: 0,           // 目前播到第幾張圖 (相對於動作的起始點)
    lastFrameTime: 0    // 用來控制動畫速度
};

// --- 4. 載入圖片 ---
const sprite = new Image();
// 請確保裁切乾淨的圖片命名為 knight.png 並放在同目錄
sprite.src = "knight.png"; 

let spriteLoaded = false;
sprite.onload = () => {
    spriteLoaded = true;
    console.log("騎士圖片載入成功！");
};
// 如果圖片讀取失敗 (例如路徑錯誤)，顯示錯誤
sprite.onerror = () => {
    console.error("找不到圖片！請確認檔名是否為 knight.png");
};

// --- 5. 遊戲主迴圈 ---
function loop(timestamp) {
    // 計算時間差，控制動畫速度
    if (!gameState.lastFrameTime) gameState.lastFrameTime = timestamp;
    const currentAnim = animations[gameState.action];
    
    // 根據動作設定的速度來決定要不要換下一張圖
    // 1000 / speed = 每一格停留的毫秒數
    if (timestamp - gameState.lastFrameTime > (1000 / currentAnim.speed)) {
        gameState.index++;
        
        // 計算這個動作總共有幾張圖
        const animLength = currentAnim.end - currentAnim.start + 1;
        
        // 如果播完了，就回到第 0 張 (循環播放)
        if (gameState.index >= animLength) {
            gameState.index = 0;
        }
        
        gameState.lastFrameTime = timestamp;
    }

    draw();
    requestAnimationFrame(loop);
}

function draw() {
    // 1. 清空畫布 (填入背景色，避免上一幀殘留)
    ctx.fillStyle = "#87CEEB"; // 天空藍背景
    ctx.fillRect(0, 0, W, H);

    if (!spriteLoaded) {
        ctx.fillStyle = "black";
        ctx.fillText("Loading...", 100, 100);
        return;
    }

    // 2. 計算要在畫布上畫哪一張圖
    const currentAnim = animations[gameState.action];
    
    // 算出真正的「圖片編號」 = 動作起始號碼 + 目前進度
    const spriteIndex = currentAnim.start + gameState.index;

    // 算出這張圖在 Sprite Sheet 裡的座標 (行與列)
    // 這是數學魔法：算出第幾列(row)、第幾行(col)
    const col = spriteIndex % gameConfig.framesPerRow;
    const row = Math.floor(spriteIndex / gameConfig.framesPerRow);

    const sx = col * gameConfig.frameWidth;
    const sy = row * gameConfig.frameHeight;

    // 3. 計算要畫在畫面上的位置 (置中)
    const drawW = gameConfig.frameWidth * gameConfig.scale;
    const drawH = gameConfig.frameHeight * gameConfig.scale;
    const dx = (W - drawW) / 2;
    const dy = (H - drawH) / 2;

    // 4. 繪製
    ctx.drawImage(
        sprite,
        sx, sy, gameConfig.frameWidth, gameConfig.frameHeight, // 來源座標與大小
        dx, dy, drawW, drawH                                 // 目標座標與大小
    );

    // 顯示說明文字
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("按下空白鍵切換動作", 10, 240);
    ctx.fillText("目前動作: " + gameState.action, 10, 20);
}

// --- 6. 控制設定 ---
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        // 如果現在是 idle 就變 run，反之亦然
        if (gameState.action === "idle") {
            gameState.action = "run";
            gameState.index = 0; // 切換動作時，重置回第一張
        } else {
            gameState.action = "idle";
            gameState.index = 0;
        }
    }
});

// 啟動遊戲
requestAnimationFrame(loop);