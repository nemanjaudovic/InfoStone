// guide.md §5.1
const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  plan: { type: String, enum: ['free', 'paid'], default: 'free' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('User', userSchema, 'users');
