from dotenv import load_dotenv
load_dotenv()

import os
import datetime

PERCENTAGE_FEE = 2
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
JWT_ACCESS_TOKEN_EXPIRES = datetime.timedelta(hours=int(os.getenv("JWT_ACCESS_TOKEN_HOURS", "8")))

_database_url = os.getenv("DATABASE_URL", "sqlite:///gokarabakh.db")
if _database_url.startswith("postgres://"):
    _database_url = _database_url.replace("postgres://", "postgresql://", 1)
SQLALCHEMY_DATABASE_URI = _database_url

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

def is_debugging() -> bool:
    return os.getenv("DEBUG", "False") == "True"
