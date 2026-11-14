// --- 選角色畫面 ---
// 每次開啟遊戲時先顯示 (script.js 最末端)：列出 js/characters.js 的所有角色 (全身圖與名稱)，
// 點角色卡選取 (鍵盤用左右鍵)，按 Start (Enter) 開始。上次選的角色會預先選好。
// 選到的角色存進永久資料 profile.character，New Game 與從本關重來都沿用。
// 角色只有外觀不同：玩家方塊、碰撞範圍、速度都跟角色無關 (script.js 的 setPlayerCharacter())。
// 相依：CHARACTERS (characters.js)；profile、saveProfile()、isCharacterId()、DEFAULT_CHARACTER (save.js)；
//       gameState、setPlayerCharacter() (script.js)
// 本檔在 script.js 之前載入，載入時只綁定事件；script.js 的東西只在函式裡使用

// 全身圖的大小 (tools/sprites.py 的 FULL_BODY_SIZE)。還沒有全身圖的角色用精靈圖畫一張同樣大小的代替
const PORTRAIT_WIDTH = 512;
const PORTRAIT_HEIGHT = 768;

let characterSelectOpen = false;
let selectedCharacterId = null;
let onCharacterChosen = null; // 選好之後要做的事 (由 showCharacterSelect() 的呼叫者決定)

// 顯示的順序：預設角色排第一個，其他照 characters.js 的順序
function getCharacterIds() {
    const ids = Object.keys(CHARACTERS);
    return ids.includes(DEFAULT_CHARACTER) ? [DEFAULT_CHARACTER, ...ids.filter(id => id !== DEFAULT_CHARACTER)] : ids;
}

// 暫停遊戲並顯示選角色畫面；玩家按下 Start 後呼叫 onChosen()，由它恢復遊戲或顯示下一個選單
function showCharacterSelect(onChosen) {
    characterSelectOpen = true;
    onCharacterChosen = onChosen;
    gameState.paused = true;
    renderCharacterCards();
    selectCharacter(isCharacterId(profile.character) ? profile.character : DEFAULT_CHARACTER);
    document.getElementById("character-overlay").style.display = "flex";
    document.getElementById("character-start").focus(); // 按 Enter 就能開始
}

// 角色卡：全身圖 + 名稱。全身圖在這個畫面打開時才載入
function renderCharacterCards() {
    const ids = getCharacterIds();
    const list = document.getElementById("character-list");
    list.innerHTML = "";
    document.getElementById("character-modal").style.setProperty("--count", ids.length); // 視窗寬度依角色數量 (style.css)
    for (const id of ids) {
        const character = CHARACTERS[id];
        const card = document.createElement("button");
        card.className = "character-card";
        card.type = "button";
        card.dataset.character = id;

        const portrait = character.fullBody ? createFullBodyPortrait(character) : createSpritePortrait(character);
        portrait.classList.add("character-portrait");

        const name = document.createElement("span");
        name.className = "character-name";
        name.textContent = character.name;

        card.append(portrait, name);
        card.onclick = () => {
            selectCharacter(id);
            document.getElementById("character-start").focus(); // 焦點回到 Start，選完按 Enter 就能開始
        };
        list.appendChild(card);
    }
}

function createFullBodyPortrait(character) {
    const image = new Image();
    image.width = character.fullBody.width;
    image.height = character.fullBody.height;
    image.alt = ""; // 名稱在圖的下方
    image.draggable = false;
    image.src = character.fullBody.image;
    return image;
}

// 還沒有全身圖的角色：把精靈圖待機動畫的第 1 格放大，畫在跟全身圖同樣大小的畫布中間
function createSpritePortrait(character) {
    const canvas = document.createElement("canvas");
    canvas.width = PORTRAIT_WIDTH;
    canvas.height = PORTRAIT_HEIGHT;
    const sheet = new Image();
    sheet.onload = () => {
        const cell = character.cell;
        canvas.getContext("2d").drawImage(
            sheet,
            0, character.animations.idle.row * cell, cell, cell,
            0, (PORTRAIT_HEIGHT - PORTRAIT_WIDTH) / 2, PORTRAIT_WIDTH, PORTRAIT_WIDTH
        );
    };
    sheet.src = character.sheet;
    return canvas;
}

// 選取一個角色：標示角色卡，並先換上它的精靈圖 (按下 Start 時已經載入完成)。按 Start 才會存檔
function selectCharacter(id) {
    selectedCharacterId = id;
    for (const card of document.getElementById("character-list").children) {
        const selected = card.dataset.character === id;
        card.classList.toggle("selected", selected);
        card.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    setPlayerCharacter(id);
}

// 往左 (-1)、往右 (+1) 換一個角色，到底時繞回另一頭
function moveCharacterSelection(step) {
    const ids = getCharacterIds();
    const index = ids.indexOf(selectedCharacterId);
    selectCharacter(ids[(index + step + ids.length) % ids.length]);
}

// 確定角色：存進永久資料、關閉畫面，接著由 onCharacterChosen 決定下一步
function confirmCharacter() {
    if (!characterSelectOpen) return;
    characterSelectOpen = false;
    setPlayerCharacter(selectedCharacterId);
    if (profile.character !== selectedCharacterId) {
        profile.character = selectedCharacterId;
        saveProfile();
    }
    document.getElementById("character-overlay").style.display = "none";
    const next = onCharacterChosen;
    onCharacterChosen = null;
    if (next) next();
}

document.getElementById("character-start").addEventListener("click", confirmCharacter);

// 鍵盤：左右鍵 (或 A、D) 換角色，Enter 開始
window.addEventListener("keydown", (e) => {
    if (!characterSelectOpen) return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
        moveCharacterSelection(-1);
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        moveCharacterSelection(1);
    } else if (e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault(); // 焦點在按鈕上時不要再觸發一次 click
        confirmCharacter();
    }
});
