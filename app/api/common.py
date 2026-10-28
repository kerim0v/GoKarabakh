import datetime
import re
from decimal import Decimal, InvalidOperation

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity

from app.services import facade, passwords
from app.services.ratelimit import limiter


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ApiError(Exception):
    """Raised from a route to answer with {"error": message, "code": code}."""

    def __init__(self, message, status=400, code=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code

    def response(self):
        body = {"error": self.message}
        if self.code:
            body["code"] = self.code
        return jsonify(body), self.status


def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Invalid or missing JSON", 400, "invalid_json")
    return data


def current_user():
    user = facade.get_user(get_jwt_identity())
    if not user:
        raise ApiError("User not found", 401, "user_not_found")
    return user


def require_role(user, *roles):
    if user.role not in roles:
        raise ApiError("You don't have access to this", 403, "forbidden")


def rate_limit(name, limit, window_seconds):
    if not limiter.hit(f"{name}:{request.remote_addr}", limit, window_seconds):
        raise ApiError("Too many attempts. Please wait a few minutes and try again.", 429, "rate_limited")


def text(data, key, max_len, required=False, label=None):
    """A trimmed string field, None when empty and optional."""
    value = data.get(key)
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            raise ApiError(f"{label or key} is required", 400, "missing_field")
        return None
    if not isinstance(value, str):
        raise ApiError(f"{label or key} must be text", 400, "invalid_field")
    value = value.strip()
    if len(value) > max_len:
        raise ApiError(f"{label or key} is too long (max {max_len} characters)", 400, "too_long")
    return value


def integer(value, key, minimum, maximum, default=None):
    if value is None or value == "":
        if default is not None:
            return default
        raise ApiError(f"{key} is required", 400, "missing_field")
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ApiError(f"{key} must be a whole number", 400, "invalid_field")
    if not minimum <= number <= maximum:
        raise ApiError(f"{key} must be between {minimum} and {maximum}", 400, "invalid_field")
    return number


def money(value, key="cost"):
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ApiError(f"{key} must be a number", 400, "invalid_field")
    if not amount.is_finite() or amount < 0 or amount > 1_000_000:
        raise ApiError(f"{key} must be between 0 and 1000000", 400, "invalid_field")
    return amount.quantize(Decimal("0.01"))


def date(value, key):
    try:
        return datetime.date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ApiError(f"{key} must be a date like 2026-05-31", 400, "invalid_date")


def time_of_day(value, key):
    try:
        return datetime.time.fromisoformat(value)
    except (TypeError, ValueError):
        raise ApiError(f"{key} must be a time like 14:30", 400, "invalid_time")


def email(value):
    if not isinstance(value, str) or not EMAIL_RE.match(value.strip()) or len(value) > 255:
        raise ApiError("Enter a valid email address", 400, "invalid_email")
    return value.strip().lower()


def password(value, email=""):
    if not isinstance(value, str) or len(value) < 8:
        raise ApiError("Password must be at least 8 characters", 400, "password_too_short")
    if len(value) > 128:
        raise ApiError("Password is too long", 400, "too_long")
    code = passwords.problem(value, email)
    if code:
        raise ApiError("This password is too easy to guess. Choose a less common one.", 400, code)
    return value


def media_url(value, key, uploads_only=False):
    """Photo URLs: our own uploads, files shipped with the frontend, or https links."""
    if value is None or value == "":
        return None
    if not isinstance(value, str) or len(value) > 500:
        raise ApiError(f"{key} is not a valid image URL", 400, "invalid_url")
    value = value.strip()
    if value.startswith("/uploads/"):
        return value
    if not uploads_only and (
        (value.startswith("/") and not value.startswith("//")) or value.startswith("https://")
    ):
        return value
    raise ApiError(f"{key} is not a valid image URL", 400, "invalid_url")
