from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

import config
from app.api import common
from app.models.community_trace import DISTRICT_SLUGS, CommunityTrace
from app.services import facade

bp = Blueprint("community", __name__, url_prefix="/api/v1/community")

FIRST_TRACE_REASON = "Shared your first community trace"


def trace_dict(trace, author_name):
    d = trace.to_dict()
    d["author_name"] = author_name
    return d


@bp.route("/traces", methods=["POST"])
@jwt_required()
def create_community_trace():
    author = common.current_user()
    data = common.json_body()

    region_slug = data.get("region_slug")
    if region_slug not in DISTRICT_SLUGS:
        raise common.ApiError(f"region_slug must be one of {', '.join(DISTRICT_SLUGS)}", 400, "invalid_region")
    trace = CommunityTrace(
        user_id=author.id,
        region_slug=region_slug,
        caption=common.text(data, "caption", 500, required=True, label="Caption"),
        photo_url=common.media_url(data.get("photo_url"), "photo_url", uploads_only=True),
    )
    facade.create_community_trace(trace)

    if not facade.has_kx_transaction_reason(author.id, FIRST_TRACE_REASON):
        facade.grant_kx(author, config.FIRST_TRACE_BONUS, FIRST_TRACE_REASON)

    return jsonify(trace_dict(trace, author.name)), 200


@bp.route("/traces", methods=["GET"])
def list_community_traces():
    region = request.args.get("region")
    limit = common.integer(request.args.get("limit"), "limit", 1, 200, default=100)
    return jsonify([trace_dict(t, name) for t, name in facade.get_community_traces(region, limit)]), 200


@bp.route("/traces/<trace_id>", methods=["DELETE"])
@jwt_required()
def delete_community_trace(trace_id):
    user = common.current_user()
    trace = facade.get_community_trace(trace_id)
    if not trace:
        raise common.ApiError("Trace not found", 404, "not_found")
    if trace.user_id != user.id and user.role != "admin":
        raise common.ApiError("You can't remove this trace", 403, "forbidden")
    facade.delete_community_trace(trace_id)
    return "", 200
