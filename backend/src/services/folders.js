const { Folder } = require('../models');

const DEFAULT_FOLDER = 'General';

// Makes sure a named folder exists for the owner (safe to call repeatedly / concurrently)
async function ensureFolder(owner, name) {
  if (!name || name === DEFAULT_FOLDER) return;
  await Folder.updateOne({ owner, name }, { $setOnInsert: { owner, name } }, { upsert: true }).catch(e => {
    if (e.code !== 11000) throw e;
  });
}

module.exports = { DEFAULT_FOLDER, ensureFolder };
