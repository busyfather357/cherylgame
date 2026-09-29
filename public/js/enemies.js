// --- 敵人：怪物、寶箱與魔王 ---
// 建立敵人、每格畫面的移動與攻擊、碰到時算什麼、繪製。
// 一般怪物依主題換外觀、隨機移動；第 11 關起的新怪物見 MONSTER_KINDS；魔王見 BOSS_TYPES。
// 每個攻擊前都有預警 (抖動、鼓起、紅色區域)，讓孩子看得懂、學得會。
// 碰撞範圍一律 50px；魔王畫大 1.5 倍但碰撞範圍不變，才不會卡在一格寬的走道。
// 相依：gameState、ctx、TILE_SIZE、isWallCollision()、checkCollision()、findSpawnTile()、getEmojiSprite() (script.js)；
//       isSmallMap() (stages.js)
// 本檔在 script.js 之前載入，頂層不能用到 TILE_SIZE 等 script.js 的常數 (只能在函式裡用)，所以距離直接寫像素

const ENEMY_SIZE = 50;
const BOSS_DRAW_SCALE = 1.5;
const WINDUP_MS = 1000;             // 攻擊前的預警時間
const FIRST_ATTACK_DELAY_MS = 1500; // 開始移動 (或被打中傳送) 後多久才開始第一次攻擊
const CROSS_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAGONAL_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

const PUFFER_DEFLATED_SIZE = 36;
const COBRA_RANGE = 200;            // 玩家在 4 格內才吐毒液
const COBRA_COOLDOWN_MS = 4000;
const COBRA_VENOM_SPEED = 2.5;      // 比玩家 (3) 慢
const GHOST_VISIBLE_MS = 3000;
const GHOST_HIDDEN_MS = 2000;
const UFO_FLEE_RANGE = 150;         // 玩家在 3 格內就逃跑
const UFO_FLEE_SPEED = 2.2;         // 比玩家慢，追到牆角就抓得到
const RHINO_STUN_MS = 3000;
const RHINO_MAX_CHARGE_MS = 3000;
const BOMB_FUSE_MS = 1500;
const BOMB_BLAST_MS = 500;
const BOMB_RANGE = 3;               // 火焰往四個方向各延伸幾格 (被牆擋住就停)

// 第 11 關起的新怪物 (出現的章節見 stages.js)。hint：第一次出現時的提示；hp：要答對幾次；
// reward：答對時的獎勵類型 (XP_REWARDS、GOLD_REWARDS)，沒寫就是 monster
const MONSTER_KINDS = {
    puffer: { icon: '🐡', name: '河豚',   hint: 'Hit it twice!',           hp: 2, update: updateWanderer },
    cobra:  { icon: '🐍', name: '眼鏡蛇', hint: 'Dodge the venom!',        update: updateCobra },
    ghost:  { icon: '👻', name: '小幽靈', hint: 'Catch it when it shows!', update: updateGhost },
    ufo:    { icon: '🛸', name: '飛碟',   hint: 'Catch it for bonus 🪙!',  reward: 'ufo', update: updateUfo }
};

// 魔王 (出現的關卡見 stages.js)。hp：要答對幾次 (★ 每顆 +2)；speed：平常移動的最高速度
const BOSS_TYPES = {
    dragon:    { icon: '🐉', name: '火龍',   hp: 5, speed: 2.5, update: updateFireBoss },
    oni:       { icon: '👹', name: '赤鬼',   hp: 5, speed: 2.5, update: updateFireBoss },
    kraken:    { icon: '🐙', name: '章魚王', hp: 6, speed: 1.5, update: updateKraken },
    rhino:     { icon: '🦏', name: '犀牛王', hp: 6, speed: 1.5, update: updateRhino },
    ghostKing: { icon: '👻', name: '幽靈王', hp: 7, speed: 1.5, update: updateGhostKing },
    robot:     { icon: '🤖', name: '機器人', hp: 8, speed: 2,   update: updateRobot }
};

// --- 建立 ---

