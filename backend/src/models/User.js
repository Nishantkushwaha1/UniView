const { Schema, model } = require('mongoose');

const schema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  resetTokenHash: { type: String, select: false },      // sha256 of the emailed reset token
  resetExpires: { type: Date, select: false },
}, { timestamps: true });

module.exports = model('User', schema);
