const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // hosting platforms sit behind a proxy

// Websites allowed to call this API. When hosted, set CLIENT_ORIGIN on the server
// to your Netlify address (no trailing slash). Several addresses: separate with commas.
const allowed = (process.env.CLIENT_ORIGIN || 'http://localhost:5500,http://127.0.0.1:5500')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowed }));
app.use(express.json({ limit: '100kb' }));

const limiter = (limit, error) =>
  rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false, message: { error } });

app.use('/api', limiter(600, 'Too many requests. Please slow down.'));
app.use('/api/auth', limiter(20, 'Too many attempts. Try again in 15 minutes.'));

app.get('/', (req, res) => res.json({ message: 'OTT API is running' }));

app.use('/api/movies', require('./routes/movies'));
app.use('/api/tv', require('./routes/tv'));
app.use('/api/search', require('./routes/search'));
app.use('/api/genres', require('./routes/genres'));
app.use('/api/sports', require('./routes/sports'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));

module.exports = app;