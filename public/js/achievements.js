// --- 成就系統 ---
// 記錄答題統計 (profile.stats)，達成條件時解鎖成就並給予鑽石。每個成就只會解鎖一次。
// 目前只有解鎖提示，還沒有成就清單畫面；鑽石也還沒有用途 (見 currency.js)。
// 相依：profile、saveProfile() (save.js)；addDiamonds() (currency.js)；showToast() (script.js)

// 新增成就：在這裡加一筆即可。id 存在存檔裡，不可重複，上線後也不要改名。
// isDone 收到 profile.stats，回傳是否達成；需要新的統計時，在 createEmptyStats() 加欄位並在下方 record 函式中累計
const ACHIEVEMENTS = [
    { id: 'first_correct', name: '第一次答對', diamonds: 1, isDone: stats => stats.correct >= 1 },
    { id: 'correct_100',   name: '累計答對 100 題', diamonds: 3, isDone: stats => stats.correct >= 100 },
    { id: 'streak_10',     name: '連續答對 10 題', diamonds: 2, isDone: stats => stats.bestStreak >= 10 },
    { id: 'multiply_50',   name: '乘法答對 50 題', diamonds: 3, isDone: stats => stats.ops['*'].correct >= 50 },
    { id: 'first_boss',    name: '第一次打倒魔王', diamonds: 3, isDone: stats => stats.bossesDefeated >= 1 },
    { id: 'stage_10',      name: '抵達第 10 關', diamonds: 3, isDone: stats => stats.highestStage >= 10 }
];

// 答題統計的預設值。存檔讀取時以這裡為底 (save.js 的 mergeCounts)，新增欄位不會讓舊存檔壞掉
function createEmptyStats() {
    return {
        correct: 0,
        wrong: 0,
        streak: 0,      // 目前連續答對題數，答錯歸零 (跨局保留)
        bestStreak: 0,
        ops: {          // 依運算分類，鍵與 triggerMathChallenge() 的運算子相同
            '+': { correct: 0, wrong: 0 },
            '-': { correct: 0, wrong: 0 },
            '*': { correct: 0, wrong: 0 }
        },
        bossesDefeated: 0,
        highestStage: 1
    };
}

// 每題作答後呼叫 (包含子彈題)
function recordAnswer(op, isCorrect) {
    const stats = profile.stats;
    if (isCorrect) {
        stats.correct += 1;
        stats.ops[op].correct += 1;
        stats.streak += 1;
        stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    } else {
        stats.wrong += 1;
        stats.ops[op].wrong += 1;
        stats.streak = 0;
    }
    checkAchievements();
    saveProfile();
}

function recordBossDefeated() {
    profile.stats.bossesDefeated += 1;
    checkAchievements();
    saveProfile();
}

// 每次進關時呼叫 (startLevel())，第一次 startLevel() 時就會執行
function recordStageReached(stage) {
    if (stage <= profile.stats.highestStage) return;
    profile.stats.highestStage = stage;
    checkAchievements();
    saveProfile();
}

function checkAchievements() {
    for (const achievement of ACHIEVEMENTS) {
        if (profile.achievements[achievement.id] || !achievement.isDone(profile.stats)) continue;
        profile.achievements[achievement.id] = Date.now();
        addDiamonds(achievement.diamonds);
        showToast(`🏆 ${achievement.name} +${achievement.diamonds} 💎`);
    }
}
