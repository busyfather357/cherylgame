// 瀏覽器測試共用：不用架伺服器，把 public/ 的檔案直接從硬碟提供給瀏覽器，並收集錯誤。
// 做法沿用 mumuisland-web 的 tools/browser/site.js。

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'public');
const WORK_DIR = path.resolve(__dirname, '..', 'work'); // 工具輸出 (截圖等)，不進 git
// 保留給測試用的 .test 網域：請求都由 routeSite() 回應，不會真的連網
const SITE_ORIGIN = 'http://cherylgame.test';

function listFiles(dir, prefix = '') {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix + entry.name;
        if (entry.isDirectory()) files.push(...listFiles(path.join(dir, entry.name), rel + '/'));
        else files.push(rel);
    }
    return files;
}

// public/ 底下的所有檔案 (相對路徑、大小寫完全相同)
const FILES = new Set(listFiles(PUBLIC_DIR));

// 網址路徑對到的檔案，比照 Cloudflare Pages：大小寫要相同；/ 對到 index.html；/about 對到 about.html
function resolvePath(urlPath) {
    const rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
    const candidates = rel === '' || rel.endsWith('/')
        ? [rel + 'index.html']
        : [rel, rel + '/index.html', rel + '.html'];
    return candidates.find(c => FILES.has(c)) || null;
}

// 遊戲網址。query 例如 '?newgame' (忽略並清除存檔)、'?debug'
function gameUrl(query = '') {
    return `${SITE_ORIGIN}/${query}`;
}

/**
 * 從硬碟提供 public/，而且不連網：本站的請求讀 public/ 的檔案 (找不到回 404)；
 * 其他網站 (Google Tag Manager 等) 一律回空內容。每個頁面開啟前都要先呼叫
 */
async function routeSite(page) {
    await page.route('**/*', route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === SITE_ORIGIN) {
            const file = resolvePath(url.pathname);
            if (file) return route.fulfill({ path: path.join(PUBLIC_DIR, file) });
            return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not found' });
        }
        const contentType = request.resourceType() === 'script' ? 'application/javascript' : 'text/plain';
        return route.fulfill({ status: 200, contentType, body: '' });
    });
}

// 收集未攔截的例外與 console error (包含 CSP 擋下的資源)；回傳的陣列會持續累積，測試最後檢查是空的
function watchErrors(page) {
    const errors = [];
    page.on('pageerror', error => errors.push(`uncaught exception: ${error.message}`));
    page.on('console', message => {
        if (message.type() === 'error') errors.push(`console error: ${message.text()}`);
    });
    return errors;
}

module.exports = { PUBLIC_DIR, WORK_DIR, SITE_ORIGIN, resolvePath, gameUrl, routeSite, watchErrors };
