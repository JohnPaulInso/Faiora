// (2026-07-13) Generate full-bleed orange adaptive icon background and foreground
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const srcFlame = path.join(rootDir, 'assets', 'new_logo.png');

const densities = [
    { name: 'ldpi', launcher: 36, fg: 81 },
    { name: 'mdpi', launcher: 48, fg: 108 },
    { name: 'hdpi', launcher: 72, fg: 162 },
    { name: 'xhdpi', launcher: 96, fg: 216 },
    { name: 'xxhdpi', launcher: 144, fg: 324 },
    { name: 'xxxhdpi', launcher: 192, fg: 432 }
];

async function run() {
    console.log('Generating full-bleed fiery orange background and foreground layers...');

    for (const d of densities) {
        const mipmapDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', `mipmap-${d.name}`);
        if (!fs.existsSync(mipmapDir)) continue;

        // 1. Full-bleed fiery gradient background (108dp equivalent for adaptive icons)
        // Edge-to-edge, NO transparent corners, rich warm orange gradient
        const bgSvg = Buffer.from(`
            <svg width="${d.fg}" height="${d.fg}">
                <defs>
                    <radialGradient id="fireBg" cx="50%" cy="38%" r="65%">
                        <stop offset="0%" stop-color="#ff7a1a"/>
                        <stop offset="45%" stop-color="#e04e06"/>
                        <stop offset="85%" stop-color="#992d00"/>
                        <stop offset="100%" stop-color="#6e1f00"/>
                    </radialGradient>
                </defs>
                <rect width="${d.fg}" height="${d.fg}" fill="url(#fireBg)"/>
            </svg>
        `);
        const bgBuf = await sharp(bgSvg).png().toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_background.png'), bgBuf);

        // 2. Adaptive Foreground: Flame logo centered within the 72dp safe zone
        const safeSize = Math.round(d.fg * 0.72);
        const flameBuf = await sharp(srcFlame)
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
        .composite([{ input: flameBuf, gravity: 'center' }])
        .png()
        .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), fgBuf);

        // 3. Legacy Launcher Icon (full composite with fiery orange background)
        const legacyBgSvg = Buffer.from(`
            <svg width="${d.launcher}" height="${d.launcher}">
                <defs>
                    <radialGradient id="legBg" cx="50%" cy="38%" r="65%">
                        <stop offset="0%" stop-color="#ff7a1a"/>
                        <stop offset="45%" stop-color="#e04e06"/>
                        <stop offset="85%" stop-color="#992d00"/>
                        <stop offset="100%" stop-color="#6e1f00"/>
                    </radialGradient>
                </defs>
                <rect width="${d.launcher}" height="${d.launcher}" rx="${d.launcher * 0.22}" fill="url(#legBg)"/>
            </svg>
        `);
        const legacyBg = await sharp(legacyBgSvg).png().toBuffer();
        const legacyFlame = await sharp(srcFlame)
            .resize(Math.round(d.launcher * 0.72), Math.round(d.launcher * 0.72), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();

        const launcherIcon = await sharp(legacyBg)
            .composite([{ input: legacyFlame, gravity: 'center' }])
            .png()
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherIcon);

        // 4. Round legacy icon
        const roundRadius = d.launcher / 2;
        const roundMask = Buffer.from(
            `<svg width="${d.launcher}" height="${d.launcher}"><circle cx="${roundRadius}" cy="${roundRadius}" r="${roundRadius}" fill="#fff"/></svg>`
        );
        const roundIcon = await sharp(launcherIcon)
            .composite([{ input: roundMask, blend: 'dest-in' }])
            .png()
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), roundIcon);

        console.log(`Generated full-bleed orange adaptive icon for mipmap-${d.name}`);
    }

    // 5. Update adaptive icon XML definitions: remove inset from background
    const anyDpiDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26');
    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
`;
    fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), xmlContent, 'utf8');
    fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), xmlContent, 'utf8');
    console.log('Updated ic_launcher.xml and ic_launcher_round.xml without background inset.');

    // 6. Update applogo.png in root and www with the full composite
    const appLogo512Svg = Buffer.from(`
        <svg width="512" height="512">
            <defs>
                <radialGradient id="appBg" cx="50%" cy="38%" r="65%">
                    <stop offset="0%" stop-color="#ff7a1a"/>
                    <stop offset="45%" stop-color="#e04e06"/>
                    <stop offset="85%" stop-color="#992d00"/>
                    <stop offset="100%" stop-color="#6e1f00"/>
                </radialGradient>
            </defs>
            <rect width="512" height="512" rx="112" fill="url(#appBg)"/>
        </svg>
    `);
    const appLogo512Bg = await sharp(appLogo512Svg).png().toBuffer();
    const appLogo512Flame = await sharp(srcFlame)
        .resize(368, 368, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();
    const fullAppLogo = await sharp(appLogo512Bg)
        .composite([{ input: appLogo512Flame, gravity: 'center' }])
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer();

    fs.writeFileSync(path.join(rootDir, 'applogo.png'), fullAppLogo);
    fs.writeFileSync(path.join(rootDir, 'assets', 'icon.png'), fullAppLogo);
    fs.writeFileSync(path.join(rootDir, 'www', 'applogo.png'), fullAppLogo);
    fs.writeFileSync(path.join(rootDir, 'www', 'assets', 'icon.png'), fullAppLogo);
    const pubDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');
    if (fs.existsSync(pubDir)) {
        fs.writeFileSync(path.join(pubDir, 'applogo.png'), fullAppLogo);
    }
    console.log('Updated applogo.png and assets/icon.png.');
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
