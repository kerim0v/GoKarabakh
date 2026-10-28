# Deploying the GoKarabakh demo (free)

- **API (Flask)** on **PythonAnywhere** (free Beginner account): always on, and the SQLite database and uploaded photos are kept.
- **Website (React)** on **Cloudflare Pages** (free): rebuilds by itself on every push to GitHub.

You need: a PythonAnywhere account, a Cloudflare account, and a password for the demo accounts
(8+ characters, not a common one).

Below, replace `USERNAME` with your PythonAnywhere username and `SITE` with your Cloudflare Pages
address (for example `gokarabakh.pages.dev`).

---

## Part 1 — API on PythonAnywhere

### 1. Get the code

Sign up at https://www.pythonanywhere.com (Beginner, free). Your API will live at
`https://USERNAME.pythonanywhere.com`.

Open **Consoles → Bash** and run:

```bash
git clone -b improvements https://github.com/kerim0v/GoKarabakh.git
cd GoKarabakh
mkvirtualenv --python=python3.13 gokarabakh      # use python3.12 or 3.11 if 3.13 isn't offered
pip install --no-cache-dir -r requirements.txt
```

### 2. Settings

Make a secret key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Create the settings file with `nano .env` and paste (use the key you just made; you'll fix `SITE`
in Part 2 if you don't know it yet):

```
JWT_SECRET_KEY=paste-the-key-here
FRONTEND_URL=https://SITE
CORS_ORIGINS=https://SITE
TRUST_PROXY=True
```

Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

### 3. Database and demo data

```bash
flask --app server db upgrade      # create the tables
flask --app server seed            # hotels, restaurants, sights and tours in the 9 districts
flask --app server demo-data       # asks for the demo password
```

Demo accounts (all with that password): `admin@example.com`, `owner@example.com`,
`traveller@example.com`, `applicant@example.com`.

### 4. Web app

Open the **Web** tab → **Add a new web app** → **Next** → **Manual configuration** (not "Flask") →
choose the same Python version as in step 1 → **Next**.

On the web app page:

- **Source code:** `/home/USERNAME/GoKarabakh`
- **Virtualenv:** `/home/USERNAME/.virtualenvs/gokarabakh`
- **WSGI configuration file:** click the link, delete everything in the file, paste this and save:

  ```python
  import sys

  path = "/home/USERNAME/GoKarabakh"
  if path not in sys.path:
      sys.path.insert(0, path)

  from server import app as application
  ```

- **Security → Force HTTPS:** on
- Click the green **Reload** button.

Check: `https://USERNAME.pythonanywhere.com/` shows `{"docs":"/api/docs","status":"ok"}`, and
`/api/docs` shows the API documentation. If not, open the **Error log** link on the Web tab.

---

## Part 2 — Website on Cloudflare Pages

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
   Allow access to GitHub and pick `kerim0v/GoKarabakh`.
2. Build settings:

   | Setting | Value |
   |---|---|
   | Project name | `gokarabakh` (this becomes `gokarabakh.pages.dev`) |
   | Production branch | `improvements` |
   | Framework preset | None |
   | Root directory | `frontend` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

3. **Environment variables** (Production):

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://USERNAME.pythonanywhere.com` |
   | `NODE_VERSION` | `22` |

4. **Save and Deploy**. When it finishes you get the address (`SITE`).
   Links like `/district/shusha` work without extra setup: Pages serves the app for every path
   because the project has no `404.html`.
5. If `SITE` differs from what you put in `.env` on PythonAnywhere, fix `FRONTEND_URL` and
   `CORS_ORIGINS` there (`nano ~/GoKarabakh/.env`) and click **Reload** on the Web tab.

---

## Part 3 — Check it

Open `https://SITE` and try:

- the globe, the Trip page map and a search with dates;
- sign in as `traveller@example.com`: profile, itinerary, a booking request, the AI planner
  (it says "demo mode" — free, no AI key needed);
- sign in as `owner@example.com`: confirm the waiting request, add closed dates;
- sign in as `admin@example.com`: approve the pending application.

If the site loads but nothing signs in or loads data, the API address or the CORS setting is wrong:
compare `VITE_API_URL` (Cloudflare) with `CORS_ORIGINS` (PythonAnywhere `.env`). Changing a
Cloudflare variable needs a new deploy (**Deployments → Retry deployment**).

---

## Updating

- **Website:** push to the `improvements` branch; Cloudflare rebuilds by itself.
- **API:** in a PythonAnywhere Bash console:

  ```bash
  cd ~/GoKarabakh && git pull
  workon gokarabakh
  pip install --no-cache-dir -r requirements.txt
  flask --app server db upgrade
  ```

  then **Reload** on the Web tab.

## Good to know

- **Monthly click:** free PythonAnywhere web apps stop after a month. On the Web tab, click
  **Run until 1 month from today** before it expires.
- **Emails** (booking notices, password reset links) are not sent on this setup; they are written to
  the **Server log** on the Web tab. Add `SMTP_*` settings to `.env` to send real ones.
- **One request at a time:** the free plan runs one worker, which is fine for a demo.
- **Real AI plans:** add `ANTHROPIC_API_KEY=...` to `.env` and reload. Free PythonAnywhere accounts
  can only reach approved websites; if Anthropic's API isn't one of them, the planner quietly keeps
  using the demo planner.
- **Backups:** the whole database is one file, `~/GoKarabakh/instance/gokarabakh.db`; download it
  from the **Files** tab.
