const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// 設定畫布大小
canvas.width = 256;
canvas.height = 256;

// 載入圖像
const sprite = new Image();
sprite.src = "Pal_test.png"; // 這個檔案要放在同一資料夾

// Sprite 設定
const frameWidth = 64;
const frameHeight = 64;
let frameIndex = 0;
let tick = 0;

sprite.onload = function () {
  requestAnimationFrame(loop);
};

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 繪製目前的 frame
  ctx.drawImage(
    sprite,
    frameIndex * frameWidth, // source x
    0,                        // source y
    frameWidth, frameHeight,  // source w/h
    96, 96,                   // draw x/y
    frameWidth, frameHeight   // draw w/h
  );

  // 更新 frame
  tick++;
  if (tick % 10 === 0) { // 控制速度
    frameIndex = (frameIndex + 1) % 4; // 假設一排有 4 張
  }

  requestAnimationFrame(loop);
}
