const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- 1. 初始化畫布 (保持原有的 High DPI 邏輯) ---
const W = 256;
const H = 256;
canvas.style.width = W + "px";
canvas.style.height = H + "px";
const DPR = window.devicePixelRatio || 1;
canvas.width = Math.floor(W * DPR);
canvas.height = Math.floor(H * DPR);
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

// --- 2. 關鍵優化：關閉圖片平滑處理 (讓像素圖放大後保持清晰) ---
ctx.imageSmoothingEnabled = false; 

// --- 3. 遊戲狀態設定 ---
const gameState = {
    fps: 12,
    playing: true,
    scale: 2,
    currentFrame: 0,
    framesPerRow: 4, // 根據你的圖片調整
    totalFrames: 4,  // 假設總共只有4幀動畫
    frameWidth: 64,  // 根據圖片實際像素
    frameHeight: 64
};

// 載入圖像
const sprite = new Image();
sprite.crossOrigin = "anonymous";
// 使用一個真正的像素 Sprite Sheet 範例 (這是一隻走路的貓)
sprite.src = "https://opengameart.org/sites/default/files/cat_0.png";
// 如果要用你原本的骰子圖，請解除下方註解並註解上方
// sprite.src = "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png";

let spriteLoaded = false;

sprite.onload = () => {
    spriteLoaded = true;
    console.log("Sprite loaded successfully!");
    // 確保圖片載入後，根據圖片實際大小可能需要調整 frame 設定 (這裡僅為範例)
    // gameState.frameWidth = sprite.width / 4; 
};

sprite.onerror = (e) => {
    console.error("Sprite load error", e);
};

// --- 4. 遊戲迴圈 (Game Loop) ---
let lastTime = 0;
let accumulator = 0; // 用來累積時間

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    
    // 計算經過時間 (ms)
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // --- 5. 防止螺旋死鎖 (Spiral of Death) ---
    // 如果切換分頁導致 deltaTime 超大 (例如 5秒)，就重置它，避免動畫一次跑幾百幀
    if (deltaTime > 1000) {
        requestAnimationFrame(loop);
        return;
    }

    if (gameState.playing) {
        accumulator += deltaTime;
        const frameDuration = 1000 / gameState.fps;

        // 當累積時間超過一幀的時間，就推進動畫
        while (accumulator >= frameDuration) {
            gameState.currentFrame = (gameState.currentFrame + 1) % gameState.totalFrames;
            accumulator -= frameDuration;
        }
    }

    draw();
    requestAnimationFrame(loop);
}

function draw() {
    // 清除畫布
    ctx.clearRect(0, 0, W, H);

    // 繪製背景測試區塊 (Debug用)
    ctx.fillStyle = "#ffcccc";
    ctx.fillRect(10, 10, 40, 40);

    // 繪製文字資訊 (取代 console.log)
    ctx.fillStyle = "#000";
    ctx.font = "14px Consolas";
    ctx.fillText(`FPS: ${gameState.fps} (Arrow Up/Down)`, 60, 25);
    ctx.fillText(`Frame: ${gameState.currentFrame}`, 60, 45);
    ctx.fillText(gameState.playing ? "Playing" : "Paused (Space)", 60, 65);

    if (spriteLoaded) {
        // 計算來源座標 (Source X, Y)
        // 假設 Sprite 是單列的 (Single Row)
        const sx = gameState.currentFrame * gameState.frameWidth; 
        const sy = 0; // 如果有多列，這裡要修改

        // 計算目標繪製尺寸與位置 (置中)
        const dw = gameState.frameWidth * gameState.gameState;
        const dh = gameState.frameHeight * gameState.scale;
        const dx = (W - (gameState.frameWidth * gameState.scale)) / 2;
        const dy = (H - (gameState.frameHeight * gameState.scale)) / 2;

        try {
            // 為了展示效果，這裡針對範例圖的貓調整了參數
            // 實際專案請根據 sprite 結構傳入正確參數
            ctx.drawImage(
                sprite, 
                sx, sy, gameState.frameWidth, gameState.frameHeight, // 來源裁切
                dx, dy, gameState.frameWidth * gameState.scale, gameState.frameHeight * gameState.scale // 目標繪製
            );
        } catch (err) {
            // 繪圖錯誤通常不需要一直 log，log 一次就好
        }
    } else {
        // Fallback: 畫一個替代方塊代表主角
        ctx.fillStyle = "purple";
        ctx.fillRect((W-64)/2, (H-64)/2, 64, 64);
        ctx.fillStyle = "white";
        ctx.fillText("Loading...", (W/2)-30, H/2);
    }
}

// --- 控制邏輯 ---
window.addEventListener("keydown", (e) => {
    // 防止空白鍵捲動網頁
    if(e.code === "Space") e.preventDefault(); 

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
