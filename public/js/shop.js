// --- 商店 ---
// 過關畫面按 Shop 進入，用金幣購買道具。
// 只在進關時 (本關還沒觸發任何題目) 開放：買到的道具會一起寫進本關的 checkpoint，
// 從本關重來時仍然保留，也不會把關卡中途的狀態存進去。
// 相依：gameState、ITEM_INFO、updateHUD()、resumeGame() (script.js)；profile、saveProgress() (save.js)；spendGold() (currency.js)

// 道具價格 (金幣)。一般關卡約可賺 25 金幣，之後再依實際遊玩調整
const SHOP_PRICES = {
    potion: 40,
    boots: 20,
    scroll: 30,
    shield: 30
};

// 商店開著時 useItem() 不使用道具 (script.js)
let shopOpen = false;

document.getElementById("shop-close").addEventListener("click", closeShop);

function openShop() {
    if (gameState.levelTouched) return; // 關卡中途不開放，見檔案開頭說明
    shopOpen = true;
    document.getElementById("math-modal-overlay").style.display = "none";
    document.getElementById("shop-overlay").style.display = "flex";
    document.getElementById("shop-feedback").textContent = "";
    document.getElementById("shop-close").textContent = `Stage ${gameState.level} ▶️`;
    renderShopItems();
    document.getElementById("shop-close").focus();
}

// 離開商店直接開始本關
function closeShop() {
    shopOpen = false;
    document.getElementById("shop-overlay").style.display = "none";
    resumeGame();
}

function buyItem(item) {
    if (!spendGold(SHOP_PRICES[item])) return;
    gameState.inventory[item] += 1;
    saveProgress(); // 仍在進關當下，買到的道具視同進關時就有
    updateHUD();
    document.getElementById("shop-feedback").textContent = `Bought 1x ${ITEM_INFO[item].name}!`;
    updateShop();
}

// 商品按鈕：圖示、名稱、價格分開放，畫面寬時 (style.css) 才能改成上下排；右上角是持有數量
function renderShopItems() {
    const list = document.getElementById("shop-items");
    list.innerHTML = "";
    for (const [item, price] of Object.entries(SHOP_PRICES)) {
        const btn = document.createElement("button");
        btn.className = "answer-btn shop-item-btn";
        btn.type = "button";
        btn.dataset.item = item;
        for (const [className, text] of [
            ["shop-item-icon", ITEM_INFO[item].icon],
            ["shop-item-name", ITEM_INFO[item].name],
            ["shop-item-price", `🪙 ${price}`],
            ["shop-item-count", ""]
        ]) {
            const span = document.createElement("span");
            span.className = className;
            span.textContent = text;
            btn.appendChild(span);
        }
        btn.onclick = () => buyItem(item);
        list.appendChild(btn);
    }
    updateShop();
}

// 更新持有金幣、道具數量，以及買不起的按鈕
function updateShop() {
    document.getElementById("shop-gold").textContent = `🪙 ${profile.gold}`;
    for (const btn of document.getElementById("shop-items").children) {
        const item = btn.dataset.item;
        btn.querySelector(".shop-item-count").textContent = `x${gameState.inventory[item]}`;
        btn.disabled = profile.gold < SHOP_PRICES[item];
    }
}
