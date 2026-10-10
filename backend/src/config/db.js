// MongoDB konekcija (mongoose). Dinamicke kolekcije koriste mongoose.connection.db
const mongoose = require('mongoose');
const { config } = require('./env');

async function connectDb() {
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB povezan');
}

module.exports = { connectDb };
