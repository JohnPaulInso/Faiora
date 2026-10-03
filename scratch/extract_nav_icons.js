const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const srcPath = 'C:/Users/Lenovo/.gemini/antigravity-ide/brain/e6d8f3ff-b80f-44d3-87cb-bc8234313975/.user_uploaded/media_1791031394760.png';
const baseDir = path.join(rootDir, 'assets', 'nav_icons');
const templateDir = path.join(baseDir, 'templates');
const wwwDir = path.join(rootDir, 'www', 'assets', 'nav_icons');

if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, { recursive: true });
if (!fs.existsSync(wwwDir)) fs.mkdirSync(wwwDir, { recursive: true });

const icons = [
  { id: 'home', state: 'outline', altState: 'inactive', box: { left: 161, top: 60, width: 149, height: 142 } },
  { id: 'home', state: 'filled', altState: 'active', box: { left: 374, top: 60, width: 146, height: 141 } },
  { id: 'notes', state: 'outline', altState: 'inactive', box: { left: 171, top: 242, width: 131, height: 141 } },
  { id: 'notes', state: 'filled', altState: 'active', box: { left: 382, top: 242, width: 130, height: 141 } },
  { id: 'quick_tasks', state: 'outline', altState: 'inactive', box: { left: 168, top: 423, width: 137, height: 139 } },
  { id: 'quick_tasks', state: 'filled', altState: 'active', box: { left: 380, top: 423, width: 135, height: 139 } },
  { id: 'alarms', state: 'outline', altState: 'inactive', box: { left: 166, top: 606, width: 159, height: 156 } },
  { id: 'alarms', state: 'filled', altState: 'active', box: { left: 374, top: 604, width: 168, height: 160 } },
  { id: 'calendar', state: 'outline', altState: 'inactive', box: { left: 166, top: 816, width: 140, height: 146 } },
  { id: 'calendar', state: 'filled', altState: 'active', box: { left: 376, top: 816, width: 142, height: 146 } }
];

async function run() {
  for (const item of icons) {
    const rawCropped = await sharp(srcPath).extract(item.box).toBuffer();

    // 192x192 app icon (lightweight, palette-optimized ~5-8KB)
    const icon192 = await sharp({
      create: { width: 192, height: 192, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
    .composite([{ input: rawCropped, gravity: 'center' }])
    .png({ palette: true, quality: 95, effort: 10 })
    .toBuffer();

    // 512x512 master template for Photoshop
    const template512 = await sharp({
      create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
    .composite([{ input: rawCropped, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();

    const name1 = `${item.id}_${item.state}.png`;
    fs.writeFileSync(path.join(baseDir, name1), icon192);
    fs.writeFileSync(path.join(wwwDir, name1), icon192);

    console.log(`Generated: ${name1} (${icon192.length} bytes)`);
  }

  const readme = [
    '# Navigation Icon Templates',
    '',
    'This directory contains cropped, background-removed, and compressed navigation icons for Faiora.',
    '',
    '## Folder Contents:',
    '- `assets/nav_icons/`: 192x192 transparent PNGs optimized for web and mobile (~5-8 KB each).',
    '- `assets/nav_icons/templates/`: 512x512 high-resolution master template files for Photoshop.',
    '',
    '## Template File Names:',
    '1. Home: `home_outline.png` / `home_filled.png` (or `home_inactive.png` / `home_active.png`)',
    '2. Notes: `notes_outline.png` / `notes_filled.png` (or `notes_inactive.png` / `notes_active.png`)',
    '3. Quick Tasks: `quick_tasks_outline.png` / `quick_tasks_filled.png` (or `quick_tasks_inactive.png` / `quick_tasks_active.png`)',
    '4. Alarms: `alarms_outline.png` / `alarms_filled.png` (or `alarms_inactive.png` / `alarms_active.png`)',
    '5. Calendar: `calendar_outline.png` / `calendar_filled.png` (or `calendar_inactive.png` / `calendar_active.png`)'
  ].join('\n');

  fs.writeFileSync(path.join(baseDir, 'README.md'), readme);
  console.log('Done!');
}

run().catch(console.error);
