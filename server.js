/**
 * Peer Study Group Finder — Express.js backend
 *
 * Endpoints:
 *   GET  /api/subjects                       -> list of study subjects
 *   GET  /api/groups?subject=..&q=..         -> list groups (filtered/searchable)
 *   GET  /api/groups/:id                     -> single group with members
 *   POST /api/groups                         -> create a study group
 *   POST /api/groups/:id/join                -> join a group (by member name/email)
 *   POST /api/groups/:id/leave               -> leave a group
 *   GET  /api/students?subject=..&q=..       -> list registered students
 *   POST /api/students                       -> register as a student
 *   GET  /api/stats                          -> dashboard statistics
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------------------------------------------------------ */
/*  Data layer                                                         */
/* ------------------------------------------------------------------ */

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'study-groups.json');

// Vercel (serverless) has a read-only filesystem except /tmp, which is
// ephemeral — persistence there is best-effort within a warm instance.
const PERSIST_DIR = process.env.VERCEL ? '/tmp' : DATA_DIR;
const PERSIST_FILE = path.join(PERSIST_DIR, 'study-groups.json');

let groups = [];
let students = [];

function loadData() {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf8'));
      groups = parsed.groups || [];
      students = parsed.students || [];
    }
  } catch (err) {
    console.error('Could not load data:', err.message);
    groups = [];
    students = [];
  }
}

function saveData() {
  try {
    if (!fs.existsSync(PERSIST_DIR)) fs.mkdirSync(PERSIST_DIR, { recursive: true });
    fs.writeFileSync(PERSIST_FILE, JSON.stringify({ groups, students }, null, 2));
  } catch (err) {
    // Serverless environments (e.g. Vercel) may block writes — keep data in memory.
    console.error('Could not save data (running in-memory):', err.message);
  }
}

loadData();

/* ------------------------------------------------------------------ */
/*  Static catalogue                                                   */
/* ------------------------------------------------------------------ */

const SUBJECTS = [
  { id: 'mathematics',    name: 'Mathematics',    icon: '∑' },
  { id: 'computer-science', name: 'Computer Science', icon: '⌘' },
  { id: 'physics',        name: 'Physics',        icon: '⚛' },
  { id: 'chemistry',      name: 'Chemistry',      icon: '⚗' },
  { id: 'biology',        name: 'Biology',        icon: '🧬' },
  { id: 'english',        name: 'English',        icon: '✒' },
  { id: 'economics',      name: 'Economics',      icon: '📈' },
  { id: 'history',        name: 'History',        icon: '🏛' },
  { id: 'psychology',     name: 'Psychology',     icon: '🧠' },
  { id: 'languages',      name: 'Languages',      icon: '🗣' },
];

