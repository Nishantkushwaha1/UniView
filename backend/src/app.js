const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
if (env.isProd) app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({
  origin: env.clientUrls.length ? env.clientUrls : true,
  exposedHeaders: ['Content-Disposition', 'Content-Range', 'Accept-Ranges', 'Content-Length'],
}));
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '12mb' }));

app.use('/api', routes);

// Frontend (frontend/dist) isi server se serve hoga
const dist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(dist));
app.get('/', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.use(notFound);
app.use(errorHandler);

module.exports = app;