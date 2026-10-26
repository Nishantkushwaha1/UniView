const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { z } = require('zod');
const { User } = require('../models');
const { who, requireUser, signToken, GID } = require('../middleware/auth');
const { wrap, parse } = require('../utils/helpers');
const HttpError = require('../utils/httpError');
const { claimGuest, deleteUser } = require('../services/cleanup');
const { sendResetEmail } = require('../services/mailer');
const env = require('../config/env');

const pub = u => ({ _id: u._id, name: u.name, email: u.email, createdAt: u.createdAt });
const guestOk = g => typeof g === 'string' && GID.test(g);

const registerSchema = z.object({
  name: z.string({ required_error: 'Enter your name.' }).trim().min(1, 'Enter your name.').max(60, 'Name is too long.'),
  email: z.string({ required_error: 'Enter your email.' }).trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string({ required_error: 'Enter a password.' }).min(6, 'Password must be at least 6 characters.').max(72, 'Password is too long (max 72 characters).'),
  guestId: z.string().optional(),
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase(), password: z.string(), guestId: z.string().optional() });
const forgotSchema = z.object({ email: z.string({ required_error: 'Enter your email.' }).trim().toLowerCase().email('Enter a valid email address.') });
const resetSchema = z.object({
  token: z.string({ required_error: 'This reset link is invalid.' }).min(20, 'This reset link is invalid.').max(200),
  password: z.string({ required_error: 'Enter a new password.' }).min(6, 'Password must be at least 6 characters.').max(72, 'Password is too long (max 72 characters).'),
});
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const profileSchema = z.object({ name: z.string().trim().min(1, 'Enter your name.').max(60, 'Name is too long.') });
const passwordSchema = z.object({
  currentPassword: z.string({ required_error: 'Enter your current password.' }),
  newPassword: z.string({ required_error: 'Enter a new password.' }).min(6, 'New password must be at least 6 characters.').max(72),
});

// POST /api/auth/register
router.post('/register', wrap(async (req, res) => {
  const { name, email, password, guestId } = parse(registerSchema, req.body);
  if (await User.exists({ email })) throw new HttpError(409, 'This email is already registered. Try signing in.');
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  if (guestOk(guestId)) await claimGuest(guestId, u._id);
  res.status(201).json({ token: signToken(u._id), user: pub(u) });
}));

// POST /api/auth/login
router.post('/login', wrap(async (req, res) => {
  const body = loginSchema.safeParse(req.body);
  if (!body.success) throw new HttpError(400, 'Enter your email and password.');
  const { email, password, guestId } = body.data;
  const u = await User.findOne({ email }).select('+password');
  if (!u || !(await bcrypt.compare(password, u.password))) throw new HttpError(401, 'Email or password is incorrect.');
  if (guestOk(guestId)) await claimGuest(guestId, u._id);
  res.json({ token: signToken(u._id), user: pub(u) });
}));

// POST /api/auth/forgot   { email }  -> emails a reset link (valid 1 hour). Always answers the same, so emails cannot be probed.
router.post('/forgot', wrap(async (req, res) => {
  const { email } = parse(forgotSchema, req.body);
  const out = { ok: true, message: 'If an account exists for that email, a reset link has been sent.' };
  const u = await User.findOne({ email });
  if (u) {
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne({ _id: u._id }, { resetTokenHash: sha(token), resetExpires: new Date(Date.now() + 60 * 60 * 1000) });
    const link = `${env.appUrl}/#/reset-password?token=${token}`;
    let sent = false;
    try { sent = await sendResetEmail(u.email, u.name, link); } catch (e) { console.error('Reset email failed:', e.message); }
    // no email service configured: outside production hand the link back so the flow can still be used and tested
    if (!sent && !env.isProd) out.devLink = link;
  }
  res.json(out);
}));

// POST /api/auth/reset   { token, password }
router.post('/reset', wrap(async (req, res) => {
  const { token, password } = parse(resetSchema, req.body);
  const u = await User.findOne({ resetTokenHash: sha(token), resetExpires: { $gt: new Date() } }).select('+resetTokenHash +resetExpires');
  if (!u) throw new HttpError(400, 'This reset link is invalid or has expired. Request a new one.');
  u.password = await bcrypt.hash(password, 10);
  u.resetTokenHash = undefined; u.resetExpires = undefined;
  await u.save();
  res.json({ ok: true, token: signToken(u._id), user: pub(u) });
}));

// Everything below needs a signed-in account
router.use(who, requireUser);

// GET /api/auth/me
router.get('/me', wrap(async (req, res) => {
  const u = await User.findById(req.uid);
  if (!u) throw new HttpError(401, 'This account no longer exists.');
  res.json(pub(u));
}));

// PATCH /api/auth/me   { name }
router.patch('/me', wrap(async (req, res) => {
  const { name } = parse(profileSchema, req.body);
  const u = await User.findByIdAndUpdate(req.uid, { name }, { new: true });
  if (!u) throw new HttpError(401, 'This account no longer exists.');
  res.json(pub(u));
}));

// POST /api/auth/password   { currentPassword, newPassword }
router.post('/password', wrap(async (req, res) => {
  const { currentPassword, newPassword } = parse(passwordSchema, req.body);
  const u = await User.findById(req.uid).select('+password');
  if (!u) throw new HttpError(401, 'This account no longer exists.');
  if (!(await bcrypt.compare(currentPassword, u.password))) throw new HttpError(400, 'Current password is incorrect.');
  u.password = await bcrypt.hash(newPassword, 10);
  await u.save();
  res.json({ ok: true });
}));

// DELETE /api/auth/me   { password }   -> deletes the account and ALL its files, notes and tasks
router.delete('/me', wrap(async (req, res) => {
  const u = await User.findById(req.uid).select('+password');
  if (!u) throw new HttpError(401, 'This account no longer exists.');
  if (!(await bcrypt.compare(String(req.body?.password || ''), u.password))) throw new HttpError(400, 'Password is incorrect.');
  await deleteUser(u._id);
  res.json({ ok: true });
}));

module.exports = router;
