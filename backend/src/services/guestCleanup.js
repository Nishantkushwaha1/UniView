const { Guest, Doc, Note, Todo, Folder } = require('../models');
const { deleteOwnerData } = require('./cleanup');

const LEAVE_GRACE_MS = 90 * 1000;          // tab closed, no ping since -> delete
const IDLE_TTL_MS = 30 * 60 * 1000;        // no sign of life for this long -> delete (crash, killed browser)

// Deletes the data of guests who are gone. Safe to run often.
async function sweepGuests(now = Date.now()) {
  const gone = await Guest.find({
    $or: [{ leftAt: { $lt: new Date(now - LEAVE_GRACE_MS) } }, { lastSeen: { $lt: new Date(now - IDLE_TTL_MS) } }],
  }).select('_id');
  for (const g of gone) {
    await deleteOwnerData('g:' + g._id);
    await Guest.deleteOne({ _id: g._id });
  }

  // data left behind by guests that have no session record at all (e.g. created before this feature existed)
  const old = { owner: /^g:/, createdAt: { $lt: new Date(now - IDLE_TTL_MS) } };
  const owners = new Set((await Promise.all([Doc, Note, Todo, Folder].map(M => M.distinct('owner', old)))).flat());
  if (owners.size) {
    const live = new Set((await Guest.find({ _id: { $in: [...owners].map(o => o.slice(2)) } }).select('_id')).map(g => 'g:' + g._id));
    for (const o of owners) if (!live.has(o)) await deleteOwnerData(o);
  }
  return gone.length;
}

function startGuestSweeper(every = 30 * 1000) {
  const t = setInterval(() => sweepGuests().catch(e => console.error('Guest cleanup failed:', e.message)), every);
  t.unref();
  return t;
}

module.exports = { sweepGuests, startGuestSweeper, LEAVE_GRACE_MS, IDLE_TTL_MS };
