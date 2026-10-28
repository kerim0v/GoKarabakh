from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request

import config
from app.api import common
from app.models.user import User
from app.services import facade

bp = Blueprint("users", __name__, url_prefix="/api/v1/users")


def _birth_fields(data):
    fields = {}
    for key, low, high in (("year_of_birth", 1900, 2100), ("month_of_birth", 1, 12), ("day_of_birth", 1, 31)):
        if data.get(key) not in (None, ""):
            fields[key] = common.integer(data.get(key), key, low, high)
    return fields


@bp.route("/create", methods=["POST"])
def create_user():
    common.rate_limit("signup", 10, 3600)
    data = common.json_body()
    about_me = data.get("about_me") or {}
    if not isinstance(about_me, dict):
        raise common.ApiError("about_me must be an object", 400, "invalid_field")

    email = common.email(data.get("email"))
    password = common.password(data.get("password"))
    name = common.text(about_me, "name", 255, required=True, label="Name")

    if facade.get_user_by_email(email):
        raise common.ApiError("Email is already registered", 409, "email_taken")

    user = User(kx_count=0, name=name, email=email, role="user", **_birth_fields(about_me))
    user.hash_pwd(password)
    facade.create_user(user)
    facade.grant_kx(user, config.WELCOME_BONUS, "Welcome bonus")
    return jsonify({"status": "User created successfully"}), 200


@bp.route("/get")
@jwt_required()
def get_users_api():
    common.require_role(common.current_user(), "admin")
    return jsonify([user.to_dict() for user in facade.get_users()])


@bp.route("/get_id")
def get_user():
    user_id = request.args.get("id")
    if not user_id:
        raise common.ApiError("Provide the user ID", 400, "missing_field")
    user = facade.get_user(user_id)
    if not user:
        raise common.ApiError("No user with specified id.", 404, "not_found")

    # Full profile only for the user themself and admins; everyone else sees name + role.
    verify_jwt_in_request(optional=True)
    viewer = facade.get_user(get_jwt_identity()) if get_jwt_identity() else None
    if viewer and (viewer.id == user.id or viewer.role == "admin"):
        return jsonify(user.to_dict())
    return jsonify(user.public_dict())


@bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    return jsonify(common.current_user().to_dict()), 200


@bp.route("/update", methods=["PUT"])
@jwt_required()
def update_user_route():
    user = common.current_user()
    data = common.json_body()
    updates = _birth_fields(data)
    if "name" in data:
        updates["name"] = common.text(data, "name", 255, required=True, label="Name")
    if not updates:
        raise common.ApiError("No valid fields to update", 400, "nothing_to_update")
    return jsonify(facade.update_user(user.id, updates).to_dict()), 200


@bp.route("/delete", methods=["POST"])
@jwt_required()
def delete_user():
    user = common.current_user()
    data = common.json_body()
    if not user.check_pwd(data.get("password")):
        raise common.ApiError("Invalid password", 401, "invalid_password")
    facade.delete_user(user.id)
    return "", 200


@bp.route("/kx_transactions", methods=["GET"])
@jwt_required()
def get_kx_transactions():
    user = common.current_user()
    return jsonify([t.to_dict() for t in facade.kx_transactions_for_user(user.id)]), 200
