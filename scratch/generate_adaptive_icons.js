const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const srcAppLogo = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'drawable', 'applogo.png');

const densities = [
    { name: 'ldpi', launcher: 36, fg: 81 },
    { name: 'mdpi', launcher: 48, fg: 108 },
    { name: 'hdpi', launcher: 72, fg: 162 },
    { name: 'xhdpi', launcher: 96, fg: 216 },
    { name: 'xxhdpi', launcher: 144, fg: 324 },
    { name: 'xxxhdpi', launcher: 192, fg: 432 }
];

async function generateAll() {
    console.log('Generating adaptive icons from real applogo.png with insets...');

    // 1. Create the master extended canvas (720x720 from 512x512 applogo)
    // 512/720 = 71.1% safe scale with 104px extended edge copy for seamless background
    const masterExtended = await sharp(srcAppLogo)
        .extend({ top: 104, bottom: 104, left: 104, right: 104, extendWith: 'copy' })
        .png()
        .toBuffer();

    // 2. Prepare squircle and circle masks for legacy icons
    const squircleMaskSvg = Buffer.from(
        '<svg width="720" height="720"><rect x="115" y="115" width="490" height="490" rx="110" ry="110" fill="#fff" /></svg>'
    );
    const squircleMaster = await sharp(masterExtended)
        .composite([{ input: squircleMaskSvg, blend: 'dest-in' }])
        .png()
        .toBuffer();

    const circleMaskSvg = Buffer.from(
        '<svg width="720" height="720"><circle cx="360" cy="360" r="240" fill="#fff" /></svg>'
    );
    const circleMaster = await sharp(masterExtended)
        .composite([{ input: circleMaskSvg, blend: 'dest-in' }])
        .png()
        .toBuffer();

    for (const d of densities) {
        const mipmapDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', `mipmap-${d.name}`);
        if (!fs.existsSync(mipmapDir)) continue;

        // A. Adaptive icon background (full 108dp size: d.fg x d.fg)
        const bgBuf = await sharp(masterExtended)
            .resize(d.fg, d.fg)
            .png()
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_background.png'), bgBuf);

        // B. Transparent foreground
        const fgBuf = await sharp({
            create: {
                width: d.fg,
                height: d.fg,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        }).png().toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), fgBuf);

        // C. Legacy squircle launcher icon (d.launcher x d.launcher)
        const launcherBuf = await sharp(squircleMaster)
            .resize(d.launcher, d.launcher)
            .png()
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherBuf);

        // D. Legacy round launcher icon (d.launcher x d.launcher)
        const roundBuf = await sharp(circleMaster)
            .resize(d.launcher, d.launcher)
            .png()
            .toBuffer();
        fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), roundBuf);

        console.log(`Generated icons for mipmap-${d.name}`);
    }

    console.log('All adaptive and legacy icons generated successfully.');
}

generateAll();
