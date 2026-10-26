const { Schema, model } = require('mongoose');
const { KINDS } = require('../utils/kinds');

// owner is "u:<userId>" for signed-in users or "g:<guestId>" for guests
const schema = new Schema({
  owner: { type: String, required: true },
  name: { type: String, required: true, trim: true, maxlength: 255 },
  ext: { type: String, default: '', lowercase: true },
  kind: { type: String, enum: KINDS, default: 'other' },
  size: { type: Number, default: 0, min: 0 },
  content: String,                 // text for text files, data-URL for other files <= 8 MB
  favorite: { type: Boolean, default: false },
  folder: { type: String, default: 'General', trim: true, maxlength: 60 },
  lastOpened: Date,
  gridId: Schema.Types.ObjectId,   // set for big files stored in GridFS
  mime: String,
}, { timestamps: true });

schema.index({ owner: 1, createdAt: -1 });
schema.index({ owner: 1, lastOpened: -1 });
schema.index({ owner: 1, favorite: 1 });
schema.index({ owner: 1, folder: 1 });
schema.index({ owner: 1, name: 1 });

module.exports = model('Doc', schema);
