const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const files = [
    { url: "https://unpkg.com/react@18/umd/react.production.min.js", dest: "assets/vendor/react.production.min.js" },
    { url: "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js", dest: "assets/vendor/react-dom.production.min.js" },
    { url: "https://unpkg.com/history@5/umd/history.production.min.js", dest: "assets/vendor/history.production.min.js" },
    { url: "https://unpkg.com/react-router@6.3.0/umd/react-router.production.min.js", dest: "assets/vendor/react-router.production.min.js" },
    { url: "https://unpkg.com/react-router-dom@6.3.0/umd/react-router-dom.production.min.js", dest: "assets/vendor/react-router-dom.production.min.js" },
    { url: "https://unpkg.com/@babel/standalone@7.23.10/babel.min.js", dest: "assets/vendor/babel.min.js" },
    { url: "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js", dest: "assets/vendor/firebase-app-compat.js" },
    { url: "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js", dest: "assets/vendor/firebase-auth-compat.js" },
    { url: "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore-compat.js", dest: "assets/vendor/firebase-firestore-compat.js" },
    { url: "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js", dest: "assets/vendor/firebase-messaging-compat.js" }
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
    for (const item of files) {
        const target = path.resolve(__dirname, '..', item.dest);
        console.log(`Fetching ${item.url} -> ${target}...`);
        await download(item.url, target);
    }
    console.log('All vendor scripts downloaded successfully.');
}

run().catch(err => {
    console.error('Download error:', err);
    process.exit(1);
});
