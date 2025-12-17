const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- 1. 初始化畫布 (High DPI 支援) ---
const W = 256;
const H = 256;
// 設定 CSS 顯示尺寸
canvas.style.width = W + "px";
canvas.style.height = H + "px";
// 取得裝置像素比 (Retina 螢幕通常是 2)
const DPR = window.devicePixelRatio || 1;
// 設定實際渲染像素
canvas.width = Math.floor(W * DPR);
canvas.height = Math.floor(H * DPR);
// 縮放繪圖 context，讓我們可以用邏輯座標 (256x256) 繪圖
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

// --- 2. 關鍵設定：關閉圖片平滑處理 (Pixel Art 必備) ---
ctx.imageSmoothingEnabled = false; 

// --- 3. 遊戲狀態 ---
const gameState = {
    fps: 10,           // 動畫速度
    playing: true,
    scale: 2,          // 圖片放大倍率
    currentFrame: 0,
    framesPerRow: 4,   // 圖片一行有幾格
    totalFrames: 4,    // 總共幾格動畫
    frameWidth: 64,    // 單格寬度 (根據圖片實際像素)
    frameHeight: 64    // 單格高度
};

// --- 4. 載入圖片 ---
const sprite = new Image();
sprite.crossOrigin = "anonymous"; // 允許跨網域載入圖片
// 這裡使用一張開源的貓咪走路圖
sprite.src = "https://opengameart.org/sites/default/files/cat_0.png";

let spriteLoaded = false;

sprite.onload = () => {
    spriteLoaded = true;
    console.log("Sprite loaded!");
};

// --- 5. 遊戲迴圈 (Game Loop) ---
let lastTime = 0;
let accumulator = 0; 

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    
    // 計算兩幀之間的時間差 (ms)
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // 防止長時間切換視窗導致的時間暴衝 (Cap at 1000ms)
    if (deltaTime > 1000) {
        requestAnimationFrame(loop);
        return;
    }

    if (gameState.playing) {
        accumulator += deltaTime;
        const frameDuration = 1000 / gameState.fps;

        // 更新邏輯 (Update)
        while (accumulator >= frameDuration) {
            gameState.currentFrame = (gameState.currentFrame + 1) % gameState.totalFrames;
            accumulator -= frameDuration;
        }
    }

    // 繪製畫面 (Draw)
    draw();
    
    // 請求下一幀
    requestAnimationFrame(loop);
}

function draw() {
    // 清空畫布
    ctx.clearRect(0, 0, W, H);

    // 顯示除錯資訊
    ctx.fillStyle = "#333"; // 深灰色文字
    ctx.font = "14px Consolas";
    ctx.fillText(`FPS: ${gameState.fps} (Up/Down)`, 10, 20);
    ctx.fillText(gameState.playing ? "State: Playing" : "State: Paused", 10, 40);

    if (spriteLoaded) {
        // 計算來源座標 (Source X, Y)
        const sx = gameState.currentFrame * gameState.frameWidth; 
        const sy = 0; // 第一列

        // 計算目標座標 (置中)
        const drawWidth = gameState.frameWidth * gameState.scale;
        const drawHeight = gameState.frameHeight * gameState.scale;
        const dx = (W - drawWidth) / 2;
        const dy = (H - drawHeight) / 2;

        // 繪圖
        ctx.drawImage(
            sprite, 
            sx, sy, gameState.frameWidth, gameState.frameHeight, // 來源裁切
            dx, dy, drawWidth, drawHeight                        // 目標位置與大小
        );
    } else {
        // 載入中畫面
        ctx.fillText("Loading Sprite...", 80, 130);
    }
}

// --- 6. 鍵盤控制 ---
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        gameState.playing = !gameState.playing;
    } else if (e.code === "ArrowUp") {
        gameState.fps = Math.min(60, gameState.fps + 2);
    } else if (e.code === "ArrowDown") {
        gameState.fps = Math.max(1, gameState.fps - 2);
    }
});

// 啟動迴圈
requestAnimationFrame(loop);
