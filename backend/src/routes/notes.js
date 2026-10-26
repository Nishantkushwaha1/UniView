const router = require('express').Router();
const { z } = require('zod');
const { Doc, Note } = require('../models');
const HttpError = require('../utils/httpError');
const { wrap, esc, parse, validId, isId } = require('../utils/helpers');

router.param('id', validId);
const text = z.string({ required_error: 'Note text is required.' }).trim().min(1, 'Note text is required.').max(5000, 'Note is too long (max 5000 characters).');

// GET /api/notes?docId=&search=
router.get('/', wrap(async (req, res) => {
  const f = { owner: req.owner };
  if (req.query.docId) {
    if (!isId(req.query.docId)) throw new HttpError(400, 'Invalid docId');
    f.docId = req.query.docId;
  }
  if (req.query.search) f.text = new RegExp(esc(String(req.query.search).slice(0, 100)), 'i');
  res.json(await Note.find(f).sort({ createdAt: -1 }).limit(500).lean());
}));

// POST /api/notes   { docId, text }
router.post('/', wrap(async (req, res) => {
  const { docId, text: t } = parse(z.object({ docId: z.string().refine(isId, 'Invalid docId'), text }), req.body);
  const doc = await Doc.findOne({ _id: docId, owner: req.owner }).select('name');
  if (!doc) throw new HttpError(404, 'File not found');
  res.status(201).json(await Note.create({ owner: req.owner, docId, docName: doc.name, text: t }));
}));

// PATCH /api/notes/:id   { text }
router.patch('/:id', wrap(async (req, res) => {
  const { text: t } = parse(z.object({ text }), req.body);
  const n = await Note.findOneAndUpdate({ _id: req.params.id, owner: req.owner }, { text: t }, { new: true });
  if (!n) throw new HttpError(404, 'Note not found');
  res.json(n);
}));

// DELETE /api/notes/:id
router.delete('/:id', wrap(async (req, res) => {
  const r = await Note.deleteOne({ _id: req.params.id, owner: req.owner });
  if (!r.deletedCount) throw new HttpError(404, 'Note not found');
  res.json({ ok: true });
}));

module.exports = router;
