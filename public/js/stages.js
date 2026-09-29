// --- 章節與關卡設定 ---
// 每 10 關一章。第 1 章 (1～10 關) 維持原本的內容；第 11 關起每章換主題、加入一種新怪物 (MONSTER_KINDS)，
// 新怪物之後的章節也會混著出現。尾數 5 的關卡固定是 🐉 火龍，10 的倍數是各章的魔王 (BOSS_TYPES)。
// 第 51 關以後輪流使用第 2～5 章的主題，數值不再提高，10 的倍數的魔王加 ★ 強化。
// 所有設定都由關卡數推算，不存檔。
// 相依：gameState、showToast() (script.js)；shuffle() (questions.js)；MONSTER_KINDS、BOSS_TYPES (enemies.js)

const CHAPTER_LENGTH = 10;
const SMALL_MAP_TILES = 100; // 外牆以內少於這個格數算小地圖 (手機直向約 5×14 格)

// 地板、棋盤格、障礙物 (依位置輪流)、一般怪物的外觀
const THEMES = {
    forest:  { floor: '#4CAF50', checker: '#45a049', obstacles: ['🌲'], monsters: ['👾'] },
    beach:   { floor: '#F5DEB3', checker: '#E6C280', obstacles: ['🌊', '🪨'], monsters: ['🦀', '🦈'] },
    dungeon: { floor: '#2F4F4F', checker: '#3F5F5F', obstacles: ['🧱'], monsters: ['👾', '🦀', '🦈'] },
    iceSea:  { floor: '#7EC8E3', checker: '#71BBD6', obstacles: ['🧊', '⛄'], monsters: ['🐧', '🦈', '🐳'] },
    desert:  { floor: '#E8A95B', checker: '#DB9C4E', obstacles: ['🌵', '🪨'], monsters: ['🦂', '🦎', '🐪'] },
    haunted: { floor: '#4A3B5C', checker: '#554668', obstacles: ['🎃', '🕸️'], monsters: ['🦇', '🦉', '🐺'] },
    space:   { floor: '#26305A', checker: '#2E3968', obstacles: ['🪐', '☄️'], monsters: ['👽', '👾'] }
};

// 第 N 章是 CHAPTERS[N - 1]。monsters：怪物數 (不含寶箱)；specials：其中新怪物的數量範圍 [最少, 最多]
const CHAPTERS = [
    { theme: null,      newKind: null,     boss: 'oni',       monsters: 4, specials: [0, 0], obstacleRate: 0.15 }, // 1～10 關 (主題見 getStageTheme)
    { theme: 'iceSea',  newKind: 'puffer', boss: 'kraken',    monsters: 5, specials: [1, 2], obstacleRate: 0.16 }, // 11～20 關
    { theme: 'desert',  newKind: 'cobra',  boss: 'rhino',     monsters: 5, specials: [2, 2], obstacleRate: 0.17 }, // 21～30 關
    { theme: 'haunted', newKind: 'ghost',  boss: 'ghostKing', monsters: 6, specials: [2, 3], obstacleRate: 0.18 }, // 31～40 關
    { theme: 'space',   newKind: 'ufo',    boss: 'robot',     monsters: 6, specials: [3, 3], obstacleRate: 0.18 }  // 41～50 關
];

// 第 1 章沿用原本的主題：第 1 關森林、第 2 關沙灘、第 3 關以後地牢
function getFirstChapterTheme(level) {
    if (level === 1) return THEMES.forest;
    if (level === 2) return THEMES.beach;
    return THEMES.dungeon;
}

let stageConfigCache = null;

// 回傳該關的設定。每一格畫面都會呼叫 (drawWorld)，同一關只計算一次
function getStageConfig(level) {
    if (stageConfigCache && stageConfigCache.level === level) return stageConfigCache;

    const chapter = Math.ceil(level / CHAPTER_LENGTH);
    const isLoop = chapter > CHAPTERS.length; // 第 51 關以後
    const data = isLoop ? CHAPTERS[1 + (chapter - 2) % (CHAPTERS.length - 1)] : CHAPTERS[chapter - 1];
    const numbers = isLoop ? CHAPTERS[CHAPTERS.length - 1] : data;

    let boss = null;
    if (level % 10 === 0) boss = data.boss;
    else if (level % 5 === 0) boss = 'dragon';

    stageConfigCache = {
        level,
        chapter,
        theme: chapter === 1 ? getFirstChapterTheme(level) : THEMES[data.theme],
        boss,
        bossStars: isLoop && level % 10 === 0 ? 1 : 0,
        monsters: numbers.monsters,
        specials: numbers.specials,
        newKind: data.newKind,
        // 已經出現過的新怪物都可能再出現
        specialPool: CHAPTERS.slice(0, isLoop ? CHAPTERS.length : chapter).map(c => c.newKind).filter(Boolean),
        obstacleRate: numbers.obstacleRate
    };
    return stageConfigCache;
}

// 需要在 generateMap() 之後呼叫 (依地圖大小判斷)
function isSmallMap() {
    return (gameState.cols - 2) * (gameState.rows - 2) < SMALL_MAP_TILES;
}

// 回傳這一關每隻怪物的種類，null 是一般怪物。本章的新怪物至少出現一隻
function pickMonsterKinds(stage) {
    let count = stage.monsters;
    if (stage.chapter > 1 && isSmallMap()) count -= 1; // 小地圖少放一隻，第 1 章維持原本的數量

    const [min, max] = stage.specials;
    const specialCount = Math.min(count, min + Math.floor(Math.random() * (max - min + 1)));
    const kinds = [];
    if (specialCount > 0) kinds.push(stage.newKind);
    const pool = shuffle([...stage.specialPool]);
    while (kinds.length < specialCount) kinds.push(pool.pop() || stage.newKind);
    while (kinds.length < count) kinds.push(null);
    return kinds;
}

// --- 進關提示 ---
// 魔王登場與新怪物的提示。進關時通常還停在過關選單或商店，所以先記下來，等玩家開始移動時才顯示
const announcedKinds = new Set(); // 這次開啟遊戲已經提示過的新怪物
let pendingAnnouncements = [];

function queueStageAnnouncements(stage, enemies) {
    pendingAnnouncements = [];
    if (stage.boss) {
        const star = stage.bossStars > 0 ? '★' : '';
        pendingAnnouncements.push({ text: `⚠️ Boss: ${star}${BOSS_TYPES[stage.boss].name}` });
    }
    for (const enemy of enemies) {
        const info = MONSTER_KINDS[enemy.kind];
        if (info && !pendingAnnouncements.some(a => a.kind === enemy.kind)) {
            pendingAnnouncements.push({ kind: enemy.kind, text: `${info.icon} ${info.name}: ${info.hint}` });
        }
    }
}

// 每一格遊戲畫面 (沒有暫停時) 呼叫
function flushStageAnnouncements() {
    for (const announcement of pendingAnnouncements) {
        if (announcement.kind) {
            if (announcedKinds.has(announcement.kind)) continue;
            announcedKinds.add(announcement.kind);
        }
        showToast(announcement.text);
    }
    pendingAnnouncements = [];
}
