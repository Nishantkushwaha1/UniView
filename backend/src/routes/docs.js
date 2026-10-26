const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const env = require('../config/env');
const { Doc, Note } = require('../models');
const { getBucket } = require('../config/db');
const HttpError = require('../utils/httpError');
const { wrap, esc, parse, validId, cleanQuery, flag } = require('../utils/helpers');
const { KINDS, extOf, kindOf } = require('../utils/kinds');
const { ensureFolder, DEFAULT_FOLDER } = require('../services/folders');
const { deleteGridFiles } = require('../services/cleanup');
const { inlineBuffer, streamGrid, contentDisposition } = require('../services/files');

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: env.uploadMaxBytes, files: 1 } });
router.param('id', validId);

const SORTS = {
  newest: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { name: 1 }, size: { size: -1 }, opened: { lastOpened: -1 },
};
const strip = d => { const { content, ...rest } = d.toObject ? d.toObject() : d; return rest; };
const mine = req => ({ _id: req.params.id, owner: req.owner });
const folderName = z.string().trim().min(1, 'Folder name is required.').max(60, 'Folder name is too long (max 60).');

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  favorite: z.string().optional(),
  recent: z.string().optional(),
  folder: z.string().trim().max(60).optional(),
  kind: z.enum(KINDS).optional(),
  sort: z.enum(Object.keys(SORTS)).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// GET /api/docs?search=&favorite=1&recent=1&folder=&kind=&sort=&page=&limit=
