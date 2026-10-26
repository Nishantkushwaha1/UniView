// Public-but-signed file streaming used by <audio>/<video> tags, which cannot send auth headers.
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { Doc } = require('../models');
const HttpError = require('../utils/httpError');
const { wrap, validId } = require('../utils/helpers');
const { streamGrid } = require('../services/files');

router.param('id', validId);

// GET /api/files/:id?t=<token from POST /api/docs/:id/link>
router.get('/:id', wrap(async (req, res) => {
  let p;
  try { p = jwt.verify(String(req.query.t || ''), env.jwtSecret); }
  catch { throw new HttpError(401, 'This link has expired.'); }
  if (p.f !== req.params.id) throw new HttpError(401, 'This link is not valid for this file.');
  await streamGrid(req, res, await Doc.findOne({ _id: p.f, owner: p.o }).select('gridId mime name'));
}));

module.exports = router;
