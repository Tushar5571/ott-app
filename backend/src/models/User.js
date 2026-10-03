const mongoose = require('mongoose');

// A saved movie or series (used for both favorites and history)
const item = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    kind: { type: String, enum: ['movie', 'tv'], required: true },
    title: { type: String, maxlength: 300 },
    poster_path: String,
    vote_average: Number,
    release_date: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    favorites: { type: [item], default: [] },
    history: { type: [item], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);