// (2026-07-13) APK uses applogo.png; app uses applogo_without_bg. Prev: shared
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const srcAppLogo = path.join(rootDir, 'applogo.png');
const srcWithoutBg = path.join(rootDir, 'applogo_without_bg.png');

const densities = [
    { name: 'ldpi', launcher: 36, fg: 81 },
    { name: 'mdpi', launcher: 48, fg: 108 },
    { name: 'hdpi', launcher: 72, fg: 162 },
    { name: 'xhdpi', launcher: 96, fg: 216 },
    { name: 'xxhdpi', launcher: 144, fg: 324 },
    { name: 'xxxhdpi', launcher: 192, fg: 432 }
];

async function run() {
    console.log('Reading source icons...');
    if (!fs.existsSync(srcAppLogo)) throw new Error('applogo.png not found');
    if (!fs.existsSync(srcWithoutBg)) throw new Error('applogo_without_bg.png not found');

    // 1. Process applogo_without_bg.png for throughout the app
    const withoutBg512 = await sharp(srcWithoutBg)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();

    // App in-app logos (sidebar, top bar, login, splash)
    fs.writeFileSync(path.join(rootDir, 'assets', 'icon-only.png'), withoutBg512);
    fs.writeFileSync(path.join(rootDir, 'logo.png'), withoutBg512);
    if (fs.existsSync(path.join(rootDir, 'www', 'assets'))) {
        fs.writeFileSync(path.join(rootDir, 'www', 'assets', 'icon-only.png'), withoutBg512);
    }
    if (fs.existsSync(path.join(rootDir, 'www'))) {
        fs.writeFileSync(path.join(rootDir, 'www', 'logo.png'), withoutBg512);
    }

    // Favicons
    const fav32 = await sharp(srcWithoutBg)
        .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();
    fs.writeFileSync(path.join(rootDir, 'favicon.png'), fav32);
    fs.writeFileSync(path.join(rootDir, 'favicon.ico'), fav32);
    if (fs.existsSync(path.join(rootDir, 'www'))) {
        fs.writeFileSync(path.join(rootDir, 'www', 'favicon.png'), fav32);
        fs.writeFileSync(path.join(rootDir, 'www', 'favicon.ico'), fav32);
    }

    const fav192 = await sharp(srcWithoutBg)
        .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();
    fs.writeFileSync(path.join(rootDir, 'favicon-192.png'), fav192);
    if (fs.existsSync(path.join(rootDir, 'www'))) {
        fs.writeFileSync(path.join(rootDir, 'www', 'favicon-192.png'), fav192);
    }

    // 2. Process applogo.png strictly for APK image
    const appLogo512 = await sharp(srcAppLogo)
        .resize(512, 512, { fit: 'contain' })
        .png({ compressionLevel: 9 })
        .toBuffer();

    const drawableDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'drawable');
    if (fs.existsSync(drawableDir)) {
        fs.writeFileSync(path.join(drawableDir, 'applogo.png'), appLogo512);
        fs.writeFileSync(path.join(drawableDir, 'ic_notification_logo.png'), withoutBg512);
        fs.writeFileSync(path.join(drawableDir, 'ic_stat_faiora.png'), withoutBg512);
    }
    fs.writeFileSync(path.join(rootDir, 'assets', 'icon.png'), appLogo512);

    // 3. Generate Android APK launcher icons
    for (const d of densities) {
        const mipmapDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', `mipmap-${d.name}`);
        if (!fs.existsSync(mipmapDir)) continue;

        // Legacy ic_launcher.png: squircle / rounded corner
        const rr = Math.round(d.launcher * 0.22);
        const rectSvg = Buffer.from(
            `<svg width="${d.launcher}" height="${d.launcher}"><rect width="${d.launcher}" height="${d.launcher}" rx="${rr}" fill="#fff"/></svg>`
        );
        const launcherBuf = await sharp(srcAppLogo)
            .resize(d.launcher, d.launcher, { fit: 'cover' })
            .composite([{ input: rectSvg, blend: 'dest-in' }])
            .png({ compressionLevel: 9 })
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherBuf);

        // Circular ic_launcher_round.png
        const radius = d.launcher / 2;
        const circleSvg = Buffer.from(
            `<svg width="${d.launcher}" height="${d.launcher}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff"/></svg>`
        );
        const roundBuf = await sharp(srcAppLogo)
            .resize(d.launcher, d.launcher, { fit: 'cover' })
            .composite([{ input: circleSvg, blend: 'dest-in' }])
            .png({ compressionLevel: 9 })
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), roundBuf);

        // Adaptive ic_launcher_foreground.png (transparent flame inside 66% safe zone)
        const safeSize = Math.round(d.fg * 0.66);
        const safeLogo = await sharp(srcWithoutBg)
            .resize(safeSize, safeSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();
        const fgBuf = await sharp({
            create: { width: d.fg, height: d.fg, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
        })
        .composite([{ input: safeLogo, gravity: 'center' }])
        .png({ compressionLevel: 9 })
        .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), fgBuf);

        // Adaptive ic_launcher_background.png from full-bleed applogo.png background
        const bgBuf = await sharp(srcAppLogo)
            .resize(d.fg, d.fg, { fit: 'cover' })
            .png({ compressionLevel: 9 })
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_background.png'), bgBuf);
    }

    console.log('All icons successfully updated: applogo_without_bg throughout app, applogo.png for APK.');
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
