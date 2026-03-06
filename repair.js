const fs = require('fs');
const path = require('path');

// --- Fix index.html ---
const indexP = 'c:\\Users\\Lenovo\\Desktop\\faiora\\index.html';
let indexC = fs.readFileSync(indexP, 'utf8');

// Fix cancelForTask corruption
indexC = indexC.replace(
    /const cancelForTask = \(taskId\) => \{[\s\S]*?localStorage\.setItem\('faiora_scheduled_notifs', JSON\.stringify\(scheduled\)\);\s+delete scheduled\[`faiora-\$\{prefix\}-\$\{taskId\}`\];\s+\/\/ ------------------------------------------------------------------/g,
    `const cancelForTask = (taskId) => {
                const existing = timers.get(taskId);
                if (existing) {
                    existing.forEach(id => clearTimeout(id));
                    timers.delete(taskId);
                }
                if (swRegistration) {
                    ['due', '2h', '1d'].forEach(prefix => {
                        swRegistration.getNotifications({ tag: \`faiora-\${prefix}-\${taskId}\` })
                            .then(notifs => {
                                notifs.forEach(n => n.close());
                            })
                            .catch(() => {});

                        const scheduled = JSON.parse(localStorage.getItem('faiora_scheduled_notifs') || '{}');
                        delete scheduled[\`faiora-\${prefix}-\${taskId}\`];
                        localStorage.setItem('faiora_scheduled_notifs', JSON.stringify(scheduled));
                    });
                }
            };

            // ------------------------------------------------------------------`
);

// Fix duplicate maxLength
indexC = indexC.replace(
    /maxLength=\{100\}\s+maxLength=\{100\}/g,
    'maxLength={100}'
);

fs.writeFileSync(indexP, indexC);
console.log('✅ index.html repaired');

// --- Fix share_note.html ---
const shareP = 'c:\\Users\\Lenovo\\Desktop\\faiora\\share_note.html';
let shareC = fs.readFileSync(shareP, 'utf8');

// The user error says line 564 has return outside function.
// Let's find common misplaced closes.
// I'll check all "};" that might have closed component prematurely.

// Actually, I'll just check if the code I added recently has an extra brace.
// Wait, I didn't add much to share_note.html recently except the paste fix.

// Let's look for:
// setError("error");
// setLoading(false);
// });
// 
// return () => unsubscribe();
// }, []);

// Wait! If I look at my version:
// 566:                 });
// 567: 
// 568:                 return () => unsubscribe();
// 569:             }, []);

// If line 562 is "};" in user's version:
// 561:                     } else { setError("not_found"); }
// 562:                 }; // <--- ERROR HERE?

// Let's look at the actual file content again around 560.
const around560 = shareC.split('\n').slice(555, 575).join('\n');
console.log('DEBUG share_note lines 556-575:\n' + around560);

// I'll also check for any dangling "};" or "}" that shouldn't be there.
// A common mistake is closing a function early.

// Let's search for the snippet the user gave for share_note.html.
if (shareC.includes('setError("error");')) {
    console.log('✅ Found setError("error") in share_note.html');
}

// I'll try to find where the brace mismatch might be by checking the overall component balance.
let scriptContent = shareC.match(/<script type="text\/babel" data-presets="env,react">([\s\S]*?)<\/script>/)[1];
let balance = 0;
let lines = scriptContent.split('\n');
for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    for (let char of l) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    if (balance === 0 && i < lines.length - 10) {
        console.warn(`⚠️ Script reached balance 0 at line ${i + 384}: ${l.trim()}`);
    }
}
