🧠 Project Name

Arogya Setu AI

🎯 Objective

Build a lightweight, production-style web app that helps elderly users manage medicines using:

AI-based medicine recognition
Medicine reminder system + SOS alerts
⚙️ Tech Stack (STRICT – Do NOT change)
Backend: Python (Flask)
Database: SQLite (local persistent storage)
Frontend: HTML + CSS + Vanilla JS
AI: Gemini API (free tier optimized)
Image Handling: Base64 / simple upload (NO heavy processing)
🚫 Constraints (VERY IMPORTANT)
Must work within FREE API limits
Optimize API calls (1 request per scan)
No unnecessary re-renders or loops
Keep UI lightweight (fast loading)
No external paid services
🧩 FEATURE 1: AI MEDICINE SCANNER
🎯 Goal

User scans or uploads medicine → system tells:

Medicine name
Usage
Reminder status
📥 Input Options
📷 Camera Capture
📁 Image Upload
🧠 Gemini Prompt Logic (VERY IMPORTANT)

AI must send this EXACT structured prompt:

You are a medical assistant AI.

From the given image:
1. Identify the medicine name (if visible)
2. Extract any readable text
3. Tell what this medicine is used for (simple explanation)
4. Keep answer short and clear for elderly users
5. if the texts or imformation is not correctly visble then don't randomly start gussesing rather then just say the user to put a clear image this is important and should be must followed.

Output format:
Medicine Name:
Use:
Confidence:
🔁 After AI Response (Backend Logic)

Match medicine name with database:

CASES:
✅ If medicine EXISTS in reminders:
Show:
“You should take this medicine at [time]”
If already marked taken:
→ “You have already taken this medicine today”
❌ If medicine NOT in reminders:
Show:
“This medicine is not in your schedule”
🧩 FEATURE 2: MEDICINE REMINDER SYSTEM
🎯 Goal

Simple CRUD system (no complexity)

🗂️ Fields:
Medicine Name
Time (HH:MM)
Days (Daily / Custom)
Status (Taken / Missed)
🧠 Logic
If current time > medicine time AND not marked taken:
→ Mark as MISSED
🚨 FEATURE 3: SOS ALERT SYSTEM
🎯 Goal

If medicine is MISSED → notify family

📤 Action:

Send message like:

example= Alert: Your parent has missed their medicine " Paracetamol" scheduled at 9:00 AM.
💡 Implementation (FREE)

Use:

Email (SMTP – Gmail free)
OR
Console log (for demo if needed)
🗄️ DATABASE SCHEMA (SQLite)
TABLE medicines:
id INTEGER PRIMARY KEY
name TEXT
time TEXT
days TEXT
status TEXT
last_taken_date TEXT
🎨 UI REQUIREMENTS (IMPORTANT)
Clean, modern UI
Large buttons (elder-friendly)
Minimal colors (soft + medical theme)
Fast loading (no heavy animations)
📱 Pages
Home
Scan Medicine
Upload Image
Reminder Page
Add / Edit / Delete medicines
Result Page
Show AI result + status
⚡ PERFORMANCE RULES
Resize image before sending to API
Limit API calls but this limit is only to ai agent like when every ai agent test the project it always do the limts rate of the free api key so that's why but when i am using don't keep such limits
Cache last result
Avoid infinite loops
🧪 TEST CASES (AI MUST PASS)
Upload valid medicine → correct output
Medicine in DB → correct timing shown
Missed medicine → SOS triggered
Reload page → data persists
🧠 NOW — THE MOST IMPORTANT PART 🔥
✅ MASTER PROMPT (Use This With AI Agent)

Build a COMPLETE, WORKING web application called "Arogya Setu AI".

🧠 PROJECT OBJECTIVE:
Create a lightweight, production-style web app that helps elderly users manage medicines using:
1) AI-based medicine recognition
2) Medicine reminder system with SOS alerts

⚙️ TECH STACK (STRICT – DO NOT CHANGE):
- Backend: Python (Flask)
- Database: SQLite (must persist data after reload)
- Frontend: HTML + CSS + Vanilla JavaScript (no frameworks)
- AI: Gemini API (free tier optimized)
- Image handling: Base64 or simple upload (NO heavy processing libraries)

🚫 CONSTRAINTS (VERY IMPORTANT):
- Must work within FREE API limits
- Only ONE Gemini API call per scan
- Avoid unnecessary API calls during testing
- Keep UI lightweight and fast loading
- No infinite loops or heavy re-renders
- No paid services or external dependencies
- Code must run locally without errors

