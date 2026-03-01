const fs = require('fs');
const filePath = 'c:/Users/Lenovo/Desktop/faiora/index.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Refine Color Palette layout
// Current: <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 flex flex-wrap justify-center gap-1.5 p-3 bg-white rounded-xl shadow-2xl border border-black/5 z-50 max-w-[280px] md:max-w-none md:flex-nowrap">
const paletteRegex = /activePopup === 'palette' && \([\s\S]*?(<div className="absolute bottom-full mb-4 left-1\/2 -translate-x-1\/2 md:left-0 md:translate-x-0)([^">]*)(">)([\s\S]*?theme[\s\S]*?<\/div>)/;
// Redesign as a grid: 6 cols on mobile, 12 on desktop
content = content.replace(/(activePopup === 'palette' && \(\s*<div className="absolute bottom-full mb-4 left-1\/2 -translate-x-1\/2[^"]*md:left-0 md:translate-x-0) flex flex-wrap justify-center gap-1\.5 p-3 bg-white rounded-xl shadow-2xl border border-black\/5 z-50 max-w-\[280px\] md:max-w-none md:flex-nowrap(">)/, 
    '$1 grid grid-cols-6 md:grid-cols-12 gap-2 p-4 bg-white rounded-2xl shadow-2xl border border-black/5 z-50 animate-in slide-in-from-bottom-2 duration-200$2');

// 2. Refine Icon Picker responsiveness and centering
// Current: <div className="absolute bottom-full mb-4 -left-2 flex flex-col p-3 bg-white rounded-2xl shadow-2xl border border-black/5 z-[120] w-64 animate-in slide-in-from-bottom-2 duration-200">
content = content.replace(/(activePopup === 'icon' && \(\s*<div className="absolute bottom-full mb-4) -left-2 (flex flex-col p-3 bg-white rounded-2xl shadow-2xl border border-black\/5 z-\[120\]) w-64 (animate-in slide-in-from-bottom-2 duration-200">)/,
    '$1 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 $2 w-72 md:w-80 $3');

fs.writeFileSync(filePath, content);
console.log('Successfully updated palette and icon picker in index.html');
