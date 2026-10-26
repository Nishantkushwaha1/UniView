/*
 * Fills the database with demo data so the app does not look empty.
 *
 *   npm run seed            (from backend/)
 *   npm run seed -- --reset (wipes ALL UniView data first)
 *
 * Demo login:  demo@uniview.app  /  Demo@1234
 * It only touches the demo account's data (unless --reset is used) so it is safe to run again.
 */
const path = require('path');
const { createRequire } = require('module');

// Reuse the backend's dependencies and models
const backend = createRequire(path.join(__dirname, '../../backend/package.json'));
backend('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
const bcrypt = backend('bcryptjs');
const { mongoose, User, Doc, Note, Todo, Folder } = backend('./src/models');
const { connect, disconnect } = backend('./src/config/db');
const { deleteOwnerData } = backend('./src/services/cleanup');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/uniview';
const DEMO = { name: 'Demo User', email: 'demo@uniview.app', password: 'Demo@1234' };

const ago = (h) => new Date(Date.now() - h * 3600 * 1000);

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#0e7490"/></linearGradient></defs>
<rect width="240" height="240" rx="48" fill="url(#g)"/>
<path d="M70 70h60l40 40v60a10 10 0 0 1-10 10H80a10 10 0 0 1-10-10z" fill="#fff" opacity=".95"/>
<path d="M130 70v40h40" fill="none" stroke="#0e7490" stroke-width="8" stroke-linejoin="round"/></svg>`;

const FILES = [
  { name: 'Welcome to UniView.md', folder: 'General', favorite: true, opened: 1, content:
`# Welcome to UniView

Everything you need to read, edit and organise documents - in one place.

## Try these
- Drag any file onto the window to open it
- Press **Ctrl + F** inside a text file to search it
- Star a file to pin it under *Favorites*
- Add notes to any file from the side panel

Happy working!
` },
  { name: 'project-plan.md', folder: 'Work', favorite: true, opened: 3, content:
`# Project plan - Q4

| Week | Goal | Owner |
|------|------|-------|
| 1 | Requirements and design | Asha |
| 2 | Backend APIs | Rohan |
| 3 | Frontend polish | Meera |
| 4 | Testing and launch | Everyone |

## Risks
1. Late feedback from the client
2. Hosting costs
` },
  { name: 'meeting-notes.txt', folder: 'Work', opened: 6, content:
`Team sync - Monday

* Dashboard redesign approved
* API documentation to be shared by Wednesday
* Next sync: Monday 11:00
` },
  { name: 'exam-schedule.csv', folder: 'Study', opened: 20, content:
`Subject,Date,Time,Room
Mathematics,2026-11-10,10:00,A-101
Physics,2026-11-12,10:00,B-204
Computer Science,2026-11-15,14:00,Lab-3
English,2026-11-18,10:00,A-105
` },
  { name: 'study-plan.md', folder: 'Study', favorite: false, opened: 30, content:
`# Study plan

- [x] Revise chapter 1-3
- [ ] Solve previous year papers
- [ ] Group study on Saturday

> Small steps every day beat big pushes once a month.
` },
  { name: 'utils.js', folder: 'Personal', opened: 48, content:
`// Small helpers
export const sum = (...n) => n.reduce((a, b) => a + b, 0);

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
` },
  { name: 'config.json', folder: 'Personal', opened: 72, content: JSON.stringify({ app: 'uniview', theme: 'light', autosave: true, version: 2 }, null, 2) + '\n' },
  { name: 'logo.svg', folder: 'Personal', opened: 10, image: LOGO_SVG },
];

async function main() {
  const reset = process.argv.includes('--reset');
  await connect(MONGO_URI);
  console.log('Connected to', MONGO_URI);

  if (reset) {
    console.log('Removing ALL existing UniView data...');
    await Promise.all(['files.files', 'files.chunks'].map(c => mongoose.connection.db.collection(c).deleteMany({}).catch(() => {})));
    await Promise.all([Doc, Note, Todo, Folder, User].map(M => M.deleteMany({})));
  }

  let user = await User.findOne({ email: DEMO.email });
  if (user) await deleteOwnerData('u:' + user._id);
  else user = await User.create({ name: DEMO.name, email: DEMO.email, password: await bcrypt.hash(DEMO.password, 10) });
  const owner = 'u:' + user._id;

  await Folder.insertMany(['Work', 'Study', 'Personal'].map(name => ({ owner, name })));

  const docs = [];
  for (const f of FILES) {
    const ext = f.name.split('.').pop();
    const base = { owner, name: f.name, ext, folder: f.folder, favorite: !!f.favorite, lastOpened: ago(f.opened), createdAt: ago(f.opened + 24) };
    if (f.image) {
      const buf = Buffer.from(f.image);
      docs.push({ ...base, kind: 'image', size: buf.length, mime: 'image/svg+xml', content: 'data:image/svg+xml;base64,' + buf.toString('base64') });
    } else {
      docs.push({ ...base, kind: 'text', size: Buffer.byteLength(f.content), content: f.content });
    }
  }
  const saved = await Doc.insertMany(docs);
  const by = n => saved.find(d => d.name === n);

  await Note.insertMany([
    { owner, docId: by('project-plan.md')._id, docName: 'project-plan.md', text: 'Share the plan with the client before Friday.' },
    { owner, docId: by('project-plan.md')._id, docName: 'project-plan.md', text: 'Check hosting quotes - two vendors so far.' },
    { owner, docId: by('exam-schedule.csv')._id, docName: 'exam-schedule.csv', text: 'Print the schedule and stick it on the wall.' },
  ]);

  await Todo.insertMany([
    { owner, text: 'Finish the project plan', done: true },
    { owner, text: 'Review pull requests' },
    { owner, text: 'Prepare for Physics exam' },
    { owner, text: 'Back up important files' },
  ]);

  console.log(`\nSeeded ${saved.length} files, 3 notes, 4 tasks and 3 folders.`);
  console.log(`Sign in with:  ${DEMO.email}  /  ${DEMO.password}\n`);
}

main()
  .catch(e => { console.error('Seeding failed:', e.message); process.exitCode = 1; })
  .finally(() => disconnect());
