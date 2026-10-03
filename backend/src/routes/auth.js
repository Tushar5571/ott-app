const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email });

router.post('/signup', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return res.status(400).json({ error: 'Enter your name, a valid email and a password of at least 8 characters.' });
  }
  try {
    if (await User.findOne({ email })) return res.status(409).json({ error: 'This email is already registered.' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: sign(user), user: pub(user) });
  } catch {
    res.status(500).json({ error: 'Could not create the account. Try again.' });
  }
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  try {
    const user = await User.findOne({ email });
    // Same message for wrong email and wrong password, so nobody can probe which emails exist
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Wrong email or password.' });
    }
    res.json({ token: sign(user), user: pub(user) });
  } catch {
    res.status(500).json({ error: 'Could not log in. Try again.' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'Please log in' });
    res.json({ user: pub(user) });
  } catch {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;