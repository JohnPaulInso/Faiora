const fs = require('fs');
const filePath = 'c:/Users/Lenovo/Desktop/faiora/index.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rename 'Style' to 'H1' (case sensitive to match the label)
// Using a broad check for the label span
content = content.replace(/(font-montserrat">)Style(<\/span>)/g, '$1H1$2');

// 2. Remove alignment buttons from the Formatting popup
// We look for the div containing justifyLeft within the format popup context
const formatPopupMatch = content.match(/activePopup === 'format' && \([\s\S]*?Main Horizontal Bar[\s\S]*?\{activePopup \=== 'format' && \(/) || [null]; // Need better match
// Instead, let's just find the alignment section and remove it if it's within a few lines of a known anchor.
// The alignment buttons follow the basic formatting buttons.
content = content.replace(/\{(\/\* Alignment Buttons \*\/)\}\s*<div className="flex items-center">\s*<button onMouseDown=\{\(e\) => \{ e\.preventDefault\(\); document\.execCommand\('justifyLeft'\); \}[\s\S]*?<\/div>/, '');
// Also remove the divider before it
content = content.replace(/<div className="w-px h-7 bg-black\/5 mx-1\.5"><\/div>\s*\n\s*(?=\{[^}]*Alignment Buttons)/, '');

// 3. Update Tools menu to horizontal icon-only
const toolsMenuRegex = /({\/\* 2\. Tools Dropdown \(Overflow Menu\) \*\/}[\s\S]*?<React\.Fragment>[\s\S]*?<div className="absolute bottom-full left-0 w-full h-8 bg-transparent"><\/div>\s*<div className="absolute[^>]*>)([\s\S]*?)(<\/div>[\s\S]*?<\/React\.Fragment>)/;
const newToolsContent = `
                                             <div className="absolute bottom-full left-0 w-full h-8 bg-transparent"></div>
                                             <div className="absolute bottom-[calc(100%+8px)] left-0 bg-white rounded-2xl shadow-xl border border-black/5 flex items-center p-1 z-50 animate-in slide-in-from-bottom-2 duration-200">
                                                 <div className="flex items-center px-1">
                                                     <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyLeft'); }} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-lg text-slate-600" title="Align Left"><span className="material-symbols-outlined text-[20px]">format_align_left</span></button>
                                                     <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyCenter'); }} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-lg text-slate-600" title="Align Center"><span className="material-symbols-outlined text-[20px]">format_align_center</span></button>
                                                     <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyRight'); }} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-lg text-slate-600" title="Align Right"><span className="material-symbols-outlined text-[20px]">format_align_right</span></button>
                                                 </div>
                                                 <div className="w-px h-6 bg-black/5 mx-1"></div>
                                                 <div className="flex items-center px-1">
                                                     <button onClick={() => { convertActiveBlock('todo'); setActivePopup(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-lg text-slate-600" title="Checklist"><span className="material-symbols-outlined text-[20px]">checklist</span></button>
                                                     <button onClick={() => { convertActiveBlock('bullet'); setActivePopup(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-lg text-slate-600" title="Bullets"><span className="material-symbols-outlined text-[20px]">format_list_bulleted</span></button>
                                                     <button onClick={() => { convertActiveBlock('number'); setActivePopup(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-lg text-slate-600" title="Numbering"><span className="material-symbols-outlined text-[20px]">format_list_numbered</span></button>
                                                 </div>
                                                 <div className="w-px h-6 bg-black/5 mx-1"></div>
                                                 <div className="flex items-center px-1">
                                                     <button onClick={() => { fileInputRef.current.click(); setActivePopup(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-lg text-slate-600" title="Add Image"><span className="material-symbols-outlined text-[20px]">image</span></button>
                                                 </div>
                                             </div>`;

content = content.replace(toolsMenuRegex, (match, p1, p2, p3) => p1 + newToolsContent + p3);

fs.writeFileSync(filePath, content);
console.log('Successfully updated index.html');
