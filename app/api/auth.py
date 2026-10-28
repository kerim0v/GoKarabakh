from flask import Blueprint, jsonify
from flask_jwt_extended import create_access_token

from app.api import common
from app.services import facade

bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")


@bp.route("/login", methods=["POST"])
def login():
    common.rate_limit("login", 10, 300)
    data = common.json_body()
    email = (data.get("email") or "").strip().lower() if isinstance(data.get("email"), str) else ""
    user = facade.get_user_by_email(email) if email else None

    if not user or not user.check_pwd(data.get("password")):
        raise common.ApiError("Invalid email or password", 401, "invalid_credentials")

    token = create_access_token(identity=user.id)
    return jsonify({"access_token": token, "user": user.to_dict()}), 200
