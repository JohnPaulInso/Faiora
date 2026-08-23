const fs = require('fs');
const path = require('path');

const now_ms = Date.now();

const raw_items = [
    // DEVELOPMENT
    { text: "Church Donation Website (ASSVF): Design and build landing page", cat: "DEVELOPMENT", due: "2026-08-23", prog: 0, done: false },
    { text: "Faiora: Make database reliable", cat: "DEVELOPMENT", due: "2026-08-23", prog: 95, done: false },
    { text: "ROUTE98 POS App: Clean up UI and fix bugs", cat: "DEVELOPMENT", due: "2026-08-23", prog: 50, done: false },
    { text: "Architecture Refactor: Hash-based routing across all apps", cat: "DEVELOPMENT", due: "2026-08-23", prog: 100, done: true },
    { text: "HydroGreen: Bug fixes complete — Testing phase now", cat: "DEVELOPMENT", due: "2026-08-29", prog: 100, done: true },
    { text: "Securo: Finalize remaining fixes", cat: "DEVELOPMENT", due: "2026-08-29", prog: 100, done: true },
    { text: "Smart Wallet App: Fix bugs", cat: "DEVELOPMENT", due: "2026-09-20", prog: 100, done: true },
    { text: "BogoLoan App: Initial exploration / build", cat: "DEVELOPMENT", due: "2026-08-29", prog: 0, done: false },
    { text: "rustinho_pro Car Website Revamp: Initial build & design", cat: "DEVELOPMENT", due: "2026-09-20", prog: 0, done: false },
    { text: "Chords App (ChoirBook Pro): Connect to Firebase and compile/update chords", cat: "DEVELOPMENT", due: "2026-09-20", prog: 0, done: false },

    // DESIGN
    { text: "Apparel: Claim purple choir uniform shirts at print house", cat: "DESIGN", due: "2026-08-23", prog: 0, done: false },
    { text: "Formal Minimalist Gold Choir Uniform: Gradient color updated and finalized", cat: "DESIGN", due: "2026-09-13", prog: 100, done: true },
    { text: "Sponsorship Agreement: Finalized printing shop logo agreement with Uncle Nilo", cat: "DESIGN", due: "2026-09-13", prog: 100, done: true },
    { text: "Design City High Choir uniform", cat: "DESIGN", due: "2026-09-13", prog: 0, done: false },
    { text: "Draft Cayang lot floor plan proposal", cat: "DESIGN", due: "2026-09-13", prog: 0, done: false },

    // ERRANDS
    { text: "Renew motorcycle registration at LTO", cat: "ERRANDS", due: "2026-08-29", prog: 100, done: true },
    { text: "Claim Papa's Plate Number at LTO Galleria", cat: "ERRANDS", due: "2026-09-06", prog: 0, done: false },
    { text: "Parking brake pads", cat: "ERRANDS", due: "2026-09-06", prog: 0, done: false },
    { text: "Aircon broken bearing", cat: "ERRANDS", due: "2026-09-06", prog: 0, done: false },
    { text: "Fix washer liquid leaking", cat: "ERRANDS", due: "2026-09-06", prog: 0, done: false },

    // MAINTENANCE
    { text: "Drill gate", cat: "MAINTENANCE", due: "2026-08-23", prog: 0, done: false },
    { text: "Fix RGB light behind the TV", cat: "MAINTENANCE", due: "2026-09-06", prog: 0, done: false },

    // CAREER
    { text: "Test Kimi AI for workflow efficiency", cat: "CAREER", due: "2026-08-29", prog: 0, done: false },
    { text: "Apply for jobs via Facebook shared post", cat: "CAREER", due: "2026-08-29", prog: 0, done: false },
    { text: "Request salary/role transition from CEO/HR", cat: "CAREER", due: "2026-09-06", prog: 0, done: false },
    { text: "Stay in touch with Kiara's father regarding app development / PickleBook", cat: "CAREER", due: "2026-09-06", prog: 0, done: false },
    { text: "Update resume", cat: "CAREER", due: "", prog: 0, done: false },

    // TRADING
    { text: "Check Bibiano's EA Forex trading", cat: "TRADING", due: "2026-09-06", prog: 0, done: false },
    { text: "Check Telegram link for VT Markets", cat: "TRADING", due: "2026-09-06", prog: 0, done: false },
    { text: "Purchase prop firm account", cat: "TRADING", due: "2026-09-06", prog: 0, done: false },
    { text: "Execute James' strategy", cat: "TRADING", due: "2026-09-06", prog: 0, done: false },

    // EVENTS
    { text: "Church Fun Run: Prepare gear and schedules", cat: "EVENTS", due: "2026-08-29", prog: 0, done: false },

    // SHOPPING
    { text: "Hygiene kit", cat: "SHOPPING", due: "2026-08-28", prog: 0, done: false },
    { text: "Spare phone / iPhone for QA testing", cat: "SHOPPING", due: "2026-08-28", prog: 0, done: false },
    { text: "Wheel valve cap", cat: "SHOPPING", due: "2026-08-28", prog: 100, done: true },
    { text: "Lanyard for motor key", cat: "SHOPPING", due: "2026-08-28", prog: 0, done: false },
    { text: "Wall hook", cat: "SHOPPING", due: "2026-08-28", prog: 100, done: true },
    { text: "Jacket stand / Rack", cat: "SHOPPING", due: "2026-08-28", prog: 0, done: false },
    { text: "Luggage rack for Sienna's bags", cat: "SHOPPING", due: "2026-08-28", prog: 0, done: false },

    // PLAYSTORE
    { text: "Smart Wallet", cat: "PLAYSTORE", due: "", prog: 100, done: true },
    { text: "Faiora", cat: "PLAYSTORE", due: "", prog: 95, done: false },
    { text: "CSB NetPay / NetPay Tracker", cat: "PLAYSTORE", due: "", prog: 100, done: true },
    { text: "HydroGreen", cat: "PLAYSTORE", due: "", prog: 100, done: true },
    { text: "Choir Attendance Tracker", cat: "PLAYSTORE", due: "", prog: 100, done: true },
    { text: "Securo (Zea's Project)", cat: "PLAYSTORE", due: "", prog: 100, done: true },
    { text: "Cebulingo", cat: "PLAYSTORE", due: "", prog: 0, done: false },
    { text: "ChoirBook Pro / Choir Book", cat: "PLAYSTORE", due: "", prog: 0, done: false },
    { text: "Sample Online App view Vercel", cat: "PLAYSTORE", due: "", prog: 0, done: false },

    // BACKLOG
    { text: "Ctrl + F Images Extension", cat: "BACKLOG", due: "", prog: 0, done: false },
    { text: "Facebook Messenger AI bot", cat: "BACKLOG", due: "", prog: 0, done: false },
    { text: "Cebeco app", cat: "BACKLOG", due: "", prog: 0, done: false }
];

