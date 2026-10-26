const router = require('express').Router();
const { z } = require('zod');
const { Doc, Folder } = require('../models');
const HttpError = require('../utils/httpError');
const { wrap, parse } = require('../utils/helpers');
const { DEFAULT_FOLDER, ensureFolder } = require('../services/folders');

const nameSchema = z.object({
  name: z.string({ required_error: 'Folder name is required.' }).trim().min(1, 'Folder name is required.').max(60, 'Folder name is too long (max 60).'),
});

// GET /api/folders   -> [{ name, count, size }]  (includes empty folders; "General" is always present)
router.get('/', wrap(async (req, res) => {
  const [stats, saved] = await Promise.all([
    Doc.aggregate([{ $match: { owner: req.owner } }, { $group: { _id: '$folder', count: { $sum: 1 }, size: { $sum: '$size' } } }]),
    Folder.find({ owner: req.owner }).select('name').lean(),
  ]);
  const map = new Map([[DEFAULT_FOLDER, { name: DEFAULT_FOLDER, count: 0, size: 0 }]]);
  saved.forEach(f => map.set(f.name, { name: f.name, count: 0, size: 0 }));
  stats.forEach(s => map.set(s._id, { name: s._id, count: s.count, size: s.size }));
  const list = [...map.values()].sort((a, b) => (a.name === DEFAULT_FOLDER ? -1 : b.name === DEFAULT_FOLDER ? 1 : a.name.localeCompare(b.name)));
  res.json(list);
}));

// POST /api/folders   { name }
router.post('/', wrap(async (req, res) => {
  const { name } = parse(nameSchema, req.body);
  if (name === DEFAULT_FOLDER || (await Folder.exists({ owner: req.owner, name })) || (await Doc.exists({ owner: req.owner, folder: name })))
    throw new HttpError(409, 'A folder with this name already exists.');
  await ensureFolder(req.owner, name);
  res.status(201).json({ name, count: 0, size: 0 });
}));

// PATCH /api/folders/:name   { name }   -> renames (or merges into an existing folder)
router.patch('/:name', wrap(async (req, res) => {
  const from = req.params.name, { name: to } = parse(nameSchema, req.body);
  if (from === DEFAULT_FOLDER) throw new HttpError(400, 'The General folder cannot be renamed.');
  if (to === from) return res.json({ name: to });
  await Doc.updateMany({ owner: req.owner, folder: from }, { folder: to });
  await Folder.deleteOne({ owner: req.owner, name: from });
  await ensureFolder(req.owner, to);
  res.json({ name: to });
}));

// DELETE /api/folders/:name   -> files inside move to "General"
router.delete('/:name', wrap(async (req, res) => {
  const name = req.params.name;
  if (name === DEFAULT_FOLDER) throw new HttpError(400, 'The General folder cannot be deleted.');
  const moved = await Doc.updateMany({ owner: req.owner, folder: name }, { folder: DEFAULT_FOLDER });
  await Folder.deleteOne({ owner: req.owner, name });
  res.json({ ok: true, moved: moved.modifiedCount });
}));

module.exports = router;
