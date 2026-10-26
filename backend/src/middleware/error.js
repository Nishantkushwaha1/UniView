const env = require('../config/env');
const HttpError = require('../utils/httpError');

const notFound = (req, _res, next) => next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message;

  if (err.name === 'CastError') { status = 400; message = 'Invalid id or value'; }
  else if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map(e => e.message)[0] || 'Invalid data'; }
  else if (err.code === 11000) { status = 409; message = 'That already exists.'; }
  else if (err.code === 'LIMIT_FILE_SIZE') { status = 413; message = 'File is larger than 200 MB.'; }
  else if (err.name === 'MulterError') { status = 400; message = err.message; }
  else if (err.type === 'entity.too.large') { status = 413; message = 'Request is too large. Files over 8 MB must be uploaded with /docs/upload.'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Request body is not valid JSON.'; }

  if (status >= 500) {
    console.error(err);
    if (env.isProd) message = 'Something went wrong on the server.';
  }
  if (res.headersSent) return res.destroy();
  res.status(status).json({ error: message });
};

module.exports = { notFound, errorHandler };
