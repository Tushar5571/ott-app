# Reelbox

A dark-themed movie and web series discovery website. Search titles, browse by genre, check ratings and cast, watch trailers, see where a title is streaming, follow sports fixtures, and save favorites and watch history to your own account.

**Live site:** https://ott-app1.netlify.app

> The backend runs on a free hosting plan and goes to sleep when nobody uses it. The first visit after a quiet period can take up to about a minute to load. After that it is fast.

## Features

- Home page with a hero banner and rows for trending, popular and top rated titles
- Search across movies and web series
- Categories: Movies, Web Series, Trending, Popular, with genre filters
- Details page with rating, genres, overview, cast, similar titles and a trailer popup
- "Where to watch" streaming platforms for India
- Sports page with upcoming matches and recent results for major leagues
- Sign up and log in, with favorites and watch history saved to your account
- Responsive design with a mobile menu, loading placeholders and error handling

## Tech stack

| Part | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (no framework) |
| Backend | Node.js, Express |
| Database | MongoDB Atlas with Mongoose |
| Login | bcryptjs (password hashing), JSON Web Tokens |
| Security | Helmet, CORS allowlist, rate limiting |
| Data sources | [TMDB API](https://www.themoviedb.org/), [TheSportsDB](https://www.thesportsdb.com/) |
| Hosting | Netlify (frontend), Render (backend) |

## How it works

```
Browser (frontend)  ->  Express backend  ->  TMDB / TheSportsDB
                              |
                              v
                       MongoDB (users, favorites, history)
```

The browser never talks to TMDB directly. The backend keeps the API key secret, forwards requests, caches sports data for 10 minutes, and handles accounts.

## Project structure

```
ott-app
├── backend
│   ├── server.js
│   └── src
│       ├── app.js              Express setup, security, routes
│       ├── config              TMDB client, database connection
│       ├── middleware          Login token check
│       ├── models              User model
│       └── routes              movies, tv, search, genres, sports, auth, user
└── frontend
    ├── index.html
    ├── style.css
    └── app.js                  Pages, routing, search, login, favorites
```

## Run it on your computer

You need [Node.js](https://nodejs.org/) (LTS version), a free [TMDB API key](https://www.themoviedb.org/settings/api), and a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

**1. Clone and install**

```bash
git clone https://github.com/Tushar5571/ott-app.git
cd ott-app/backend
npm install
```

**2. Create `backend/.env`**

```
TMDB_API_KEY=your_tmdb_v3_api_key
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_text_of_32_or_more_characters
```

Never commit this file. It is already listed in `.gitignore`.

**3. Start the backend**

```bash
npm run dev
```

You should see `Server running on http://localhost:5000` and `MongoDB connected`.

**4. Start the frontend**

Open the `frontend` folder in VS Code, right-click `index.html` and choose **Open with Live Server** (port 5500). On localhost the frontend automatically uses the backend at `http://localhost:5000`.

## Environment variables (hosting)

| Name | Where | Purpose |
|---|---|---|
| `TMDB_API_KEY` | Backend | TMDB v3 API key |
| `MONGO_URI` | Backend | MongoDB connection string |
| `JWT_SECRET` | Backend | Secret used to sign login tokens (32+ characters) |
| `CLIENT_ORIGIN` | Backend | Address of the deployed frontend, for CORS. Several addresses can be separated by commas |
| `PORT` | Backend | Set automatically by most hosts |

## Deployment

- **Backend (Render):** Root Directory `backend`, Build Command `npm install`, Start Command `npm start`, plus the environment variables above.
- **Frontend (Netlify):** Publish directory `frontend`, no build command. Set the `LIVE_API` constant at the top of `frontend/app.js` to your backend address, ending in `/api`.

## API overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/movies/trending` `popular` `top-rated` `now-playing` | Movie lists |
| GET | `/api/movies/discover?with_genres=28` | Movies by genre |
| GET | `/api/movies/:id` | Movie details with cast, trailers, similar titles and streaming |
| GET | `/api/tv/trending` `popular` `top-rated` `discover` | Web series lists |
| GET | `/api/tv/:id` | Series details |
| GET | `/api/search?query=batman` | Search movies and series |
| GET | `/api/genres/movie` `tv` | Genre lists |
| GET | `/api/sports/leagues` | Supported leagues |
| GET | `/api/sports/:id/next` `past` | Upcoming and recent matches |
| POST | `/api/auth/signup` `login` | Create an account, log in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/user/data` | Saved favorites and history |
| PUT | `/api/user/favorites` `history` | Save favorites or history |

## Notes

- Reelbox does not stream movies. It plays official trailers and shows where a title is available to watch.
- Favorites and history are saved in the browser for visitors who are not logged in, and in the account when logged in.
- This is a learning project, built for non-commercial use.

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability data is provided by JustWatch through TMDB. Sports data is provided by TheSportsDB.

## Roadmap

- Custom domain
- "Continue watching" row on the home page
- Remove single items from history
- User reviews and ratings