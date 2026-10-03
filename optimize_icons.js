const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const rootLogo = 'applogo.png';

// Android icon sizes for each density
const sizes = {
    'ldpi': 36,
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

async function optimizeIcons() {
    console.log('Optimizing Android icons from applogo.png...');
    
    for (const [density, size] of Object.entries(sizes)) {
        const mipmapDir = `android/app/src/main/res/mipmap-${density}`;
        
        // Resize and compress for ic_launcher.png
        const launcherPath = path.join(mipmapDir, 'ic_launcher.png');
        await sharp(rootLogo)
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ compressionLevel: 9, effort: 10 })
            .toFile(launcherPath);
        
        const launcherSize = fs.statSync(launcherPath).size;
        console.log(`  ${density} (${size}×${size}px): ${Math.round(launcherSize/1024)}KB`);
        
        // Copy same for round icon
        fs.copyFileSync(launcherPath, path.join(mipmapDir, 'ic_launcher_round.png'));
    }
    
    console.log('\nDone! Icons optimized and compressed.');
}

optimizeIcons().catch(console.error);