// Never returns file content. Response: { items, total, page, pages }
router.get('/', wrap(async (req, res) => {
  const q = parse(listQuery, cleanQuery(req.query));
  const f = { owner: req.owner };
  if (flag(q.favorite)) f.favorite = true;
  if (q.folder) f.folder = q.folder;
  if (q.kind) f.kind = q.kind;
  if (q.search) f.name = new RegExp(esc(q.search), 'i');
  const recent = flag(q.recent);
  if (recent) f.lastOpened = { $ne: null };

  const limit = recent ? Math.min(q.limit, 20) : q.limit;
  const page = recent ? 1 : q.page;
  const sort = recent ? SORTS.opened : SORTS[q.sort || 'newest'];
  const [items, count] = await Promise.all([
    Doc.find(f).select('-content').sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Doc.countDocuments(f),
  ]);
  const total = recent ? Math.min(count, 20) : count;
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

const createSchema = z.object({
  name: z.string({ required_error: 'File name is required.' }).trim().min(1, 'File name is required.').max(255),
  content: z.string({ required_error: 'File content is required.' }),
  folder: folderName.optional(),
});

// POST /api/docs   { name, content, folder? }   (files up to 8 MB; text as text, others as a data URL)
router.post('/', wrap(async (req, res) => {
  const { name, content, folder } = parse(createSchema, req.body);
  const ext = extOf(name), kind = kindOf(ext);
  let size, mime;
  if (kind === 'text') {
    size = Buffer.byteLength(content, 'utf8');
  } else {
    const m = /^data:([^;,]*)(?:;[^,]*)?,/.exec(content);
    if (!m) throw new HttpError(400, 'Non-text files must be sent as a data URL.');
    mime = m[1] || 'application/octet-stream';
    const b64 = content.length - m[0].length;
    size = Math.floor((b64 * 3) / 4) - (content.endsWith('==') ? 2 : content.endsWith('=') ? 1 : 0);
  }
  if (size > env.inlineMaxBytes) throw new HttpError(413, 'Files over 8 MB must be sent to POST /api/docs/upload.');
  const target = folder || DEFAULT_FOLDER;
  await ensureFolder(req.owner, target);
  const d = await Doc.create({ owner: req.owner, name, ext, kind, size, content, mime, folder: target, lastOpened: new Date() });
  res.status(201).json(strip(d));
}));

// POST /api/docs/upload   multipart: file, folder?   (files up to 200 MB, stored in GridFS)
router.post('/upload', upload.single('file'), wrap(async (req, res) => {
  const f = req.file;
  if (!f) throw new HttpError(400, 'Choose a file to upload.');
  try {
    // Browsers send UTF-8 names that multer may read as latin1; repair so Hindi/Unicode names survive
    let name = f.originalname;
    const fixed = Buffer.from(name, 'latin1').toString('utf8');
    if (/[\u0080-\u00ff]/.test(name) && !fixed.includes('\uFFFD')) name = fixed;
    const ext = extOf(name), kind = kindOf(ext);
    if (kind === 'text') throw new HttpError(413, "Text and code files over 8 MB can't be opened here.");
    const folder = req.body.folder ? parse(folderName, req.body.folder) : DEFAULT_FOLDER;
    const bucket = getBucket();
    const gridId = await new Promise((ok, no) => {
      const u = bucket.openUploadStream(name);
      fs.createReadStream(f.path).on('error', no).pipe(u).on('error', no).on('finish', () => ok(u.id));
    });
    await ensureFolder(req.owner, folder);
    const d = await Doc.create({ owner: req.owner, name, ext, kind, size: f.size, gridId, mime: f.mimetype, folder, lastOpened: new Date() });
    res.status(201).json(strip(d));
  } finally {
    fs.unlink(f.path, () => {});
  }
}));

// GET /api/docs/:id   -> full document (opens it: updates "recent")
router.get('/:id', wrap(async (req, res) => {
  const d = await Doc.findOneAndUpdate(mine(req), { lastOpened: new Date() }, { new: true }).lean();
  if (!d) throw new HttpError(404, 'File not found');
  res.json(d);
}));

// GET /api/docs/:id/file   -> raw bytes of a big (GridFS) file, supports Range requests
router.get('/:id/file', wrap(async (req, res) => {
  await streamGrid(req, res, await Doc.findOne(mine(req)).select('gridId mime name'));
}));

// GET /api/docs/:id/download   -> any file as an attachment
router.get('/:id/download', wrap(async (req, res) => {
  const d = await Doc.findOne(mine(req));
  if (!d) throw new HttpError(404, 'File not found');
  if (d.gridId) return streamGrid(req, res, d, { download: true });
  const { buf } = inlineBuffer(d);
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': contentDisposition('attachment', d.name),
    'Content-Length': buf.length,
    'Cache-Control': 'private, no-store',
  }).send(buf);
}));

// POST /api/docs/:id/link   -> short-lived URL so <audio>/<video> can stream big files
router.post('/:id/link', wrap(async (req, res) => {
  const d = await Doc.findOne(mine(req)).select('gridId');
  if (!d || !d.gridId) throw new HttpError(404, 'File not found');
  const t = jwt.sign({ f: String(d._id), o: req.owner }, env.jwtSecret, { expiresIn: '1h' });
  res.json({ path: `/files/${d._id}?t=${t}`, expiresIn: 3600 });
}));

const patchSchema = z.object({
  content: z.string().optional(),
  favorite: z.boolean().optional(),
  folder: folderName.optional(),
  name: z.string().trim().min(1, 'File name is required.').max(255).optional(),
});

// PATCH /api/docs/:id   { content?, favorite?, folder?, name? }
router.patch('/:id', wrap(async (req, res) => {
  const body = parse(patchSchema, req.body);
  const d = await Doc.findOne(mine(req)).select('-content');
  if (!d) throw new HttpError(404, 'File not found');
  const set = {};
  if (body.content !== undefined) {
    if (d.kind !== 'text') throw new HttpError(400, 'Only text files can be edited.');
    const size = Buffer.byteLength(body.content, 'utf8');
    if (size > env.inlineMaxBytes) throw new HttpError(413, 'Text files can be at most 8 MB.');
    set.content = body.content; set.size = size;
  }
  if (body.favorite !== undefined) set.favorite = body.favorite;
  if (body.folder !== undefined) { await ensureFolder(req.owner, body.folder); set.folder = body.folder; }
  if (body.name !== undefined) {
    // keep the original extension so the file type never changes by accident
    set.name = d.ext && extOf(body.name) !== d.ext ? `${body.name}.${d.ext}` : body.name;
  }
  const updated = await Doc.findOneAndUpdate(mine(req), set, { new: true }).select('-content').lean();
  res.json(updated);
}));

// DELETE /api/docs/:id   -> removes the file, its GridFS data and its notes
router.delete('/:id', wrap(async (req, res) => {
  const d = await Doc.findOne(mine(req)).select('gridId');
  if (!d) throw new HttpError(404, 'File not found');
  await deleteGridFiles([d]);
  await Promise.all([Doc.deleteOne({ _id: d._id }), Note.deleteMany({ docId: d._id, owner: req.owner })]);
  res.json({ ok: true });
}));

module.exports = router;
