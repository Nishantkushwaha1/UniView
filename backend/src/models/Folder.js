const { Schema, model } = require('mongoose');

// Folders are stored by name on each document; this collection lets empty folders exist too.
const schema = new Schema({
  owner: { type: String, required: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
}, { timestamps: true });

schema.index({ owner: 1, name: 1 }, { unique: true });

module.exports = model('Folder', schema);
