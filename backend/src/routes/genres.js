const express = require('express');
const { proxy } = require('../config/tmdb');
const router = express.Router();

router.get('/movie', proxy(() => '/genre/movie/list'));
router.get('/tv', proxy(() => '/genre/tv/list'));

module.exports = router;