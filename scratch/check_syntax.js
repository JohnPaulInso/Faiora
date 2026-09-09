const fs = require('fs');

// Load babel from assets/vendor/babel.min.js
const Babel = require('../assets/vendor/babel.min.js');

const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/<script\s+type="text\/babel"[^>]*>([\s\S]*?)<\/script>/i);
if (!match) {
    console.error("No babel script found!");
    process.exit(1);
}

const scriptContent = match[1];
const beforeMatch = html.substring(0, match.index);
const scriptStartLine = beforeMatch.split('\n').length;

try {
    Babel.transform(scriptContent, {
        presets: ['react']
    });
    console.log("Babel transform SUCCESSFUL! No syntax error.");
} catch (err) {
    console.error("Babel error:", err.message);
    if (err.loc) {
        console.error("Line in script:", err.loc.line, "col:", err.loc.column);
        console.error("Line in index.html:", scriptStartLine + err.loc.line - 1);
    }
}