function createEnemy(type, icon, x, y) {
    return {
        x, y,
        width: ENEMY_SIZE,
        height: ENEMY_SIZE,
        type,              // 'monster'、'chest'、'boss'
        kind: null,        // MONSTER_KINDS 或 BOSS_TYPES 的鍵；一般怪物與寶箱是 null
        icon,
        spriteImg: getEmojiSprite(icon), // 預先產生並儲存圖片物件
        vx: 0,
        vy: 0,
        hp: 1,             // 還要答對幾次 (魔王的血量在 gameState.bossHitsNeeded)
        reward: type,      // 答對時的獎勵類型
        active: true,
        state: 'walk',     // 'walk'、'windup' (攻擊預警)、'charge' (衝撞)、'stunned' (暈倒)
        stateUntil: 0,
        nextAttackAt: 0,   // 0：第一次移動時才開始計時 (進關時通常還停在選單)
        hidden: false,     // 隱身的幽靈：碰不到、可以穿牆
        phaseUntil: 0
    };
}

function setRandomVelocity(enemy, max) {
    enemy.vx = (Math.random() * 2 - 1) * max;
    enemy.vy = (Math.random() * 2 - 1) * max;
}

function createChest(x, y) {
    return createEnemy('chest', '🎁', x, y);
}

// kind 是 null 時為一般怪物，外觀從主題中隨機挑
function createMonster(kind, theme, x, y) {
    const info = MONSTER_KINDS[kind];
    const icon = info ? info.icon : theme.monsters[Math.floor(Math.random() * theme.monsters.length)];
    const monster = createEnemy('monster', icon, x, y);
    if (info) {
        monster.kind = kind;
        monster.hp = info.hp || 1;
        monster.reward = info.reward || 'monster';
    }
    setRandomVelocity(monster, 1);
    return monster;
}

function createBoss(kind, stars, x, y) {
    const type = BOSS_TYPES[kind];
    const boss = createEnemy('boss', type.icon, x, y);
    boss.kind = kind;
    boss.stars = stars;
    boss.maxHp = type.hp + 2 * stars;
    setRandomVelocity(boss, type.speed * 0.6);
    return boss;
}

// --- 每格畫面的更新 ---

// 對每個還在場上的敵人呼叫。frame：{ now, dt, worldW, worldH, player (玩家碰撞範圍的中心) }
function updateEnemy(enemy, frame) {
    if (enemy.type === 'boss') {
        BOSS_TYPES[enemy.kind].update(enemy, frame);
    } else if (enemy.type === 'monster') {
        const info = MONSTER_KINDS[enemy.kind];
        (info ? info.update : updateWanderer)(enemy, frame);
    }
}

// 碰到時算什麼：'monster'、'chest'、'boss' 是出題；'bullet' 是被撞到 (跟被子彈打到一樣)；null 是碰不到
function getContactType(enemy) {
    if (enemy.hidden) return null;
    if (enemy.state === 'charge') return 'bullet';
    return enemy.type;
}

// 答對時魔王扣幾格血：犀牛王暈倒時算 2 下
function getBossDamage(boss) {
    return boss.state === 'stunned' ? 2 : 1;
}

// 血剩一半以下會生氣：攻擊變快或變多
function isAngry(boss) {
    return gameState.bossHitsNeeded <= boss.maxHp / 2;
}

function bossCooldown(boss, normalMs, angryMs) {
    return (isAngry(boss) ? angryMs : normalMs) * (boss.stars > 0 ? 0.8 : 1);
}

function getCenter(enemy) {
    return { x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2 };
}

// 隨機方向移動，撞牆反彈，偶爾微調方向
function moveWandering(enemy, frame, maxSpeed) {
    const moveX = enemy.vx * frame.dt;
    enemy.x += moveX;
    if (isWallCollision(enemy) || enemy.x <= 0 || enemy.x + enemy.width >= frame.worldW) {
        enemy.x -= moveX;
        enemy.vx *= -1;
    }

    const moveY = enemy.vy * frame.dt;
    enemy.y += moveY;
    if (isWallCollision(enemy) || enemy.y <= 0 || enemy.y + enemy.height >= frame.worldH) {
        enemy.y -= moveY;
        enemy.vy *= -1;
    }

    adjustDirection(enemy, frame.dt, maxSpeed);
}

function adjustDirection(enemy, dt, maxSpeed) {
    if (Math.random() < 0.02 * dt) {
        enemy.vx += (Math.random() * 0.5) - 0.25;
        enemy.vy += (Math.random() * 0.5) - 0.25;
        enemy.vx = Math.max(-maxSpeed, Math.min(maxSpeed, enemy.vx));
        enemy.vy = Math.max(-maxSpeed, Math.min(maxSpeed, enemy.vy));
    }
}

