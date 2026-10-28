from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.api import common
from app.models.partner_application import PartnerApplication
from app.models.user import PARTNER_ROLES
from app.services import facade

bp = Blueprint("partners", __name__, url_prefix="/api/v1/partner-applications")


def application_dict(application, applicant=None):
    d = application.to_dict()
    if applicant:
        d["user_name"] = applicant.name
        d["user_email"] = applicant.email
    return d


def _pending_application(application_id):
    common.require_role(common.current_user(), "admin")
    application = facade.get_partner_application(application_id)
    if not application:
        raise common.ApiError("Application not found", 404, "not_found")
    if application.status != "pending":
        raise common.ApiError("Application has already been decided", 400, "already_decided")
    return application


@bp.route("", methods=["POST"])
@jwt_required()
def create_partner_application():
    user = common.current_user()
    data = common.json_body()

    target_role = data.get("target_role")
    if target_role not in PARTNER_ROLES:
        raise common.ApiError("target_role must be owner or guide", 400, "invalid_field")
    if user.role in PARTNER_ROLES or user.role == "admin":
        raise common.ApiError("Account is already a partner", 400, "already_partner")
    if facade.get_pending_application_for_user(user.id):
        raise common.ApiError("You already have a pending application", 409, "already_pending")

    is_business = target_role == "owner"
    application = PartnerApplication(
        user_id=user.id,
        target_role=target_role,
        company_name=common.text(data, "company_name", 255, required=is_business, label="Company name"),
        tax_id=common.text(data, "tax_id", 100, required=is_business, label="Tax ID"),
        phone=common.text(data, "phone", 50, required=True, label="Phone"),
        bio=common.text(data, "bio", 2000, required=True, label="About you"),
        languages=common.text(data, "languages", 255, required=True, label="Languages"),
        status="pending",
    )
    facade.create_partner_application(application)
    return jsonify(application.to_dict()), 200


@bp.route("", methods=["GET"])
@jwt_required()
def list_partner_applications():
    user = common.current_user()
    if user.role == "admin":
        return jsonify([
            application_dict(a, facade.get_user(a.user_id)) for a in facade.get_partner_applications()
        ]), 200
    return jsonify([a.to_dict() for a in facade.get_partner_applications(user.id)]), 200


@bp.route("/<application_id>/approve", methods=["POST"])
@jwt_required()
def approve_partner_application(application_id):
    application = _pending_application(application_id)
    facade.update_partner_application(application.id, {"status": "approved"})
    facade.update_user(application.user_id, {"role": application.target_role})
    facade.set_owner_places_active(application.user_id, True)
    return jsonify({"status": "Approved"}), 200


@bp.route("/<application_id>/reject", methods=["POST"])
@jwt_required()
def reject_partner_application(application_id):
    application = _pending_application(application_id)
    facade.update_partner_application(application.id, {"status": "rejected"})
    return jsonify({"status": "Rejected"}), 200
