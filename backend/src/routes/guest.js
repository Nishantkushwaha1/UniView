const router = require('express').Router();
const express = require('express');
const { Guest } = require('../models');
const { who, GID } = require('../middleware/auth');
const { wrap } = require('../utils/helpers');

// POST /api/guest/ping   (x-guest-id header) -> "I am still here"; also cancels a pending leave (page reload)
router.post('/ping', who, wrap(async (req, res) => {
  if (req.uid) return res.json({ ok: true });
  await Guest.updateOne({ _id: req.owner.slice(2) }, { $set: { lastSeen: new Date() }, $unset: { leftAt: 1 } }, { upsert: true });
  res.json({ ok: true });
}));

// POST /api/guest/leave  body (text/plain): the guest id.  Sent with navigator.sendBeacon when the tab closes.
// The data is removed after a short grace period unless the same guest pings again (a reload).
router.post('/leave', express.text({ type: '*/*', limit: '1kb' }), wrap(async (req, res) => {
  const id = typeof req.body === 'string' ? req.body.trim() : '';
  if (GID.test(id)) await Guest.updateOne({ _id: id }, { $set: { leftAt: new Date() } });
  res.status(204).end();
}));

module.exports = router;
