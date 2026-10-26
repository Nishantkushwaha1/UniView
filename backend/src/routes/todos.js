const router = require('express').Router();
const { z } = require('zod');
const { Todo } = require('../models');
const HttpError = require('../utils/httpError');
const { wrap, parse, validId, flag } = require('../utils/helpers');

router.param('id', validId);
const text = z.string({ required_error: 'Task text is required.' }).trim().min(1, 'Task text is required.').max(500, 'Task is too long (max 500 characters).');

// GET /api/todos
router.get('/', wrap(async (req, res) => res.json(await Todo.find({ owner: req.owner }).sort({ createdAt: 1 }).limit(500).lean())));

// POST /api/todos   { text }
router.post('/', wrap(async (req, res) => {
  const { text: t } = parse(z.object({ text }), req.body);
  res.status(201).json(await Todo.create({ owner: req.owner, text: t }));
}));

// DELETE /api/todos?completed=1   -> clears finished tasks
router.delete('/', wrap(async (req, res) => {
  if (!flag(req.query.completed)) throw new HttpError(400, 'Add ?completed=1 to clear finished tasks.');
  const r = await Todo.deleteMany({ owner: req.owner, done: true });
  res.json({ ok: true, deleted: r.deletedCount });
}));

// PATCH /api/todos/:id   { done?, text? }
router.patch('/:id', wrap(async (req, res) => {
  const b = parse(z.object({ done: z.boolean().optional(), text: text.optional() }), req.body);
  const t = await Todo.findOneAndUpdate({ _id: req.params.id, owner: req.owner }, b, { new: true });
  if (!t) throw new HttpError(404, 'Task not found');
  res.json(t);
}));

// DELETE /api/todos/:id
router.delete('/:id', wrap(async (req, res) => {
  const r = await Todo.deleteOne({ _id: req.params.id, owner: req.owner });
  if (!r.deletedCount) throw new HttpError(404, 'Task not found');
  res.json({ ok: true });
}));

module.exports = router;
