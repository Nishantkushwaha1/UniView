const router = require('express').Router();
const { Doc, Note, Todo, Folder } = require('../models');
const { wrap } = require('../utils/helpers');

// GET /api/stats   -> numbers for the dashboard
router.get('/', wrap(async (req, res) => {
  const owner = req.owner;
  const [byKind, favorites, notes, todosOpen, todosDone, folders, folderNames] = await Promise.all([
    Doc.aggregate([{ $match: { owner } }, { $group: { _id: '$kind', count: { $sum: 1 }, size: { $sum: '$size' } } }]),
    Doc.countDocuments({ owner, favorite: true }),
    Note.countDocuments({ owner }),
    Todo.countDocuments({ owner, done: false }),
    Todo.countDocuments({ owner, done: true }),
    Folder.countDocuments({ owner }),
    Doc.distinct('folder', { owner, folder: { $ne: 'General' } }),
  ]);
  const kinds = byKind.map(k => ({ kind: k._id, count: k.count, size: k.size })).sort((a, b) => b.size - a.size);
  res.json({
    totalDocs: kinds.reduce((a, k) => a + k.count, 0),
    totalSize: kinds.reduce((a, k) => a + k.size, 0),
    favorites, notes,
    todos: { open: todosOpen, done: todosDone },
    folders: 1 + Math.max(folders, folderNames.length),
    byKind: kinds,
  });
}));

module.exports = router;
