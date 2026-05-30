# SBA School Manager — Complete Online Implementation Guide
### From Zero to Live App · Ghana Education Service
---

> **Who this guide is for:** Someone who understands what React, Node.js and Google Sheets are, but has not written code before and needs exact step-by-step instructions with every command and every click explained.

---

## TABLE OF CONTENTS

1. What We Are Building
2. Software You Must Install
3. Project Folder Structure (What Each File Does)
4. PART A — Google Sheets Setup (Your Database)
5. PART B — Google Cloud Setup (API Access)
6. PART C — Server Setup (The Backend)
7. PART D — React App Setup (The Frontend)
8. PART E — Running the App Locally
9. PART F — Deploying to the Internet (Free Hosting)
10. How the Grade Calculations Work
11. Troubleshooting Common Errors
12. Quick Reference Cheat Sheet

---

## 1. WHAT WE ARE BUILDING

```
┌─────────────────────┐        ┌─────────────────────┐        ┌─────────────────────┐
│   React Frontend    │        │   Node.js Server     │        │   Google Sheets     │
│  (what users see)   │ ◄────► │  (your backend API)  │ ◄────► │   (your database)   │
│  Vercel (free)      │        │  Render.com (free)   │        │  Google Drive (free)│
└─────────────────────┘        └─────────────────────┘        └─────────────────────┘
```

**What each part does:**
- **React Frontend** — The screens, buttons, tables, report cards. Runs in the browser.
- **Node.js Server** — Handles login, saves data, does calculations. Runs on a server.
- **Google Sheets** — Stores all data (students, marks, teachers etc). Visible as a spreadsheet.

**All features from the original desktop app are preserved:**
✅ Login / user accounts  
✅ Dashboard with charts  
✅ Students, Teachers management  
✅ Marks entry with SBA calculations  
✅ Attendance recording  
✅ Conduct & Remarks  
✅ Raw scores & class positions  
✅ Printable A4 report cards  
✅ Settings (school info, mark labels, classes, subjects, conduct options, users)  

---

## 2. SOFTWARE YOU MUST INSTALL

Install these in order. Each one is free.

### 2.1 — Node.js (Required)

1. Go to **https://nodejs.org**
2. Click the big green **"LTS"** button (Long Term Support)
3. Download and run the installer
4. Click **Next** on every screen, accept defaults
5. ✅ Check the box that says **"Automatically install necessary tools"**
6. Finish the installation

**Verify it worked:** Open **Command Prompt** (press Win+R, type `cmd`, press Enter) and type:
```
node --version
```
You should see something like: `v20.11.0`

Also type:
```
npm --version
```
You should see something like: `10.2.4`

If you see a version number, Node.js is installed correctly. ✅

### 2.2 — Visual Studio Code (Code Editor)

1. Go to **https://code.visualstudio.com**
2. Click **Download for Windows**
3. Run the installer, accept all defaults
4. This is where you will open and edit your project files

### 2.3 — Git (Optional but recommended)

1. Go to **https://git-scm.com/download/win**
2. Download and install with all default settings

---

## 3. PROJECT FOLDER STRUCTURE

After you set everything up, your project will look like this:

```
sba-online/                         ← The main project folder
│
├── public/
│   └── index.html                  ← The single HTML page React uses
│
├── src/                            ← All your React (frontend) code
│   ├── index.js                    ← React entry point (do not edit)
│   ├── App.jsx                     ← Main app: routing + API helper
│   ├── index.css                   ← All styles (Tailwind + custom)
│   ├── components/
│   │   └── Layout.jsx              ← Sidebar navigation + top bar
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
├── server/                         ← Your Node.js backend
│   ├── index.js                    ← The entire API server
│   ├── package.json                ← Server dependencies list
│   └── .env                        ← Secret keys (YOU CREATE THIS)
│
├── package.json                    ← Frontend dependencies list
├── tailwind.config.js              ← Tailwind CSS config
└── postcss.config.js               ← PostCSS config
```

---

## 4. PART A — GOOGLE SHEETS SETUP (YOUR DATABASE)

Google Sheets will act as your database. Each sheet tab = one database table.

### Step A1 — Create the Google Spreadsheet

1. Go to **https://sheets.google.com**
2. Click the **"+"** button (Blank spreadsheet)
3. Click on "Untitled spreadsheet" at the top and rename it to: **SBA School Database**
4. Copy the **Spreadsheet ID** from the URL bar. The URL looks like:
   ```
   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
   ```
   The ID is the long string between `/d/` and `/edit`:
   ```
   1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
   ```
   **Save this — you will need it later.**

