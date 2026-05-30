# SBA School Manager — Implementation Guide for Google Antigravity
### Step-by-Step Setup Using Google's Agentic IDE
---

> **Who this guide is for:** Someone who has Google Antigravity installed and wants to get the SBA School Manager online app running — with no prior coding experience needed. Antigravity's AI agents will handle most of the heavy lifting for you.

---

## TABLE OF CONTENTS

1. What We Are Building
2. What Makes Antigravity Different
3. Project Folder Structure (What Each File Does)
4. PART A — Google Sheets Setup (Your Database)
5. PART B — Google Cloud Setup (API Access)
6. PART C — Open the SBA Project in Antigravity
7. PART D — Configure Antigravity Security Settings
8. PART E — Install Dependencies Using the Agent
9. PART F — Create Your .env Secret File
10. PART G — Run the App Locally
11. PART H — Deploy to the Internet (Free Hosting)
12. Using Antigravity Agents for Ongoing Tasks
13. How the Grade Calculations Work
14. Troubleshooting Common Errors
15. Quick Reference Cheat Sheet

---

## 1. WHAT WE ARE BUILDING

```
┌─────────────────────┐        ┌─────────────────────┐        ┌─────────────────────┐
│   React Frontend    │        │   Node.js Server     │        │   Google Sheets     │
│  (what users see)   │ ◄────► │  (your backend API)  │ ◄────► │   (your database)   │
│  Vercel (free)      │        │  Render.com (free)   │        │  Google Drive (free)│
└─────────────────────┘        └─────────────────────┘        └─────────────────────┘
```

**All features from the original desktop app are preserved:**
✅ Login / user accounts
✅ Dashboard with charts
✅ Students & Teachers management
✅ Marks entry with full SBA calculations (GES Grade Scale 1–9)
✅ Attendance recording
✅ Conduct & Remarks
✅ Raw scores & class positions
✅ Printable A4 report cards
✅ Full Settings panel

---

## 2. WHAT MAKES ANTIGRAVITY DIFFERENT

Instead of typing commands yourself, you describe what you want to the AI agent in plain English and it does the work. For example:

- Instead of typing `npm install` yourself → you tell the agent: *"Install the dependencies for this project"*
- Instead of manually configuring files → you tell the agent: *"Set up the server and run it"*
- If something breaks → you tell the agent: *"Fix this error"* and it reads the error and fixes it

Antigravity has two main views you will use:

**Agent Manager** — Where you type instructions to the AI agent. Think of it as your command centre.

**Editor** — The VS Code-style file editor where you can see and edit files directly.

You can switch between them anytime with **Cmd+E** (Mac) or **Ctrl+E** (Windows).

---

## 3. PROJECT FOLDER STRUCTURE

After setup, your project will look like this:

```
sba-online/                         ← Main project folder (open this in Antigravity)
│
├── public/
│   └── index.html                  ← The HTML page React loads into
│
├── src/                            ← All React frontend code
│   ├── index.js                    ← React entry point
│   ├── App.jsx                     ← Main app: routing + API helper
│   ├── index.css                   ← All styles
│   ├── components/
│   │   └── Layout.jsx              ← Sidebar + top navigation bar
│   └── pages/
│       ├── LoginPage.jsx           ← Login screen
│       ├── Dashboard.jsx           ← Home dashboard with charts
│       ├── StudentsPage.jsx        ← Student management
│       ├── TeachersPage.jsx        ← Teacher management
│       ├── MarksEntryPage.jsx      ← SBA marks entry with calculations
│       ├── AttendancePage.jsx      ← Attendance recording
│       ├── ConductPage.jsx         ← Conduct and remarks
│       ├── RawScoresPage.jsx       ← Class positions table
│       ├── ReportCardsPage.jsx     ← A4 printable report cards
│       └── SettingsPage.jsx        ← All settings tabs
│
├── server/                         ← Node.js backend
│   ├── index.js                    ← Entire API (Google Sheets connection)
│   ├── package.json                ← Server dependencies
│   └── .env                        ← Your secret credentials (YOU CREATE THIS)
│
├── package.json                    ← Frontend dependencies
├── tailwind.config.js              ← CSS framework config
└── postcss.config.js               ← PostCSS config
```

