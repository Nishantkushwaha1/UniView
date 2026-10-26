const nodemailer = require('nodemailer');
const env = require('../config/env');

let transport;
const getTransport = () => {
  if (!env.smtp.host) return null;
  transport ||= nodemailer.createTransport({
    host: env.smtp.host, port: env.smtp.port, secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transport;
};

// Sends the password reset email. Returns true when a real email was sent.
// Without SMTP settings the link is printed to the server console instead (handy for local development).
async function sendResetEmail(to, name, link) {
  const t = getTransport();
  if (!t) {
    if (!env.isTest) console.log(`\n[UniView] SMTP not configured. Password reset link for ${to}:\n${link}\n`);
    return false;
  }
  await t.sendMail({
    from: env.smtp.from, to,
    subject: 'Reset your UniView password',
    text: `Hi ${name},\n\nUse this link to choose a new password (valid for 1 hour):\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
    html: `<p>Hi ${name.replace(/[<>&]/g, '')},</p><p><a href="${link}">Choose a new password</a> (link valid for 1 hour).</p><p>If you did not ask for this, you can ignore this email.</p>`,
  });
  return true;
}

module.exports = { sendResetEmail };
