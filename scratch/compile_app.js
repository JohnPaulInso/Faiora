// (2026-07-13) AOT compiler: compile JSX from index.html to www/app.bundle.js
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const wwwDir = path.join(rootDir, 'www');
const wwwIndexPath = path.join(wwwDir, 'index.html');
const bundlePath = path.join(wwwDir, 'app.bundle.js');

if (!fs.existsSync(wwwDir)) {
    fs.mkdirSync(wwwDir, { recursive: true });
}

console.log('Reading index.html...');
const html = fs.readFileSync(indexPath, 'utf8');

const startTag = '<script type="text/babel" data-presets="react" data-plugins="transform-modules-umd">';
const endTag = '</script>';

const startIndex = html.indexOf(startTag);
if (startIndex === -1) {
    console.error('Error: Could not find React JSX start tag in index.html');
    process.exit(1);
}

const contentStart = startIndex + startTag.length;
const endIndex = html.lastIndexOf(endTag);
if (endIndex === -1 || endIndex <= contentStart) {
    console.error('Error: Could not find closing script tag for React JSX');
    process.exit(1);
}

const jsxSource = html.substring(contentStart, endIndex);
console.log(`Extracted ${jsxSource.length} bytes of JSX source.`);

console.log('Compiling JSX with esbuild...');
const t0 = Date.now();
const result = esbuild.buildSync({
    stdin: {
        contents: jsxSource,
        resolveDir: rootDir,
        loader: 'jsx',
        sourcefile: 'index.html.jsx'
    },
    bundle: false,
    write: true,
    outfile: bundlePath,
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    target: ['es2020', 'chrome80']
});

console.log(`Compilation complete in ${Date.now() - t0}ms. Output: ${bundlePath}`);

// Transform HTML for production www/index.html
console.log('Generating optimized www/index.html...');
let optimizedHtml = html.substring(0, startIndex) + 
    '<!-- (2026-07-13) Pre-compiled AOT React bundle. Prev: runtime in-browser Babel -->\n' +
    '    <script src="app.bundle.js" defer></script>\n' +
    html.substring(endIndex + endTag.length);

// Remove babel.min.js from production www/index.html
optimizedHtml = optimizedHtml.replace(
    '<script src="assets/vendor/babel.min.js"></script>',
    '<!-- (2026-07-13) Babel eliminated for instant APK load. Prev: runtime babel.min.js -->'
);

// Remove blocking remote Google Fonts links (fonts are already locally defined in style.css)
optimizedHtml = optimizedHtml.replace(
    /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined[^>]*>/,
    '<!-- (2026-07-13) Offline local font loaded via style.css. Prev: remote Google Fonts -->'
);
optimizedHtml = optimizedHtml.replace(/<\/style>\s*<\/style>/, '');
optimizedHtml = optimizedHtml.replace(
    /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Newsreader[^>]*>/,
    '<!-- (2026-07-13) Offline Newsreader loaded via style.css. Prev: remote Google Fonts -->'
);
optimizedHtml = optimizedHtml.replace(
    /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter[^>]*>/,
    '<!-- (2026-07-13) Offline Inter/Montserrat loaded via style.css. Prev: remote Google Fonts -->'
);
optimizedHtml = optimizedHtml.replace(
    /<noscript><link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter[^>]*><\/noscript>/,
    ''
);

fs.writeFileSync(wwwIndexPath, optimizedHtml, 'utf8');
console.log(`Wrote optimized www/index.html (${optimizedHtml.length} bytes).`);
