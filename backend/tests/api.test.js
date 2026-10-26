// Integration tests: run against a real MongoDB (default: mongodb://127.0.0.1:27017/uniview_test)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret';
process.env.MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/uniview_test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const app = require('../src/app');
const { connect, disconnect } = require('../src/config/db');
const { mongoose } = require('../src/models');

let server, base;
const guest = crypto.randomUUID();
const guest2 = crypto.randomUUID();

async function call(method, path, { body, headers = {}, form, token, g = guest } = {}) {
  const h = { ...(g && { 'x-guest-id': g }), ...(token && { authorization: 'Bearer ' + token }), ...headers };
  if (body !== undefined) h['content-type'] = 'application/json';
  const res = await fetch(base + path, { method, headers: h, body: form || (body !== undefined ? JSON.stringify(body) : undefined) });
  const buf = Buffer.from(await res.arrayBuffer());
  let json = null; try { json = JSON.parse(buf.toString()); } catch {}
  return { status: res.status, json, buf, headers: res.headers };
}

// Empties every collection but keeps validators and indexes (so it also works on a DB prepared by database/init)
async function wipe() {
  const db = mongoose.connection.db;
  for (const c of await db.listCollections().toArray()) await db.collection(c.name).deleteMany({});
}

before(async () => {
  await connect(process.env.MONGO_URI);
  await wipe();
  await Promise.all(Object.values(mongoose.models).map(m => m.init()));
  await new Promise(ok => { server = app.listen(0, () => ok()); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  await wipe();
  await new Promise(ok => server.close(ok));
  await disconnect();
});

describe('health & access control', () => {
  it('health is public', async () => {
    const r = await call('GET', '/health', { g: null });
    assert.equal(r.status, 200); assert.equal(r.json.db, 'connected');
  });
  it('rejects calls without a user or guest id', async () => {
    assert.equal((await call('GET', '/docs', { g: null })).status, 401);
  });
  it('rejects invalid tokens with 401', async () => {
    assert.equal((await call('GET', '/docs', { token: 'nope' })).status, 401);
  });
  it('unknown routes return JSON 404', async () => {
    const r = await call('GET', '/nothing-here'); assert.equal(r.status, 404); assert.ok(r.json.error);
  });
});

describe('documents', () => {
  let id;
  it('creates a text file', async () => {
    const r = await call('POST', '/docs', { body: { name: 'hello.txt', content: 'line1\nline2' } });
    assert.equal(r.status, 201);
    assert.equal(r.json.kind, 'text'); assert.equal(r.json.ext, 'txt'); assert.equal(r.json.size, 11);
    assert.equal(r.json.content, undefined); assert.equal(r.json.folder, 'General');
    id = r.json._id;
  });
  it('creates a binary file from a data URL and detects its size', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');
    const r = await call('POST', '/docs', { body: { name: 'pixel.png', content: 'data:image/png;base64,' + png.toString('base64') } });
    assert.equal(r.status, 201); assert.equal(r.json.kind, 'image'); assert.equal(r.json.size, png.length); assert.equal(r.json.mime, 'image/png');
  });
  it('validates input', async () => {
    assert.equal((await call('POST', '/docs', { body: { content: 'x' } })).status, 400);
    assert.equal((await call('POST', '/docs', { body: { name: 'a.pdf', content: 'not a data url' } })).status, 400);
    assert.equal((await call('GET', '/docs/not-an-id')).status, 400);
    assert.equal((await call('GET', '/docs?kind=banana')).status, 400);
  });
  it('lists with pagination and filters, without content', async () => {
    const r = await call('GET', '/docs?limit=1&page=1');
    assert.equal(r.status, 200); assert.equal(r.json.items.length, 1); assert.equal(r.json.total, 2); assert.equal(r.json.pages, 2);
    assert.equal(r.json.items[0].content, undefined);
    assert.equal((await call('GET', '/docs?kind=image')).json.total, 1);
    assert.equal((await call('GET', '/docs?search=HELLO')).json.total, 1);
    assert.equal((await call('GET', '/docs?search=.*')).json.total, 0); // regex is escaped
    assert.equal((await call('GET', '/docs?folder=&kind=')).json.total, 2); // empty filters ignored
  });
  it('opens, edits, renames, favorites and moves a file', async () => {
    const o = await call('GET', '/docs/' + id); assert.equal(o.json.content, 'line1\nline2');
    const p = await call('PATCH', '/docs/' + id, { body: { content: 'changed content', favorite: true, folder: 'Work', name: 'renamed' } });
    assert.equal(p.status, 200); assert.equal(p.json.name, 'renamed.txt'); assert.equal(p.json.favorite, true);
    assert.equal(p.json.folder, 'Work'); assert.equal(p.json.size, 15);
    assert.equal((await call('GET', '/docs?favorite=1')).json.total, 1);
    assert.equal((await call('GET', '/docs?recent=1')).json.total, 2);
  });
  it('blocks editing non-text files', async () => {
    const png = (await call('GET', '/docs?kind=image')).json.items[0];
    assert.equal((await call('PATCH', '/docs/' + png._id, { body: { content: 'x' } })).status, 400);
  });
  it('downloads a file as attachment', async () => {
    const r = await call('GET', `/docs/${id}/download`);
    assert.equal(r.status, 200); assert.equal(r.buf.toString(), 'changed content');
    assert.match(r.headers.get('content-disposition'), /attachment/);
  });
  it('isolates data between owners', async () => {
    assert.equal((await call('GET', '/docs/' + id, { g: guest2 })).status, 404);
    assert.equal((await call('DELETE', '/docs/' + id, { g: guest2 })).status, 404);
    assert.equal((await call('GET', '/docs', { g: guest2 })).json.total, 0);
  });
  it('rejects text files that are too large', async () => {
    const r = await call('POST', '/docs', { body: { name: 'big.txt', content: 'a'.repeat(8 * 1024 * 1024 + 1) } });
    assert.equal(r.status, 413);
  });
});

describe('big files (GridFS)', () => {
  let id, data;
  it('uploads, streams with Range support, and deletes', async () => {
    data = crypto.randomBytes(300 * 1024);
    const fd = new FormData();
    fd.append('file', new Blob([data], { type: 'video/mp4' }), 'clip é.mp4');
    fd.append('folder', 'Videos');
    const up = await call('POST', '/docs/upload', { form: fd });
    assert.equal(up.status, 201, JSON.stringify(up.json));
    assert.equal(up.json.kind, 'video'); assert.equal(up.json.size, data.length); assert.equal(up.json.folder, 'Videos');
    assert.equal(up.json.name, 'clip é.mp4');
    id = up.json._id;

    const full = await call('GET', `/docs/${id}/file`);
    assert.equal(full.status, 200); assert.ok(full.buf.equals(data)); assert.equal(full.headers.get('accept-ranges'), 'bytes');

    const part = await call('GET', `/docs/${id}/file`, { headers: { range: 'bytes=10-19' } });
    assert.equal(part.status, 206); assert.ok(part.buf.equals(data.subarray(10, 20)));
    assert.equal(part.headers.get('content-range'), `bytes 10-19/${data.length}`);

    const tail = await call('GET', `/docs/${id}/file`, { headers: { range: 'bytes=-5' } });
    assert.equal(tail.status, 206); assert.ok(tail.buf.equals(data.subarray(data.length - 5)));

    assert.equal((await call('GET', `/docs/${id}/file`, { headers: { range: 'bytes=999999999-' } })).status, 416);
    assert.equal((await call('GET', `/docs/${id}/download`)).buf.length, data.length);
  });
  it('issues short-lived signed links for streaming', async () => {
    const l = await call('POST', `/docs/${id}/link`);
    assert.equal(l.status, 200);
    const r = await call('GET', l.json.path, { g: null });   // no auth headers at all
    assert.equal(r.status, 200); assert.equal(r.buf.length, data.length);
    assert.equal((await call('GET', `/files/${id}?t=bad`, { g: null })).status, 401);
    assert.equal((await call('POST', `/docs/${id}/link`, { g: guest2 })).status, 404);
  });
  it('refuses big text files and empty uploads', async () => {
    const fd = new FormData(); fd.append('file', new Blob(['hi']), 'a.txt');
    assert.equal((await call('POST', '/docs/upload', { form: fd })).status, 413);
    assert.equal((await call('POST', '/docs/upload', { form: new FormData() })).status, 400);
  });
  it('deleting a doc removes its GridFS data', async () => {
    assert.equal((await call('DELETE', '/docs/' + id)).status, 200);
    assert.equal((await call('GET', '/docs/' + id)).status, 404);
    assert.equal(await mongoose.connection.db.collection('files.files').countDocuments(), 0);
  });
});

describe('folders', () => {
  it('lists, creates, renames, merges and deletes folders', async () => {
    let r = await call('GET', '/folders');
    assert.deepEqual(r.json.map(f => f.name), ['General', 'Videos', 'Work']);
    assert.equal(r.json.find(f => f.name === 'Work').count, 1);

    assert.equal((await call('POST', '/folders', { body: { name: 'Projects' } })).status, 201);
    assert.equal((await call('POST', '/folders', { body: { name: 'Projects' } })).status, 409);
    assert.equal((await call('POST', '/folders', { body: { name: '   ' } })).status, 400);

    r = await call('PATCH', '/folders/Work', { body: { name: 'Office' } });
    assert.equal(r.status, 200);
    assert.equal((await call('GET', '/docs?folder=Office')).json.total, 1);
    assert.equal((await call('PATCH', '/folders/General', { body: { name: 'X' } })).status, 400);

    r = await call('DELETE', '/folders/Office');
    assert.equal(r.json.moved, 1);
    assert.equal((await call('GET', '/docs?folder=General')).json.total, 2);
    assert.equal((await call('DELETE', '/folders/General')).status, 400);
    const names = (await call('GET', '/folders')).json.map(f => f.name);
    assert.ok(!names.includes('Office') && names.includes('Projects'));
  });
});

describe('notes', () => {
  let docId, noteId;
  it('creates, filters, edits and deletes notes', async () => {
    docId = (await call('GET', '/docs?kind=text')).json.items[0]._id;
    const c = await call('POST', '/notes', { body: { docId, text: 'Remember this' } });
    assert.equal(c.status, 201); assert.ok(c.json.docName); noteId = c.json._id;
    assert.equal((await call('POST', '/notes', { body: { docId, text: '' } })).status, 400);
    assert.equal((await call('POST', '/notes', { body: { docId: '000000000000000000000000', text: 'x' } })).status, 404);
    assert.equal((await call('GET', '/notes?docId=' + docId)).json.length, 1);
    assert.equal((await call('GET', '/notes?search=remember')).json.length, 1);
    assert.equal((await call('GET', '/notes?docId=bad')).status, 400);
    assert.equal((await call('PATCH', '/notes/' + noteId, { body: { text: 'Edited' } })).json.text, 'Edited');
    assert.equal((await call('PATCH', '/notes/' + noteId, { body: { text: 'No way' }, g: guest2 })).status, 404);
  });
  it('removes notes together with their file', async () => {
    assert.equal((await call('DELETE', '/docs/' + docId)).status, 200);
    assert.equal((await call('GET', '/notes')).json.length, 0);
  });
});

describe('todos', () => {
  it('full lifecycle', async () => {
    const a = (await call('POST', '/todos', { body: { text: 'Buy milk' } })).json;
    const b = (await call('POST', '/todos', { body: { text: 'Call mom' } })).json;
    assert.equal((await call('POST', '/todos', { body: { text: ' ' } })).status, 400);
    assert.equal((await call('PATCH', '/todos/' + a._id, { body: { done: true } })).json.done, true);
    assert.equal((await call('PATCH', '/todos/' + b._id, { body: { text: 'Call dad' } })).json.text, 'Call dad');
    assert.equal((await call('PATCH', '/todos/000000000000000000000000', { body: { done: true } })).status, 404);
    assert.equal((await call('DELETE', '/todos')).status, 400);
    assert.equal((await call('DELETE', '/todos?completed=1')).json.deleted, 1);
    assert.equal((await call('GET', '/todos')).json.length, 1);
    assert.equal((await call('DELETE', '/todos/' + b._id)).status, 200);
    assert.equal((await call('DELETE', '/todos/' + b._id)).status, 404);
  });
});

describe('stats & search', () => {
  it('reports dashboard numbers', async () => {
    await call('POST', '/todos', { body: { text: 'open task' } });
    const s = (await call('GET', '/stats')).json;
    assert.equal(s.totalDocs, 1); assert.equal(s.byKind[0].kind, 'image');
    assert.equal(s.todos.open, 1); assert.ok(s.totalSize > 0); assert.ok(s.folders >= 2);
  });
  it('searches file names and notes', async () => {
    const doc = (await call('GET', '/docs')).json.items[0];
    await call('POST', '/notes', { body: { docId: doc._id, text: 'pixel perfect idea' } });
    const r = (await call('GET', '/search?q=pixel')).json;
    assert.equal(r.docs.length, 1); assert.equal(r.notes.length, 1);
    assert.equal((await call('GET', '/search')).status, 400);
    assert.equal((await call('GET', '/search?q=zzzz')).json.docs.length, 0);
  });
});

describe('accounts', () => {
  let token, user;
  it('validates registration', async () => {
    assert.equal((await call('POST', '/auth/register', { body: { name: 'A', email: 'bad', password: '123456' } })).status, 400);
    assert.equal((await call('POST', '/auth/register', { body: { name: 'A', email: 'a@b.co', password: '123' } })).status, 400);
    assert.equal((await call('POST', '/auth/register', { body: {} })).status, 400);
  });
  it('registers and moves guest data into the account', async () => {
    const r = await call('POST', '/auth/register', { body: { name: 'Riya', email: 'Riya@Example.com', password: 'secret123', guestId: guest } });
    assert.equal(r.status, 201); token = r.json.token; user = r.json.user;
    assert.equal(user.email, 'riya@example.com'); assert.equal(r.json.user.password, undefined);
    assert.equal((await call('GET', '/docs', { token, g: null })).json.total, 1);   // the guest's file
    assert.equal((await call('GET', '/docs')).json.total, 0);                        // guest is now empty
    assert.equal((await call('GET', '/folders', { token, g: null })).json.some(f => f.name === 'Projects'), true);
    assert.equal((await call('POST', '/auth/register', { body: { name: 'Riya', email: 'riya@example.com', password: 'secret123' } })).status, 409);
  });
  it('logs in and reads the profile', async () => {
    assert.equal((await call('POST', '/auth/login', { body: { email: 'riya@example.com', password: 'wrong' } })).status, 401);
    assert.equal((await call('POST', '/auth/login', { body: {} })).status, 400);
    const l = await call('POST', '/auth/login', { body: { email: 'RIYA@example.com', password: 'secret123' } });
    assert.equal(l.status, 200); token = l.json.token;
    const me = await call('GET', '/auth/me', { token, g: null });
    assert.equal(me.json.name, 'Riya');
    assert.equal((await call('GET', '/auth/me')).status, 401);      // guests have no profile
  });
  it('updates name and password', async () => {
    assert.equal((await call('PATCH', '/auth/me', { token, body: { name: 'Riya S' } })).json.name, 'Riya S');
    assert.equal((await call('POST', '/auth/password', { token, body: { currentPassword: 'nope', newPassword: 'newpass1' } })).status, 400);
    assert.equal((await call('POST', '/auth/password', { token, body: { currentPassword: 'secret123', newPassword: 'newpass1' } })).status, 200);
    assert.equal((await call('POST', '/auth/login', { body: { email: 'riya@example.com', password: 'secret123' } })).status, 401);
    assert.equal((await call('POST', '/auth/login', { body: { email: 'riya@example.com', password: 'newpass1' } })).status, 200);
  });
  it('resets a forgotten password with an emailed link', async () => {
    assert.equal((await call('POST', '/auth/forgot', { body: { email: 'not-an-email' } })).status, 400);
    const none = await call('POST', '/auth/forgot', { body: { email: 'nobody@example.com' } });
    assert.equal(none.status, 200); assert.equal(none.json.devLink, undefined);       // same answer, nothing leaked
    const r = await call('POST', '/auth/forgot', { body: { email: 'riya@example.com' } });
    assert.equal(r.status, 200); assert.ok(r.json.devLink, 'dev link is returned when SMTP is not configured');
    const t = new URL(r.json.devLink.replace('/#', '')).searchParams.get('token');
    assert.equal((await call('POST', '/auth/reset', { body: { token: 'x'.repeat(64), password: 'brandnew1' } })).status, 400);
    assert.equal((await call('POST', '/auth/reset', { body: { token: t, password: '123' } })).status, 400);
    const ok = await call('POST', '/auth/reset', { body: { token: t, password: 'brandnew1' } });
    assert.equal(ok.status, 200); assert.ok(ok.json.token);
    assert.equal((await call('POST', '/auth/reset', { body: { token: t, password: 'again123' } })).status, 400);   // single use
    assert.equal((await call('POST', '/auth/login', { body: { email: 'riya@example.com', password: 'brandnew1' } })).status, 200);
    await call('POST', '/auth/password', { token: ok.json.token, body: { currentPassword: 'brandnew1', newPassword: 'newpass1' } });
  });
  it('deletes the account with all its data', async () => {
    assert.equal((await call('DELETE', '/auth/me', { token, body: { password: 'bad' } })).status, 400);
    assert.equal((await call('DELETE', '/auth/me', { token, body: { password: 'newpass1' } })).status, 200);
    assert.equal(await mongoose.models.Doc.countDocuments({ owner: 'u:' + user._id }), 0);
    assert.equal((await call('GET', '/auth/me', { token, g: null })).status, 401);
    assert.equal((await call('POST', '/auth/login', { body: { email: 'riya@example.com', password: 'newpass1' } })).status, 401);
  });
});

describe('guest sessions', () => {
  const { sweepGuests } = require('../src/services/guestCleanup');
  const g = crypto.randomUUID(), keep = crypto.randomUUID();
  it('removes a guest\'s files after the tab closes, but not if the page just reloaded', async () => {
    for (const id of [g, keep]) await call('POST', '/docs', { g: id, body: { name: 'a.txt', content: 'hello' } });
    assert.equal((await call('POST', '/guest/leave', { g: null, headers: { 'content-type': 'text/plain' }, form: g })).status, 204);
    await call('POST', '/guest/leave', { g: null, headers: { 'content-type': 'text/plain' }, form: keep });
    await call('POST', '/guest/ping', { g: keep });                                       // reload: same guest is back
    await sweepGuests(Date.now() + 2 * 60 * 1000);                                        // pretend the grace period passed
    assert.equal((await call('GET', '/docs', { g })).json.total, 0);
    assert.equal((await call('GET', '/docs', { g: keep })).json.total, 1);
  });
  it('removes data of guests that went silent', async () => {
    await call('GET', '/docs', { g: keep });
    await sweepGuests(Date.now() + 31 * 60 * 1000);
    assert.equal(await mongoose.models.Doc.countDocuments({ owner: 'g:' + keep }), 0);
  });
});
