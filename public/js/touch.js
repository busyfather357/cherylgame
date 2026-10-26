// --- 觸控操作：浮動搖桿、道具按鈕與畫面方向 ---
// 觸控模式 (body.touch-mode) 下，手指按在畫面上任何地方 (按鈕以外) 就在那裡出現搖桿，往哪裡拉角色就往哪裡跑。
// 手機只支援直向、平板只支援橫向：方向不對時蓋上提示並停止遊戲 (orientationBlocked，script.js 的 update() 會檢查)；嵌入版不檢查。
// 觸控模式下地圖只畫在遊戲區域 (getPlayArea)：扣掉上方的 HUD 與道具按鈕 (手機在下方、平板在右側)，控制鍵不會擋住地圖。
// 相依：W、H、ctx、gameState、useItem()、POST_CHALLENGE_GRACE_MS (script.js)
// 本檔在 script.js 之前載入，載入時只綁定事件；script.js 的東西只在函式裡使用 (第一次呼叫是 script.js 的 resizeCanvas())

const JOYSTICK_RADIUS = 60;                   // 底座半徑 (style.css 的 #joystick 直徑 120px)；拉超過時底座跟著手指移動
const JOYSTICK_DEAD_ZONE = 10;                // 拉動這個距離以內不移動，超過就全速
const JOYSTICK_SNAP_RAD = 20 * Math.PI / 180; // 接近上下左右 ±20° 時吸附成正方向，比較容易走進一格寬的通道
const PHONE_MAX_SHORT_SIDE = 600;             // 螢幕短邊 (CSS px) 小於這個算手機，其餘的觸控裝置算平板
const DEBUG_VIEWPORT = new URLSearchParams(location.search).has('debug'); // ?debug：顯示畫面尺寸，在實機上找畫面被截斷的原因
const IN_IFRAME = window.self !== window.top; // 嵌入版的形狀由外層網頁決定 (private/iframe.txt)，不檢查畫面方向

let touchMode = false;
let orientationBlocked = false; // 畫面方向不對 (手機橫向、平板直向)
let playArea = null;            // 觸控模式的遊戲區域；null 表示整個畫面
let joystickHintDismissed = false;
let hudObserver = null;
const joystick = { pointerId: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };

const joystickEl = document.getElementById("joystick");
const joystickKnobEl = document.getElementById("joystick-knob");

function isPhone() {
    return Math.min(screen.width, screen.height) < PHONE_MAX_SHORT_SIDE;
}

function enableTouchMode() {
    if (touchMode) return;
    touchMode = true;
    document.body.classList.add("touch-mode", isPhone() ? "touch-phone" : "touch-tablet");
}

// 主要輸入是觸控的裝置一開始就是觸控模式；接上滑鼠的 iPad、觸控筆電等第一次用手指操作時才切換
if (matchMedia("(hover: none) and (pointer: coarse)").matches) enableTouchMode();

// 依目前的畫面大小更新畫面方向的提示、遊戲區域與搖桿提示的位置。
// script.js 的 resizeCanvas() 會呼叫；HUD 高度改變 (換行) 時也會呼叫
function refreshTouchLayout() {
    if (!hudObserver && window.ResizeObserver) {
        hudObserver = new ResizeObserver(() => refreshTouchLayout());
        hudObserver.observe(document.getElementById("hud"));
    }

    const wasBlocked = orientationBlocked;
    orientationBlocked = touchMode && !IN_IFRAME && (isPhone() ? W > H : W < H);
    document.body.classList.toggle("rotate-needed", orientationBlocked);
    if (orientationBlocked) {
        resetTouchInput();
    } else if (wasBlocked) {
        gameState.graceUntil = performance.now() + POST_CHALLENGE_GRACE_MS; // 轉回來時跟答完題一樣給短暫保護時間
    }

    if (!touchMode) {
        playArea = null;
        return;
    }
    const top = Math.ceil(document.getElementById("hud").getBoundingClientRect().bottom) + 4;
    const items = document.getElementById("touch-items").getBoundingClientRect();
    if (isPhone()) {
        playArea = { x: 0, y: top, width: W, height: Math.max(50, Math.floor(items.top) - 8 - top) };
    } else {
        playArea = { x: 0, y: top, width: Math.max(50, Math.floor(items.left) - 8), height: H - top };
    }
    placeJoystickHint();
}

// 地圖的繪製範圍 (script.js 的 draw())
function getPlayArea() {
    return playArea || { x: 0, y: 0, width: W, height: H };
}

// --- 搖桿 ---

function moveJoystickEl(baseX, baseY, dx, dy) {
    joystickEl.style.transform = `translate(${baseX - JOYSTICK_RADIUS}px, ${baseY - JOYSTICK_RADIUS}px)`;
    joystickKnobEl.style.transform = `translate(${dx}px, ${dy}px)`;
}

// 還沒用過搖桿時，在遊戲區域左下角顯示半透明的搖桿當作提示
function placeJoystickHint() {
    const showHint = touchMode && !joystickHintDismissed && joystick.pointerId === null;
    joystickEl.classList.toggle("hint", showHint);
    if (showHint) {
        moveJoystickEl(playArea.x + 24 + JOYSTICK_RADIUS, playArea.y + playArea.height - 24 - JOYSTICK_RADIUS, 0, 0);
    }
}

