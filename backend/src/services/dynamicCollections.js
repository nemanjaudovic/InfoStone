// Dinamicke kolekcije: jedna po komponenti, ime {username}_{type}_{index} (guide §3.1)
const mongoose = require('mongoose');
const Component = require('../models/Component');

const collectionName = (username, type, index) => `${username}_${type}_${index}`;

// Sledeci redni broj za tip komponente tog korisnika
async function nextIndex(owner, type) {
  const last = await Component.findOne({ owner, type }).sort({ index: -1 }).lean();
  return last ? last.index + 1 : 1;
}

// Nativna MongoDB kolekcija (bez mongoose seme)
const getCollection = (name) => mongoose.connection.db.collection(name);

module.exports = { collectionName, nextIndex, getCollection };