const categories_set = new Set();
const quick_tasks = [];

raw_items.forEach((item, index) => {
    const task_id = `qt_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`;
    const singleCat = item.cat.toUpperCase();
    categories_set.add(singleCat);

    const prog = item.prog;
    const completed = item.done || prog === 100;
    const status = completed ? "completed" : (prog > 0 ? "in_progress" : "not_started");

    const hist = [];
    if (prog > 0) {
        hist.push({
            id: `log_${Math.random().toString(36).substr(2, 8)}`,
            progress: prog,
            note: prog < 100 ? `Current status: ${prog}% done` : "Completed",
            timestamp: now_ms
        });
    }

    quick_tasks.push({
        id: task_id,
        text: item.text,
        dueDate: item.due,
        dueTime: item.due ? "09:00" : "",
        categories: [singleCat],
        progress: prog,
        completed: completed,
        status: status,
        progressHistory: hist,
        createdAt: now_ms,
        updatedAt: now_ms
    });
});

const all_categories = Array.from(categories_set).sort();

const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    notes: [],
    quickTasks: quick_tasks,
    alarms: [],
    settings: {},
    profile: {},
    categories: all_categories,
    sections: []
};

const outputPath = path.resolve('c:/Users/Lenovo/Desktop/faiora/faiora-import-tasks.json');
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf-8');
console.log(`Generated ${quick_tasks.length} deduplicated quick tasks with ${all_categories.length} single categories to ${outputPath}`);
