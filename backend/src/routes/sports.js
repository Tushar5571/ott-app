const express = require('express');
const axios = require('axios');
const router = express.Router();

const KEY = process.env.SPORTSDB_KEY || '123';
const sdb = axios.create({
  baseURL: `https://www.thesportsdb.com/api/v1/json/${KEY}`,
  timeout: 10000,
});

// Leagues shown on the Sports page (ids from TheSportsDB)
const LEAGUES = [
  { id: '4328', name: 'English Premier League' },
  { id: '4335', name: 'La Liga' },
  { id: '4331', name: 'Bundesliga' },
  { id: '4332', name: 'Serie A' },
  { id: '4334', name: 'Ligue 1' },
  { id: '4480', name: 'Champions League' },
  { id: '4387', name: 'NBA' },
];

// Current season string, e.g. "2026-2027" (seasons start around July)
function season() {
  const d = new Date();
  const y = d.getUTCFullYear();
  return d.getUTCMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

const list = (path, params) =>
  sdb.get(path, { params }).then((r) => r.data.events || []).catch(() => []);

// Next + past events, then the rounds around the current one, merged
async function leagueEvents(id) {
  const s = season();
  const [nx, pv] = await Promise.all([
    list('/eventsnextleague.php', { id }),
    list('/eventspastleague.php', { id }),
  ]);
  const round = Number((nx[0] || pv[0] || {}).intRound);
  let extra = [];
  if (round) {
    const rounds = [round - 1, round, round + 1].filter((r) => r > 0);
    const results = await Promise.all(rounds.map((r) => list('/eventsround.php', { id, r, s })));
    extra = results.flat();
  }
  const merged = new Map();
  [...pv, ...nx, ...extra].forEach((e) => merged.set(e.idEvent, e));
  return [...merged.values()];
}

// Cache per league for 10 minutes (free key allows about 30 requests/minute)
const cache = new Map();
const TTL = 10 * 60 * 1000;

function cachedEvents(id) {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.t < TTL) return hit.p;
  const p = leagueEvents(id);
  cache.set(id, { t: Date.now(), p });
  p.catch(() => cache.delete(id));
  return p;
}

const finished = (e) => e.intHomeScore != null && e.intHomeScore !== '';
const byDate = (a, b) =>
  (a.dateEvent + (a.strTime || '')).localeCompare(b.dateEvent + (b.strTime || ''));

const pick = (kind) => async (req, res) => {
  const { id } = req.params;
  if (!LEAGUES.some((l) => l.id === id)) return res.status(400).json({ error: 'Unknown league' });
  try {
    const all = await cachedEvents(id);
    const today = new Date().toISOString().slice(0, 10);
    const events =
      kind === 'next'
        ? all.filter((e) => !finished(e) && e.dateEvent >= today).sort(byDate).slice(0, 10)
        : all.filter(finished).sort((a, b) => byDate(b, a)).slice(0, 10);
    res.json({ events });
  } catch {
    res.status(502).json({ error: 'Sports data is unavailable right now' });
  }
};

router.get('/leagues', (req, res) => res.json({ leagues: LEAGUES }));
router.get('/:id/next', pick('next'));
router.get('/:id/past', pick('past'));

module.exports = router;