---

## 4. PART A — GOOGLE SHEETS SETUP (YOUR DATABASE)

Google Sheets stores all your data. Each tab in the sheet = one data table. Do this before opening Antigravity.

### Step A1 — Create the Spreadsheet

1. Go to **https://sheets.google.com**
2. Click **"+"** to create a new blank spreadsheet
3. Rename it: **SBA School Database**
4. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit
   ```
   Save it — you'll need it later.

### Step A2 — Create 11 Sheet Tabs

Click **"+"** at the bottom to add new sheets. Rename each one exactly as shown (spelling and underscores matter):

| Tab Name | What It Stores |
|---|---|
| `school_info` | School name, address, head teacher |
| `mark_labels` | SBA component names and max scores |
| `classes` | Class names (Basic 1–6 etc.) |
| `subjects` | Subject names and codes |
| `teachers` | Teacher records |
| `students` | Student records |
| `marks` | All SBA and exam marks |
| `attendance` | Student attendance per term |
| `conduct` | Conduct, attitude, interest, remarks |
| `conduct_options` | Dropdown values for conduct fields |
| `users` | Login accounts |

### Step A3 — Add Column Headers to Each Sheet Tab

Click each tab and type these headers in Row 1 (one word per column, A, B, C...):

**`school_info`:**
`id` | `school_name` | `address` | `district` | `academic_year` | `current_term` | `number_on_roll` | `total_attendance` | `date_vacated` | `reopening_date` | `head_teacher` | `logo_base64`

**`mark_labels`:**
`id` | `test1_label` | `test1_max` | `group_work_label` | `group_work_max` | `test2_label` | `test2_max` | `project_label` | `project_max`

**`classes`:**
`id` | `class_name` | `class_level`

**`subjects`:**
`id` | `subject_name` | `subject_code` | `display_order`

**`teachers`:**
`id` | `name` | `subject_id` | `class_id` | `phone` | `status`

**`students`:**
`id` | `student_no` | `name` | `gender` | `class_id` | `academic_year` | `status`

**`marks`:**
`id` | `student_id` | `subject_id` | `academic_year` | `term` | `sba1` | `sba2` | `sba3` | `sba4` | `class_total` | `class_score_50` | `exam_score` | `exam_score_50` | `overall_total` | `grade` | `remark` | `position`

**`attendance`:**
`id` | `student_id` | `academic_year` | `term` | `days_present` | `total_days`

**`conduct`:**
`id` | `student_id` | `academic_year` | `term` | `conduct` | `attitude` | `interest` | `remarks` | `promoted_to` | `class_teacher_remark`

**`conduct_options`:**
`id` | `category` | `value` | `display_order`

**`users`:**
`id` | `username` | `password_hash` | `full_name` | `role` | `is_active`

> ✅ When the server first starts, it automatically fills in all default data (school info, classes, subjects, admin user, conduct options). You only need to set up the headers.

---

## 5. PART B — GOOGLE CLOUD SETUP (API ACCESS)

You need a **Service Account** so your server can read and write to Google Sheets automatically.

### Step B1 — Create a Google Cloud Project

1. Go to **https://console.cloud.google.com**
2. Click **"Select a project"** → **"New Project"**
3. Name it `SBA School App` → click **"Create"**

### Step B2 — Enable the Google Sheets API

1. Click the menu (☰) → **"APIs & Services"** → **"Library"**
2. Search for `Google Sheets API`
3. Click it → click **"Enable"**

### Step B3 — Create a Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"Service Account"**
3. Name: `sba-sheets-service`
4. Click **"Create and Continue"**
5. Role: **"Basic"** → **"Editor"** → **"Continue"** → **"Done"**

### Step B4 — Download the JSON Key File

1. Click your new service account email in the list
2. Go to the **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"** → **"JSON"** → **"Create"**
4. A JSON file downloads — **keep this safe**

Open it in Notepad. You need:
- `client_email` — e.g. `sba-sheets-service@sba-school-app.iam.gserviceaccount.com`
- `private_key` — the long key starting with `-----BEGIN RSA PRIVATE KEY-----`

### Step B5 — Share the Spreadsheet with the Service Account

1. Open your **SBA School Database** Google Sheet
2. Click **"Share"** (top right)
3. Paste the `client_email` from the JSON file
4. Set to **"Editor"** → uncheck "Notify people" → **"Share"**

---

## 6. PART C — OPEN THE SBA PROJECT IN ANTIGRAVITY

### Step C1 — Extract the ZIP

1. Find the `SBA_Online_App.zip` file you downloaded
2. Right-click it → **"Extract All"** (Windows) or double-click (Mac)
3. You will get a folder called `sba-online`

### Step C2 — Open in Antigravity

1. Launch **Google Antigravity**
2. On the welcome screen, click **"Open Folder"**
3. Navigate to and select the `sba-online` folder
4. Click **"Open"**

You will now see the Agent Manager view with the `sba-online` workspace loaded.

### Step C3 — Switch to Editor to Verify Files

Click **"Open Editor"** (top right) or press **Cmd+E** / **Ctrl+E**.

In the file explorer on the left, you should see:
- `src/` folder with all the `.jsx` files
- `server/` folder with `index.js`
- `package.json`, `tailwind.config.js` etc.

If everything is there — great! Switch back to **Agent Manager** with **Cmd+E**.

---

## 7. PART D — CONFIGURE ANTIGRAVITY SECURITY SETTINGS

Before using the agent, set up the right security level for your project.

### Step D1 — Set the Agent Mode

When you first start a conversation in Agent Manager, you'll see a mode selector. Set it to:

**→ "Review-driven development"** (recommended)

This means the agent will ask you to approve steps before executing them — perfect for a beginner who wants to see what's happening.

### Step D2 — Set Terminal Policy

Go to Antigravity **Settings** (Ctrl+, or Cmd+,) → **Agent** section:

- **Terminal Command Auto Execution:** Set to **"Request Review"**
  - This means the agent will ask before running any terminal command
- **Enable Terminal Sandbox:** Turn **ON**

### Step D3 — Allow npm and node Commands

Still in Settings → **Permissions** → **Always Allow**, add these entries (one per line):

```
command(npm)
command(node)
```

This allows the agent to run `npm install` and `node index.js` without asking every time.

---

## 8. PART E — INSTALL DEPENDENCIES USING THE AGENT

Now you can let the agent do the setup work. Go to **Agent Manager** and type these prompts one at a time.

### Prompt 1 — Install Frontend Dependencies

Type this in the Agent Manager chat box and press **Enter**:

```
Install the npm dependencies for the React frontend. Run npm install in the root sba-online folder.
```

The agent will:
1. Show you what command it wants to run (`npm install`)
2. Ask you to approve (click **"Proceed"** or **"Allow"**)
3. Run it and show you the output

Wait until it finishes. You will see a `node_modules` folder appear in the editor.

### Prompt 2 — Install Server Dependencies

```
Install the npm dependencies for the backend server. Run npm install inside the server folder.
```

Again, approve when asked. Wait for it to finish.

### Prompt 3 — Verify Installation

```
Check that both npm installs completed successfully. List the contents of the sba-online folder and the server folder.
```

The agent will confirm both `node_modules` folders exist.

---

## 9. PART F — CREATE YOUR .env SECRET FILE

This is the most important step. The `.env` file holds your Google credentials. You create this yourself — do NOT let the agent create it (to keep your secrets safe).

### Step F1 — Open the Editor

Press **Cmd+E** / **Ctrl+E** to switch to Editor view.

### Step F2 — Create the .env File

In the file explorer, right-click the `server` folder → **"New File"** → name it `.env`

### Step F3 — Fill in Your Credentials

Paste this template into the `.env` file and fill in YOUR values:

```
SPREADSHEET_ID=paste_your_spreadsheet_id_here

