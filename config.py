from dotenv import load_dotenv
load_dotenv()

import os
import datetime


def _env_bool(name, default="False"):
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes")


DEBUG = _env_bool("DEBUG")

# Coins: 1 coin = 1 AZN off a booking
PERCENTAGE_FEE = 2          # % of the paid amount credited back as coins on a confirmed booking
WELCOME_BONUS = 100
FIRST_TRACE_BONUS = 50

# Required outside DEBUG: create_app() refuses to start without it.
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ACCESS_TOKEN_EXPIRES = datetime.timedelta(hours=int(os.getenv("JWT_ACCESS_TOKEN_HOURS", "8")))
SECRET_KEY = os.getenv("SECRET_KEY") or JWT_SECRET_KEY

_database_url = os.getenv("DATABASE_URL", "sqlite:///gokarabakh.db")
if _database_url.startswith("postgres://"):
    _database_url = _database_url.replace("postgres://", "postgresql://", 1)
SQLALCHEMY_DATABASE_URI = _database_url

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
# Set when running behind a reverse proxy (Render, Heroku, nginx) so rate limits see the real client IP
TRUST_PROXY = _env_bool("TRUST_PROXY")

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER")  # defaults to instance/uploads
MAX_UPLOAD_MB = 5
MAX_CONTENT_LENGTH = 6 * 1024 * 1024        # whole request, uploads included

SMTP_HOST = os.getenv("SMTP_HOST")          # unset = emails are only logged
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_USE_TLS = _env_bool("SMTP_USE_TLS", "True")
MAIL_FROM = os.getenv("MAIL_FROM", "GoKarabakh <no-reply@gokarabakh.local>")

# AI trip planner (Claude). Without an API key the free rule-based demo planner answers instead.
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
AI_MODEL = os.getenv("AI_MODEL", "claude-haiku-5-5")    # claude-opus-5-5 plans better, ~40x the price
AI_EFFORT = os.getenv("AI_EFFORT", "medium")            # low | medium | high
AI_DAILY_LIMIT = int(os.getenv("AI_DAILY_LIMIT", "10"))  # plans per user per day

# Prices are stored in AZN; other currencies are shown as approximations
AZN_PER_USD = float(os.getenv("AZN_PER_USD", "1.70"))
AZN_PER_EUR = float(os.getenv("AZN_PER_EUR", "1.98"))


def is_debugging() -> bool:
    return DEBUG
