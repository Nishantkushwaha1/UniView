const { Schema, model } = require('mongoose');

// One row per anonymous browser tab session. Guest data lives only while the session is alive:
// it is deleted shortly after the tab closes (leftAt) or after a long silence (lastSeen).
const schema = new Schema({
  _id: { type: String, required: true },   // the guest id sent in x-guest-id
  lastSeen: { type: Date, default: Date.now, index: true },
  leftAt: { type: Date, index: true },     // set when the browser reports the tab is closing
});

module.exports = model('Guest', schema);