### Step A2 — Create the Sheet Tabs

You need to create exactly **11 sheet tabs** with these exact names (case sensitive):

At the bottom of Google Sheets, you see a "+" button to add new sheets. Click it and rename each one. The sheet names must be **exactly** as written:

| Tab Name | What It Stores |
|---|---|
| `school_info` | School name, address, head teacher, etc. |
| `mark_labels` | Names and max scores for SBA components |
| `classes` | Class names (Basic 1, Basic 2, etc.) |
| `subjects` | Subject names and codes |
| `teachers` | Teacher records |
| `students` | Student records |
| `marks` | All SBA and exam marks |
| `attendance` | Student attendance records |
| `conduct` | Conduct, attitude, remarks per student |
| `conduct_options` | Dropdown options for conduct fields |
| `users` | Login accounts |

**How to create each tab:**
1. Click the **"+"** at the bottom of Sheets
2. Right-click the new "Sheet1" tab → **Rename**
3. Type the exact name from the table above
4. Press **Enter**

Repeat until you have all 11 tabs.

### Step A3 — Add Column Headers to Each Sheet

Click on each sheet tab and add the headers in Row 1. Type each header in a separate column (A, B, C...). **Headers must be exactly as written:**

**Sheet: `school_info`** — Row 1 headers:
```
id | school_name | address | district | academic_year | current_term | number_on_roll | total_attendance | date_vacated | reopening_date | head_teacher | logo_base64
```

**Sheet: `mark_labels`** — Row 1 headers:
```
id | test1_label | test1_max | group_work_label | group_work_max | test2_label | test2_max | project_label | project_max
```

**Sheet: `classes`** — Row 1 headers:
```
id | class_name | class_level
```

**Sheet: `subjects`** — Row 1 headers:
```
id | subject_name | subject_code | display_order
```

**Sheet: `teachers`** — Row 1 headers:
```
id | name | subject_id | class_id | phone | status
```

**Sheet: `students`** — Row 1 headers:
```
id | student_no | name | gender | class_id | academic_year | status
```

**Sheet: `marks`** — Row 1 headers:
```
id | student_id | subject_id | academic_year | term | sba1 | sba2 | sba3 | sba4 | class_total | class_score_50 | exam_score | exam_score_50 | overall_total | grade | remark | position
```

**Sheet: `attendance`** — Row 1 headers:
```
id | student_id | academic_year | term | days_present | total_days
```

**Sheet: `conduct`** — Row 1 headers:
```
id | student_id | academic_year | term | conduct | attitude | interest | remarks | promoted_to | class_teacher_remark
```

**Sheet: `conduct_options`** — Row 1 headers:
```
id | category | value | display_order
```

**Sheet: `users`** — Row 1 headers:
```
id | username | password_hash | full_name | role | is_active
```

> **TIP:** When the server starts for the first time, it automatically fills in the default data (default school, classes, subjects, admin user, conduct options). You only need to create the headers!

---

## 5. PART B — GOOGLE CLOUD SETUP (API ACCESS)

To let your server talk to Google Sheets, you need a **Service Account** — like a robot account with permission to read/write the spreadsheet.

### Step B1 — Create a Google Cloud Project

1. Go to **https://console.cloud.google.com**
2. Sign in with your Google account
3. At the top, click **"Select a project"** → **"New Project"**
4. Project name: `SBA School App` (anything works)
5. Click **"Create"**
6. Wait for it to create, then select it

### Step B2 — Enable the Google Sheets API

1. In the Google Cloud Console, click the **hamburger menu** (☰) top left
2. Go to **"APIs & Services"** → **"Library"**
3. In the search box, type: `Google Sheets API`
4. Click on **"Google Sheets API"**
5. Click the blue **"Enable"** button
6. Wait for it to enable ✅

### Step B3 — Create a Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"Service Account"**
3. Service account name: `sba-sheets-service`
4. Click **"Create and Continue"**
5. For the role, click **"Select a role"** → **"Basic"** → **"Editor"**
6. Click **"Continue"**
7. Click **"Done"**

### Step B4 — Download the Service Account Key (JSON file)

1. You should see your new service account in the list
2. Click on its email address (e.g., `sba-sheets-service@sba-school-app.iam.gserviceaccount.com`)
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **"JSON"** format
6. Click **"Create"**
7. A JSON file downloads automatically — **keep this safe, it's your password**

