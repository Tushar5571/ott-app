// After you host the backend, put its address here (keep /api at the end)
const LIVE_API = 'https://YOUR-BACKEND.onrender.com/api';
const API = ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:5000/api' : LIVE_API;
const IMG = 'https://image.tmdb.org/t/p/';
const REGION = 'IN'; // country used for "Where to watch"
const app = document.getElementById('app');
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const year = (d) => (d || '').slice(0, 4);
const setTitle = (t) => { document.title = t ? `${t} | Reelbox` : 'Reelbox'; };

// ---------- Login (token kept in this browser) ----------
const TKEY = 'reelbox_token';
const UKEY = 'reelbox_user';
const token = () => { try { return localStorage.getItem(TKEY); } catch { return null; } };
const me = () => { try { return JSON.parse(localStorage.getItem(UKEY)); } catch { return null; } };

async function authFetch(path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token()) headers.Authorization = 'Bearer ' + token();
  const r = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && path.startsWith('/user')) logout(); // session expired
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Send the saved list to the account (only when logged in)
function syncUp(field) {
  if (!token()) return Promise.resolve();
  const list = field === 'favorites' ? loadFavs() : loadHistory();
  return authFetch('/user/' + field, 'PUT', { [field]: list }).catch(() => {});
}

const mergeLists = (a, b, max) => {
  const seen = new Set();
  return [...a, ...b].filter((x) => { const k = x.kind + x.id; return seen.has(k) ? false : seen.add(k); }).slice(0, max);
};

// merge=true (right after login): keep what was saved while logged out. Otherwise the account wins.
async function pullData(merge) {
  const d = await authFetch('/user/data');
  const favs = merge ? mergeLists(loadFavs(), d.favorites, 200) : d.favorites;
  const hist = merge ? mergeLists(loadHistory(), d.history, 50) : d.history;
  try {
    localStorage.setItem(FKEY, JSON.stringify(favs));
    localStorage.setItem(HKEY, JSON.stringify(hist));
  } catch {}
  if (merge) await Promise.all([syncUp('favorites'), syncUp('history')]);
}

function logout() {
  // Clear saved lists too, so the next person on this computer doesn't see them
  try { [TKEY, UKEY, FKEY, HKEY].forEach((k) => localStorage.removeItem(k)); } catch {}
  renderAuth();
  if (!location.hash || location.hash === '#/') route(); else location.hash = '#/';
}

function renderAuth() {
  const u = me();
  const on = token() && u;
  $('#auth').innerHTML = on
    ? `<span class="hi">Hi, ${esc(String(u.name).split(' ')[0])}</span><button class="btn ghost" id="logout">Logout</button>`
    : '<a class="btn" href="#/login">Login</a>';
  if (on) $('#logout').onclick = logout;
}

function authPage(mode) {
  const signup = mode === 'signup';
  setTitle(signup ? 'Sign up' : 'Log in');
  app.innerHTML = `<div class="wrap"><form class="authbox" id="af" novalidate>
    <h1 class="ttl">${signup ? 'Create account' : 'Welcome back'}</h1>
    ${signup ? '<label>Name<input name="name" autocomplete="name" required></label>' : ''}
    <label>Email<input name="email" type="email" autocomplete="email" required></label>
    <label>Password<input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required></label>
    ${signup ? '<p class="meta">Use at least 8 characters.</p>' : ''}
    <p class="err" id="err" role="alert"></p>
    <button class="btn" id="go">${signup ? 'Sign up' : 'Log in'}</button>
    <p class="meta">${signup ? 'Already have an account? <a href="#/login">Log in</a>' : 'New here? <a href="#/signup">Create an account</a>'}</p>
  </form></div>`;
  $('#af').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#go');
    btn.disabled = true;
    $('#err').textContent = '';
    try {
      const d = await authFetch('/auth/' + mode, 'POST', Object.fromEntries(new FormData(e.target)));
      try { localStorage.setItem(TKEY, d.token); localStorage.setItem(UKEY, JSON.stringify(d.user)); } catch {}
      await pullData(true).catch(() => {});
      renderAuth();
      location.hash = '#/';
    } catch (err) {
      $('#err').textContent = err.message;
      btn.disabled = false;
    }
  };
}

// ---------- Watch history (saved in this browser only) ----------
const HKEY = 'reelbox_history';
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch { return []; }
}
function saveHistory(item) {
  const list = loadHistory().filter((h) => !(h.id === item.id && h.kind === item.kind));
  list.unshift(item);                       // newest first
  try { localStorage.setItem(HKEY, JSON.stringify(list.slice(0, 50))); } catch {}
  syncUp('history');
}

