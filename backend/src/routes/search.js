const express = require('express');
const { proxy } = require('../config/tmdb');
const router = express.Router();

// Usage: /api/search?query=batman
router.get('/', proxy(() => '/search/multi'));

module.exports = router;