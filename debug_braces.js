const fs = require('fs');
const path = require('path');

const shareP = 'c:\\Users\\Lenovo\\Desktop\\faiora\\share_note.html';
const content = fs.readFileSync(shareP, 'utf8');

const scriptMatch = content.match(/<script type="text\/babel" data-presets="env,react">([\s\S]*?)<\/script>/);
if (!scriptMatch) {
    console.log('Script not found');
    process.exit(1);
}

const scriptContent = scriptMatch[1];
const scriptStartLine = content.split('<script type="text/babel" data-presets="env,react">')[0].split('\n').length;

let balance = 0;
const lines = scriptContent.split('\n');
const results = [];

for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const originalLineNum = scriptStartLine + i;
    
    for (let char of l) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    
    if (balance === 0 && l.trim() !== '' && i > 10) {
        results.push(`Line ${originalLineNum}: ${l.trim()}`);
    }
}

fs.writeFileSync('c:\\Users\\Lenovo\\Desktop\\faiora\\debug_braces.txt', results.join('\n'));
console.log('Done. Results in debug_braces.txt');
