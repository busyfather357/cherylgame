// --- 數學題目 ---
// 題目範圍是設計決策，調整前先與維護者確認：
//   加法 10～59 + 10～59、減法 20～69 減 1～(被減數 - 10) (答案至少 10)、乘法 1～9 × 1～9。
// 第 11 關起範圍不變，但題目變難：
//   A. 錯誤選項改用常見錯誤 (忘記進位／借位、差 1、九九乘法表相鄰的積)，只看個位數選不出答案
//   B. 約 2 成是填空題 (□ + 23 = 51)
//   C. 較常出需要進位／借位的加減法，以及 6～9 的乘法
// 相依：無 (shuffle() 也給 stages.js 使用)

const HARD_QUESTION_STAGE = 11; // 從這一關開始套用上面的 A～C
const HARD_PROBLEM_RATE = 0.7;  // C：需要進位／借位、6～9 乘法的比例
const FILL_IN_RATE = 0.2;       // B：填空題的比例
const OP_SYMBOLS = { '+': '+', '-': '-', '*': '×' };

function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

// 重複產生直到符合條件；條件的機率都接近一半，100 次內幾乎一定找得到
function generateUntil(generate, accept) {
    for (let i = 0; i < 100; i++) {
        const result = generate();
        if (accept(result)) return result;
    }
    return generate();
}

// 回傳 { a, b, c }：a op b = c。wantHard 時出需要進位／借位的加減法、6～9 的乘法
function createProblem(op, wantHard) {
    if (op === '+') {
        const make = () => {
            const a = randInt(10, 59);
            const b = randInt(10, 59);
            return { a, b, c: a + b };
        };
        return wantHard ? generateUntil(make, p => p.a % 10 + p.b % 10 >= 10) : make();
    }
    if (op === '-') {
        const make = () => {
            const a = randInt(20, 69);
            const b = randInt(1, a - 10); // 答案至少 10
            return { a, b, c: a - b };
        };
        return wantHard ? generateUntil(make, p => p.a % 10 < p.b % 10) : make();
    }
    if (wantHard) {
        const big = randInt(6, 9);
        const other = randInt(2, 9);
        const [a, b] = Math.random() < 0.5 ? [big, other] : [other, big];
        return { a, b, c: a * b };
    }
    const a = randInt(1, 9);
    const b = randInt(1, 9);
    return { a, b, c: a * b };
}

// 回傳 { op, text, answer, choices }；op 是 '+'、'-'、'*'，答題統計依它分類
function generateQuestion(level) {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const hard = level >= HARD_QUESTION_STAGE;
    const problem = createProblem(op, hard && Math.random() < HARD_PROBLEM_RATE);
    const symbol = OP_SYMBOLS[op];

    // blank：填空的位置 ('a' 或 'b')，null 是一般題目
    const blank = hard && Math.random() < FILL_IN_RATE ? (Math.random() < 0.5 ? 'a' : 'b') : null;
    let text, answer;
    if (blank === 'a') {
        text = `□ ${symbol} ${problem.b} = ${problem.c}`;
        answer = problem.a;
    } else if (blank === 'b') {
        text = `${problem.a} ${symbol} □ = ${problem.c}`;
        answer = problem.b;
    } else {
        text = `${problem.a} ${symbol} ${problem.b} = ?`;
        answer = problem.c;
    }

    const minChoice = op === '*' && blank ? 1 : 0; // 乘法填空的答案是 1～9，不放 0
    const wrong = hard
        ? pickMistakes(answer, mistakeGroups(op, problem, blank), minChoice)
        : pickNearbyWrong(answer, 3, [], minChoice);
    return { op, text, answer, choices: shuffle([answer, ...wrong]) };
}

// 正確答案 ±10 以內隨機 (第 10 關以前的錯誤選項)
function pickNearbyWrong(answer, count, taken, min) {
    const wrong = [];
    while (wrong.length < count) {
        const candidate = answer + randInt(-10, 10);
        if (candidate !== answer && candidate >= min && !wrong.includes(candidate) && !taken.includes(candidate)) {
            wrong.push(candidate);
        }
    }
    return wrong;
}

// 常見錯誤的候選答案，分組列出。每組至少挑一個，
// 加減法才會同時有「個位數相同」(差 10) 與「十位數相同」(差 1、2) 的錯誤選項
function mistakeGroups(op, { a, b, c }, blank) {
    if (op === '*') {
        if (!blank) return [[a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b]]; // 背成九九乘法表相鄰的積
        const answer = blank === 'a' ? a : b;
        return [[answer - 1, answer + 1], [answer - 2, answer + 2]];
    }

    if (!blank) {
        const groups = [];
        if (op === '-' && a % 10 < b % 10) {
            // 需要借位時，個位數用大的減小的 (52 - 27 算成 35)
            groups.push([10 * (Math.floor(a / 10) - Math.floor(b / 10)) + (b % 10 - a % 10)]);
        }
        groups.push([c - 10, c + 10], [c - 1, c + 1, c - 2, c + 2]);
        return groups;
    }

    // 填空題最常見的錯誤是把題目上的兩個數直接相加或相減 (□ + 23 = 51 答成 74)
    const answer = blank === 'a' ? a : b;
    let wrongOperation;
    if (op === '+') {
        wrongOperation = c + (blank === 'a' ? b : a);
    } else {
        wrongOperation = blank === 'a' ? Math.abs(c - b) : a + c;
    }
    return [[wrongOperation], [answer - 10, answer + 10], [answer - 1, answer + 1, answer - 2, answer + 2]];
}

function pickMistakes(answer, groups, min) {
    const isUsable = (candidate, wrong) => candidate !== answer && candidate >= min && !wrong.includes(candidate);
    const wrong = [];
    for (const group of groups) {
        if (wrong.length >= 3) break;
        const pick = shuffle(group.filter(candidate => isUsable(candidate, wrong)))[0];
        if (pick !== undefined) wrong.push(pick);
    }
    // 還不到 3 個時從剩下的候選補，候選都用完 (例如 1 × 1) 再用 ±10 以內隨機補
    const rest = shuffle([...new Set(groups.flat())].filter(candidate => isUsable(candidate, wrong)));
    while (wrong.length < 3 && rest.length > 0) wrong.push(rest.pop());
    return wrong.concat(pickNearbyWrong(answer, 3 - wrong.length, wrong, min));
}
