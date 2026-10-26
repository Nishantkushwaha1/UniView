const router = require('express').Router();
const mongoose = require('mongoose');

// GET /api/health  (public)
router.get('/', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const db = states[mongoose.connection.readyState] || 'unknown';
  res.status(db === 'connected' ? 200 : 503).json({
    status: db === 'connected' ? 'ok' : 'degraded',
    db, uptime: Math.round(process.uptime()), time: new Date().toISOString(),
  });
});

module.exports = router;
