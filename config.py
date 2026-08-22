from dotenv import load_dotenv
load_dotenv()

import os

PERCENTAGE_FEE = 2
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///gokarabakh.db")

def is_debugging() -> bool:
    return os.getenv("DEBUG", "False") == "True"
