const express = require('express');
const { proxy } = require('../config/tmdb');
const router = express.Router();

router.get('/trending', proxy(() => '/trending/tv/week'));
router.get('/popular', proxy(() => '/tv/popular'));
router.get('/top-rated', proxy(() => '/tv/top_rated'));
router.get('/discover', proxy(() => '/discover/tv')); // ?with_genres=18

router.get(
  '/:id',
  proxy((req) => `/tv/${req.params.id}`, {
    append_to_response: 'credits,videos,similar,watch/providers',
  })
);

module.exports = router;