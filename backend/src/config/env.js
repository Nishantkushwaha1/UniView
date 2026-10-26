require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
const DEV_SECRET = 'dev-secret-change-me';

const env = {
  isProd,
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/uniview',
  jwtSecret: process.env.JWT_SECRET || DEV_SECRET,
  clientUrls: (process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean),
  // Used to build links in password reset emails (first CLIENT_URL, or the Vite dev server)
  appUrl: (process.env.APP_URL || (process.env.CLIENT_URL || '').split(',')[0].trim() || 'http://localhost:5173').replace(/\/$/, ''),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'UniView <no-reply@uniview.app>',
  },
  inlineMaxBytes: 8 * 1024 * 1024,      // files up to 8 MB are stored inside the document
  uploadMaxBytes: 200 * 1024 * 1024,    // bigger files go to GridFS, up to 200 MB
};

if (!process.env.JWT_SECRET) {
  if (isProd) throw new Error('JWT_SECRET must be set in production.');
  if (!env.isTest) console.warn('WARNING: JWT_SECRET is not set. Using an insecure development secret.');
}

module.exports = env;
