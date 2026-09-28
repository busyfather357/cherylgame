// --- 貨幣：金幣與鑽石 ---
// 金幣 🪙：打倒怪物、打開寶箱、打中魔王可獲得，在商店 (shop.js) 購買道具。
// 鑽石 💎：只從成就 (achievements.js) 取得，目前還沒有用途。
//          所有鑽石來源都經過 addDiamonds()，日後接上獎勵廣告時也從這裡發放。
// 相依：profile、saveProfile() (save.js)

// 答對一題可得的金幣，鍵與 XP_REWARDS (experience.js) 相同。子彈題沒有獎勵
const GOLD_REWARDS = {
    monster: 5,
    chest: 5,
    bossHit: 5,     // 魔王還沒倒下的每一擊
    bossDefeat: 35  // 打倒魔王的最後一擊 (一擊 5 + 擊敗獎勵 30)
};

function addGold(amount) {
    profile.gold += amount;
    saveProfile();
    updateWalletHUD();
}

// 金幣足夠時扣款並回傳 true，不夠時不扣款並回傳 false
function spendGold(amount) {
    if (profile.gold < amount) return false;
    profile.gold -= amount;
    saveProfile();
    updateWalletHUD();
    return true;
}

function addDiamonds(amount) {
    profile.diamonds += amount;
    saveProfile();
    updateWalletHUD();
}

function updateWalletHUD() {
    document.getElementById("gold-display").textContent = `🪙 ${profile.gold}`;
    document.getElementById("diamond-display").textContent = `💎 ${profile.diamonds}`;
}
