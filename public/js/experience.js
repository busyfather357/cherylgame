// --- 經驗值與角色等級 ---
// 打倒怪物、打開寶箱、打中魔王可獲得經驗值。取代原本的分數 (Score)。
// 角色等級 (Lv) 目前只是記錄，沒有任何能力加成。存檔只存累計經驗值，等級每次由經驗值換算。
// 相依：profile、saveProfile() (save.js)；showToast() (script.js)

// 答對一題可得的經驗值，依題目來源分類。子彈題沒有獎勵
const XP_REWARDS = {
    monster: 10,
    chest: 10,
    bossHit: 10,    // 魔王還沒倒下的每一擊
    bossDefeat: 60  // 打倒魔王的最後一擊 (一擊 10 + 擊敗獎勵 50)
};

// 升到第 level 級需要的累計經驗值：每升一級所需比上一級多 50
// Lv2: 50、Lv3: 150、Lv4: 300、Lv5: 500 …… 一般關卡約可得 50 經驗值
function xpForLevel(level) {
    return 25 * level * (level - 1);
}

function getPlayerLevel(xp) {
    let level = 1;
    while (xp >= xpForLevel(level + 1)) level++;
    return level;
}

function gainXp(amount) {
    const before = getPlayerLevel(profile.xp);
    profile.xp += amount;
    saveProfile();
    updateXpHUD();

    const after = getPlayerLevel(profile.xp);
    if (after > before) showToast(`⭐ Level Up! Lv ${after}`);
}

// HUD：等級 + 升級進度條，進度條上顯示累計經驗值
function updateXpHUD() {
    const level = getPlayerLevel(profile.xp);
    const levelStart = xpForLevel(level);
    const nextLevel = xpForLevel(level + 1);
    const progress = (profile.xp - levelStart) / (nextLevel - levelStart);

    document.getElementById("xp-level").textContent = `Lv ${level}`;
    document.getElementById("xp-bar-fill").style.width = `${Math.floor(progress * 100)}%`;
    document.getElementById("xp-bar-text").textContent = `${profile.xp} XP`;
    document.getElementById("xp-display").title = `${nextLevel - profile.xp} XP to Lv ${level + 1}`;
}
