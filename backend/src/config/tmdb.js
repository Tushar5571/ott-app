const axios = require('axios');

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
});

// Adds your secret key to every request
tmdb.interceptors.request.use((config) => {
  config.params = {
    api_key: process.env.TMDB_API_KEY,
    language: 'en-US',
    ...config.params,
  };
  return config;
});

// Helper: calls TMDB and sends the result back
const proxy = (getPath, extraParams = {}) => async (req, res) => {
  try {
    const { data } = await tmdb.get(getPath(req), {
      params: { ...req.query, ...extraParams },
    });
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.status_message || 'Something went wrong',
    });
  }
};

module.exports = { tmdb, proxy };