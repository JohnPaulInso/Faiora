const fs = require('fs');
const filePath = 'c:/Users/Lenovo/Desktop/faiora/index.html';
let content = fs.readFileSync(filePath, 'utf8');

// The tools menu has duplicate content. Let's fix it by replacing the whole tools content block.
const toolsBlockStart = 'activePopup === \'tools\' && (';
const toolsBlockEnd = ')}'; // End of the condition

// Use a more specific regex to capture the entire tools popup content
const toolsPopupRegex = /(activePopup === 'tools' && \([\s\S]*?<React\.Fragment>[\s\S]*?<div className="absolute[^>]*>)([\s\S]*?)(<\/div>\s*<\/React\.Fragment>\s*\)\s*\})/;

const correctToolsContent = `
                                            <div className="absolute bottom-full left-0 w-full h-8 bg-transparent"></div>
                                             <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 bg-white rounded-2xl shadow-xl border border-black/5 flex items-center p-1 z-50 animate-in slide-in-from-bottom-2 duration-200">
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

content = content.replace(/(activePopup === 'tools' && \([\s\S]*?<React\.Fragment>)([\s\S]*?)(<\/React\.Fragment>\s*\)\s*})/, (match, p1, p2, p3) => p1 + correctToolsContent + p3);

fs.writeFileSync(filePath, content);
console.log('Successfully cleaned up Tools menu in index.html');
