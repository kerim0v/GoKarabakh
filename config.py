from dotenv import load_dotenv
load_dotenv()

import os

PERCENTAGE_FEE = 2
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-production")

def is_debugging() -> bool:
    return os.getenv("DEBUG", "False") == "True"