const subjectName = (id) => SUBJECTS.find((s) => s.id === id)?.name || id;
const subjectIcon = (id) => SUBJECTS.find((s) => s.id === id)?.icon || '📚';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function nextGroupId() {
  return groups.reduce((m, g) => Math.max(m, g.id), 0) + 1;
}
function nextStudentId() {
  return students.reduce((m, s) => Math.max(m, s.id), 0) + 1;
}
function nextMemberId(group) {
  return group.members.reduce((m, x) => Math.max(m, x.id), 0) + 1;
}
function makeRef() {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  let ref;
  do {
    ref = `SGF-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (groups.some((g) => g.refNumber === ref));
  return ref;
}
const emailOk = (e) => /^\S+@\S+\.\S+$/.test(String(e || ''));

/* ------------------------------------------------------------------ */
/*  Routes                                                             */
/* ------------------------------------------------------------------ */

app.get('/api/subjects', (_req, res) => res.json(SUBJECTS));

app.get('/api/groups', (req, res) => {
  let result = [...groups].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const { subject, q } = req.query;
  if (subject) result = result.filter((g) => g.subject === subject);
  if (q) {
    const needle = String(q).toLowerCase();
    result = result.filter(
      (g) =>
        g.groupName.toLowerCase().includes(needle) ||
        g.subjectName.toLowerCase().includes(needle) ||
        (g.description || '').toLowerCase().includes(needle) ||
        (g.location || '').toLowerCase().includes(needle)
    );
  }
  // Strip member emails in list views for privacy; expose counts only.
  const list = result.map((g) => ({ ...g, members: undefined, memberCount: g.members.length }));
  res.json(list);
});

app.get('/api/groups/:id', (req, res) => {
  const group = groups.find((g) => g.id === Number(req.params.id));
  if (!group) return res.status(404).json({ error: 'Study group not found' });
  res.json(group);
});

app.post('/api/groups', (req, res) => {
  const b = req.body || {};
  const required = ['groupName', 'subject'];
  for (const field of required) {
    if (b[field] === undefined || b[field] === null || String(b[field]).trim() === '') {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }
  const subject = SUBJECTS.find((s) => s.id === b.subject);
  if (!subject) return res.status(400).json({ error: 'Unknown subject' });

  const maxMembers = b.maxMembers !== undefined && b.maxMembers !== null && Number.isFinite(Number(b.maxMembers))
    ? Math.min(50, Math.max(2, Math.round(Number(b.maxMembers))))
    : 10;

  const creator = {
    id: 1,
    name: String(b.creatorName || '').trim() || 'Group Creator',
    email: String(b.creatorEmail || '').trim(),
    role: 'Lead',
    joinedAt: new Date().toISOString(),
  };

  const group = {
    id: nextGroupId(),
    refNumber: makeRef(),
    groupName: String(b.groupName).trim(),
    subject: subject.id,
    subjectName: subject.name,
    subjectIcon: subject.icon,
    description: String(b.description || '').trim(),
    schedule: String(b.schedule || '').trim(),
    location: String(b.location || '').trim() || 'Online',
    maxMembers,
    members: [creator],
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };

  groups.push(group);
  saveData();
  res.status(201).json(group);
});

app.post('/api/groups/:id/join', (req, res) => {
  const group = groups.find((g) => g.id === Number(req.params.id));
  if (!group) return res.status(404).json({ error: 'Study group not found' });

  const b = req.body || {};
  if (!String(b.name || '').trim()) return res.status(400).json({ error: 'Your name is required' });
  if (!emailOk(b.email)) return res.status(400).json({ error: 'A valid email is required' });

  const name = String(b.name).trim();
  const email = String(b.email).trim().toLowerCase();

  if (group.members.some((m) => m.email === email)) {
    return res.status(409).json({ error: 'You are already a member of this group' });
  }
  if (group.members.length >= group.maxMembers) {
    return res.status(409).json({ error: 'This group is full' });
  }

  const member = {
    id: nextMemberId(group),
    name,
    email,
    role: 'Member',
    joinedAt: new Date().toISOString(),
  };
  group.members.push(member);
  if (group.members.length >= group.maxMembers) group.status = 'FULL';
  saveData();
  res.status(201).json({ ok: true, group: { id: group.id, refNumber: group.refNumber, memberCount: group.members.length, status: group.status } });
});

app.post('/api/groups/:id/leave', (req, res) => {
  const group = groups.find((g) => g.id === Number(req.params.id));
  if (!group) return res.status(404).json({ error: 'Study group not found' });

  const b = req.body || {};
  const email = String(b.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const idx = group.members.findIndex((m) => m.email === email);
  if (idx === -1) return res.status(404).json({ error: 'You are not a member of this group' });
  if (group.members[idx].role === 'Lead') {
    return res.status(400).json({ error: 'The group lead cannot leave — delete the group instead' });
  }

  group.members.splice(idx, 1);
  group.status = 'OPEN';
  saveData();
  res.json({ ok: true, group: { id: group.id, memberCount: group.members.length, status: group.status } });
});

app.get('/api/students', (req, res) => {
  let result = [...students].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const { subject, q } = req.query;
  if (subject) result = result.filter((s) => s.subject === subject);
  if (q) {
    const needle = String(q).toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.subjectName.toLowerCase().includes(needle) ||
        (s.description || '').toLowerCase().includes(needle)
    );
  }
  res.json(result.map((s) => ({ ...s, email: undefined })));
});

app.post('/api/students', (req, res) => {
  const b = req.body || {};
  if (!String(b.name || '').trim()) return res.status(400).json({ error: 'Name is required' });
  if (!emailOk(b.email)) return res.status(400).json({ error: 'A valid email is required' });

  const subject = SUBJECTS.find((s) => s.id === b.subject);
  if (!subject) return res.status(400).json({ error: 'Unknown subject' });

  const student = {
    id: nextStudentId(),
    name: String(b.name).trim(),
    email: String(b.email).trim().toLowerCase(),
    subject: subject.id,
    subjectName: subject.name,
    description: String(b.description || '').trim(),
    createdAt: new Date().toISOString(),
  };
  students.push(student);
  saveData();
  res.status(201).json({ ...student, email: undefined });
});

app.get('/api/stats', (_req, res) => {
  const totalGroups = groups.length;
  const totalMembers = groups.reduce((m, g) => m + g.members.length, 0);
  const openGroups = groups.filter((g) => g.status === 'OPEN').length;
  const fullGroups = groups.filter((g) => g.status === 'FULL').length;
  const totalStudents = students.length;
  const subjects = SUBJECTS.length;
  const bySubject = {};
  groups.forEach((g) => { bySubject[g.subjectName] = (bySubject[g.subjectName] || 0) + 1; });
  res.json({ totalGroups, totalMembers, openGroups, fullGroups, totalStudents, subjects, bySubject });
});

// SPA fallback (keep JSON 404s for unknown API routes)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server when run directly (local dev / npm start).
// On serverless platforms (Vercel), the app is exported and invoked by
// the platform via api/index.js instead.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`📚 Study Group Finder running at http://localhost:${PORT}`);
  });
}

module.exports = app;