GOOGLE_CLIENT_EMAIL=paste_client_email_from_json_here

GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
paste_the_entire_private_key_here
each_line_on_its_own_line
-----END RSA PRIVATE KEY-----
"

JWT_SECRET=0a36e60977f9a406f4328d07538950f03aac0fa04d6170a3c17df3445a0cda1

PORT=4000

CLIENT_URL=http://localhost:3000
```

**Tips for the private key:**
- Open the JSON file in Notepad
- Copy everything from `-----BEGIN RSA PRIVATE KEY-----` to `-----END RSA PRIVATE KEY-----`
- In the JSON, the key has `\n` characters — when pasting into `.env`, replace each `\n` with an actual new line
- Keep the double quotes around the entire key block

**Example of a correctly filled `.env`:**
```
SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
GOOGLE_CLIENT_EMAIL=sba-sheets-service@my-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA2a2rwplBQL...
...many more lines...
-----END RSA PRIVATE KEY-----
"
JWT_SECRET=sba2024ghanaschoolsecretkey99xyz
PORT=4000
CLIENT_URL=http://localhost:3000
```

Press **Ctrl+S** / **Cmd+S** to save the file.

---

## 10. PART G — RUN THE APP LOCALLY

### Step G1 — Start the Server (Agent Prompt)

Switch back to **Agent Manager** and type:

```
Start the Node.js server by running: node index.js inside the server folder. Show me the terminal output.
```

The agent will open the terminal and run it. You should see:
```
[SBA] Seed check complete.
[SBA] Server running on http://localhost:4000
```

**Check your Google Sheet** — the `school_info` tab should now have a row of default data in Row 2. The `users` tab should have the admin account. This confirms the server connected to Google Sheets! ✅

### Step G2 — Start the React Frontend (New Agent Conversation)

Click **"Start Conversation"** in Agent Manager to begin a new conversation, then type:

```
Start the React frontend by running npm start in the root sba-online folder. Open the browser preview.
```

Approve when asked. After 30–60 seconds, Antigravity will open a browser preview (or you can manually open **http://localhost:3000**).

### Step G3 — Log In

You will see the SBA login screen. Use:
- **Username:** `admin`
- **Password:** `admin123`

🎉 **Your app is running!**

### Step G4 — First-Time Setup in the App

1. Go to **Settings → School Info** — fill in your school name, address, district, head teacher
2. Upload your school logo/crest
3. Set the academic year and current term
4. Go to **Students** and add your students
5. Go to **Marks Entry** and select a class and subject to start entering marks

---

## 11. PART H — DEPLOY TO THE INTERNET (FREE HOSTING)

Once everything works locally, follow these steps to put it online.

### Deploy the Server on Render.com

1. Go to **https://render.com** → create a free account
2. Click **"New +"** → **"Web Service"**
3. Choose **"Upload Files"** and upload your `server/` folder contents

**Render Settings:**
| Setting | Value |
|---|---|
| Name | `sba-school-server` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `node index.js` |
| Plan | Free |

**Add Environment Variables** (click "Environment" tab, add each one):
- `SPREADSHEET_ID` → your spreadsheet ID
- `GOOGLE_CLIENT_EMAIL` → your service account email
- `GOOGLE_PRIVATE_KEY` → your entire private key
- `JWT_SECRET` → your secret string
- `CLIENT_URL` → fill this after Vercel deployment

Click **"Create Web Service"**. Wait 3–5 minutes.

You get a URL like: `https://sba-school-server.onrender.com` — **copy this.**

