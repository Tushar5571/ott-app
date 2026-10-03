const express = require('express');
const { proxy } = require('../config/tmdb');
const router = express.Router();

router.get('/trending', proxy(() => '/trending/movie/week'));
router.get('/popular', proxy(() => '/movie/popular'));
router.get('/top-rated', proxy(() => '/movie/top_rated'));
router.get('/now-playing', proxy(() => '/movie/now_playing'));
router.get('/discover', proxy(() => '/discover/movie')); // ?with_genres=28

// Keep this LAST so it doesn't catch the routes above
router.get(
  '/:id',
  proxy((req) => `/movie/${req.params.id}`, {
    append_to_response: 'credits,videos,similar,watch/providers',
  })
);

module.exports = router;