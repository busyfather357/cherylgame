<script>
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// 設定畫布大小（顯示像素大小與繪製尺寸分離以支援高 DPI）
const W = 256;
const H = 256;
canvas.style.width = W + "px";
canvas.style.height = H + "px";
const DPR = window.devicePixelRatio || 1;
canvas.width = Math.floor(W * DPR);
canvas.height = Math.floor(H * DPR);
ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // 將繪圖縮放回 CSS 尺寸

// 載入圖像
const sprite = new Image();
sprite.crossOrigin = "anonymous";
sprite.src = "https://busyfather357.github.io/cherylgame/Pal_test.png";

// Sprite 設定（可調）
const frameWidth = 64;
const frameHeight = 64;
const framesPerRow = 4;   // 每列多少張 frame
const rows = 1;           // 幾列（若 sprite sheet 有多列）
let frameIndex = 0;
let fps = 12;             // 期望幀率
let playing = true;

// 計時器
let lastTime = 0;
const frameDuration = 1000 / fps;

// 圖片載入錯誤處理
sprite.onload = () => requestAnimationFrame(loop);
sprite.onerror = (e) => console.error("Sprite load error", e);

// 將 sprite 繪在畫布中央，並可放大縮小
const scale = 2; // 顯示時放大倍數

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;

  // 更新邏輯（依 FPS 控制）
  if (playing && delta >= frameDuration) {
    const steps = Math.floor(delta / frameDuration);
    frameIndex = (frameIndex + steps) % (framesPerRow * rows);
    lastTime = timestamp - (delta % frameDuration);
  }

  // 清除並繪製
  ctx.clearRect(0, 0, W, H);

  // 計算當前來源位置（支援多列）
  const sx = (frameIndex % framesPerRow) * frameWidth;
  const sy = Math.floor(frameIndex / framesPerRow) * frameHeight;

  // 繪製在畫布中央
  const dw = frameWidth * scale;
  const dh = frameHeight * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;

  ctx.drawImage(sprite, sx, sy, frameWidth, frameHeight, dx, dy, dw, dh);

  requestAnimationFrame(loop);
}

// 簡單鍵盤控制：空白鍵切換播放/暫停，箭頭上下調速度
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    playing = !playing;
  } else if (e.code === "ArrowUp") {
    fps = Math.min(60, fps + 2);
  } else if (e.code === "ArrowDown") {
    fps = Math.max(1, fps - 2);
  }
});
</script>
