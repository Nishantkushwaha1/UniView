const mongoose = require('mongoose');
const HttpError = require('../utils/httpError');

let bucket = null;

async function connect(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'files' });
  return mongoose.connection;
}

async function disconnect() {
  bucket = null;
  await mongoose.disconnect();
}

function getBucket() {
  if (!bucket) throw new HttpError(503, 'File storage is not ready yet. Try again in a moment.');
  return bucket;
}

module.exports = { connect, disconnect, getBucket };