// ---------- Favorites (saved in this browser only) ----------
const FKEY = 'reelbox_favs';
const loadFavs = () => { try { return JSON.parse(localStorage.getItem(FKEY)) || []; } catch { return []; } };
const isFav = (kind, id) => loadFavs().some((f) => f.kind === kind && f.id === id);
function toggleFav(item) {
  let list = loadFavs();
  if (isFav(item.kind, item.id)) list = list.filter((f) => !(f.kind === item.kind && f.id === item.id));
  else list.unshift(item);
  try { localStorage.setItem(FKEY, JSON.stringify(list)); } catch {}
  syncUp('favorites');
}

async function get(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed');
  return r.json();
}

// One movie/series card
function card(i, kind) {
  const k = i.media_type || kind;
  if (k === 'person') return '';
  const t = i.title || i.name;
  const img = i.poster_path ? `<img loading="lazy" src="${IMG}w342${i.poster_path}" alt="${esc(t)}">` : `<span>${esc(t)}</span>`;
  const rating = i.vote_average ? i.vote_average.toFixed(1) : 'NR';
  return `<a class="card" href="#/${k}/${i.id}"><div class="ph">${img}<b class="rate">★ ${rating}</b></div><h3>${esc(t)}</h3><p>${year(i.release_date || i.first_air_date)}</p></a>`;
}

const row = (title, items, kind) =>
  `<section class="row"><h2>${title}</h2><div class="scroll">${items.map((i) => card(i, kind)).join('')}</div></section>`;

// ---------- Home ----------
async function home() {
  const [tm, pm, ps, tr] = await Promise.all([
    get('/movies/trending'), get('/movies/popular'), get('/tv/popular'), get('/movies/top-rated'),
  ]);
  const h = tm.results.find((m) => m.backdrop_path) || tm.results[0];
  app.innerHTML =
    `<section class="hero" style="--img:url(${IMG}w1280${h.backdrop_path})"><div><h1>${esc(h.title)}</h1><p>${esc(h.overview)}</p><a class="btn" href="#/movie/${h.id}">View details</a></div></section>` +
    row('Trending movies', tm.results, 'movie') +
    row('Popular movies', pm.results, 'movie') +
    row('Popular web series', ps.results, 'tv') +
    row('Top rated movies', tr.results, 'movie');
}

// ---------- Browse pages (movies, series, trending, popular) ----------
const SECTIONS = {
  movies:   { kind: 'movie', title: 'Movies', list: '/movies/popular', disc: '/movies/discover', gen: '/genres/movie' },
  series:   { kind: 'tv', title: 'Web series', list: '/tv/popular', disc: '/tv/discover', gen: '/genres/tv' },
  trending: { kind: 'movie', title: 'Trending movies', list: '/movies/trending' },
  popular:  { kind: 'movie', title: 'Popular movies', list: '/movies/popular' },
};

async function browse(name, params) {
  const s = SECTIONS[name];
  setTitle(s.title);
  const g = params.get('g');
  let page = 1;
  let chips = '';
  if (s.gen) {
    const { genres } = await get(s.gen);
    chips = `<div class="chips"><a class="${g ? '' : 'on'}" href="#/${name}">All</a>` +
      genres.map((x) => `<a class="${g == x.id ? 'on' : ''}" href="#/${name}?g=${x.id}">${esc(x.name)}</a>`).join('') + '</div>';
  }
  app.innerHTML = `<div class="wrap"><h1 class="ttl">${s.title}</h1>${chips}<div class="grid" id="grid"></div><button class="btn" id="more">Load more</button></div>`;
  const load = async () => {
    const url = g ? `${s.disc}?page=${page}&with_genres=${g}&sort_by=popularity.desc` : `${s.list}?page=${page}`;
    const d = await get(url);
    $('#grid').insertAdjacentHTML('beforeend', d.results.map((i) => card(i, s.kind)).join(''));
    $('#more').hidden = page >= d.total_pages;
    page++;
  };
  $('#more').onclick = load;
  await load();
}

// ---------- Search ----------
async function search(q) {
  setTitle(q ? 'Search: ' + q : 'Search');
  app.innerHTML = `<div class="wrap"><h1 class="ttl">Results for “${esc(q)}”</h1><div class="grid" id="grid"></div></div>`;
  if (!q) { $('#grid').innerHTML = '<p class="msg">Type a title in the search box.</p>'; return; }
  const d = await get('/search?query=' + encodeURIComponent(q));
  const r = d.results.filter((i) => i.media_type !== 'person' && i.poster_path);
  $('#grid').innerHTML = r.length ? r.map((i) => card(i)).join('') : '<p class="msg">No matches. Try a different title.</p>';
}

