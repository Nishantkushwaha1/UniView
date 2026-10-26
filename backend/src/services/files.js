const { getBucket } = require('../config/db');
const HttpError = require('../utils/httpError');

// Never serve HTML/SVG/XML/JS inline from the API origin (stored-XSS protection)
const UNSAFE = /html|svg|xml|javascript|ecmascript/i;
const safeMime = m => (m && !UNSAFE.test(m) ? m : 'application/octet-stream');

const contentDisposition = (type, name) =>
  `${type}; filename="${String(name).replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`;

// Turns an inline document (text or data-URL) into a Buffer + mime
function inlineBuffer(doc) {
  if (doc.kind === 'text') return { buf: Buffer.from(doc.content || '', 'utf8'), mime: 'text/plain; charset=utf-8' };
  const m = /^data:([^;,]*)((?:;[^;,]*)*),(.*)$/s.exec(doc.content || '');
  if (!m) throw new HttpError(422, 'This file has no readable content.');
  const isB64 = /;base64/i.test(m[2]);
  const buf = isB64 ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8');
  return { buf, mime: m[1] || 'application/octet-stream' };
}

// Streams a GridFS file with HTTP Range support (needed for audio / video seeking)
async function streamGrid(req, res, doc, { download = false } = {}) {
  if (!doc || !doc.gridId) throw new HttpError(404, 'File not found');
  const bucket = getBucket();
  const [f] = await bucket.find({ _id: doc.gridId }).toArray();
  if (!f) throw new HttpError(404, 'File data is missing');

  const total = f.length;
  let start = 0, end = total - 1, status = 200;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2]) && total > 0) {
    if (m[1] === '') start = Math.max(total - Number(m[2]), 0);
    else { start = Number(m[1]); if (m[2]) end = Math.min(Number(m[2]), total - 1); }
    if (start > end || start >= total) {
      res.status(416).set('Content-Range', `bytes */${total}`);
      return res.end();
    }
    status = 206;
  }

  res.status(status).set({
    'Content-Type': download ? 'application/octet-stream' : safeMime(doc.mime),
    'Content-Disposition': contentDisposition(download ? 'attachment' : 'inline', doc.name),
    'Accept-Ranges': 'bytes',
    'Content-Length': total === 0 ? 0 : end - start + 1,
    'Cache-Control': 'private, no-store',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    ...(status === 206 && { 'Content-Range': `bytes ${start}-${end}/${total}` }),
  });
  if (total === 0) return res.end();
  bucket.openDownloadStream(doc.gridId, { start, end: end + 1 })
    .on('error', () => res.destroy())
    .pipe(res);
}

module.exports = { safeMime, contentDisposition, inlineBuffer, streamGrid };
