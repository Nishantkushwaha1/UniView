const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HttpError = require('../utils/httpError');

const GID = /^[\w-]{16,64}$/;

const signToken = userId => jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: '30d' });

// Keeps a guest's "last seen" fresh (at most once every 20 s per guest) so abandoned guest data can be cleaned up
const seen = new Map();
function touchGuest(id) {
  const now = Date.now();
  if (now - (seen.get(id) || 0) < 20000) return;
  seen.set(id, now);
  if (seen.size > 5000) for (const [k, t] of seen) if (now - t > 60000) seen.delete(k);
  require('../models').Guest.updateOne({ _id: id }, { $set: { lastSeen: new Date() }, $unset: { leftAt: 1 } }, { upsert: true }).catch(() => seen.delete(id));
}

// Identifies the caller: a signed-in user (Bearer token) OR a guest (x-guest-id header).
// Everything the API stores is scoped to req.owner.
function who(req, _res, next) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) {
    try {
      const { id } = jwt.verify(h.slice(7), env.jwtSecret);
      req.uid = id;
      req.owner = 'u:' + id;
      return next();
    } catch {
      return next(new HttpError(401, 'Your session has expired. Please sign in again.'));
    }
  }
  const g = req.headers['x-guest-id'];
  if (g && GID.test(g)) {
    req.owner = 'g:' + g;
    touchGuest(g);
    return next();
  }
  next(new HttpError(401, 'Not signed in'));
}

// For routes that only make sense for real accounts
function requireUser(req, _res, next) {
  req.uid ? next() : next(new HttpError(401, 'Please sign in to use this feature.'));
}

module.exports = { who, requireUser, signToken, GID };
