// (2026-07-13) Batch process and compress new rebrand logos across app and Android
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const srcNewLogo = path.join(rootDir, 'assets', 'new_logo.png');
const srcApkNewLogo = path.join(rootDir, 'assets', 'apk_new_logo.png');

async function processIcons() {
    console.log('Verifying source files...');
    if (!fs.existsSync(srcNewLogo)) throw new Error('Missing assets/new_logo.png');
    if (!fs.existsSync(srcApkNewLogo)) throw new Error('Missing assets/apk_new_logo.png');

    console.log('Generating compressed root and web logos...');
    // 1. Root and web logo.png (transparent flame mark)
    const logo512 = await sharp(srcNewLogo)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer();

    fs.writeFileSync(path.join(rootDir, 'logo.png'), logo512);
    fs.writeFileSync(path.join(rootDir, 'assets', 'icon-only.png'), logo512);
    if (fs.existsSync(path.join(rootDir, 'www'))) {
        fs.writeFileSync(path.join(rootDir, 'www', 'logo.png'), logo512);
    }
    if (fs.existsSync(path.join(rootDir, 'public'))) {
        fs.writeFileSync(path.join(rootDir, 'public', 'logo.png'), logo512);
    }
    const publicAssetsDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');
    if (fs.existsSync(publicAssetsDir)) {
        fs.writeFileSync(path.join(publicAssetsDir, 'logo.png'), logo512);
    }
    console.log('logo.png generated and saved (size:', logo512.length, 'bytes)');

    // 2. Root and web applogo.png (full icon with background)
    const appLogo512 = await sharp(srcApkNewLogo)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer();

    fs.writeFileSync(path.join(rootDir, 'applogo.png'), appLogo512);
    fs.writeFileSync(path.join(rootDir, 'assets', 'icon.png'), appLogo512);
    if (fs.existsSync(path.join(rootDir, 'www'))) {
        fs.writeFileSync(path.join(rootDir, 'www', 'applogo.png'), appLogo512);
    }
    if (fs.existsSync(path.join(rootDir, 'public'))) {
        fs.writeFileSync(path.join(rootDir, 'public', 'applogo.png'), appLogo512);
    }
    if (fs.existsSync(publicAssetsDir)) {
        fs.writeFileSync(path.join(publicAssetsDir, 'applogo.png'), appLogo512);
    }
    console.log('applogo.png generated and saved (size:', appLogo512.length, 'bytes)');

    // 3. Android drawable icons
    const drawableDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'drawable');
    if (fs.existsSync(drawableDir)) {
        fs.writeFileSync(path.join(drawableDir, 'applogo.png'), appLogo512);
        fs.writeFileSync(path.join(drawableDir, 'ic_notification_logo.png'), logo512);
        // (2026-07-13) Inset splash icon to avoid corner clipping. Prev: 0 insets
        const splashFlame = await sharp(srcNewLogo).resize(328, 328, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
        const splashIcon512 = await sharp({ create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: splashFlame, gravity: 'center' }]).png({ compressionLevel: 9, effort: 10 }).toBuffer();
        fs.writeFileSync(path.join(drawableDir, 'ic_stat_faiora.png'), splashIcon512);
    }

    // 4. Android mipmap densities
    const densities = [
        { name: 'ldpi', launcher: 36, fg: 81 },
        { name: 'mdpi', launcher: 48, fg: 108 },
        { name: 'hdpi', launcher: 72, fg: 162 },
        { name: 'xhdpi', launcher: 96, fg: 216 },
        { name: 'xxhdpi', launcher: 144, fg: 324 },
        { name: 'xxxhdpi', launcher: 192, fg: 432 }
    ];

    for (const d of densities) {
        const mipmapDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', `mipmap-${d.name}`);
        if (!fs.existsSync(mipmapDir)) continue;

        // ic_launcher.png
        const launcherBuf = await sharp(srcApkNewLogo)
            .resize(d.launcher, d.launcher, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ compressionLevel: 9, effort: 10 })
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherBuf);

        // ic_launcher_round.png (circular mask)
        const radius = d.launcher / 2;
        const circleSvg = Buffer.from(
            `<svg width="${d.launcher}" height="${d.launcher}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff"/></svg>`
        );
        const roundBuf = await sharp(srcApkNewLogo)
            .resize(d.launcher, d.launcher, { fit: 'cover' })
            .composite([{ input: circleSvg, blend: 'dest-in' }])
            .png({ compressionLevel: 9, effort: 10 })
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), roundBuf);

        // ic_launcher_foreground.png (flame centered within safe zone)
        const safeSize = Math.round(d.fg * 0.72);
        const fgFlame = await sharp(srcNewLogo)
            .resize(safeSize, safeSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();
        const fgBuf = await sharp({
            create: {
                width: d.fg,
                height: d.fg,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
        .composite([{ input: fgFlame, gravity: 'center' }])
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), fgBuf);

        // ic_launcher_background.png (dark background matching app theme)
        const bgBuf = await sharp({
            create: {
                width: d.fg,
                height: d.fg,
                channels: 4,
                background: { r: 14, g: 6, b: 3, alpha: 1 } // #0e0603 dark background
            }
        })
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_background.png'), bgBuf);

        // ic_notification_logo.png & ic_stat_faiora.png
        const notifBuf = await sharp(srcNewLogo)
            .resize(d.launcher, d.launcher, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ compressionLevel: 9, effort: 10 })
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_notification_logo.png'), notifBuf);
        fs.writeFileSync(path.join(mipmapDir, 'ic_stat_faiora.png'), notifBuf);

        console.log(`Processed mipmap-${d.name}`);
    }

    console.log('All rebrand logo assets processed and compressed successfully.');
}

processIcons().catch(err => {
    console.error('Error processing icons:', err);
    process.exit(1);
});