// ---------- Trailer popup ----------
function openTrailer(key, title) {
  const opener = document.activeElement;
  const m = document.createElement('div');
  m.className = 'modal';
  m.setAttribute('role', 'dialog');
  m.setAttribute('aria-modal', 'true');
  m.setAttribute('aria-label', 'Trailer: ' + title);
  m.innerHTML = `<div class="mbox"><button class="mclose" aria-label="Close trailer">×</button><iframe src="https://www.youtube.com/embed/${encodeURIComponent(key)}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen title="${esc(title)} trailer"></iframe></div>`;
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() { m.remove(); document.removeEventListener('keydown', onKey); if (opener) opener.focus(); }
  m.onclick = (e) => { if (e.target === m) close(); };
  m.querySelector('.mclose').onclick = close;
  document.addEventListener('keydown', onKey);
  document.body.append(m);
  m.querySelector('.mclose').focus();
}

// ---------- Details ----------
async function detail(kind, id) {
  const d = await get(`/${kind === 'tv' ? 'tv' : 'movies'}/${id}`);
  const t = d.title || d.name;
  setTitle(t);
  const length = d.runtime ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`
    : d.number_of_seasons ? `${d.number_of_seasons} season${d.number_of_seasons > 1 ? 's' : ''}` : '';
  const trailer = (d.videos?.results || []).find((v) => v.site === 'YouTube' && v.type === 'Trailer');
  const cast = (d.credits?.cast || []).slice(0, 12);
  const meta = [year(d.release_date || d.first_air_date), length].filter(Boolean).join('  |  ');

  // Where to watch (streaming platforms for your country)
  const wp = d['watch/providers']?.results?.[REGION];
  const group = (label, list) => list?.length
    ? `<div class="prov"><span>${label}</span>${list.map((p) =>
        `<img src="${IMG}w92${p.logo_path}" alt="${esc(p.provider_name)}" title="${esc(p.provider_name)}">`).join('')}</div>` : '';
  const where = wp
    ? group('Stream', wp.flatrate) + group('Free with ads', wp.ads) + group('Rent', wp.rent) + group('Buy', wp.buy)
    : '';

  app.innerHTML =
    `<section class="det" style="--img:url(${IMG}w1280${d.backdrop_path || ''})">
      ${d.poster_path ? `<img src="${IMG}w500${d.poster_path}" alt="${esc(t)}">` : '<div></div>'}
      <div>
        <h1>${esc(t)}</h1>
        <p class="meta"><span class="score">★ ${d.vote_average ? d.vote_average.toFixed(1) : 'NR'}</span> (${d.vote_count || 0} votes)  |  ${meta}</p>
        <div class="tags">${(d.genres || []).map((g) => `<span>${esc(g.name)}</span>`).join('')}</div>
        <p class="ov">${esc(d.overview || 'No description available.')}</p>
        <h3 class="wh">Where to watch</h3>
        ${where
          ? where + `<a class="jw" href="${esc(wp.link)}" target="_blank" rel="noopener">See all options</a>`
          : '<p class="meta">Not listed on any streaming service in your country right now.</p>'}
        <p class="attr">Streaming data by JustWatch</p>
        <div class="acts">
          ${trailer ? '<button class="btn" id="trailer">Watch trailer</button>' : ''}
          <button class="btn ghost" id="fav"></button>
        </div>
      </div>
    </section>` +
    (cast.length ? `<section class="row"><h2>Cast</h2><div class="scroll">${cast.map((c) =>
      `<div class="person">${c.profile_path ? `<img loading="lazy" src="${IMG}w185${c.profile_path}" alt="">` : '<i></i>'}${esc(c.name)}<small>${esc(c.character)}</small></div>`).join('')}</div></section>` : '') +
    ((d.similar?.results || []).length ? row('More like this', d.similar.results, kind) : '');
  if (trailer) $('#trailer').onclick = () => {
    saveHistory({
      id: d.id, kind, title: t, poster_path: d.poster_path,
      vote_average: d.vote_average, release_date: d.release_date || d.first_air_date,
    });
    openTrailer(trailer.key, t);
  };

  const item = {
    id: d.id, kind, title: t, poster_path: d.poster_path,
    vote_average: d.vote_average, release_date: d.release_date || d.first_air_date,
  };
  const favBtn = $('#fav');
  const paint = () => { favBtn.textContent = isFav(kind, d.id) ? '♥ In favorites' : '♡ Add to favorites'; };
  paint();
  favBtn.onclick = () => { toggleFav(item); paint(); };
}

// ---------- History page ----------
function historyPage() {
  setTitle('Watch history');
  const list = loadHistory();
  app.innerHTML = `<div class="wrap"><div class="head"><h1 class="ttl">Watch history</h1>${list.length ? '<button class="btn ghost" id="clear">Clear history</button>' : ''}</div>` +
    (list.length
      ? `<div class="grid">${list.map((h) => card(h, h.kind)).join('')}</div>`
      : '<p class="msg">No trailers watched yet. Play a trailer on any movie or series and it will appear here.</p>') + '</div>';
  if (list.length) $('#clear').onclick = () => {
    try { localStorage.removeItem(HKEY); } catch {}
    syncUp('history');
    historyPage();
  };
}

// ---------- Favorites page ----------
function favoritesPage() {
  setTitle('My favorites');
  const list = loadFavs();
  app.innerHTML = `<div class="wrap"><h1 class="ttl">My favorites</h1>` +
    (list.length
      ? `<div class="grid">${list.map((f) => `<div class="fav">${card(f, f.kind)}<button class="rm" data-k="${f.kind}" data-id="${f.id}" aria-label="Remove ${esc(f.title)} from favorites">×</button></div>`).join('')}</div>`
      : '<p class="msg">No favorites yet. Open any movie or series and press “Add to favorites”.</p>') + '</div>';
  document.querySelectorAll('.rm').forEach((b) => {
    b.onclick = () => { toggleFav({ kind: b.dataset.k, id: Number(b.dataset.id) }); favoritesPage(); };
  });
}

// ---------- Sports ----------
const eventRow = (e) => {
  const done = e.intHomeScore != null && e.intHomeScore !== '';
  const when = `${esc(e.dateEvent)} ${esc((e.strTime || '').slice(0, 5))}${e.strTime ? ' UTC' : ''}`;
  return `<div class="match"><span class="when">${when}</span><b>${esc(e.strHomeTeam)}</b><span class="vs">${done ? `${esc(e.intHomeScore)} - ${esc(e.intAwayScore)}` : 'vs'}</span><b>${esc(e.strAwayTeam)}</b></div>`;
};

async function sportsPage(id) {
  setTitle('Sports');
  const { leagues } = await get('/sports/leagues');
  const lid = id || leagues[0].id;
  const [next, past] = await Promise.all([get(`/sports/${lid}/next`), get(`/sports/${lid}/past`)]);
  const upcoming = next.events.sort((a, b) => (a.dateEvent > b.dateEvent ? 1 : -1));
  const recent = past.events.sort((a, b) => (a.dateEvent < b.dateEvent ? 1 : -1));
  app.innerHTML = `<div class="wrap"><h1 class="ttl">Sports</h1>
    <div class="chips">${leagues.map((l) => `<a class="${l.id === lid ? 'on' : ''}" href="#/sports/${l.id}">${esc(l.name)}</a>`).join('')}</div>
    <h2 class="sub">Upcoming</h2>${upcoming.length ? upcoming.map(eventRow).join('') : '<p class="msg">No upcoming matches found.</p>'}
    <h2 class="sub">Recent results</h2>${recent.length ? recent.map(eventRow).join('') : '<p class="msg">No recent results found.</p>'}
  </div>`;
}

// ---------- Router ----------
async function route() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const p = path.split('/').filter(Boolean);
  const params = new URLSearchParams(qs);
  document.querySelectorAll('nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + path));
  document.querySelector('.modal')?.remove();
  $('nav').classList.remove('open');
  $('#menu').setAttribute('aria-expanded', 'false');
  setTitle('');
  app.innerHTML = `<div class="wrap"><div class="grid">${'<div class="sk"></div>'.repeat(12)}</div></div>`;
  scrollTo(0, 0);
  try {
    if (!p.length) await home();
    else if (SECTIONS[p[0]]) await browse(p[0], params);
    else if (p[0] === 'search') await search(decodeURIComponent(p[1] || ''));
    else if (p[0] === 'movie' || p[0] === 'tv') await detail(p[0], p[1]);
    else if (p[0] === 'history') historyPage();
    else if (p[0] === 'favorites') favoritesPage();
    else if (p[0] === 'login' || p[0] === 'signup') authPage(p[0]);
    else if (p[0] === 'sports') await sportsPage(p[1]);
    else {
      setTitle('Page not found');
      app.innerHTML = '<div class="wrap"><h1 class="ttl">Page not found</h1><p class="msg">That page does not exist.</p><a class="btn" href="#/">Go home</a></div>';
    }
  } catch (e) {
    app.innerHTML = `<div class="wrap"><p class="msg">Couldn't load data: ${esc(e.message)}</p><button class="btn" id="retry">Try again</button></div>`;
    $('#retry').onclick = route;
  }
}

// Search box: wait until typing stops, then go to the results page
let timer;
$('#q').addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const v = e.target.value.trim();
    location.hash = v ? '#/search/' + encodeURIComponent(v) : '#/';
  }, 400);
});

$('#menu').onclick = () => {
  const open = $('nav').classList.toggle('open');
  $('#menu').setAttribute('aria-expanded', String(open));
};

addEventListener('hashchange', route);
renderAuth();
route();
if (token()) {
  pullData(false).then(() => { if (/#\/(favorites|history)/.test(location.hash)) route(); }).catch(() => {});
}