// 穿牆移動 (隱身的幽靈)，只在外牆以內反彈
function moveThroughWalls(enemy, frame, maxSpeed) {
    const maxX = frame.worldW - TILE_SIZE - enemy.width;
    const maxY = frame.worldH - TILE_SIZE - enemy.height;

    enemy.x += enemy.vx * frame.dt;
    if (enemy.x < TILE_SIZE || enemy.x > maxX) {
        enemy.x = Math.max(TILE_SIZE, Math.min(maxX, enemy.x));
        enemy.vx *= -1;
    }
    enemy.y += enemy.vy * frame.dt;
    if (enemy.y < TILE_SIZE || enemy.y > maxY) {
        enemy.y = Math.max(TILE_SIZE, Math.min(maxY, enemy.y));
        enemy.vy *= -1;
    }

    adjustDirection(enemy, frame.dt, maxSpeed);
}

// 直線移動 (衝撞)，撞到牆時停住並回傳 true
function moveStraight(enemy, frame) {
    let hitWall = false;

    const moveX = enemy.vx * frame.dt;
    enemy.x += moveX;
    if (isWallCollision(enemy) || enemy.x <= 0 || enemy.x + enemy.width >= frame.worldW) {
        enemy.x -= moveX;
        hitWall = true;
    }

    const moveY = enemy.vy * frame.dt;
    enemy.y += moveY;
    if (isWallCollision(enemy) || enemy.y <= 0 || enemy.y + enemy.height >= frame.worldH) {
        enemy.y -= moveY;
        hitWall = true;
    }

    return hitWall;
}

function fireBullet(from, dirX, dirY, speed, icon) {
    const dist = Math.hypot(dirX, dirY) || 1;
    gameState.bullets.push({
        x: from.x - 15, // 30x30 的子彈置中
        y: from.y - 15,
        width: 30,
        height: 30,
        vx: (dirX / dist) * speed,
        vy: (dirY / dist) * speed,
        icon,
        active: true
    });
}

// 固定間隔攻擊：時間到先預警 WINDUP_MS，再呼叫 attack()
function updateAttackCycle(enemy, frame, cooldownMs, attack) {
    if (!enemy.nextAttackAt) enemy.nextAttackAt = frame.now + FIRST_ATTACK_DELAY_MS;
    if (enemy.state === 'windup') {
        if (frame.now >= enemy.stateUntil) {
            enemy.state = 'walk';
            enemy.nextAttackAt = frame.now + cooldownMs;
            attack();
        }
    } else if (frame.now >= enemy.nextAttackAt) {
        enemy.state = 'windup';
        enemy.stateUntil = frame.now + WINDUP_MS;
    }
}

// 一般怪物與 🐡 河豚
function updateWanderer(monster, frame) {
    moveWandering(monster, frame, 1.5);
}

// 🐍 玩家靠近時先抖 1 秒，再朝玩家吐一發慢速毒液
function updateCobra(cobra, frame) {
    if (cobra.state !== 'windup') moveWandering(cobra, frame, 1.5);

    const from = getCenter(cobra);
    const dx = frame.player.x - from.x;
    const dy = frame.player.y - from.y;
    if (cobra.state === 'windup' || Math.hypot(dx, dy) <= COBRA_RANGE) {
        updateAttackCycle(cobra, frame, COBRA_COOLDOWN_MS, () => {
            fireBullet(from, frame.player.x - from.x, frame.player.y - from.y, COBRA_VENOM_SPEED, '🟢');
        });
    }
}

// 👻 忽隱忽現：隱身時碰不到、可以穿牆
function updateGhost(ghost, frame) {
    updateGhostPhase(ghost, frame, GHOST_VISIBLE_MS, GHOST_HIDDEN_MS);
    if (ghost.hidden) {
        moveThroughWalls(ghost, frame, 1.5);
    } else {
        moveWandering(ghost, frame, 1.5);
    }
}

function updateGhostPhase(ghost, frame, visibleMs, hiddenMs) {
    if (!ghost.phaseUntil) ghost.phaseUntil = frame.now + Math.random() * visibleMs; // 錯開每隻幽靈的節奏
    if (frame.now < ghost.phaseUntil) return;

    if (ghost.hidden) {
        // 在牆裡時先不現身，等穿出來，否則會卡在牆裡
        if (!isWallCollision(ghost)) {
            ghost.hidden = false;
            ghost.phaseUntil = frame.now + visibleMs;
        }
    } else if (ghost.state !== 'windup') {
        ghost.hidden = true;
        ghost.phaseUntil = frame.now + hiddenMs;
    }
}