// 放開搖桿 (script.js 在暫停時、切換 App 時呼叫)，之後要重新按下才會移動
function resetTouchInput() {
    if (joystick.pointerId === null) return;
    joystick.pointerId = null;
    joystick.dx = 0;
    joystick.dy = 0;
    joystickEl.classList.remove("active");
}

// 搖桿的方向 (長度 1)；沒有按住或還在死區內時回傳 null (script.js 的 getMoveVector())
function getTouchMoveVector() {
    if (joystick.pointerId === null || Math.hypot(joystick.dx, joystick.dy) < JOYSTICK_DEAD_ZONE) return null;
    const angle = Math.atan2(joystick.dy, joystick.dx);
    const axis = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(angle - axis) < JOYSTICK_SNAP_RAD) {
        return { x: Math.round(Math.cos(axis)), y: Math.round(Math.sin(axis)) }; // 吸附成正方向
    }
    return { x: Math.cos(angle), y: Math.sin(angle) };
}

document.getElementById("game").addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return; // 滑鼠用鍵盤玩
    if (!touchMode) {
        enableTouchMode();
        refreshTouchLayout();
    }
    if (joystick.pointerId !== null || gameState.paused || orientationBlocked) return;
    e.preventDefault();
    joystick.pointerId = e.pointerId;
    joystick.baseX = e.clientX;
    joystick.baseY = e.clientY;
    joystick.dx = 0;
    joystick.dy = 0;
    joystickHintDismissed = true;
    joystickEl.classList.remove("hint");
    joystickEl.classList.add("active");
    moveJoystickEl(e.clientX, e.clientY, 0, 0);
});

// 觸控的 pointer 事件會一直送到按下時的元素 (畫布)，再往上傳到 window
window.addEventListener("pointermove", (e) => {
    if (e.pointerId !== joystick.pointerId) return;
    let dx = e.clientX - joystick.baseX;
    let dy = e.clientY - joystick.baseY;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_RADIUS) {
        // 拉超過底座時底座跟著手指移動，拇指一直往同方向滑也不會拉不動
        dx *= JOYSTICK_RADIUS / dist;
        dy *= JOYSTICK_RADIUS / dist;
        joystick.baseX = e.clientX - dx;
        joystick.baseY = e.clientY - dy;
    }
    joystick.dx = dx;
    joystick.dy = dy;
    moveJoystickEl(joystick.baseX, joystick.baseY, dx, dy);
});

// 放開、被系統取消 (iOS 的手勢、通知) 都停止
for (const type of ["pointerup", "pointercancel"]) {
    window.addEventListener(type, (e) => {
        if (e.pointerId === joystick.pointerId) resetTouchInput();
    });
}

// --- 道具按鈕：按下就使用，可以一指拉搖桿、另一指按道具 ---

for (const btn of document.querySelectorAll(".item-btn")) {
    btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        btn.classList.add("pressed");
        setTimeout(() => btn.classList.remove("pressed"), 150);
        useItem(btn.dataset.item);
    });
}

// --- ?debug：畫面尺寸資訊 ---

let debugEl = null;
let safeAreaProbeEl = null;
let debugUpdatedAt = 0;

// draw() 每格呼叫：紅框是畫布邊緣 (看不到下面的紅框就是畫布超出畫面)、黃框是遊戲區域；文字每 0.5 秒更新
function drawDebugInfo(area) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "red";
    ctx.strokeRect(2, 2, W - 4, H - 4);
    ctx.strokeStyle = "yellow";
    ctx.strokeRect(area.x + 2, area.y + 2, area.width - 4, area.height - 4);
    ctx.restore();

    const now = performance.now();
    if (now - debugUpdatedAt < 500) return;
    debugUpdatedAt = now;
    if (!debugEl) {
        debugEl = document.createElement("div");
        debugEl.id = "debug-info";
        safeAreaProbeEl = document.createElement("div");
        safeAreaProbeEl.id = "safe-area-probe";
        document.body.append(debugEl, safeAreaProbeEl);
    }

    const vv = window.visualViewport;
    const safe = getComputedStyle(safeAreaProbeEl);
    const media = (query) => matchMedia(query).matches ? "Y" : "n";
    debugEl.textContent = [
        `canvas ${W}x${H}  dpr ${window.devicePixelRatio}`,
        `inner ${window.innerWidth}x${window.innerHeight}`,
        `client ${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`,
        vv ? `visual ${Math.round(vv.width)}x${Math.round(vv.height)}  top ${Math.round(vv.offsetTop)}  scale ${vv.scale}` : "visual -",
        `screen ${screen.width}x${screen.height}`,
        `safe ${safe.paddingTop} ${safe.paddingRight} ${safe.paddingBottom} ${safe.paddingLeft}`,
        `map ${gameState.cols}x${gameState.rows}  play ${Math.round(area.x)},${Math.round(area.y)} ${Math.round(area.width)}x${Math.round(area.height)}`,
        `touch ${touchMode ? (isPhone() ? "phone" : "tablet") : "off"}  blocked ${orientationBlocked}`,
        `hover:none ${media("(hover: none)")}  coarse ${media("(pointer: coarse)")}  any-coarse ${media("(any-pointer: coarse)")}`,
        `standalone ${media("(display-mode: standalone)")}`,
        navigator.userAgent
    ].join("\n");
}