### Update the Frontend API URL

In Antigravity Editor, open `src/App.jsx`. Find this line near the top:

```javascript
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
```

You can either:
- Create a `.env` file in the root `sba-online/` folder with:
  ```
  REACT_APP_API_URL=https://sba-school-server.onrender.com/api
  ```
- Or ask the agent: *"Update the API_BASE in src/App.jsx to point to https://sba-school-server.onrender.com/api"*

Then ask the agent:
```
Build the React app for production by running: npm run build
```

### Deploy Frontend on Vercel

1. Go to **https://vercel.com** → create a free account
2. Click **"Add New Project"**
3. Upload the `build/` folder that was created

**OR use the Vercel CLI (the agent can do this):**

Ask the agent:
```
Install the Vercel CLI globally with npm install -g vercel, then run vercel to deploy the build folder
```

Follow the prompts. When done, Vercel gives you a URL like `https://sba-school.vercel.app`.

### Final Step — Update CORS on Render

Go back to Render → your server → Environment:
- Update `CLIENT_URL` to your Vercel URL: `https://sba-school.vercel.app`
- Click **"Save Changes"**

🌐 **Your app is now live on the internet — accessible from any browser, anywhere!**

---

## 12. USING ANTIGRAVITY AGENTS FOR ONGOING TASKS

