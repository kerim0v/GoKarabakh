# GoKarabakh 🏔️

## Tours, hotels, and local guides in Karabakh — all in one place.

GoKarabakh is a full-stack booking platform built as our final project at Holberton School. The region is opening up to travelers again, but there's no single place to plan a trip — you'd have to hunt through scattered social media pages and word-of-mouth recommendations just to book a guide or find a place to stay. GoKarabakh fixes that by bringing tours, accommodations, and local guides into one platform.

## What it does

- Browse hotels, restaurants, sights and tours in nine districts, on an interactive map or by search
- Request a booking: the partner confirms, then both sides get each other's contact details by email
- Save places to a multi-day itinerary
- Rate and review places after a confirmed visit
- Earn Karabakh coins (welcome bonus, first community photo, 2% of every booking) and spend them on bookings (1 coin = 1 AZN)
- Share photos and notes from the road in the community archive
- Businesses and guides apply to become partners, then publish listings and answer requests from their workspace
- Admin page for partner applications, user roles and listings
- Azerbaijani, English and Russian; prices shown in AZN, USD or EUR

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
| `flask --app server create-admin EMAIL` | Make an account an admin (creates it if needed) |

> Databases created before migrations were added (with `db.create_all()`) have an older schema.
> Drop the old tables, or start from an empty database, then run `db upgrade` and `seed`.

## Deploying

- Set `JWT_SECRET_KEY` (the API refuses to start without it unless `DEBUG=True`), `DATABASE_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, and `TRUST_PROXY=True` behind a proxy.
- Run with `gunicorn server:app` and `flask --app server db upgrade` on each deploy.
- Uploaded photos are saved to `UPLOAD_FOLDER` (default `instance/uploads`) — use a persistent disk.
- Set the `SMTP_*` variables to send real emails; without them, emails are written to the server log.
- The frontend is a single-page app: configure the host to serve `index.html` for unknown paths (e.g. `/district/shusha`).
- See `.env.example` for every setting.

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

# Ideas for later

📖 Short cultural/historical background on each site\
🧭 Guide verification badges (ID-checked, licensed, etc.)\
💳 Online payment (bookings are currently confirmed by the partner and paid directly)\
🗺️ Translated listing descriptions (place content is stored in one language)

# Team

Built by a team of 4 as a Holberton School final project:

### [Baghirzade Turkan](https://github.com/prenses123) — UI-UX / Frontend developer
### [Nabiyeva Gulustan](https://github.com/gulustan1) — Project Manager / Frontend developer/UI-UX
### [Aliyev Abdulqadir](https://github.com/hbtn12749) — Backend developer
### [Kerimov Tamerlan](https://github.com/kerim0v) — Backend developer
