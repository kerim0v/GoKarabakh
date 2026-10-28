# GoKarabakh - development notes

How to run, test and deploy the project. The project overview is in [README.md](README.md); step-by-step hosting of the free demo is in [DEPLOY.md](DEPLOY.md).

## Running it locally

You need Python 3.12+ and Node 20+.

**Backend** (from the project root):

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env               # then set JWT_SECRET_KEY, or DEBUG=True for local work
flask --app server db upgrade      # create the tables
flask --app server seed            # add the district content
flask --app server create-admin you@example.com
python server.py                   # http://localhost:5000, API docs at /api/docs
```

**Frontend** (in `frontend/`):

```bash
npm ci
cp .env.example .env               # VITE_API_URL=http://localhost:5000
npm run dev                        # http://localhost:5173
```

**Tests:** `pytest` from the project root.

### Useful commands

| Command | What it does |
|---|---|
| `flask --app server db upgrade` | Apply database migrations |
| `flask --app server db migrate -m "..."` | Create a migration after changing a model |
| `flask --app server seed` | Add the district content (safe to run again) |
| `flask --app server demo-data` | Add demo accounts, bookings, a review and a trace (asks for their password) |
| `flask --app server create-admin EMAIL` | Make an account an admin (creates it if needed) |
| `python scripts/build_openapi.py` | Rebuild `static/openapi.json` after changing the API (a test checks every route is documented) |
| `node frontend/scripts/build-map.mjs` | Rebuild the atlas map from `frontend/scripts/data/azerbaijan-districts.geojson` |

> Databases created before migrations were added (with `db.create_all()`) have an older schema.
> Drop the old tables, or start from an empty database, then run `db upgrade` and `seed`.

## Deploying

- Set `JWT_SECRET_KEY` (the API refuses to start without it unless `DEBUG=True`), `DATABASE_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, and `TRUST_PROXY=True` behind a proxy.
- Run with `gunicorn server:app` and `flask --app server db upgrade` on each deploy.
- Uploaded photos are saved to `UPLOAD_FOLDER` (default `instance/uploads`) — use a persistent disk.
- Set the `SMTP_*` variables to send real emails; without them, emails are written to the server log.
- The frontend is a single-page app: configure the host to serve `index.html` for unknown paths (e.g. `/district/shusha`).
- Run gunicorn with a longer timeout (`gunicorn --timeout 120 server:app`): an AI plan can take up to a minute.
- See `.env.example` for every setting.

## AI trip planner

The planner sends Claude (Anthropic) the list of active listings plus the traveller's wishes, and gets back a day-by-day plan that may only use those listings — the server drops anything else.

- **No key needed for a demo:** without `ANTHROPIC_API_KEY` a free rule-based planner (`app/services/demo_planner.py`) builds the plans and the page shows "demo mode". It also steps in if Claude can't be reached.
- Set `ANTHROPIC_API_KEY` (from console.anthropic.com, pay per use) to switch on real AI plans.
- `AI_MODEL` defaults to `claude-haiku-5-5` (a fraction of a cent per plan). `claude-opus-5-5` plans better at about 40 times the price.
- Each user gets `AI_DAILY_LIMIT` plans per day (default 10). Every request is logged in `ai_plan_logs` with its token usage.
- The listing catalogue is sent as a cached prompt prefix, so repeated plans cost less while listings don't change.

## Content to check before launch

- District history texts (`frontend/src/data/history.js`) are a draft — have someone who knows the region check them.
- Azerbaijani and Russian translations (`frontend/src/i18n/`) should be proofread by native speakers.
- Many seeded listings are placeholders (e.g. "Kalbajar Panorama Stay"); replace them with real partners.

Map boundaries: [geoBoundaries](https://www.geoboundaries.org), CC BY 4.0.

## Project layout

```
server.py            entry point (gunicorn server:app)
config.py            settings from .env
app/
  api/               one blueprint per area (auth, users, places, bookings, reviews, ...)
  models/            SQLAlchemy models
  services/          facade (queries), mailer, rate limiter, reset tokens
migrations/          Alembic migrations
tests/               pytest suite
static/openapi.json  API docs served at /api/docs
frontend/src/
  pages/             one component per page
  components/        shared UI (header, modals, cards)
  i18n/              en.js, az.js, ru.js (same keys)
  lib/               router, session, currency, helpers
```
