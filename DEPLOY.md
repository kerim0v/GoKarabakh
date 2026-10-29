# Deploying the GoKarabakh demo (free)

- **API (Flask)** on **PythonAnywhere** (free Beginner account): always on, and the SQLite database and uploaded photos are kept.
- **Website (React)** on **Cloudflare** (free Worker): rebuilds by itself on every push to GitHub.

You need: a PythonAnywhere account, a Cloudflare account, and a password for the demo accounts
(8+ characters, not a common one).

Below, replace `USERNAME` with your PythonAnywhere username and `SITE` with your Cloudflare
address (for example `gokarabakh.<account>.workers.dev`).

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

## Part 2 — Website on Cloudflare (Worker)

Cloudflare's dashboard now creates a **Worker** for Git projects;  tells it
to publish the built site from  and to send paths like  to the app.

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Import a repository** →
   pick . Name the Worker  (it must match  in
   ).
2. Settings (on the create screen, or later under the Worker → **Settings** → **Build**):

   | Setting | Value |
   |---|---|
   | Production branch |  |
   | Root directory (path) |  |
   | Build command |  |
   | Deploy command | 
╭─────────────────────────────────╮
│ Did you mean "wrangler deploy"? │
╰─────────────────────────────────╯

wrangler

COMMANDS
  wrangler docs [search..]        📚 Open Wrangler's command documentation in your browser
  wrangler complete [shell]       ⌨️ Generate and handle shell completions

  wrangler email                  Manage Cloudflare Email services [open beta]

ACCOUNT
  wrangler auth                   🔐 Manage authentication
  wrangler login                  🔓 Login to Cloudflare
  wrangler logout                 🚪 Logout from Cloudflare
  wrangler whoami                 🕵️ Retrieve your user information

COMPUTE & AI
  wrangler agent-memory           🧠 Manage Agent Memory namespaces [private beta]
  wrangler ai                     🤖 Manage AI models
  wrangler ai-search              🔍 Manage AI Search instances [open beta]
  wrangler browser                🌐 Manage Browser Run sessions [open beta]
  wrangler containers             📦 Manage Containers
  wrangler delete [name]          🗑️ Delete a Worker from Cloudflare
  wrangler deploy [path]          🆙 Deploy a Worker to Cloudflare
  wrangler deployments            🚢 List and view the current and past deployments for your Worker
  wrangler dev [script]           👂 Start a local server for developing your Worker
  wrangler dispatch-namespace     🏗️ Manage dispatch namespaces
  wrangler flagship               🚩 Manage Flagship apps and feature flags [open beta]
  wrangler init [name]            📥 Initialize a basic Worker
  wrangler pages                  ⚡️ Configure Cloudflare Pages
  wrangler preview [script]       👀 Create a Preview deployment of the current Worker [open beta]
  wrangler queues                 📬 Manage Workers Queues
  wrangler rollback [version-id]  🔙 Rollback a deployment for a Worker
  wrangler secret                 🤫 Generate a secret that can be referenced in a Worker
  wrangler setup                  🪄 Setup a project to work on Cloudflare
  wrangler tail [worker]          🦚 Start a log tailing session for a Worker
  wrangler triggers               🎯 Updates the triggers of your current deployment [experimental]
  wrangler types [path]           📝 Generate types from your Worker configuration
  wrangler versions               🫧 List, view, upload and deploy Versions of your Worker to Cloudflare
  wrangler vpc                    🌐 Manage VPC [open beta]
  wrangler workflows              🔁 Manage Workflows

STORAGE & DATABASES
  wrangler artifacts              🧱 Manage Artifacts namespaces and repos [open beta]
  wrangler basin                  🏞️ Manage Basin products
  wrangler d1                     🗄️ Manage Workers D1 databases
  wrangler hyperdrive             🚀 Manage Hyperdrive databases
  wrangler k2                     ⛰️ Manage K2 streams [open beta]
  wrangler kv                     🗂️ Manage Workers KV Namespaces
  wrangler r2                     📦 Manage R2 buckets & objects
  wrangler secrets-store          🔐 Manage the Secrets Store [open beta]
  wrangler vectorize              🧮 Manage Vectorize indexes

NETWORKING & SECURITY
  wrangler cert                   🪪 Manage client mTLS certificates and CA certificate chains used for secured connections [open beta]
  wrangler mtls-certificate       🪪 Manage certificates used for mTLS connections
  wrangler tunnel                 🚇 Manage Cloudflare Tunnels [experimental]
  wrangler turnstile              🛡️ Manage Turnstile widgets [alpha]

GLOBAL FLAGS
  -c, --config          Path to Wrangler configuration file  [string]
      --cwd             Run as if Wrangler was started in the specified directory instead of the current working directory  [string]
  -e, --env             Environment to use for operations, and for selecting .env and .dev.vars files  [string]
      --env-file        Path to an .env file to load - can be specified multiple times - values from earlier files are overridden by values in later files  [array]
  -h, --help            Show help  [boolean]
      --install-skills  Install Cloudflare skills for detected AI coding agents before running the command  [boolean] [default: false]
      --profile         Use a specific auth profile  [string]
  -v, --version         Show version number  [boolean]

Please report any issues to https://github.com/cloudflare/workers-sdk/issues/new/choose |

3. **Build variables** (Settings → Build → *Variables and secrets* for the build — not the Worker's
   runtime variables; the website reads them while it's being built):

   | Name | Value |
   |---|---|
   |  |  |
   |  |  |

4. Start a build (Deployments → retry the latest build, or push to ). A correct build
   log runs  and , never . The site is at
    (that's ).
5. If  differs from what you put in  on PythonAnywhere, fix  and
    there ([?2004h[?1049h[22;0;0t[1;24r(B[m[4l[?7h[39;49m[?1h=[?1h=[?25l[39;49m(B[m[H[2J[22;11H(B[0;1m[37m[41m[ Directory '/c/Users/Tamerlan/GoKarabakh' does not exist ][39;49m(B[m[?12l[?25h[24;1H[?1049l[23;0;0t
[?1l>[?2004l) and click **Reload** on the Web tab.

---

## Part 3 — Check it

Open `https://SITE` and try:

- the globe, the Trip page map and a search with dates;
- sign in as `traveller@example.com`: profile, itinerary, a booking request, the AI planner
  (it says "demo mode" — free, no AI key needed);
- sign in as `owner@example.com`: confirm the waiting request, add closed dates;
- sign in as `admin@example.com`: approve the pending application.

If the site loads but nothing signs in or loads data, the API address or the CORS setting is wrong:
compare `VITE_API_URL` (Cloudflare build variable) with `CORS_ORIGINS` (PythonAnywhere `.env`).
Changing a Cloudflare build variable needs a new build.

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
