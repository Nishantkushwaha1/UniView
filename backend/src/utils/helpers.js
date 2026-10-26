const mongoose = require('mongoose');
const HttpError = require('./httpError');

// Wraps async route handlers so that rejected promises reach the error middleware
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Escapes user input before it is used inside a RegExp
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Validates data with a zod schema and throws a readable 400 error on failure
const parse = (schema, data) => {
  const r = schema.safeParse(data);
  if (!r.success) {
    const i = r.error.issues[0];
    const where = i.path.length ? `${i.path.join('.')}: ` : '';
    throw new HttpError(400, i.message && !i.message.startsWith('Required') ? where + i.message : `${where || 'Field '}is required`);
  }
  return r.data;
};

const isId = v => mongoose.Types.ObjectId.isValid(v) && String(new mongoose.Types.ObjectId(v)) === String(v);

// Router param guard: rejects malformed ObjectIds with a 400 instead of a 500
const validId = (req, _res, next, id) => (isId(id) ? next() : next(new HttpError(400, 'Invalid id')));

// Removes empty query-string values (?folder=&kind=) so optional filters stay optional
const cleanQuery = q => Object.fromEntries(Object.entries(q).filter(([, v]) => typeof v === 'string' && v !== ''));

const flag = v => v === '1' || v === 'true' || v === true;

module.exports = { wrap, esc, parse, isId, validId, cleanQuery, flag };
