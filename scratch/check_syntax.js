const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const marker = 'data-presets="react"';
const startIdx = content.indexOf(marker);
if (startIdx === -1) {
    console.error('Marker not found');
    process.exit(1);
}
const scriptOpen = content.indexOf('>', startIdx) + 1;
const scriptClose = content.lastIndexOf('</script>');
const code = content.substring(scriptOpen, scriptClose);
console.log('Script length:', code.length);

// Let's test with esbuild
const esbuild = require('esbuild');
try {
    esbuild.transformSync(code, { loader: 'jsx' });
    console.log('esbuild JSX transform SUCCESS! No syntax errors.');
} catch (err) {
    console.error('esbuild SYNTAX ERROR:', err.message);
    if (err.errors) {
        err.errors.forEach(e => {
            console.error('Location:', e.location);
            console.error('Text:', e.text);
        });
    }
}
