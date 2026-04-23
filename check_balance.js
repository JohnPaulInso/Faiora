const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Lenovo\\Desktop\\faiora\\index.html', 'utf8');
const scriptStart = content.indexOf('<script type="text/babel" data-presets="env,react">');
if (scriptStart === -1) {
    console.log('Script not found');
    process.exit(1);
}
const scriptContent = content.substring(scriptStart).split('</script>')[0];
const lines = scriptContent.split('\n');
let braces = 0;
let parens = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') braces++;
        if (char === '}') braces--;
        if (char === '(') parens++;
        if (char === ')') parens--;
    }
    if (braces < 0 || parens < 0) {
        console.log(`Mismatch on line ${i + 1 + content.substring(0, scriptStart).split('\n').length}: Braces=${braces}, Parens=${parens}`);
        // Reset to prevent cascade if it was a false positive, but usually it means we found the error point
    }
}
console.log(`Final balance: Braces=${braces}, Parens=${parens}`);