One of the biggest advantages of Antigravity is you can ask the agent to help with any task going forward. Here are useful prompts:

### If Something Breaks
```
I'm getting this error in the terminal: [paste the error here]. Please fix it.
```

### To Add a New Feature
```
Add a feature to export the raw scores table as a PDF in addition to CSV.
```

### To Debug a Calculation
```
The overall mark calculation in MarksEntryPage.jsx seems wrong. Can you verify the formula matches: SBA Total / 2 + Exam Score / 2 = Overall out of 100?
```

### To Update Styling
```
Make the sidebar background color darker navy blue and make the active menu item highlight amber/gold instead of the current style.
```

### To Review Code Before Deployment
Switch to **Planning mode** in the agent chat, then:
```
Review all the files in src/pages/ for any potential bugs or issues before we deploy.
```

The agent will create an **Implementation Plan artifact** you can review before it makes any changes.

### To Understand What a File Does
```
Explain what server/index.js does in simple terms, focusing on how it reads and writes to Google Sheets.
```

---

## 13. HOW THE GRADE CALCULATIONS WORK

This is the exact GES (Ghana Education Service) formula used in the original app:

```
SBA Components (4 scores):
  TEST 1        (default max: 30)
  GROUP WORK    (default max: 20)
  TEST 2        (default max: 30)
  PROJECT       (default max: 20)
  ─────────────────────────────────
  SBA TOTAL     (max: 100)

CLASS SCORE  = SBA TOTAL ÷ 2         → score out of 50
EXAM SCORE   = Exam Mark ÷ 2         → score out of 50
OVERALL      = CLASS SCORE + EXAM    → out of 100
```

**GES Grade Scale:**

| Grade | Remark      | Score Range |
|-------|-------------|-------------|
| 1     | Excellent   | > 79        |
| 2     | Very Good   | 70 – 79     |
| 3     | Good        | 65 – 69     |
| 4     | Fairly Good | 59 – 64     |
| 5     | Credit      | 50 – 58     |
| 6     | Average     | 45 – 49     |
| 7     | Pass        | 39 – 44     |
| 8     | Weak        | 35 – 38     |
| 9     | Very Weak   | < 35        |

**Aggregate** = Sum of all grade numbers (lower is better).
**Position** = Ranked by overall total within the class.

---

## 14. TROUBLESHOOTING COMMON ERRORS

For any error, the fastest fix is to paste the error message into the Antigravity Agent Manager and ask:
```
Fix this error: [paste error here]
```

