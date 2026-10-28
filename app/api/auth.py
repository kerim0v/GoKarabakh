from flask import Blueprint, jsonify
from flask_jwt_extended import create_access_token

from app.api import common
from app.services import facade
from app.services.mailer import frontend_link, send_mail
from app.services.tokens import make_reset_token, user_from_reset_token

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


@bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    common.rate_limit("forgot", 5, 900)
    data = common.json_body()
    email = data.get("email").strip().lower() if isinstance(data.get("email"), str) else ""
    user = facade.get_user_by_email(email) if email else None
    if user and user.pwd_hash:
        link = frontend_link(f"/reset-password?token={make_reset_token(user)}")
        send_mail(user.email, "Reset your GoKarabakh password",
                  f"Hi {user.name},\n\nUse this link within an hour to choose a new password:\n{link}\n\n"
                  "If you didn't ask for this, you can ignore this email.")
    # Same answer either way, so the form can't be used to find out who has an account
    return jsonify({"status": "If that email has an account, a reset link is on its way."}), 200


@bp.route("/reset-password", methods=["POST"])
def reset_password():
    common.rate_limit("reset", 10, 900)
    data = common.json_body()
    user = user_from_reset_token(data.get("token") or "")
    if not user:
        raise common.ApiError("This reset link is invalid or has expired", 400, "invalid_token")
    user.hash_pwd(common.password(data.get("password"), user.email))
    facade.commit()
    return jsonify({"status": "Password updated"}), 200
