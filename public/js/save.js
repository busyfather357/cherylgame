// --- 存檔 (設計見 private/doc/system_architecture.md 第 4 節) ---
// 同一個 localStorage key 存兩部分，每次整份一起寫入，不會只存到一半：
//   run     本局進度 (level、hp、inventory)：只記錄「進關當下」的狀態，重新整理、從本關重來都回到這裡。
//           不可以在關卡中途更新，否則讀檔後寶箱重生，可被用來刷道具。
//   profile 永久資料 (經驗值、金幣、鑽石、答題統計、成就)：一有變動就寫入，New Game 與從本關重來都不回溯。
// 相依：gameState、ITEM_TYPES、MAX_HP、createEmptyInventory() (script.js)；createEmptyStats()、ACHIEVEMENTS (achievements.js)
// 所有 localStorage 存取都包 try/catch：sandbox iframe 中連讀取 window.localStorage 都會丟 SecurityError。

const SAVE_KEY = 'cherylgame.save';
const SAVE_VERSION = 2;

// 最近一次進關時的本局進度。localStorage 無法使用時 (例如 sandbox iframe)，Game Over 仍可用它從本關重來
let checkpoint = null;

// 永久資料。各系統直接讀寫自己的欄位，改完呼叫 saveProfile()
let profile = createEmptyProfile();

function createEmptyProfile() {
    return {
        xp: 0,
        gold: 0,
        diamonds: 0,
        stats: createEmptyStats(),
        achievements: {} // 成就 id → 解鎖時間 (Date.now())
    };
}

function isIntAtLeast(value, min) {
    return Number.isInteger(value) && value >= min;
}

// 以 template (預設值) 為底，只合併已知欄位中的非負整數，巢狀物件逐層處理。
// 將來新增欄位時舊存檔也能讀，不認識的欄位與不合格的數值會被丟棄
function mergeCounts(template, data) {
    if (!data || typeof data !== 'object') return template;
    for (const key of Object.keys(template)) {
        if (typeof template[key] === 'object') {
            mergeCounts(template[key], data[key]);
        } else if (isIntAtLeast(data[key], 0)) {
            template[key] = data[key];
        }
    }
    return template;
}

// 本局進度任何必要欄位不合格就回傳 null (從第 1 關開始)
function parseRun(data) {
    if (!data || !isIntAtLeast(data.level, 1) || !isIntAtLeast(data.hp, 1)) return null;
    return {
        level: data.level,
        hp: Math.min(data.hp, MAX_HP),
        inventory: mergeCounts(createEmptyInventory(), data.inventory)
    };
}

// 永久資料不合格的欄位用預設值，不會因為一個欄位壞掉就清空全部
function parseProfile(data) {
    const result = mergeCounts(createEmptyProfile(), data);
    if (data && data.achievements && typeof data.achievements === 'object') {
        for (const { id } of ACHIEVEMENTS) {
            if (isIntAtLeast(data.achievements[id], 1)) result.achievements[id] = data.achievements[id];
        }
    }
    return result;
}

// 回傳 { run, profile }，JSON 或版本不合格時回傳 null (視為沒有存檔)
function parseSave(raw) {
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        return null;
    }
    if (!data || typeof data !== 'object') return null;
    if (data.v === 1) return migrateV1(data);
    if (data.v !== SAVE_VERSION) return null;
    return { run: parseRun(data.run), profile: parseProfile(data.profile) };
}

// v1 只有本局進度 { v, level, score, hp, inventory }。
// 分數與經驗值同樣是每答對一題 +10，舊分數直接換成經驗值；維持 v1 的規則，分數不合格就視為沒有存檔
function migrateV1(data) {
    const run = parseRun(data);
    if (!run || !isIntAtLeast(data.score, 0)) return null;
    const migrated = createEmptyProfile();
    migrated.xp = data.score;
    return { run, profile: migrated };
}

function readSave() {
    try {
        const raw = window.localStorage.getItem(SAVE_KEY);
        return raw ? parseSave(raw) : null;
    } catch (e) {
        return null;
    }
}

function clearSave() {
    try {
        window.localStorage.removeItem(SAVE_KEY);
    } catch (e) {
        // 無法使用 localStorage，本來就沒有存檔
    }
}

// run 一律寫入 checkpoint (進關當下)，所以關卡中途呼叫也不會存到中途的道具
function writeSave() {
    try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, run: checkpoint, profile }));
    } catch (e) {
        // 無法存檔時靜默略過，遊戲照常進行
    }
}

// 更新本局進度的 checkpoint 並存檔。只在進關當下呼叫：startLevel()，以及進關時開放的商店 (shop.js)
function saveProgress() {
    checkpoint = {
        level: gameState.level,
        hp: gameState.hp,
        inventory: { ...gameState.inventory }
    };
    writeSave();
}

// 永久資料有變動時呼叫，關卡中途也可以
function saveProfile() {
    writeSave();
}

function applyProgress(progress) {
    gameState.level = progress.level;
    gameState.hp = progress.hp;
    gameState.inventory = { ...progress.inventory };
}

// 必須在第一次 startLevel() 之前執行 (script.js)
function loadProgress() {
    // 開發測試用：網址加上 ?newgame 時忽略並清除存檔 (包含永久資料)
    if (new URLSearchParams(window.location.search).has('newgame')) {
        clearSave();
        return;
    }
    const save = readSave();
    if (!save) return;
    profile = save.profile;
    if (save.run) applyProgress(save.run);
}