// 🛸 玩家靠近就逃跑
function updateUfo(ufo, frame) {
    const from = getCenter(ufo);
    const dx = from.x - frame.player.x;
    const dy = from.y - frame.player.y;
    const dist = Math.hypot(dx, dy);
    const fleeing = dist > 0 && dist < UFO_FLEE_RANGE;
    if (fleeing) {
        ufo.vx = (dx / dist) * UFO_FLEE_SPEED;
        ufo.vy = (dy / dist) * UFO_FLEE_SPEED;
    }
    moveWandering(ufo, frame, fleeing ? UFO_FLEE_SPEED : 1.5);
}

// 🐉 火龍、👹 赤鬼：抖動 1 秒後朝玩家噴一發火球
function updateFireBoss(boss, frame) {
    moveWandering(boss, frame, BOSS_TYPES[boss.kind].speed);
    updateAttackCycle(boss, frame, bossCooldown(boss, 4000, 2500), () => {
        const from = getCenter(boss);
        fireBullet(from, frame.player.x - from.x, frame.player.y - from.y, 4, '🔥');
    });
}

// 🐙 章魚王：停下來鼓起 1 秒後往上下左右噴墨；生氣後 8 個方向 (小地圖改成十字與斜向輪流)
function updateKraken(boss, frame) {
    if (boss.state !== 'windup') moveWandering(boss, frame, BOSS_TYPES.kraken.speed);
    updateAttackCycle(boss, frame, bossCooldown(boss, 4000, 4000), () => {
        let dirs = CROSS_DIRS;
        if (isAngry(boss)) {
            if (isSmallMap()) {
                boss.volley = (boss.volley || 0) + 1;
                dirs = boss.volley % 2 === 0 ? CROSS_DIRS : DIAGONAL_DIRS;
            } else {
                dirs = CROSS_DIRS.concat(DIAGONAL_DIRS);
            }
        }
        const from = getCenter(boss);
        for (const [dx, dy] of dirs) fireBullet(from, dx, dy, 3, '💧');
    });
}

// 🦏 犀牛王：跺腳 1 秒 (地上畫出紅色路線) 後直線衝向玩家，撞牆後暈倒 3 秒。
// 衝撞中碰到算被撞 (getContactType)，暈倒時答對算 2 下 (getBossDamage)
function updateRhino(boss, frame) {
    if (boss.state === 'charge') {
        if (moveStraight(boss, frame)) {
            boss.state = 'stunned';
            boss.stateUntil = frame.now + RHINO_STUN_MS;
        } else if (frame.now >= boss.stateUntil) {
            finishRhinoCharge(boss, frame);
        }
        return;
    }
    if (boss.state === 'stunned') {
        if (frame.now >= boss.stateUntil) finishRhinoCharge(boss, frame);
        return;
    }
    if (boss.state === 'windup') {
        if (frame.now >= boss.stateUntil) {
            const speed = isAngry(boss) ? 8 : 7;
            boss.state = 'charge';
            boss.stateUntil = frame.now + RHINO_MAX_CHARGE_MS;
            boss.vx = boss.chargeDir.x * speed;
            boss.vy = boss.chargeDir.y * speed;
        }
        return;
    }

    moveWandering(boss, frame, BOSS_TYPES.rhino.speed);
    if (!boss.nextAttackAt) boss.nextAttackAt = frame.now + FIRST_ATTACK_DELAY_MS;
    if (frame.now >= boss.nextAttackAt) {
        // 預警開始時就決定方向並畫出路線，玩家有 1 秒可以閃開
        const from = getCenter(boss);
        const dx = frame.player.x - from.x;
        const dy = frame.player.y - from.y;
        const dist = Math.hypot(dx, dy) || 1;
        boss.chargeDir = { x: dx / dist, y: dy / dist };
        boss.chargeLength = measureChargeLength(boss);
        boss.state = 'windup';
        boss.stateUntil = frame.now + WINDUP_MS;
    }
}

function finishRhinoCharge(boss, frame) {
    boss.state = 'walk';
    boss.nextAttackAt = frame.now + bossCooldown(boss, 2500, 1500);
    setRandomVelocity(boss, BOSS_TYPES.rhino.speed * 0.6);
}

