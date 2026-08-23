const fs = require('fs');
const path = require('path');

const now_ms = Date.now();

const raw_items = [
    // PRIORITIES / TODAY (Aug 23, 2026)
    { text: "Church Donation Website (ASSVF): Design and build landing page", cat: ["PRIORITIES", "DEVELOPMENT"], due: "2026-08-23", prog: 0, done: false },
    { text: "Faiora: Make database reliable", cat: ["PRIORITIES", "DEVELOPMENT"], due: "2026-08-23", prog: 95, done: false },
    { text: "ROUTE98 POS: Clean up UI and fix bugs", cat: ["PRIORITIES", "DEVELOPMENT"], due: "2026-08-23", prog: 50, done: false },
    { text: "Apparel: Claim purple choir uniform shirts at print house", cat: ["PRIORITIES", "DESIGN"], due: "2026-08-23", prog: 0, done: false },
    { text: "Errands: Drill gate", cat: ["PRIORITIES", "ERRANDS"], due: "2026-08-23", prog: 0, done: false },
    { text: "Architecture: Hash-based routing across all apps", cat: ["PRIORITIES", "DEVELOPMENT"], due: "2026-08-23", prog: 100, done: true },

    // WEEKLY
    { text: "Vehicle: Renew motorcycle registration at LTO", cat: ["ERRANDS", "VEHICLE"], due: "2026-08-29", prog: 100, done: true },
    { text: "HydroGreen: Bug fixes complete — Testing phase now", cat: ["DEVELOPMENT"], due: "2026-08-29", prog: 100, done: true },
    { text: "Design: Gold choir uniform — Change gradient color", cat: ["DESIGN"], due: "2026-08-29", prog: 100, done: true },
    { text: "Securo: Finalize remaining fixes", cat: ["DEVELOPMENT"], due: "2026-08-29", prog: 100, done: true },
    { text: "Development: Try making BogoLoan app", cat: ["DEVELOPMENT"], due: "2026-08-29", prog: 0, done: false },
    { text: "Playstore: Capture thumbnails, screens, and trailers for existing apps", cat: ["PLAYSTORE"], due: "2026-08-29", prog: 0, done: false },
    { text: "Career: Test Kimi AI for workflow efficiency & apply for jobs via FB shared post", cat: ["CAREER"], due: "2026-08-29", prog: 0, done: false },
    { text: "Trading: Check Bibiano's EA Forex & check Telegram link for VT Markets", cat: ["TRADING"], due: "2026-08-29", prog: 0, done: false },

    // DEADLINES / EVENTS
    { text: "Church Fun Run (Prepare gear and schedules)", cat: ["EVENTS"], due: "2026-08-29", prog: 0, done: false },

    // SHOPPING (3-5 Days ~ Aug 26-28)
    { text: "Hygiene kit", cat: ["SHOPPING", "PERSONAL"], due: "2026-08-28", prog: 0, done: false },
    { text: "Spare phone / iPhone (for QA testing)", cat: ["SHOPPING", "PERSONAL"], due: "2026-08-28", prog: 0, done: false },
    { text: "Wheel valve cap", cat: ["SHOPPING", "AUTO"], due: "2026-08-28", prog: 100, done: true },
    { text: "Lanyard for motor key", cat: ["SHOPPING", "AUTO"], due: "2026-08-28", prog: 0, done: false },
    { text: "Wall hook", cat: ["SHOPPING", "STORAGE"], due: "2026-08-28", prog: 100, done: true },
    { text: "Jacket stand / Rack", cat: ["SHOPPING", "STORAGE"], due: "2026-08-28", prog: 0, done: false },
    { text: "Luggage rack (for Sienna's bags)", cat: ["SHOPPING", "STORAGE"], due: "2026-08-28", prog: 0, done: false },

    // ERRANDS (1-2 Weeks ~ Sept 06)
    { text: "Renew Motorcycle Registration at LTO", cat: ["ERRANDS", "VEHICLE"], due: "2026-08-29", prog: 100, done: true },
    { text: "Claim Papa's Plate Number (LTO Galleria)", cat: ["ERRANDS", "VEHICLE"], due: "2026-09-06", prog: 0, done: false },
    { text: "Car Repair: Parking brake pads", cat: ["ERRANDS", "VEHICLE"], due: "2026-09-06", prog: 0, done: false },
    { text: "Car Repair: Aircon broken bearing", cat: ["ERRANDS", "VEHICLE"], due: "2026-09-06", prog: 0, done: false },
    { text: "Car Repair: Fix washer liquid leaking", cat: ["ERRANDS", "VEHICLE"], due: "2026-09-06", prog: 0, done: false },
    { text: "Apply for jobs via Facebook shared post", cat: ["CAREER"], due: "2026-08-29", prog: 0, done: false },
    { text: "Test Kimi AI for workflow efficiency", cat: ["CAREER"], due: "2026-08-29", prog: 0, done: false },
    { text: "Request salary/role transition from CEO/HR (Intern to Junior status)", cat: ["CAREER"], due: "2026-09-06", prog: 0, done: false },
    { text: "Stay in touch with Kiara's father regarding app development / PickleBook", cat: ["CAREER", "DEVELOPMENT"], due: "2026-09-06", prog: 0, done: false },
    { text: "Drill gate", cat: ["MAINTENANCE"], due: "2026-08-23", prog: 0, done: false },
    { text: "Fix RGB light behind the TV", cat: ["MAINTENANCE"], due: "2026-09-06", prog: 0, done: false },

    // TRADING (2 Weeks ~ Sept 06)
    { text: "Check Bibiano's EA Forex trading", cat: ["TRADING"], due: "2026-09-06", prog: 0, done: false },
    { text: "Check Telegram link for VT Markets", cat: ["TRADING"], due: "2026-09-06", prog: 0, done: false },
    { text: "Purchase prop firm account", cat: ["TRADING"], due: "2026-09-06", prog: 0, done: false },
    { text: "Execute James' strategy", cat: ["TRADING"], due: "2026-09-06", prog: 0, done: false },

    // DESIGN (2-3 Weeks ~ Sept 13)
    { text: "Pickup Production: Get Ike's shirts & Purple Choir Uniform today", cat: ["DESIGN"], due: "2026-08-23", prog: 0, done: false },
    { text: "Sponsorship Agreement: Finalized printing shop logo sponsorship agreement with Uncle Nilo!", cat: ["DESIGN"], due: "2026-09-13", prog: 100, done: true },
    { text: "Formal Minimalist Gold Choir Uniform: Gradient color updated and finalized!", cat: ["DESIGN"], due: "2026-09-13", prog: 100, done: true },
    { text: "Design City High Choir uniform", cat: ["DESIGN"], due: "2026-09-13", prog: 0, done: false },
    { text: "Draft Cayang lot floor plan proposal", cat: ["DESIGN"], due: "2026-09-13", prog: 0, done: false },

    // DEVELOPMENT (3-4 Weeks ~ Sept 20)
    { text: "ASSVF Landing Page: Design online church donation website", cat: ["DEVELOPMENT"], due: "2026-08-23", prog: 0, done: false },
    { text: "Architecture Refactor: Hash-based routing across all apps", cat: ["DEVELOPMENT"], due: "2026-09-20", prog: 100, done: true },
    { text: "Wallet App: Fix bugs on Smart Wallet app", cat: ["DEVELOPMENT"], due: "2026-09-20", prog: 100, done: true },
    { text: "Securo (Zea's Project): Final bug fixes & improvements completed!", cat: ["DEVELOPMENT"], due: "2026-09-20", prog: 100, done: true },
    { text: "HydroGreen (formerly HydroTrack): Bug fixes complete — Testing phase now", cat: ["DEVELOPMENT"], due: "2026-09-20", prog: 100, done: true },
    { text: "Faiora: Make database reliable", cat: ["DEVELOPMENT"], due: "2026-09-20", prog: 95, done: false },
    { text: "ROUTE98 POS App: Clean up UI and fix bugs", cat: ["DEVELOPMENT"], due: "2026-09-20", prog: 50, done: false },
    { text: "rustinho_pro Car Website Revamp: Initial build & design", cat: ["DEVELOPMENT"], due: "2026-09-20", prog: 0, done: false },
    { text: "BogoLoan App: Initial exploration / build", cat: ["DEVELOPMENT"], due: "2026-08-29", prog: 0, done: false },
    { text: "Chords App (ChoirBook Pro): Connect to Firebase and compile/update chords for 1st–13th masses", cat: ["DEVELOPMENT"], due: "2026-09-20", prog: 0, done: false },

    // PLAYSTORE
    { text: "Sample Online App view Vercel", cat: ["PLAYSTORE"], due: "", prog: 0, done: false },
    { text: "Play Store Media: Smart Wallet", cat: ["PLAYSTORE"], due: "", prog: 100, done: true },
    { text: "Play Store Media: Faiora — Database Testing", cat: ["PLAYSTORE"], due: "", prog: 95, done: false },
    { text: "Play Store Media: CSB NetPay / NetPay Tracker (Over 1M+ Data)", cat: ["PLAYSTORE"], due: "", prog: 100, done: true },
    { text: "Play Store Media: HydroGreen", cat: ["PLAYSTORE"], due: "", prog: 100, done: true },
    { text: "Play Store Media: Choir Attendance Tracker", cat: ["PLAYSTORE"], due: "", prog: 100, done: true },
    { text: "Play Store Media: Securo (Zea's Project)", cat: ["PLAYSTORE"], due: "", prog: 100, done: true },
    { text: "Play Store Media: Cebulingo", cat: ["PLAYSTORE"], due: "", prog: 0, done: false },
    { text: "Play Store Media: ChoirBook Pro / Choir Book", cat: ["PLAYSTORE"], due: "", prog: 0, done: false },

    // BACKLOG (2-4 Months)
    { text: "Ctrl + F Images Extension", cat: ["BACKLOG", "DEVELOPMENT"], due: "", prog: 0, done: false },
    { text: "Update resume", cat: ["BACKLOG", "CAREER"], due: "", prog: 0, done: false },
    { text: "PickleBook / Pickleball Booking App: Keep feedback loop open with Kiara's father", cat: ["BACKLOG", "DEVELOPMENT"], due: "", prog: 0, done: false },
    { text: "Facebook Messenger AI bot (similar to Memorae)", cat: ["BACKLOG", "DEVELOPMENT"], due: "", prog: 0, done: false },
    { text: "Cebeco app", cat: ["BACKLOG", "DEVELOPMENT"], due: "", prog: 0, done: false },
];

const categories_set = new Set();
const quick_tasks = [];

raw_items.forEach((item, index) => {
    const task_id = `qt_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`;
    item.cat.forEach(c => categories_set.add(c.toUpperCase()));

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
        categories: item.cat.map(c => c.toUpperCase()),
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
console.log(`Generated ${quick_tasks.length} quick tasks with ${all_categories.length} categories to ${outputPath}`);
