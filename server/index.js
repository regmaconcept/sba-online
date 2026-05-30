/**
 * SBA School Manager — Express API Server
 * Backend: Node.js + Express + Google Sheets API v4
 * ------------------------------------------------
 * Each sheet in the Google Spreadsheet acts as a DB table.
 * Sheet names match the constants defined in SHEETS below.
 */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const crypto   = require('crypto');
const { google } = require('googleapis');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://sba-online.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps, Render health checks)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' })); // 5 MB for logo uploads

// ── GOOGLE SHEETS AUTH ────────────────────────────────────────────────────────
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// ── SHEET NAMES (must match your Google Sheet tab names exactly) ───────────────
const SHEETS = {
  SCHOOL:    'school_info',
  LABELS:    'mark_labels',
  CLASSES:   'classes',
  SUBJECTS:  'subjects',
  TEACHERS:  'teachers',
  STUDENTS:  'students',
  MARKS:     'marks',
  ATTENDANCE:'attendance',
  CONDUCT:   'conduct',
  CONDUCT_OPTS: 'conduct_options',
  USERS:     'users',
};

// ── LOW-LEVEL HELPERS ─────────────────────────────────────────────────────────

/** Read all rows from a sheet; row 1 = headers */
async function readSheet(sheets, sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
    return obj;
  });
}

/** Append a new row to a sheet */
async function appendRow(sheets, sheetName, headers, data) {
  const row = headers.map(h => data[h] !== undefined ? String(data[h]) : '');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [row] },
  });
}

/** Update a specific row by its 1-based row index (includes header row so data rows start at 2) */
async function updateRow(sheets, sheetName, rowIndex, headers, data) {
  const row = headers.map(h => data[h] !== undefined ? String(data[h]) : '');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [row] },
  });
}

/** Delete a row by its 1-based row index */
async function deleteRow(sheets, sheetName, rowIndex, sheetId) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // 0-based
            endIndex:   rowIndex,
          },
        },
      }],
    },
  });
}

/** Get the numeric sheetId for a named sheet */
async function getSheetId(sheets, sheetName) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });

  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  return sheet ? sheet.properties.sheetId : null;
}

/** Auto-increment ID helper — finds the max id column value */
function nextId(rows) {
  if (!rows.length) return 1;
  return Math.max(...rows.map(r => parseInt(r.id) || 0)) + 1;
}

function sha256(str) { return crypto.createHash('sha256').update(str).digest('hex'); }

// ── JWT-LITE AUTH ─────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'sba-secret-change-me';

function signToken(payload) {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const body    = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
  const sig     = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch { return null; }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  const payload = verifyToken(auth.slice(7));
  if (!payload) return res.status(401).json({ message: 'Invalid token' });
  req.user = payload;
  next();
}

// ── GRADE HELPERS (match original app exactly) ────────────────────────────────
function getGrade(s) {
  if (s > 79) return 1; if (s >= 70) return 2; if (s >= 65) return 3;
  if (s >= 59) return 4; if (s >= 50) return 5; if (s >= 45) return 6;
  if (s >= 39) return 7; if (s >= 35) return 8; return 9;
}
function getRemark(s) {
  if (s > 79) return 'Excellent';    if (s >= 70) return 'Very Good';
  if (s >= 65) return 'Good';        if (s >= 59) return 'Fairly Good';
  if (s >= 50) return 'Credit';      if (s >= 45) return 'Average';
  if (s >= 39) return 'Pass';        if (s >= 35) return 'Weak';
  return 'Very Weak';
}
function calcMark(s1, s2, s3, s4, exam) {
  const c  = [s1, s2, s3, s4].map(v => parseFloat(v) || 0);
  const ct = c.reduce((a, b) => a + b, 0);
  const cs = ct / 2;
  const ex = parseFloat(exam) || 0;
  const ex50 = ex / 2;
  const ov = parseFloat((cs + ex50).toFixed(2));
  return { classTotal: +ct.toFixed(2), cs50: +cs.toFixed(2), ex: +ex.toFixed(2),
           ex50: +ex50.toFixed(2), overall: ov, grade: getGrade(ov), remark: getRemark(ov) };
}