--------------------------------------------------

🧩 FEATURE 1: AI MEDICINE SCANNER (FULLY WORKING)

🎯 GOAL:
User scans or uploads a medicine image → system identifies it and checks reminder status

📥 INPUT METHODS:
- Camera capture (webcam)
- Image upload (file input)

🧠 GEMINI API INSTRUCTION (USE EXACT PROMPT):

"You are a medical assistant AI.

From the given image:
1. Identify the medicine name (if visible)
2. Extract any readable text
3. Tell what this medicine is used for (simple explanation)
4. Keep answer short and clear for elderly users
5. If the text or information is not clearly visible, DO NOT guess. Instead respond: 'Please provide a clearer image.'

Output format:
Medicine Name:
Use:
Confidence:"

⚠️ IMPORTANT:
- Do NOT hallucinate or guess medicine names
- Always follow strict output format

--------------------------------------------------

🔁 BACKEND LOGIC AFTER AI RESPONSE:

Match detected medicine name with SQLite database.

CASES:

1. ✅ IF MEDICINE EXISTS:
- Show: "You should take this medicine at [time]"
- If already taken today:
  → Show: "You have already taken this medicine today"

2. ❌ IF MEDICINE NOT FOUND:
- Show: "This medicine is not in your schedule"

3. ⏰ IF TIME PASSED AND NOT TAKEN:
- Show: "You have missed this medicine"

--------------------------------------------------

🧩 FEATURE 2: MEDICINE REMINDER SYSTEM (FULL CRUD)

🎯 GOAL:
Simple and fully functional reminder system

📋 FIELDS:
- Medicine Name
- Time (HH:MM)
- Days (Daily or Custom)
- Status (Taken / Missed)
- Last Taken Date

🧠 LOGIC:
- If current time > scheduled time AND not marked taken:
  → Automatically mark as MISSED

- User must be able to:
  - Add medicine
  - Edit medicine
  - Delete medicine
  - Mark as taken

--------------------------------------------------

🚨 FEATURE 3: SOS ALERT SYSTEM

🎯 GOAL:
Trigger alert when medicine is missed

📤 ACTION:
Send message:

"Alert: Your parent has missed their medicine '[Medicine Name]' scheduled at [Time]."

💡 IMPLEMENTATION (FREE ONLY):
- Use SMTP email (Gmail)
OR
- Console log (for demo)

⚠️ Only trigger when medicine is MISSED

--------------------------------------------------

🗄️ DATABASE (SQLite - MUST IMPLEMENT)

TABLE: medicines

- id INTEGER PRIMARY KEY
- name TEXT
- time TEXT
- days TEXT
- status TEXT
- last_taken_date TEXT

Data must persist after reload (VERY IMPORTANT)

--------------------------------------------------

🎨 UI REQUIREMENTS (STRICT)

- Clean, modern UI
- Large buttons (elder-friendly)
- Minimal soft medical color theme
- Fast loading (no heavy animations)

📱 PAGES REQUIRED:

1. Home Page:
- Camera scan button
- Upload image button

2. Reminder Page:
- Add / Edit / Delete medicines

3. Result Page:
- Show AI result
- Show medicine timing + status

--------------------------------------------------

⚡ PERFORMANCE RULES

- Resize/compress image before sending to Gemini
- Cache last scan result
- Avoid repeated API calls
- IMPORTANT:
  During AI testing, avoid hitting free API rate limits
  BUT do NOT restrict actual user functionality artificially

--------------------------------------------------

🧪 TEST CASES (MUST PASS)

1. Upload valid medicine → correct AI output
2. Medicine exists → correct timing shown
3. Medicine missed → SOS triggered
4. Page reload → data persists (SQLite working)
5. Blurry image → shows "Please provide a clearer image"

--------------------------------------------------

📦 OUTPUT REQUIREMENTS

Provide COMPLETE project:

- Full folder structure
- All backend + frontend code files
- Requirements.txt
- .env example for Gemini API key
- Step-by-step setup instructions
- Ensure project runs locally without errors

--------------------------------------------------

⚠️ FINAL INSTRUCTIONS

- Do NOT skip any feature
- Do NOT give partial code
- Ensure everything works end-to-end
- Focus on correctness over extra features
- Keep code clean, modular, and readable

