from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.api import common
from app.api.places import place_dict
from app.models.user import PARTNER_ROLES, ROLES
from app.services import facade

bp = Blueprint("admin", __name__, url_prefix="/api/v1/admin")


def _admin():
    user = common.current_user()
    common.require_role(user, "admin")
    return user


@bp.route("/overview", methods=["GET"])
@jwt_required()
def overview():
    _admin()
    return jsonify(facade.overview_counts()), 200


@bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    _admin()
    q = (request.args.get("q") or "").strip()[:100] or None
    return jsonify([u.to_dict() for u in facade.search_users(q)]), 200


@bp.route("/users/<user_id>/role", methods=["PUT"])
@jwt_required()
def set_role(user_id):
    admin = _admin()
    role = common.json_body().get("role")
    if role not in ROLES:
        raise common.ApiError(f"role must be one of {', '.join(ROLES)}", 400, "invalid_field")
    if user_id == admin.id and role != "admin":
        raise common.ApiError("You can't remove your own admin role", 400, "own_role")
    user = facade.get_user(user_id)
    if not user:
        raise common.ApiError("User not found", 404, "not_found")
    facade.update_user(user.id, {"role": role})
    facade.set_owner_places_active(user.id, role in PARTNER_ROLES or role == "admin")
    return jsonify(user.to_dict()), 200


@bp.route("/users/<user_id>/verification", methods=["PUT"])
@jwt_required()
def set_verification(user_id):
    _admin()
    data = common.json_body()
    user = facade.get_user(user_id)
    if not user:
        raise common.ApiError("User not found", 404, "not_found")
    updates = {key: bool(data[key]) for key in ("id_verified", "licensed") if key in data}
    if not updates:
        raise common.ApiError("Send id_verified and/or licensed", 400, "nothing_to_update")
    return jsonify(facade.update_user(user.id, updates).to_dict()), 200


@bp.route("/places", methods=["GET"])
@jwt_required()
def list_places():
    _admin()
    rows = facade.query_places(include_inactive=True, q=(request.args.get("q") or "").strip()[:100] or None)
    return jsonify([place_dict(*row) for row in rows]), 200
