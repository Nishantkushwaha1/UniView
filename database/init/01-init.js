/*
 * UniView database bootstrap.
 *
 * Creates the collections with schema validation and the indexes the API relies on.
 * Docker runs this automatically the first time the Mongo volume is created.
 * Run it by hand against any MongoDB (local or Atlas) with:
 *
 *     mongosh "mongodb://127.0.0.1:27017/uniview" database/init/01-init.js
 *
 * It is safe to run more than once. The backend also creates the same indexes on its own
 * (Mongoose autoIndex), so this script is a convenience for fresh setups and for production.
 */
const database = db.getSiblingDB('uniview');

const num = { bsonType: 'number', minimum: 0 };
const date = { bsonType: 'date' };
const str = (max, min) => ({ bsonType: 'string', maxLength: max, ...(min ? { minLength: min } : {}) });

const collections = {
  // Accounts. Guests have no user document: their data is owned by "g:<guestId>".
  users: {
    required: ['name', 'email', 'password'],
    properties: {
      name: str(60, 1), email: str(320, 3), password: { bsonType: 'string' },
      createdAt: date, updatedAt: date,
    },
    indexes: [[{ email: 1 }, { unique: true }]],
  },

  // Every file. Small files keep their content inline; big ones live in GridFS (files.files / files.chunks).
  docs: {
    required: ['owner', 'name'],
    properties: {
      owner: str(80, 3),                                   // "u:<userId>" or "g:<guestId>"
      name: str(255, 1), ext: { bsonType: 'string' },
      kind: { enum: ['text', 'image', 'audio', 'video', 'pdf', 'docx', 'xlsx', 'pptx', 'other'] },
      size: num, content: { bsonType: 'string' },
      favorite: { bsonType: 'bool' }, folder: str(60, 1),
      lastOpened: { bsonType: ['date', 'null'] },
      gridId: { bsonType: 'objectId' }, mime: { bsonType: 'string' },
      createdAt: date, updatedAt: date,
    },
    indexes: [
      [{ owner: 1, createdAt: -1 }], [{ owner: 1, lastOpened: -1 }], [{ owner: 1, favorite: 1 }],
      [{ owner: 1, folder: 1 }], [{ owner: 1, name: 1 }],
    ],
  },

  // Notes attached to a file.
  notes: {
    required: ['owner', 'docId', 'text'],
    properties: {
      owner: str(80, 3), docId: { bsonType: 'objectId' }, docName: { bsonType: 'string' },
      text: str(5000, 1), createdAt: date, updatedAt: date,
    },
    indexes: [[{ owner: 1, docId: 1 }], [{ owner: 1, createdAt: -1 }]],
  },

  // To-do tool.
  todos: {
    required: ['owner', 'text'],
    properties: {
      owner: str(80, 3), text: str(500, 1), done: { bsonType: 'bool' }, createdAt: date, updatedAt: date,
    },
    indexes: [[{ owner: 1, createdAt: 1 }]],
  },

  // Named folders (so that empty folders can exist). Files reference a folder by name.
  folders: {
    required: ['owner', 'name'],
    properties: { owner: str(80, 3), name: str(60, 1), createdAt: date, updatedAt: date },
    indexes: [[{ owner: 1, name: 1 }, { unique: true }]],
  },
};

const existing = database.getCollectionNames();

Object.keys(collections).forEach(function (name) {
  const c = collections[name];
  const validator = { $jsonSchema: { bsonType: 'object', required: c.required, properties: c.properties } };
  if (existing.indexOf(name) === -1) {
    database.createCollection(name, { validator: validator, validationLevel: 'moderate', validationAction: 'error' });
  } else {
    database.runCommand({ collMod: name, validator: validator, validationLevel: 'moderate', validationAction: 'error' });
  }
  c.indexes.forEach(function (ix) {
    database.getCollection(name).createIndex(ix[0], ix[1] || {});
  });
  print('  ready: ' + name);
});

print('UniView database initialised.');
