const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const fonts = [
    { url: "https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2", dest: "assets/fonts/montserrat-latin.woff2" },
    { url: "https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459Wdhyzbi.woff2", dest: "assets/fonts/montserrat-latin-ext.woff2" },
    { url: "https://fonts.gstatic.com/s/montserrat/v31/JTUQjIg1_i6t8kCHKm459WxRyS7m.woff2", dest: "assets/fonts/montserrat-italic-latin.woff2" },
    { url: "https://fonts.gstatic.com/s/montserrat/v31/JTUQjIg1_i6t8kCHKm459WxRxy7mw9c.woff2", dest: "assets/fonts/montserrat-italic-latin-ext.woff2" },
    { url: "https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2", dest: "assets/fonts/inter-latin.woff2" },
    { url: "https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7SUc.woff2", dest: "assets/fonts/inter-latin-ext.woff2" },
    { url: "https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK4397yjA.woff2", dest: "assets/fonts/newsreader-latin.woff2" },
    { url: "https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK439DyjJBG.woff2", dest: "assets/fonts/newsreader-latin-ext.woff2" },
    { url: "https://fonts.gstatic.com/s/newsreader/v26/cY9CfjOCX1hbuyalUrK439vCjohC.woff2", dest: "assets/fonts/newsreader-italic-latin.woff2" },
    { url: "https://fonts.gstatic.com/s/newsreader/v26/cY9CfjOCX1hbuyalUrK439vCgIhCFpY.woff2", dest: "assets/fonts/newsreader-italic-latin-ext.woff2" }
];

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let redirectUrl = res.headers.location;
                if (!redirectUrl.startsWith('http')) {
                    const u = new URL(url);
                    redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
                }
                return download(redirectUrl, dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
            }
            const fileStream = fs.createWriteStream(dest);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded ${path.basename(dest)}`);
                resolve();
            });
            fileStream.on('error', reject);
        }).on('error', reject);
    });
}

async function run() {
    const root = path.resolve(__dirname, '..');
    for (const item of fonts) {
        const target = path.join(root, item.dest);
        const wwwTarget = path.join(root, 'www', item.dest);
        const androidTarget = path.join(root, 'android/app/src/main/assets/public', item.dest);

        console.log(`Fetching ${item.url} -> ${target}...`);
        await download(item.url, target);

        // Copy to www and android public as well
        fs.mkdirSync(path.dirname(wwwTarget), { recursive: true });
        fs.copyFileSync(target, wwwTarget);

        if (fs.existsSync(path.dirname(androidTarget))) {
            fs.copyFileSync(target, androidTarget);
        }
    }
    console.log('All offline font files downloaded successfully.');
}

run().catch(err => {
    console.error('Download error:', err);
    process.exit(1);
});
