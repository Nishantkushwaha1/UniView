const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { who } = require('../middleware/auth');

const skip = () => env.isTest;
const general = rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false, skip, message: { error: 'Too many requests. Slow down a little.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, skip, message: { error: 'Too many attempts. Try again in a few minutes.' } });

router.use(general);

// Public
router.use('/health', require('./health'));
router.use('/files', require('./files'));       // signed-link streaming
router.use('/auth/login', authLimiter);
router.use('/auth/register', authLimiter);
router.use('/auth/forgot', authLimiter);
router.use('/auth/reset', authLimiter);
router.use('/guest', require('./guest'));
router.use('/auth', require('./auth'));

// Everything below belongs to the caller (signed-in user or guest)
router.use(who);
router.use('/docs', require('./docs'));
router.use('/folders', require('./folders'));
router.use('/notes', require('./notes'));
router.use('/todos', require('./todos'));
router.use('/stats', require('./stats'));
router.use('/search', require('./search'));

module.exports = router;
