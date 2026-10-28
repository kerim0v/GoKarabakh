from itsdangerous import BadSignature, URLSafeTimedSerializer
from flask import current_app

from app.services import facade

RESET_MAX_AGE = 60 * 60  # 1 hour


def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="password-reset")


def _fingerprint(user):
    # Part of the current hash: once the password changes, older links stop working
    return (user.pwd_hash or "")[-16:]


def make_reset_token(user):
    return _serializer().dumps({"id": user.id, "fp": _fingerprint(user)})


def user_from_reset_token(token):
    try:
        data = _serializer().loads(token, max_age=RESET_MAX_AGE)
    except BadSignature:  # also covers SignatureExpired
        return None
    user = facade.get_user(data.get("id"))
    if not user or _fingerprint(user) != data.get("fp"):
        return None
    return user