// 從目前位置沿衝撞方向走到撞牆的距離 (畫預警路線用)
function measureChargeLength(boss) {
    const probe = { x: boss.x, y: boss.y, width: boss.width, height: boss.height };
    let length = 0;
    while (length < 2000) {
        probe.x = boss.x + boss.chargeDir.x * (length + 10);
        probe.y = boss.y + boss.chargeDir.y * (length + 10);
        if (isWallCollision(probe)) break;
        length += 10;
    }
    return length;
}

// 👻 幽靈王：定時隱身 (碰不到、可以穿牆)，現身時抖 1 秒後叫出一隻小幽靈，
// 小幽靈最多 2 隻 (小地圖 1 隻)。打倒小幽靈有一般怪物的獎勵，魔王倒下時一起消失 (defeatBoss)
function updateGhostKing(boss, frame) {
    updateGhostPhase(boss, frame, 4000, 2500);
    const speed = isAngry(boss) ? 2 : BOSS_TYPES.ghostKing.speed;
    if (boss.hidden) {
        moveThroughWalls(boss, frame, speed);
        return;
    }
    if (boss.state !== 'windup') moveWandering(boss, frame, speed);

    const maxMinions = isSmallMap() ? 1 : 2;
    const minions = gameState.enemies.filter(enemy => enemy.active && enemy.minion).length;
    if (boss.state === 'windup' || minions < maxMinions) {
        updateAttackCycle(boss, frame, bossCooldown(boss, 6000, 4000), () => {
            const minion = createMonster('ghost', null, boss.x, boss.y);
            minion.minion = true;
            gameState.enemies.push(minion);
        });
    }
}

// 🤖 機器人：在腳下放 💣，地板先閃 1.5 秒紅色十字才爆炸，站在火焰裡算被打中 (findBlastHit)
function updateRobot(boss, frame) {
    moveWandering(boss, frame, BOSS_TYPES.robot.speed);
    if (!boss.nextAttackAt) boss.nextAttackAt = frame.now + FIRST_ATTACK_DELAY_MS;
    if (frame.now >= boss.nextAttackAt) {
        boss.nextAttackAt = frame.now + bossCooldown(boss, 4000, 2500);
        placeBomb(getCenter(boss), frame.now);
    }
}

// --- 炸彈 (gameState.hazards) ---

function placeBomb(at, now) {
    const c = Math.floor(at.x / TILE_SIZE);
    const r = Math.floor(at.y / TILE_SIZE);
    const tiles = [{ c, r }];
    for (const [dc, dr] of CROSS_DIRS) {
        for (let i = 1; i <= BOMB_RANGE; i++) {
            const row = gameState.map[r + dr * i];
            if (!row || row[c + dc * i] !== 0) break; // 火焰被牆擋住
            tiles.push({ c: c + dc * i, r: r + dr * i });
        }
    }
    gameState.hazards.push({
        tiles,
        x: (c + 0.5) * TILE_SIZE,
        y: (r + 0.5) * TILE_SIZE,
        blastAt: now + BOMB_FUSE_MS,
        endAt: now + BOMB_FUSE_MS + BOMB_BLAST_MS
    });
}

function updateHazards(now) {
    gameState.hazards = gameState.hazards.filter(hazard => now < hazard.endAt);
}

