import json
import time
import uuid

now_ms = int(time.time() * 1000)

raw_items = [
    # PRIORITIES / TODAY (Aug 23, 2026)
    {"text": "Church Donation Website (ASSVF): Design and build landing page", "cat": ["PRIORITIES", "DEVELOPMENT"], "due": "2026-08-23", "prog": 0, "done": False},
    {"text": "Faiora: Make database reliable", "cat": ["PRIORITIES", "DEVELOPMENT"], "due": "2026-08-23", "prog": 95, "done": False},
    {"text": "ROUTE98 POS: Clean up UI and fix bugs", "cat": ["PRIORITIES", "DEVELOPMENT"], "due": "2026-08-23", "prog": 50, "done": False},
    {"text": "Apparel: Claim purple choir uniform shirts at print house", "cat": ["PRIORITIES", "DESIGN"], "due": "2026-08-23", "prog": 0, "done": False},
    {"text": "Errands: Drill gate", "cat": ["PRIORITIES", "ERRANDS"], "due": "2026-08-23", "prog": 0, "done": False},
    {"text": "Architecture: Hash-based routing across all apps", "cat": ["PRIORITIES", "DEVELOPMENT"], "due": "2026-08-23", "prog": 100, "done": True},

    # WEEKLY
    {"text": "Vehicle: Renew motorcycle registration at LTO", "cat": ["ERRANDS", "VEHICLE"], "due": "2026-08-29", "prog": 100, "done": True},
    {"text": "HydroGreen: Bug fixes complete — Testing phase now", "cat": ["DEVELOPMENT"], "due": "2026-08-29", "prog": 100, "done": True},
    {"text": "Design: Gold choir uniform — Change gradient color", "cat": ["DESIGN"], "due": "2026-08-29", "prog": 100, "done": True},
    {"text": "Securo: Finalize remaining fixes", "cat": ["DEVELOPMENT"], "due": "2026-08-29", "prog": 100, "done": True},
    {"text": "Development: Try making BogoLoan app", "cat": ["DEVELOPMENT"], "due": "2026-08-29", "prog": 0, "done": False},
    {"text": "Playstore: Capture thumbnails, screens, and trailers for existing apps", "cat": ["PLAYSTORE"], "due": "2026-08-29", "prog": 0, "done": False},
    {"text": "Career: Test Kimi AI for workflow efficiency & apply for jobs via FB shared post", "cat": ["CAREER"], "due": "2026-08-29", "prog": 0, "done": False},
    {"text": "Trading: Check Bibiano's EA Forex & check Telegram link for VT Markets", "cat": ["TRADING"], "due": "2026-08-29", "prog": 0, "done": False},

    # DEADLINES / EVENTS
    {"text": "Church Fun Run (Prepare gear and schedules)", "cat": ["EVENTS"], "due": "2026-08-29", "prog": 0, "done": False},

    # SHOPPING (3-5 Days ~ Aug 26-28)
    {"text": "Hygiene kit", "cat": ["SHOPPING", "PERSONAL"], "due": "2026-08-28", "prog": 0, "done": False},
    {"text": "Spare phone / iPhone (for QA testing)", "cat": ["SHOPPING", "PERSONAL"], "due": "2026-08-28", "prog": 0, "done": False},
    {"text": "Wheel valve cap", "cat": ["SHOPPING", "AUTO"], "due": "2026-08-28", "prog": 100, "done": True},
    {"text": "Lanyard for motor key", "cat": ["SHOPPING", "AUTO"], "due": "2026-08-28", "prog": 0, "done": False},
    {"text": "Wall hook", "cat": ["SHOPPING", "STORAGE"], "due": "2026-08-28", "prog": 100, "done": True},
    {"text": "Jacket stand / Rack", "cat": ["SHOPPING", "STORAGE"], "due": "2026-08-28", "prog": 0, "done": False},
    {"text": "Luggage rack (for Sienna's bags)", "cat": ["SHOPPING", "STORAGE"], "due": "2026-08-28", "prog": 0, "done": False},

    # ERRANDS (1-2 Weeks ~ Sept 06)
    {"text": "Renew Motorcycle Registration at LTO", "cat": ["ERRANDS", "VEHICLE"], "due": "2026-08-29", "prog": 100, "done": True},
    {"text": "Claim Papa's Plate Number (LTO Galleria)", "cat": ["ERRANDS", "VEHICLE"], "due": "2026-09-06", "prog": 0, "done": False},
    {"text": "Car Repair: Parking brake pads", "cat": ["ERRANDS", "VEHICLE"], "due": "2026-09-06", "prog": 0, "done": False},
    {"text": "Car Repair: Aircon broken bearing", "cat": ["ERRANDS", "VEHICLE"], "due": "2026-09-06", "prog": 0, "done": False},
    {"text": "Car Repair: Fix washer liquid leaking", "cat": ["ERRANDS", "VEHICLE"], "due": "2026-09-06", "prog": 0, "done": False},
    {"text": "Apply for jobs via Facebook shared post", "cat": ["CAREER"], "due": "2026-08-29", "prog": 0, "done": False},
    {"text": "Test Kimi AI for workflow efficiency", "cat": ["CAREER"], "due": "2026-08-29", "prog": 0, "done": False},
    {"text": "Request salary/role transition from CEO/HR (Intern to Junior status)", "cat": ["CAREER"], "due": "2026-09-06", "prog": 0, "done": False},
    {"text": "Stay in touch with Kiara's father regarding app development / PickleBook", "cat": ["CAREER", "DEVELOPMENT"], "due": "2026-09-06", "prog": 0, "done": False},
    {"text": "Drill gate", "cat": ["MAINTENANCE"], "due": "2026-08-23", "prog": 0, "done": False},
    {"text": "Fix RGB light behind the TV", "cat": ["MAINTENANCE"], "due": "2026-09-06", "prog": 0, "done": False},

    # TRADING (2 Weeks ~ Sept 06)
    {"text": "Check Bibiano's EA Forex trading", "cat": ["TRADING"], "due": "2026-09-06", "prog": 0, "done": False},
    {"text": "Check Telegram link for VT Markets", "cat": ["TRADING"], "due": "2026-09-06", "prog": 0, "done": False},
    {"text": "Purchase prop firm account", "cat": ["TRADING"], "due": "2026-09-06", "prog": 0, "done": False},
    {"text": "Execute James' strategy", "cat": ["TRADING"], "due": "2026-09-06", "prog": 0, "done": False},

    # DESIGN (2-3 Weeks ~ Sept 13)
    {"text": "Pickup Production: Get Ike's shirts & Purple Choir Uniform today", "cat": ["DESIGN"], "due": "2026-08-23", "prog": 0, "done": False},
    {"text": "Sponsorship Agreement: Finalized printing shop logo sponsorship agreement with Uncle Nilo!", "cat": ["DESIGN"], "due": "2026-09-13", "prog": 100, "done": True},
    {"text": "Formal Minimalist Gold Choir Uniform: Gradient color updated and finalized!", "cat": ["DESIGN"], "due": "2026-09-13", "prog": 100, "done": True},
    {"text": "Design City High Choir uniform", "cat": ["DESIGN"], "due": "2026-09-13", "prog": 0, "done": False},
    {"text": "Draft Cayang lot floor plan proposal", "cat": ["DESIGN"], "due": "2026-09-13", "prog": 0, "done": False},

    # DEVELOPMENT (3-4 Weeks ~ Sept 20)
    {"text": "ASSVF Landing Page: Design online church donation website", "cat": ["DEVELOPMENT"], "due": "2026-08-23", "prog": 0, "done": False},
    {"text": "Architecture Refactor: Hash-based routing across all apps", "cat": ["DEVELOPMENT"], "due": "2026-09-20", "prog": 100, "done": True},
    {"text": "Wallet App: Fix bugs on Smart Wallet app", "cat": ["DEVELOPMENT"], "due": "2026-09-20", "prog": 100, "done": True},
    {"text": "Securo (Zea's Project): Final bug fixes & improvements completed!", "cat": ["DEVELOPMENT"], "due": "2026-09-20", "prog": 100, "done": True},
    {"text": "HydroGreen (formerly HydroTrack): Bug fixes complete — Testing phase now", "cat": ["DEVELOPMENT"], "due": "2026-09-20", "prog": 100, "done": True},
    {"text": "Faiora: Make database reliable", "cat": ["DEVELOPMENT"], "due": "2026-09-20", "prog": 95, "done": False},
    {"text": "ROUTE98 POS App: Clean up UI and fix bugs", "cat": ["DEVELOPMENT"], "due": "2026-09-20", "prog": 50, "done": False},
    {"text": "rustinho_pro Car Website Revamp: Initial build & design", "cat": ["DEVELOPMENT"], "due": "2026-09-20", "prog": 0, "done": False},
    {"text": "BogoLoan App: Initial exploration / build", "cat": ["DEVELOPMENT"], "due": "2026-08-29", "prog": 0, "done": False},
    {"text": "Chords App (ChoirBook Pro): Connect to Firebase and compile/update chords for 1st–13th masses", "cat": ["DEVELOPMENT"], "due": "2026-09-20", "prog": 0, "done": False},

    # PLAYSTORE
    {"text": "Sample Online App view Vercel", "cat": ["PLAYSTORE"], "due": "", "prog": 0, "done": False},
    {"text": "Play Store Media: Smart Wallet", "cat": ["PLAYSTORE"], "due": "", "prog": 100, "done": True},
    {"text": "Play Store Media: Faiora — Database Testing", "cat": ["PLAYSTORE"], "due": "", "prog": 95, "done": False},
    {"text": "Play Store Media: CSB NetPay / NetPay Tracker (Over 1M+ Data)", "cat": ["PLAYSTORE"], "due": "", "prog": 100, "done": True},
    {"text": "Play Store Media: HydroGreen", "cat": ["PLAYSTORE"], "due": "", "prog": 100, "done": True},
    {"text": "Play Store Media: Choir Attendance Tracker", "cat": ["PLAYSTORE"], "due": "", "prog": 100, "done": True},
    {"text": "Play Store Media: Securo (Zea's Project)", "cat": ["PLAYSTORE"], "due": "", "prog": 100, "done": True},
    {"text": "Play Store Media: Cebulingo", "cat": ["PLAYSTORE"], "due": "", "prog": 0, "done": False},
    {"text": "Play Store Media: ChoirBook Pro / Choir Book", "cat": ["PLAYSTORE"], "due": "", "prog": 0, "done": False},

    # BACKLOG (2-4 Months)
    {"text": "Ctrl + F Images Extension", "cat": ["BACKLOG", "DEVELOPMENT"], "due": "", "prog": 0, "done": False},
    {"text": "Update resume", "cat": ["BACKLOG", "CAREER"], "due": "", "prog": 0, "done": False},
    {"text": "PickleBook / Pickleball Booking App: Keep feedback loop open with Kiara's father", "cat": ["BACKLOG", "DEVELOPMENT"], "due": "", "prog": 0, "done": False},
    {"text": "Facebook Messenger AI bot (similar to Memorae)", "cat": ["BACKLOG", "DEVELOPMENT"], "due": "", "prog": 0, "done": False},
    {"text": "Cebeco app", "cat": ["BACKLOG", "DEVELOPMENT"], "due": "", "prog": 0, "done": False},
]