// ── SEED DEFAULT DATA (run once on startup if sheets are empty) ───────────────
async function seedDefaultData(sheets) {
  // Default school info row
  const schoolRows = await readSheet(sheets, SHEETS.SCHOOL);
  if (!schoolRows.length) {
    await appendRow(sheets, SHEETS.SCHOOL,
      ['id','school_name','address','district','academic_year','current_term','number_on_roll','total_attendance','date_vacated','reopening_date','head_teacher','logo_base64'],
      { id:1, school_name:'NUNGUA METHODIST 2 PRIMARY SCHOOL', address:'P.O. BOX 147, NUNGUA',
        district:'KROWOR', academic_year: new Date().getFullYear().toString(),
        current_term:'ONE', number_on_roll:0, total_attendance:52,
        date_vacated:'', reopening_date:'', head_teacher:'', logo_base64:'' });
  }

  // Default mark labels
  const labelsRows = await readSheet(sheets, SHEETS.LABELS);
  if (!labelsRows.length) {
    await appendRow(sheets, SHEETS.LABELS,
      ['id','test1_label','test1_max','group_work_label','group_work_max','test2_label','test2_max','project_label','project_max'],
      { id:1, test1_label:'TEST 1', test1_max:30, group_work_label:'GROUP WORK', group_work_max:20,
        test2_label:'TEST 2', test2_max:30, project_label:'PROJECT', project_max:20 });
  }

  // Default admin user
  const users = await readSheet(sheets, SHEETS.USERS);
  if (!users.find(u => u.username === 'admin')) {
    await appendRow(sheets, SHEETS.USERS,
      ['id','username','password_hash','full_name','role','is_active'],
      { id:1, username:'admin', password_hash: sha256('admin123'),
        full_name:'System Administrator', role:'Admin', is_active:1 });
  }

  // Default classes
  const classes = await readSheet(sheets, SHEETS.CLASSES);
  if (!classes.length) {
    const defaultClasses = ['Basic 1','Basic 2','Basic 3','Basic 4','Basic 5','Basic 6'];
    for (let i = 0; i < defaultClasses.length; i++) {
      await appendRow(sheets, SHEETS.CLASSES, ['id','class_name','class_level'],
        { id: i+1, class_name: defaultClasses[i], class_level: i+1 });
    }
  }

  // Default subjects
  const subjects = await readSheet(sheets, SHEETS.SUBJECTS);
  if (!subjects.length) {
    const defaultSubjects = [
      ['ENGLISH LANGUAGE','ENG',1], ['MATHEMATICS','MATH',2], ['SCIENCE','SCI',3],
      ['HISTORY','HIST',4], ['RELIGIOUS & MORAL EDUCATION','RME',5],
      ['OUR WORLD OUR PEOPLE','OWOP',6], ['CREATIVE ART','CAD',7],
      ['COMPUTING','COMP',8], ['GHANAIAN LANGUAGE','GHA LANG',9], ['FRENCH','FRE',10],
    ];
    for (let i = 0; i < defaultSubjects.length; i++) {
      const [name, code, order] = defaultSubjects[i];
      await appendRow(sheets, SHEETS.SUBJECTS, ['id','subject_name','subject_code','display_order'],
        { id: i+1, subject_name: name, subject_code: code, display_order: order });
    }
  }

  // Default conduct options
  const conductOpts = await readSheet(sheets, SHEETS.CONDUCT_OPTS);
  if (!conductOpts.length) {
    const opts = [
      ['conduct','Excellent',1],['conduct','Very Good',2],['conduct','Good',3],
      ['conduct','Fairly Good',4],['conduct','Average',5],['conduct','Poor',6],
      ['conduct','Not serious in Class',7],
      ['attitude','Hardworking',1],['attitude','Attentive',2],['attitude','Participative',3],
      ['attitude','Average',4],['attitude','Lazy',5],['attitude','Disruptive',6],
      ['attitude','Needs Improvement',7],
      ['interest','Academics',1],['interest','Reading',2],['interest','Sports',3],
      ['interest','Games',4],['interest','Arts',5],['interest','Music',6],
      ['interest','Science',7],['interest','Computing',8],['interest','All Subjects',9],
      ['remarks','Keep it up',1],['remarks','Needs to work harder',2],
      ['remarks','Can do better',3],['remarks','Shows great improvement',4],
      ['remarks','Need help to understand instructions',5],
      ['remarks','Excellent performance',6],['remarks','Needs more attention',7],
      ['remarks','Good effort this term',8],['remarks','Shows potential but needs focus',9],
      ['remarks','Outstanding student',10],
    ];
    for (let i = 0; i < opts.length; i++) {
      const [cat, val, ord] = opts[i];
      await appendRow(sheets, SHEETS.CONDUCT_OPTS,
        ['id','category','value','display_order'],
        { id: i+1, category: cat, value: val, display_order: ord });
    }
  }

  console.log('[SBA] Seed check complete.');
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// AUTH
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const sheets = await getSheets();
    const users  = await readSheet(sheets, SHEETS.USERS);
    const hash   = sha256(password);
    const user   = users.find(u => u.username === username && u.password_hash === hash && u.is_active !== '0');
    if (!user) return res.status(401).json({ message: 'Invalid username or password' });
    const { password_hash, ...safeUser } = user;
    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.json({ user: safeUser, token });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPwd, newPwd } = req.body;
    const sheets = await getSheets();
    const users  = await readSheet(sheets, SHEETS.USERS);
    const idx    = users.findIndex(u => u.id === req.user.id && u.password_hash === sha256(oldPwd));
    if (idx < 0) return res.status(400).json({ message: 'Current password is incorrect' });
    users[idx].password_hash = sha256(newPwd);
    const headers = ['id','username','password_hash','full_name','role','is_active'];
    await updateRow(sheets, SHEETS.USERS, idx + 2, headers, users[idx]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// SCHOOL INFO
app.get('/api/school', authMiddleware, async (req, res) => {
  try {
    const sheets = await getSheets();
    const rows   = await readSheet(sheets, SHEETS.SCHOOL);
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/school', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.SCHOOL);
    const headers = ['id','school_name','address','district','academic_year','current_term','number_on_roll','total_attendance','date_vacated','reopening_date','head_teacher','logo_base64'];
    const existing = rows[0] || {};
    const updated  = { ...existing, ...req.body, id: 1, logo_base64: existing.logo_base64 || '' };
    if (rows.length) await updateRow(sheets, SHEETS.SCHOOL, 2, headers, updated);
    else await appendRow(sheets, SHEETS.SCHOOL, headers, updated);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/school/logo', authMiddleware, async (req, res) => {
  try {
    const { base64 } = req.body;
    if (!base64?.startsWith('data:image/')) return res.status(400).json({ message: 'Invalid image' });
    if (base64.length > 2 * 1024 * 1024 * 1.37) return res.status(400).json({ message: 'Image too large (max 2MB)' });
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.SCHOOL);
    const headers = ['id','school_name','address','district','academic_year','current_term','number_on_roll','total_attendance','date_vacated','reopening_date','head_teacher','logo_base64'];
    const existing = rows[0] || {};
    await updateRow(sheets, SHEETS.SCHOOL, 2, headers, { ...existing, logo_base64: base64 });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// MARK LABELS
app.get('/api/marklabels', authMiddleware, async (req, res) => {
  try {
    const sheets = await getSheets();
    const rows   = await readSheet(sheets, SHEETS.LABELS);
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/marklabels', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.LABELS);
    const headers = ['id','test1_label','test1_max','group_work_label','group_work_max','test2_label','test2_max','project_label','project_max'];
    const data    = { id: 1, ...req.body };
    if (rows.length) await updateRow(sheets, SHEETS.LABELS, 2, headers, data);
    else await appendRow(sheets, SHEETS.LABELS, headers, data);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// CLASSES
app.get('/api/classes', authMiddleware, async (req, res) => {
  try {
    const sheets = await getSheets();
    const rows   = await readSheet(sheets, SHEETS.CLASSES);
    res.json(rows.sort((a, b) => parseInt(a.class_level) - parseInt(b.class_level)));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/classes', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.CLASSES);
    const id      = nextId(rows);
    const headers = ['id','class_name','class_level'];
    await appendRow(sheets, SHEETS.CLASSES, headers, { id, ...req.body });
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/classes/:id', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.CLASSES);
    const idx     = rows.findIndex(r => String(r.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: 'Not found' });
    const headers = ['id','class_name','class_level'];
    await updateRow(sheets, SHEETS.CLASSES, idx + 2, headers, { ...rows[idx], ...req.body });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/classes/:id', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.CLASSES);
    const idx     = rows.findIndex(r => String(r.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: 'Not found' });
    const sheetId = await getSheetId(sheets, SHEETS.CLASSES);
    await deleteRow(sheets, SHEETS.CLASSES, idx + 2, sheetId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// SUBJECTS
app.get('/api/subjects', authMiddleware, async (req, res) => {
  try {
    const sheets = await getSheets();
    const rows   = await readSheet(sheets, SHEETS.SUBJECTS);
    res.json(rows.sort((a, b) => parseInt(a.display_order) - parseInt(b.display_order)));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/subjects', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.SUBJECTS);
    const id      = nextId(rows);
    const order   = rows.length ? Math.max(...rows.map(r => parseInt(r.display_order) || 0)) + 1 : 1;
    const headers = ['id','subject_name','subject_code','display_order'];
    await appendRow(sheets, SHEETS.SUBJECTS, headers, { id, display_order: order, ...req.body });
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/subjects/:id', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.SUBJECTS);
    const idx     = rows.findIndex(r => String(r.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: 'Not found' });
    const headers = ['id','subject_name','subject_code','display_order'];
    await updateRow(sheets, SHEETS.SUBJECTS, idx + 2, headers, { ...rows[idx], ...req.body });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/subjects/:id', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    // Delete associated marks first
    const marks   = await readSheet(sheets, SHEETS.MARKS);
    const toDelete = marks.map((r, i) => String(r.subject_id) === String(req.params.id) ? i : -1).filter(i => i >= 0).reverse();
    const markSheetId = await getSheetId(sheets, SHEETS.MARKS);
    for (const i of toDelete) await deleteRow(sheets, SHEETS.MARKS, i + 2, markSheetId);
    // Delete subject
    const subjects = await readSheet(sheets, SHEETS.SUBJECTS);
    const idx      = subjects.findIndex(r => String(r.id) === String(req.params.id));
    if (idx >= 0) {
      const subSheetId = await getSheetId(sheets, SHEETS.SUBJECTS);
      await deleteRow(sheets, SHEETS.SUBJECTS, idx + 2, subSheetId);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// TEACHERS
app.get('/api/teachers', authMiddleware, async (req, res) => {
  try {
    const sheets   = await getSheets();
    const teachers = await readSheet(sheets, SHEETS.TEACHERS);
    const subjects = await readSheet(sheets, SHEETS.SUBJECTS);
    const classes  = await readSheet(sheets, SHEETS.CLASSES);
    const subMap   = Object.fromEntries(subjects.map(s => [s.id, s.subject_name]));
    const clsMap   = Object.fromEntries(classes.map(c => [c.id, c.class_name]));
    res.json(teachers.map(t => ({
      ...t,
      subject_name: subMap[t.subject_id] || '',
      class_name:   clsMap[t.class_id]   || '',
    })).sort((a, b) => a.name.localeCompare(b.name)));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/teachers', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.TEACHERS);
    const id      = nextId(rows);
    const headers = ['id','name','subject_id','class_id','phone','status'];
    await appendRow(sheets, SHEETS.TEACHERS, headers, { id, status: 'Active', ...req.body });
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/teachers/:id', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.TEACHERS);
    const idx     = rows.findIndex(r => String(r.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: 'Not found' });
    const headers = ['id','name','subject_id','class_id','phone','status'];
    await updateRow(sheets, SHEETS.TEACHERS, idx + 2, headers, { ...rows[idx], ...req.body });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/teachers/:id', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.TEACHERS);
    const idx     = rows.findIndex(r => String(r.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: 'Not found' });
    const sheetId = await getSheetId(sheets, SHEETS.TEACHERS);
    await deleteRow(sheets, SHEETS.TEACHERS, idx + 2, sheetId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// STUDENTS
app.get('/api/students', authMiddleware, async (req, res) => {
  try {
    const { class_id, year, gender } = req.query;
    const sheets   = await getSheets();
    const students = await readSheet(sheets, SHEETS.STUDENTS);
    const classes  = await readSheet(sheets, SHEETS.CLASSES);
    const clsMap   = Object.fromEntries(classes.map(c => [c.id, { name: c.class_name, level: parseInt(c.class_level) }]));
    let filtered   = students.filter(s => s.status !== 'Inactive');
    if (class_id) filtered = filtered.filter(s => String(s.class_id) === String(class_id));
    if (year)     filtered = filtered.filter(s => s.academic_year === year);
    if (gender)   filtered = filtered.filter(s => s.gender === gender);
    res.json(filtered.map(s => ({
      ...s,
      class_name: clsMap[s.class_id]?.name || '',
    })).sort((a, b) => {
      const la = clsMap[a.class_id]?.level || 0, lb = clsMap[b.class_id]?.level || 0;
      if (la !== lb) return la - lb;
      if (a.gender !== b.gender) return b.gender.localeCompare(a.gender); // Girls before Boys (DESC)
      return a.name.localeCompare(b.name);
    }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/students', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.STUDENTS);
    const id      = nextId(rows);
    const headers = ['id','student_no','name','gender','class_id','academic_year','status'];
    const sno     = 'STU' + Date.now().toString().slice(-6);
    await appendRow(sheets, SHEETS.STUDENTS, headers, { id, student_no: sno, status: 'Active', ...req.body });
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/students/:id', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.STUDENTS);
    const idx     = rows.findIndex(r => String(r.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: 'Not found' });
    const headers = ['id','student_no','name','gender','class_id','academic_year','status'];
    await updateRow(sheets, SHEETS.STUDENTS, idx + 2, headers, { ...rows[idx], ...req.body });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/students/:id', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.STUDENTS);
    const idx     = rows.findIndex(r => String(r.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: 'Not found' });
    const headers = ['id','student_no','name','gender','class_id','academic_year','status'];
    await updateRow(sheets, SHEETS.STUDENTS, idx + 2, headers, { ...rows[idx], status: 'Inactive' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// MARKS
app.get('/api/marks', authMiddleware, async (req, res) => {
  try {
    const { subject_id, class_id, year, term } = req.query;
    const sheets   = await getSheets();
    const marks    = await readSheet(sheets, SHEETS.MARKS);
    const students = await readSheet(sheets, SHEETS.STUDENTS);
    const stuMap   = Object.fromEntries(students.map(s => [s.id, s]));
    const filtered = marks.filter(m =>
      String(m.subject_id) === String(subject_id) &&
      m.academic_year === year && m.term === term &&
      stuMap[m.student_id]?.class_id === class_id &&
      stuMap[m.student_id]?.status !== 'Inactive'
    );
    res.json(filtered.map(m => ({
      ...m,
      name:   stuMap[m.student_id]?.name   || '',
      gender: stuMap[m.student_id]?.gender || '',
    })));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/marks/bulk', authMiddleware, async (req, res) => {
  try {
    const { rows, subject_id, year, term } = req.body;
    const sheets  = await getSheets();
    const marks   = await readSheet(sheets, SHEETS.MARKS);
    const headers = ['id','student_id','subject_id','academic_year','term','sba1','sba2','sba3','sba4',
                     'class_total','class_score_50','exam_score','exam_score_50','overall_total','grade','remark','position'];

    for (const r of rows) {
      const c   = calcMark(r.sba1, r.sba2, r.sba3, r.sba4, r.exam_score);
      const idx = marks.findIndex(m =>
        String(m.student_id) === String(r.student_id) &&
        String(m.subject_id) === String(subject_id) &&
        m.academic_year === year && m.term === term
      );
      const data = {
        student_id: r.student_id, subject_id, academic_year: year, term,
        sba1: r.sba1 || '', sba2: r.sba2 || '', sba3: r.sba3 || '', sba4: r.sba4 || '',
        class_total: c.classTotal, class_score_50: c.cs50,
        exam_score: c.ex, exam_score_50: c.ex50,
        overall_total: c.overall, grade: c.grade, remark: c.remark, position: 0,
      };
      if (idx >= 0) {
        marks[idx] = { ...marks[idx], ...data };
        await updateRow(sheets, SHEETS.MARKS, idx + 2, headers, marks[idx]);
      } else {
        const id = nextId(marks);
        const newRow = { id, ...data };
        marks.push(newRow);
        await appendRow(sheets, SHEETS.MARKS, headers, newRow);
      }
    }

    // Recalculate positions for this subject/year/term
    const freshMarks = await readSheet(sheets, SHEETS.MARKS);
    const relevant   = freshMarks
      .map((m, i) => ({ ...m, _i: i }))
      .filter(m => String(m.subject_id) === String(subject_id) && m.academic_year === year && m.term === term)
      .sort((a, b) => parseFloat(b.overall_total) - parseFloat(a.overall_total));
    for (let pos = 0; pos < relevant.length; pos++) {
      const m = relevant[pos];
      await updateRow(sheets, SHEETS.MARKS, m._i + 2, headers, { ...m, position: pos + 1 });
    }

    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// RAW SCORES
app.get('/api/rawscores', authMiddleware, async (req, res) => {
  try {
    const { class_id, year, term } = req.query;
    const sheets   = await getSheets();
    const students = await readSheet(sheets, SHEETS.STUDENTS);
    const subjects = await readSheet(sheets, SHEETS.SUBJECTS);
    const marks    = await readSheet(sheets, SHEETS.MARKS);

    const classStudents = students
      .filter(s => String(s.class_id) === String(class_id) && s.academic_year === year && s.status !== 'Inactive')
      .sort((a, b) => {
        if (a.gender !== b.gender) return b.gender.localeCompare(a.gender);
        return a.name.localeCompare(b.name);
      });

    const markMap = {};
    marks.filter(m => m.academic_year === year && m.term === term)
      .forEach(m => {
        if (!markMap[m.student_id]) markMap[m.student_id] = {};
        markMap[m.student_id][m.subject_id] = parseFloat(m.overall_total) || 0;
      });

    const sortedSubjects = subjects.sort((a, b) => parseInt(a.display_order) - parseInt(b.display_order));
    const result = classStudents.map(s => {
      const scores = sortedSubjects.map(sub => markMap[s.id]?.[sub.id] ?? null);
      return { ...s, scores, total: scores.reduce((a, v) => a + (v || 0), 0) };
    });

    const posMap = {};
    [...result].sort((a, b) => b.total - a.total).forEach((s, i) => { posMap[s.id] = i + 1; });
    res.json({ students: result.map(s => ({ ...s, position: posMap[s.id] })), subjects: sortedSubjects });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ATTENDANCE
app.get('/api/attendance', authMiddleware, async (req, res) => {
  try {
    const { class_id, year, term } = req.query;
    const sheets   = await getSheets();
    const att      = await readSheet(sheets, SHEETS.ATTENDANCE);
    const students = await readSheet(sheets, SHEETS.STUDENTS);
    const stuMap   = Object.fromEntries(students.map(s => [s.id, s]));
    res.json(att
      .filter(a => a.academic_year === year && a.term === term &&
        stuMap[a.student_id]?.class_id === class_id && stuMap[a.student_id]?.status !== 'Inactive')
      .map(a => ({ ...a, name: stuMap[a.student_id]?.name || '', gender: stuMap[a.student_id]?.gender || '' })));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/attendance/bulk', authMiddleware, async (req, res) => {
  try {
    const { rows, year, term, total_days } = req.body;
    const sheets  = await getSheets();
    const att     = await readSheet(sheets, SHEETS.ATTENDANCE);
    const headers = ['id','student_id','academic_year','term','days_present','total_days'];
    for (const r of rows) {
      const idx = att.findIndex(a => String(a.student_id) === String(r.student_id) && a.academic_year === year && a.term === term);
      const data = { student_id: r.student_id, academic_year: year, term, days_present: r.days_present || 0, total_days: total_days || 0 };
      if (idx >= 0) {
        att[idx] = { ...att[idx], ...data };
        await updateRow(sheets, SHEETS.ATTENDANCE, idx + 2, headers, att[idx]);
      } else {
        const id = nextId(att);
        att.push({ id, ...data });
        await appendRow(sheets, SHEETS.ATTENDANCE, headers, { id, ...data });
      }
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// CONDUCT
app.get('/api/conduct', authMiddleware, async (req, res) => {
  try {
    const { class_id, year, term } = req.query;
    const sheets   = await getSheets();
    const conduct  = await readSheet(sheets, SHEETS.CONDUCT);
    const students = await readSheet(sheets, SHEETS.STUDENTS);
    const stuMap   = Object.fromEntries(students.map(s => [s.id, s]));
    res.json(conduct
      .filter(c => c.academic_year === year && c.term === term &&
        stuMap[c.student_id]?.class_id === class_id && stuMap[c.student_id]?.status !== 'Inactive')
      .map(c => ({ ...c, name: stuMap[c.student_id]?.name || '', gender: stuMap[c.student_id]?.gender || '' })));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/conduct/bulk', authMiddleware, async (req, res) => {
  try {
    const { rows, year, term } = req.body;
    const sheets  = await getSheets();
    const conduct = await readSheet(sheets, SHEETS.CONDUCT);
    const headers = ['id','student_id','academic_year','term','conduct','attitude','interest','remarks','promoted_to','class_teacher_remark'];
    for (const r of rows) {
      const idx  = conduct.findIndex(c => String(c.student_id) === String(r.student_id) && c.academic_year === year && c.term === term);
      const data = { student_id: r.student_id, academic_year: year, term,
        conduct: r.conduct || '', attitude: r.attitude || '', interest: r.interest || '',
        remarks: r.remarks || '', promoted_to: r.promoted_to || '', class_teacher_remark: r.class_teacher_remark || '' };
      if (idx >= 0) {
        conduct[idx] = { ...conduct[idx], ...data };
        await updateRow(sheets, SHEETS.CONDUCT, idx + 2, headers, conduct[idx]);
      } else {
        const id = nextId(conduct);
        conduct.push({ id, ...data });
        await appendRow(sheets, SHEETS.CONDUCT, headers, { id, ...data });
      }
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// CONDUCT OPTIONS
app.get('/api/conduct-options', authMiddleware, async (req, res) => {
  try {
    const sheets = await getSheets();
    const rows   = await readSheet(sheets, SHEETS.CONDUCT_OPTS);
    res.json(rows.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return parseInt(a.display_order) - parseInt(b.display_order);
    }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/conduct-options', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.CONDUCT_OPTS);
    const id      = nextId(rows);
    const headers = ['id','category','value','display_order'];
    await appendRow(sheets, SHEETS.CONDUCT_OPTS, headers, { id, ...req.body });
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/conduct-options/:id', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.CONDUCT_OPTS);
    const idx     = rows.findIndex(r => String(r.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: 'Not found' });
    const headers = ['id','category','value','display_order'];
    await updateRow(sheets, SHEETS.CONDUCT_OPTS, idx + 2, headers, { ...rows[idx], ...req.body });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/conduct-options/:id', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.CONDUCT_OPTS);
    const idx     = rows.findIndex(r => String(r.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: 'Not found' });
    const sheetId = await getSheetId(sheets, SHEETS.CONDUCT_OPTS);
    await deleteRow(sheets, SHEETS.CONDUCT_OPTS, idx + 2, sheetId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// USERS
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const sheets = await getSheets();
    const rows   = await readSheet(sheets, SHEETS.USERS);
    res.json(rows.map(({ password_hash, ...u }) => u).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/users', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.USERS);
    if (rows.find(u => u.username === req.body.username)) return res.status(400).json({ message: 'Username already exists' });
    const id      = nextId(rows);
    const headers = ['id','username','password_hash','full_name','role','is_active'];
    await appendRow(sheets, SHEETS.USERS, headers, {
      id, ...req.body,
      password_hash: sha256(req.body.password || 'password123'),
      is_active: 1,
    });
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.USERS);
    const idx     = rows.findIndex(r => String(r.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: 'Not found' });
    const headers = ['id','username','password_hash','full_name','role','is_active'];
    await updateRow(sheets, SHEETS.USERS, idx + 2, headers, { ...rows[idx], ...req.body });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/users/:id/reset-password', authMiddleware, async (req, res) => {
  try {
    const sheets  = await getSheets();
    const rows    = await readSheet(sheets, SHEETS.USERS);
    const idx     = rows.findIndex(r => String(r.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: 'Not found' });
    const headers = ['id','username','password_hash','full_name','role','is_active'];
    await updateRow(sheets, SHEETS.USERS, idx + 2, headers, { ...rows[idx], password_hash: sha256(req.body.newPwd) });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DASHBOARD
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const { year, term } = req.query;
    const sheets   = await getSheets();
    const [school, students, teachers, classes, subjects, marks] = await Promise.all([
      readSheet(sheets, SHEETS.SCHOOL),
      readSheet(sheets, SHEETS.STUDENTS),
      readSheet(sheets, SHEETS.TEACHERS),
      readSheet(sheets, SHEETS.CLASSES),
      readSheet(sheets, SHEETS.SUBJECTS),
      readSheet(sheets, SHEETS.MARKS),
    ]);
    const active     = students.filter(s => s.academic_year === year && s.status !== 'Inactive');
    const boys       = active.filter(s => s.gender === 'Boy').length;
    const girls      = active.filter(s => s.gender === 'Girl').length;
    const activeTeachers = teachers.filter(t => t.status !== 'Inactive').length;
    const clsMap     = Object.fromEntries(classes.map(c => [c.id, c]));
    const byClass    = classes.sort((a, b) => parseInt(a.class_level) - parseInt(b.class_level)).map(c => ({
      class_name: c.class_name,
      count: active.filter(s => String(s.class_id) === String(c.id)).length,
    }));
    // Subject averages
    const termMarks  = marks.filter(m => m.academic_year === year && m.term === term);
    const subjectAvgs = subjects.sort((a, b) => parseInt(a.display_order) - parseInt(b.display_order)).map(sub => {
      const subMarks = termMarks.filter(m => String(m.subject_id) === String(sub.id));
      const avg = subMarks.length ? subMarks.reduce((a, m) => a + (parseFloat(m.overall_total) || 0), 0) / subMarks.length : 0;
      return { subject_name: sub.subject_name, subject_code: sub.subject_code, avg_score: +avg.toFixed(2) };
    });
    res.json({ info: school[0], totalStudents: active.length, boys, girls, totalTeachers: activeTeachers, byClass, subjectAvgs });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// REPORT — single student
app.get('/api/report/student', authMiddleware, async (req, res) => {
  try {
    const { student_id, year, term } = req.query;
    const sheets  = await getSheets();
    const [school, students, classes, subjects, marks, att, conduct] = await Promise.all([
      readSheet(sheets, SHEETS.SCHOOL),
      readSheet(sheets, SHEETS.STUDENTS),
      readSheet(sheets, SHEETS.CLASSES),
      readSheet(sheets, SHEETS.SUBJECTS),
      readSheet(sheets, SHEETS.MARKS),
      readSheet(sheets, SHEETS.ATTENDANCE),
      readSheet(sheets, SHEETS.CONDUCT),
    ]);
    const student  = students.find(s => String(s.id) === String(student_id));
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const cls      = classes.find(c => String(c.id) === String(student.class_id));
    const stuMarks = marks.filter(m => String(m.student_id) === String(student_id) && m.academic_year === year && m.term === term);
    const marksMap = Object.fromEntries(stuMarks.map(m => [m.subject_id, m]));
    const allSubjects = subjects.sort((a, b) => parseInt(a.display_order) - parseInt(b.display_order));
    const marksOut = allSubjects.map(sub => ({
      ...(marksMap[sub.id] || { class_score_50: null, exam_score_50: null, overall_total: null, grade: null, remark: null, position: null }),
      subject_id: sub.id, subject_name: sub.subject_name,
    }));

    // Overall position in class
    const classStudents = students.filter(s => String(s.class_id) === String(student.class_id) && s.academic_year === year && s.status !== 'Inactive');
    const classMarks    = marks.filter(m => m.academic_year === year && m.term === term);
    const totals        = classStudents.map(s => ({
      id: s.id,
      total: classMarks.filter(m => String(m.student_id) === String(s.id)).reduce((a, m) => a + (parseFloat(m.overall_total) || 0), 0),
    })).sort((a, b) => b.total - a.total);
    const posIdx = totals.findIndex(t => String(t.id) === String(student_id));

    const entered = marksOut.filter(m => m.overall_total != null);
    res.json({
      info:     school[0] || {},
      student:  { ...student, class_name: cls?.class_name || '' },
      marks:    marksOut,
      attendance: att.find(a => String(a.student_id) === String(student_id) && a.academic_year === year && a.term === term) || null,
      conduct:    conduct.find(c => String(c.student_id) === String(student_id) && c.academic_year === year && c.term === term) || null,
      overallPosition: posIdx >= 0 ? posIdx + 1 : null,
      totalScore:  entered.reduce((a, m) => a + (parseFloat(m.overall_total) || 0), 0),
      aggregate:   entered.reduce((a, m) => a + (parseInt(m.grade) || 9), 0),
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// REPORT — all students in class
app.get('/api/report/class', authMiddleware, async (req, res) => {
  try {
    const { class_id, year } = req.query;
    const sheets   = await getSheets();
    const students = await readSheet(sheets, SHEETS.STUDENTS);
    const classes  = await readSheet(sheets, SHEETS.CLASSES);
    const cls      = classes.find(c => String(c.id) === String(class_id));
    res.json(students
      .filter(s => String(s.class_id) === String(class_id) && s.academic_year === year && s.status !== 'Inactive')
      .map(s => ({ ...s, class_name: cls?.class_name || '' }))
      .sort((a, b) => {
        if (a.gender !== b.gender) return b.gender.localeCompare(a.gender);
        return a.name.localeCompare(b.name);
      }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── START ──────────────────────────────────────────────────────────────────────
async function start() {
  try {
    const sheets = await getSheets();
    await seedDefaultData(sheets);
    app.listen(PORT, () => console.log(`[SBA] Server running on http://localhost:${PORT}`));
  } catch (e) {
    console.error('[SBA] Failed to start:', e.message);
    process.exit(1);
  }
}

start();
