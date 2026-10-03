const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth); // everything below needs a login

router.get('/data', async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(401).json({ error: 'Please log in' });
    res.json({ favorites: user.favorites, history: user.history });
  } catch {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Replaces the saved list. The schema drops unknown fields and rejects bad ones.
const save = (field, max) => async (req, res) => {
  const list = req.body?.[field];
  if (!Array.isArray(list)) return res.status(400).json({ error: `${field} must be a list` });
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'Please log in' });
    user[field] = list.slice(0, max);
    await user.save();
    res.json({ [field]: user[field] });
  } catch {
    res.status(400).json({ error: 'Invalid data' });
  }
};

router.put('/favorites', save('favorites', 200));
router.put('/history', save('history', 50));

module.exports = router;