const router = require('express').Router();
const { z } = require('zod');
const { Doc, Note } = require('../models');
const { wrap, esc, parse } = require('../utils/helpers');

// GET /api/search?q=   -> { docs, notes }  (file names + note text)
router.get('/', wrap(async (req, res) => {
  const { q } = parse(z.object({ q: z.string({ required_error: 'Type something to search.' }).trim().min(1, 'Type something to search.').max(100) }), req.query);
  const re = new RegExp(esc(q), 'i');
  const [docs, notes] = await Promise.all([
    Doc.find({ owner: req.owner, name: re }).select('-content').sort({ lastOpened: -1, createdAt: -1 }).limit(30).lean(),
    Note.find({ owner: req.owner, text: re }).sort({ createdAt: -1 }).limit(30).lean(),
  ]);
  res.json({ q, docs, notes });
}));

module.exports = router;
