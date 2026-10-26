const { Schema, model } = require('mongoose');

const schema = new Schema({
  owner: { type: String, required: true },
  text: { type: String, required: true, trim: true, maxlength: 500 },
  done: { type: Boolean, default: false },
}, { timestamps: true });

schema.index({ owner: 1, createdAt: 1 });

module.exports = model('Todo', schema);