But here are the most common issues and solutions:

### Server shows "Invalid grant" or Google auth error
**Cause:** Wrong Google credentials in `.env`
**Fix:** Double-check `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` match your JSON file exactly. Make sure the spreadsheet is shared with the service account email.

### "The caller does not have permission"
**Cause:** Spreadsheet not shared with service account
**Fix:** In Google Sheets → Share → add the service account email with Editor access

### React shows blank white screen or "Network Error"
**Cause:** Frontend can't reach the server
**Fix:** Make sure the server is running. Check `API_BASE` in `App.jsx` points to the correct URL.

### Login fails — "Invalid username or password"
**Cause:** Admin user not seeded yet
**Fix:** Check the `users` tab in Google Sheets. If empty, restart the server — it seeds default data on startup. Default: `admin` / `admin123`

### Report card prints with blank pages
**Fix:** In browser print dialog → Margins: None → Paper: A4 → disable headers/footers

### Google Sheets API rate limit error
**Cause:** Too many requests in one minute (free tier limit: 300/min)
**Fix:** Wait 60 seconds and try again. The app batches requests efficiently to stay under limits.

### Antigravity agent says "I can't run terminal commands"
**Fix:** Go to Settings → Agent → Terminal Command Auto Execution → set to "Request Review" (not Disabled). Also add `command(npm)` and `command(node)` to the Always Allow list.

---

## 15. QUICK REFERENCE CHEAT SHEET

### Agent Prompts for Daily Use

| Task | What to Say to the Agent |
|---|---|
| Start server | `Run node index.js in the server folder` |
| Start frontend | `Run npm start in the sba-online root folder` |
| Fix an error | `Fix this error: [paste error]` |
| Build for production | `Run npm run build` |
| Install new package | `Install [package name] using npm` |
| Check if server is running | `Check if the server is running at localhost:4000` |

### Keyboard Shortcuts in Antigravity

| Shortcut | Action |
|---|---|
| Cmd/Ctrl + E | Toggle between Agent Manager and Editor |
| Cmd/Ctrl + L | Toggle agent side panel in Editor |
| Cmd/Ctrl + I | Inline command in editor or terminal |
| Cmd/Ctrl + , | Open Settings |
| Ctrl + ` | Toggle terminal panel |

### Key Files

| File | What to Edit |
|---|---|
| `server/.env` | Your secret credentials |
| `src/App.jsx` | Change API server URL for production |
| `src/index.css` | Change colours and visual styles |
| `server/index.js` | Add new API features |
| `src/pages/ReportCardsPage.jsx` | Change report card layout |

### Default Login
- **Username:** `admin`
- **Password:** `admin123`
- Change this immediately in **Settings → Users** after first login

### Free Hosting Summary
| Service | What It Hosts | URL |
|---|---|---|
| Render.com | Node.js server | render.com |
| Vercel.com | React frontend | vercel.com |
| Google Sheets | Database | sheets.google.com |
| Google Cloud | API credentials | console.cloud.google.com |

---

## SUMMARY — THE WHOLE PROCESS IN 10 STEPS

1. Create a Google Sheet with 11 tabs and add headers to each
2. Enable Google Sheets API in Google Cloud Console
3. Create a Service Account, download the JSON key file
4. Share the Google Sheet with the Service Account email
5. Extract `SBA_Online_App.zip` and open the `sba-online` folder in Antigravity
6. Configure Antigravity security settings (Review-driven mode, allow npm/node)
7. Use the Agent to install dependencies: `npm install` in root and server folders
8. Create `server/.env` manually with your credentials
9. Use the Agent to start the server and frontend — log in and test
10. Deploy server to Render.com and frontend to Vercel.com

---

*SBA School Manager — Online Version · Built for Ghana Education Service*
*Powered by React + Node.js + Google Sheets · Developed with Google Antigravity*
