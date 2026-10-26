const mongoose = require('mongoose');
module.exports = {
  mongoose,
  Doc: require('./Doc'),
  Note: require('./Note'),
  Todo: require('./Todo'),
  Folder: require('./Folder'),
  User: require('./User'),
  Guest: require('./Guest'),
};
