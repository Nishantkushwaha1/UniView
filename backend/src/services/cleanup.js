const { Doc, Note, Todo, Folder, User, Guest } = require('../models');
const { getBucket } = require('../config/db');

// Deletes GridFS files that belong to the given documents (errors are ignored on purpose)
async function deleteGridFiles(docs) {
  const bucket = getBucket();
  await Promise.all(docs.filter(d => d.gridId).map(d => bucket.delete(d.gridId).catch(() => {})));
}

// Removes everything an owner has created
async function deleteOwnerData(owner) {
  const docs = await Doc.find({ owner }).select('gridId');
  await deleteGridFiles(docs);
  await Promise.all([Doc, Note, Todo, Folder].map(M => M.deleteMany({ owner })));
}

async function deleteUser(userId) {
  await deleteOwnerData('u:' + userId);
  await User.deleteOne({ _id: userId });
}

// Moves everything a guest created in this browser into the account
async function claimGuest(guestId, userId) {
  const from = 'g:' + guestId, to = 'u:' + userId;
  await Promise.all([Doc, Note, Todo].map(M => M.updateMany({ owner: from }, { owner: to })));
  const folders = await Folder.find({ owner: from });
  for (const f of folders) {
    await Folder.updateOne({ owner: to, name: f.name }, { $setOnInsert: { owner: to, name: f.name } }, { upsert: true }).catch(() => {});
  }
  await Folder.deleteMany({ owner: from });
  await Guest.deleteOne({ _id: guestId });
}

module.exports = { deleteGridFiles, deleteOwnerData, deleteUser, claimGuest };
