const { Schema, model } = require('mongoose');

const schema = new Schema({
  owner: { type: String, required: true },
  docId: { type: Schema.Types.ObjectId, required: true },
  docName: { type: String, default: '' },
  text: { type: String, required: true, trim: true, maxlength: 5000 },
}, { timestamps: true });

schema.index({ owner: 1, docId: 1 });
schema.index({ owner: 1, createdAt: -1 });

module.exports = model('Note', schema);