// 玩家碰到爆炸中的火焰時，回傳炸彈中心 (擊退的來源)；沒碰到回傳 null
function findBlastHit(rect, now) {
    for (const hazard of gameState.hazards) {
        if (now < hazard.blastAt) continue;
        for (const { c, r } of hazard.tiles) {
            const tile = { x: c * TILE_SIZE, y: r * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
            if (checkCollision(rect, tile)) return { x: hazard.x, y: hazard.y };
        }
    }
    return null;
}

// --- 答對之後 ---

// 答對一次，回傳是否倒下。🐡 河豚第一次答對後消氣變小，要再答對一次
function hitMonster(monster) {
    monster.hp -= 1;
    if (monster.hp > 0) {
        const shrink = (monster.width - PUFFER_DEFLATED_SIZE) / 2;
        monster.x += shrink;
        monster.y += shrink;
        monster.width = PUFFER_DEFLATED_SIZE;
        monster.height = PUFFER_DEFLATED_SIZE;
        return false;
    }
    monster.active = false;
    return true;
}

// 魔王被打中還沒倒下：傳送到別的地方 (避開玩家周圍)，並取消攻擊預警、衝撞與暈倒
function teleportBoss(boss) {
    const spawn = findSpawnTile();
    if (spawn) {
        boss.x = spawn.x;
        boss.y = spawn.y;
    }
    resetBossState(boss);
}

// 也用在犀牛王撞到玩家時 (script.js)，避免答完題目後繼續衝撞
function resetBossState(boss) {
    boss.state = 'walk';
    boss.nextAttackAt = 0;
    boss.hidden = false;
    boss.phaseUntil = 0;
    setRandomVelocity(boss, BOSS_TYPES[boss.kind].speed * 0.6);
}

// 魔王倒下時，召喚出來的小幽靈一起消失
function defeatBoss(boss) {
    boss.active = false;
    for (const enemy of gameState.enemies) {
        if (enemy.minion) enemy.active = false;
    }
}

// --- 繪製 (drawWorld 在地圖座標中呼叫) ---

function drawEmoji(icon, cx, cy, size) {
    const img = getEmojiSprite(icon);
    if (img.complete) {
        ctx.drawImage(img, Math.floor(cx - size / 2), Math.floor(cy - size / 2), Math.floor(size), Math.floor(size));
    }
}

function drawHazards(now) {
    for (const hazard of gameState.hazards) {
        const exploding = now >= hazard.blastAt;
        for (const { c, r } of hazard.tiles) {
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;
            if (exploding) {
                drawEmoji('🔥', x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE);
            } else {
                // 預警：紅色區域閃爍
                ctx.fillStyle = Math.floor(now / 150) % 2 === 0 ? 'rgba(255, 40, 40, 0.45)' : 'rgba(255, 40, 40, 0.25)';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
        if (!exploding) drawEmoji('💣', hazard.x, hazard.y, 40);
    }
}

function drawEnemy(enemy, now) {
    const isBoss = enemy.type === 'boss';
    const center = getCenter(enemy);
    let size = isBoss ? enemy.width * BOSS_DRAW_SCALE : enemy.width;

    if (enemy.kind === 'rhino' && enemy.state === 'windup') drawChargeLane(enemy);

    // 攻擊預警：章魚王慢慢鼓起，其他的左右抖動
    if (enemy.state === 'windup') {
        if (enemy.kind === 'kraken') {
            const progress = Math.max(0, Math.min(1, 1 - (enemy.stateUntil - now) / WINDUP_MS));
            size *= 1 + 0.3 * progress;
        } else {
            center.x += Math.sin(now / 20) * 4;
        }
    }

    ctx.save();
    if (enemy.hidden) ctx.globalAlpha = 0.2;

    if (isBoss && isAngry(enemy)) {
        // 生氣：紅色光圈
        ctx.fillStyle = 'rgba(255, 50, 50, 0.35)';
        ctx.beginPath();
        ctx.arc(center.x, center.y, size * 0.55, 0, Math.PI * 2);
        ctx.fill();
    }

    drawEmoji(enemy.icon, center.x, center.y, size);

    if (isBoss) {
        if (enemy.state === 'stunned') drawEmoji('💫', center.x, center.y - size * 0.35, 28);
        if (isAngry(enemy)) drawEmoji('💢', center.x + size * 0.4, center.y - size * 0.35, 24);
        drawBossHpBar(enemy, center, size);
    }
    ctx.restore();
}

// 魔王頭上的血條，一格是一次答對
function drawBossHpBar(boss, center, size) {
    const segment = 9;
    const width = boss.maxHp * segment;
    const x = Math.floor(center.x - width / 2);
    const y = Math.floor(center.y - size / 2 - 12);
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 2, y - 2, width + 2, 11);
    for (let i = 0; i < boss.maxHp; i++) {
        ctx.fillStyle = i < gameState.bossHitsNeeded ? '#ff4d4d' : '#555';
        ctx.fillRect(x + i * segment, y, segment - 2, 7);
    }
}

// 犀牛王衝撞前的紅色路線
function drawChargeLane(boss) {
    const from = getCenter(boss);
    ctx.save();
    ctx.strokeStyle = 'rgba(230, 30, 30, 0.4)';
    ctx.lineWidth = boss.width;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(from.x + boss.chargeDir.x * boss.chargeLength, from.y + boss.chargeDir.y * boss.chargeLength);
    ctx.stroke();
    ctx.restore();
}