categories_set = set()
quick_tasks = []

for item in raw_items:
    task_id = f"qt_{uuid.uuid4().hex[:12]}"
    for c in item["cat"]:
        categories_set.add(c.upper())
    
    prog = item["prog"]
    status = "completed" if (item["done"] or prog == 100) else ("in_progress" if prog > 0 else "not_started")
    completed = item["done"] or prog == 100
    
    hist = []
    if prog > 0:
        hist.append({
            "id": f"log_{uuid.uuid4().hex[:8]}",
            "progress": prog,
            "note": f"Current status: {prog}% done" if prog < 100 else "Completed",
            "timestamp": now_ms
        })
    
    quick_tasks.append({
        "id": task_id,
        "text": item["text"],
        "dueDate": item["due"],
        "dueTime": "09:00" if item["due"] else "",
        "categories": [c.upper() for c in item["cat"]],
        "progress": prog,
        "completed": completed,
        "status": status,
        "progressHistory": hist,
        "createdAt": now_ms,
        "updatedAt": now_ms
    })

all_categories = sorted(list(categories_set))

payload = {
    "exportedAt": "2026-08-23T21:45:00.000Z",
    "version": 1,
    "notes": [],
    "quickTasks": quick_tasks,
    "alarms": [],
    "settings": {},
    "profile": {},
    "categories": all_categories,
    "sections": []
}

with open(r"c:\Users\Lenovo\Desktop\faiora\faiora-import-tasks.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2)

print(f"Generated {len(quick_tasks)} quick tasks with {len(all_categories)} categories successfully!")
