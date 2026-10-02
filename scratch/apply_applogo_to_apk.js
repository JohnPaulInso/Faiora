// (2026-07-13) Use root applogo.png directly for all Android APK launcher icons
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const srcAppLogo = path.join(rootDir, 'applogo.png');

const densities = [
    { name: 'ldpi', launcher: 36, fg: 81 },
    { name: 'mdpi', launcher: 48, fg: 108 },
    { name: 'hdpi', launcher: 72, fg: 162 },
    { name: 'xhdpi', launcher: 96, fg: 216 },
    { name: 'xxhdpi', launcher: 144, fg: 324 },
    { name: 'xxxhdpi', launcher: 192, fg: 432 }
];

async function run() {
    console.log('Reading root applogo.png:', srcAppLogo);
    if (!fs.existsSync(srcAppLogo)) throw new Error('applogo.png not found in root directory');

    // 1. Update drawable/applogo.png (512x512)
    const appLogo512 = await sharp(srcAppLogo)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();

    const drawableDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'drawable');
    if (fs.existsSync(drawableDir)) {
        fs.writeFileSync(path.join(drawableDir, 'applogo.png'), appLogo512);
    }
    fs.writeFileSync(path.join(rootDir, 'www', 'applogo.png'), appLogo512);
    fs.writeFileSync(path.join(rootDir, 'assets', 'icon.png'), appLogo512);
    const pubDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');
    if (fs.existsSync(pubDir)) {
        fs.writeFileSync(path.join(pubDir, 'applogo.png'), appLogo512);
    }

    // 2. Generate all densities
    for (const d of densities) {
        const mipmapDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', `mipmap-${d.name}`);
        if (!fs.existsSync(mipmapDir)) continue;

        // ic_launcher.png (exact applogo.png resized)
        const launcherBuf = await sharp(srcAppLogo)
            .resize(d.launcher, d.launcher, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ compressionLevel: 9 })
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherBuf);

        // ic_launcher_round.png (circular mask)
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

        // ic_launcher_foreground.png (applogo.png filling adaptive safe area)
        const fgBuf = await sharp(srcAppLogo)
            .resize(d.fg, d.fg, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ compressionLevel: 9 })
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), fgBuf);

        // ic_launcher_background.png (full-bleed fiery background from applogo)
        const bgBuf = await sharp({
            create: {
                width: d.fg,
                height: d.fg,
                channels: 4,
                background: { r: 234, g: 88, b: 12, alpha: 1 } // #ea580c warm orange base
            }
        })
        .composite([{ input: fgBuf }])
        .png({ compressionLevel: 9 })
        .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_background.png'), bgBuf);

        console.log(`Generated mipmap-${d.name} icons from applogo.png`);
    }

    // 3. Ensure ic_launcher.xml in mipmap-anydpi-v26 references the full layers
    const anyDpiDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26');
    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
    fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), xmlContent, 'utf8');
    fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), xmlContent, 'utf8');

    console.log('All APK launcher icons successfully updated directly from applogo.png.');
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