Open the downloaded JSON file in Notepad. You need two values from it:

- `client_email` — looks like: `sba-sheets-service@sba-school-app.iam.gserviceaccount.com`
- `private_key` — a long string starting with `-----BEGIN RSA PRIVATE KEY-----`

### Step B5 — Share the Spreadsheet with the Service Account

1. Go back to your Google Sheet: **SBA School Database**
2. Click the **"Share"** button (top right, green)
3. In the "Add people and groups" field, paste the **client_email** from the JSON file
4. Set permission to **"Editor"**
5. Uncheck "Notify people" (the service account doesn't need an email)
6. Click **"Share"**

> ✅ Your server can now read and write to the spreadsheet.

---

## 6. PART C — SERVER SETUP (THE BACKEND)

### Step C1 — Create the Server Folder

Open **Command Prompt** and run these commands one by one. Press **Enter** after each line:

```cmd
cd Desktop
mkdir sba-school-app
cd sba-school-app
mkdir server
cd server
```

You are now inside the `server` folder.

### Step C2 — Copy the Server Files

Copy these two files from the code package you received into the `server` folder:
- `index.js`
- `package.json`

You can also create them manually in VS Code:
1. Open VS Code
2. File → Open Folder → select your `server` folder
3. Create `index.js` and paste the full contents
4. Create `package.json` and paste the contents

### Step C3 — Install Server Dependencies

In Command Prompt (still inside the `server` folder), run:

```cmd
npm install
```

This downloads all required libraries. You will see lots of text scrolling — this is normal. Wait until you see the cursor again (takes 1–3 minutes).

When done, you will see a new folder called `node_modules` appear. This is correct.

### Step C4 — Create the .env File (Your Secret Keys)

This is the most important step. In the `server` folder, create a file called **`.env`** (just `.env`, nothing before the dot).

**In VS Code:** Right-click in the file panel → New File → name it `.env`

Copy this template and fill in YOUR values:

```
SPREADSHEET_ID=paste_your_spreadsheet_id_here

GOOGLE_CLIENT_EMAIL=paste_client_email_from_json_here

GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
paste_entire_private_key_here_including_the_header_and_footer_lines
-----END RSA PRIVATE KEY-----
"

JWT_SECRET=pick_any_long_random_string_like_sba2024securekey9821xyz

PORT=4000

CLIENT_URL=http://localhost:3000
```

**Important notes about the private key:**
- Copy the ENTIRE private key from the JSON file, including the `-----BEGIN` and `-----END` lines
- The private key will have `\n` characters in the JSON file — replace each `\n` with an actual new line when you paste it into `.env`
- Wrap the entire key in double quotes as shown above

**Example of what your `.env` should look like (with fake values):**
```
SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
GOOGLE_CLIENT_EMAIL=sba-sheets-service@sba-school-app.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA2a2rwplBQL...
...many more lines...
-----END RSA PRIVATE KEY-----
"
JWT_SECRET=sba2024securekey9821xyz
PORT=4000
CLIENT_URL=http://localhost:3000
```

### Step C5 — Test the Server

In Command Prompt (inside the `server` folder):

```cmd
node index.js
```

You should see:
```
[SBA] Seed check complete.
[SBA] Server running on http://localhost:4000
```

If you see this — the server works! ✅

**Open your browser and go to:** `http://localhost:4000/api/health`

You should see: `{"status":"ok","time":"2024-..."}`

**Check your Google Sheet** — the `school_info` tab should now have a row of default data in Row 2. The `users` tab should have the admin account. This means the server connected to Sheets successfully! ✅

Press **Ctrl+C** in Command Prompt to stop the server for now.

---

## 7. PART D — REACT APP SETUP (THE FRONTEND)

### Step D1 — Go Back to the Main Project Folder

In Command Prompt:

```cmd
cd ..
```

You are now in `sba-school-app/` (one level up from server).

### Step D2 — Copy the Frontend Files

Copy these files/folders from the code package into `sba-school-app/`:
- `public/` folder (with `index.html` inside)
- `src/` folder (with all the .jsx files inside)
- `package.json`
- `tailwind.config.js`
- `postcss.config.js`

### Step D3 — Set the Server URL

Open `src/App.jsx` in VS Code. Near the top you will see this line:

```javascript
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
```

For local development, this already points to `http://localhost:4000/api` — the server you set up. No changes needed for now.

### Step D4 — Install Frontend Dependencies

In Command Prompt (inside `sba-school-app/`, NOT inside `server/`):

```cmd
npm install
```

Wait for it to finish (2–5 minutes). When done you will see a `node_modules` folder.

---

## 8. PART E — RUNNING THE APP LOCALLY

You need **two** Command Prompt windows open at the same time.

### Window 1 — Start the Server

```cmd
cd Desktop\sba-school-app\server
node index.js
```

Leave this window open. You should see `[SBA] Server running on http://localhost:4000`

### Window 2 — Start the React App

Open a new Command Prompt window:

```cmd
cd Desktop\sba-school-app
npm start
```

After 30–60 seconds, your browser will automatically open at **http://localhost:3000**

You will see the **login screen**. Log in with:
- Username: `admin`
- Password: `admin123`

🎉 **Your app is running!**

**First things to do after logging in:**
1. Go to **Settings → School Info** and fill in your school details
2. Upload your school logo/crest
3. Set the academic year and current term
4. Go to **Students** and add your students
5. Go to **Marks Entry** and start entering marks

---

## 9. PART F — DEPLOYING TO THE INTERNET (FREE HOSTING)

When the app is ready to go live (accessible from any browser, anywhere), follow these steps.

### Deploy the Server on Render.com (Free)

**Render** is a free hosting platform for Node.js apps.

1. Go to **https://render.com** and create a free account
2. Click **"New +"** → **"Web Service"**
3. Choose **"Deploy from Git"** (or manually upload your files — see below)

**If not using Git, use the manual approach:**

1. Zip your entire `server/` folder (right-click → Send to → Compressed folder)
2. On Render: New → Web Service → Upload ZIP

**Render settings:**
- **Name:** `sba-school-server`
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `node index.js`
- **Plan:** Free

**Add Environment Variables on Render:**
Go to "Environment" tab and add each variable from your `.env` file:
- `SPREADSHEET_ID` = your spreadsheet ID
- `GOOGLE_CLIENT_EMAIL` = your service account email
- `GOOGLE_PRIVATE_KEY` = your private key (paste the entire key)
- `JWT_SECRET` = your secret string
- `CLIENT_URL` = you will fill this after deploying the frontend

Click **"Create Web Service"**. Wait 3–5 minutes for it to deploy.

When deployed, Render gives you a URL like: `https://sba-school-server.onrender.com`

**Copy this URL — you need it for the frontend.**

### Deploy the Frontend on Vercel (Free)

**Vercel** is a free hosting platform for React apps.

1. Go to **https://vercel.com** and create a free account
2. Before deploying, update `src/App.jsx`:
   - Change `http://localhost:4000/api` to your Render server URL + `/api`
   - Example: `https://sba-school-server.onrender.com/api`
3. Re-run `npm run build` in Command Prompt to create a production build
4. On Vercel: Click **"Add New Project"** → **"Deploy from your computer"**
5. Upload the `build/` folder that was created

**OR use the Vercel CLI (easier):**

```cmd
npm install -g vercel
vercel
```

Follow the prompts. When done, Vercel gives you a URL like: `https://sba-school.vercel.app`

**Final step — update CORS on Render:**
Go back to Render → your server → Environment variables:
- Update `CLIENT_URL` to your Vercel URL: `https://sba-school.vercel.app`
- Click **"Save Changes"** and wait for redeploy

🌐 **Your app is now live on the internet!**

---

## 10. HOW THE GRADE CALCULATIONS WORK

This is the exact same formula as the original desktop app:

```
SBA Components (4 scores):
  TEST 1     (default max: 30)
  GROUP WORK (default max: 20)
  TEST 2     (default max: 30)
  PROJECT    (default max: 20)
  ─────────────────────────────
  SBA TOTAL  (max: 100)

CLASS SCORE = SBA TOTAL ÷ 2       → gives a score out of 50
EXAM SCORE  = Exam Mark ÷ 2       → gives a score out of 50
OVERALL     = CLASS SCORE + EXAM SCORE   → out of 100
```

**Grade Scale (Ghana Education Service):**

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

**Position calculation:**
- Students are ranked by their OVERALL score within each subject
- Overall class position is calculated by summing all subject totals

**Aggregate:**
- Sum of all subject grades (lower is better)
- Example: 5 subjects with grades 1, 2, 1, 3, 2 = aggregate of 9

---

## 11. TROUBLESHOOTING COMMON ERRORS

### "Cannot find module 'googleapis'"
**Solution:** You forgot to run `npm install` in the server folder.
```cmd
cd server
npm install
```

### "Invalid grant" or "unauthorized_client"
**Solution:** The Google service account credentials are wrong.
- Double-check `GOOGLE_CLIENT_EMAIL` — must match exactly what's in the JSON file
- Check `GOOGLE_PRIVATE_KEY` — make sure you copied the entire key including the header/footer lines
- Make sure you shared the spreadsheet with the service account email

### "The caller does not have permission"
**Solution:** You did not share the spreadsheet with the service account.
- In Google Sheets, click Share, add the service account email, set to Editor

### "SPREADSHEET_ID not found" or cells are empty
**Solution:** Check your `.env` file — the SPREADSHEET_ID may have a typo.

### React app shows "Network Error" or blank white screen
**Solution:** The frontend cannot reach the backend server.
- Make sure the server is running (Window 1 in Command Prompt)
- Check that `API_BASE` in `App.jsx` points to the correct URL
- In production: check that `CLIENT_URL` in Render matches your Vercel URL

### Login fails with "Invalid username or password"
**Solution:** The admin user may not have been seeded.
- Check the `users` sheet in Google Sheets — is there a row with username `admin`?
- If not, restart the server — it will seed default data automatically
- Default credentials: `admin` / `admin123`

### "Too many requests" to Google Sheets API
**Solution:** The free tier of Google Sheets API allows 300 read requests per minute. 
- The app batches requests efficiently to stay under limits
- If you hit limits, wait 60 seconds and try again
- For very large schools, consider caching frequently-read data

### Report card prints with extra blank pages
**Solution:** This is a browser print setting.
- In the print dialog, set margins to "None"
- Set paper size to "A4"
- Disable "Print headers and footers"

### Numbers appear as text in Google Sheets
**Solution:** This is cosmetic only and does not affect calculations. 
- The server reads all values as strings and converts them with `parseFloat()` before calculating

---

## 12. QUICK REFERENCE CHEAT SHEET

### Daily Commands (Development)

**Start the server:**
```cmd
cd Desktop\sba-school-app\server
node index.js
```

**Start the React app (new window):**
```cmd
cd Desktop\sba-school-app
npm start
```

**Open the app:** http://localhost:3000  
**Default login:** admin / admin123

### File Locations

| File | Purpose |
|---|---|
| `server/index.js` | All API routes and database logic |
| `server/.env` | Your secret credentials (never share!) |
| `src/App.jsx` | API URL and app routing |
| `src/pages/MarksEntryPage.jsx` | Grade calculations |
| `src/pages/ReportCardsPage.jsx` | A4 report card layout |
| `src/index.css` | All visual styles |

### API Endpoints Summary

| Method | Endpoint | What It Does |
|---|---|---|
| POST | `/api/auth/login` | Login |
| GET | `/api/school` | Get school info |
| PUT | `/api/school` | Update school info |
| GET | `/api/students` | List students |
| POST | `/api/students` | Add student |
| GET | `/api/marks` | Get marks for a class/subject |
| POST | `/api/marks/bulk` | Save marks (with auto-calculation) |
| GET | `/api/report/student` | Get full report card data |
| GET | `/api/dashboard` | Dashboard statistics |

### Google Sheets Tabs Summary

| Sheet Tab | Data Stored |
|---|---|
| school_info | 1 row — school name, term, year |
| mark_labels | 1 row — SBA component names and max scores |
| classes | 1 row per class |
| subjects | 1 row per subject |
| students | 1 row per student |
| teachers | 1 row per teacher |
| marks | 1 row per student×subject×term |
| attendance | 1 row per student×term |
| conduct | 1 row per student×term |
| conduct_options | 1 row per dropdown option |
| users | 1 row per user account |

---

## SUMMARY — THE WHOLE PROCESS IN 10 STEPS

1. Install Node.js and VS Code
2. Create a Google Sheet with 11 tabs and add headers to each
3. Create a Google Cloud project and enable Google Sheets API
4. Create a Service Account, download the JSON key file
5. Share the Google Sheet with the Service Account email
6. Copy the server files, run `npm install`, create `.env` with credentials
7. Test the server locally with `node index.js`
8. Copy the frontend files, run `npm install`
9. Start both server and React app, log in and test everything
10. Deploy server to Render.com and frontend to Vercel.com

---

*SBA School Manager — Online Version · Built for Ghana Education Service · Powered by React + Node.js + Google Sheets*
