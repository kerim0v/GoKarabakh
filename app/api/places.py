import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request

from app.api import common
from app.models.closed_period import ClosedPeriod
from app.models.place import CATEGORIES, Place
from app.models.regions import REGIONS
from app.models.user import PARTNER_ROLES
from app.services import facade

bp = Blueprint("places", __name__, url_prefix="/api/v1/places")

SORTS = ("popular", "rating", "price_asc", "price_desc")


def place_dict(place, owner=None, bookings=None, avg_rating=None, review_count=None):
    d = place.to_dict()
    d["owner_role"] = owner.role if owner else None
    d["owner_verified"] = bool(owner and owner.id_verified)
    d["owner_licensed"] = bool(owner and owner.licensed)
    if bookings is not None:
        d["bookings_count"] = bookings
    if review_count is not None:
        d["review_count"] = review_count
        d["avg_rating"] = round(float(avg_rating), 1) if avg_rating is not None else None
    return d


def _listing_fields(data, owner, partial=False):
    """Validated listing fields from a create (all required) or update (only those sent) body."""
    fields = {}
    if not partial or "name" in data:
        fields["name"] = common.text(data, "name", 255, required=True, label="Name")
    if not partial or "description" in data:
        fields["description"] = common.text(data, "description", 5000, required=True, label="Description")
    if not partial or "cost" in data:
        if data.get("cost") in (None, ""):
            raise common.ApiError("Cost was not provided", 400, "missing_field")
        fields["cost"] = common.money(data.get("cost"))
    if not partial or "main_photo_url" in data:
        fields["main_photo_url"] = common.media_url(data.get("main_photo_url"), "main_photo_url")
        if not fields["main_photo_url"]:
            raise common.ApiError("A cover photo is required", 400, "missing_field")
    if not partial or "region" in data:
        if data.get("region") not in REGIONS:
            raise common.ApiError(f"region must be one of {', '.join(REGIONS)}", 400, "invalid_region")
        fields["region"] = data["region"]
    if not partial or "category" in data:
        category = "tour" if owner.role == "guide" else data.get("category")
        if category not in CATEGORIES:
            raise common.ApiError(f"category must be one of {', '.join(CATEGORIES)}", 400, "invalid_category")
        fields["category"] = category
    for key, max_len in (("subtitle", 255), ("badge", 100)):
        if key in data:
            fields[key] = common.text(data, key, max_len)
    if "tags" in data:
        tags = data.get("tags") or []
        if not isinstance(tags, list) or len(tags) > 10 or not all(isinstance(t, str) and len(t) <= 50 for t in tags):
            raise common.ApiError("tags must be a list of up to 10 short strings", 400, "invalid_field")
        fields["tags"] = [t.strip() for t in tags if t.strip()]
    return fields


def _search_days(args):
    """First and last day a search covers: the nights of a stay, or the single date."""
    if not args.get("check_in"):
        return None, None
    check_in = common.date(args.get("check_in"), "check_in")
    if not args.get("check_out"):
        return check_in, check_in
    check_out = common.date(args.get("check_out"), "check_out")
    if check_out <= check_in:
        raise common.ApiError("Check-out must be after check-in", 400, "checkout_before_checkin")
    return check_in, check_out - datetime.timedelta(days=1)


def _owned_place(place_id, user):
    if not place_id:
        raise common.ApiError("Place id was not provided", 400, "missing_field")
    place = facade.get_place(place_id)
    if not place:
        raise common.ApiError("No place with specified id.", 404, "not_found")
    if place.owner_user_id != user.id and user.role != "admin":
        raise common.ApiError("You are not the owner of this place", 403, "forbidden")
    return place


@bp.route("/get")
def get_places():
    args = request.args
    region = args.get("region")
    category = args.get("category")
    if region and region not in REGIONS:
        raise common.ApiError("Unknown region", 400, "invalid_region")
    if category and category not in CATEGORIES:
        raise common.ApiError("Unknown category", 400, "invalid_category")
    limit = common.integer(args.get("limit"), "limit", 1, 500, default=500)
    open_from, open_to = _search_days(args)
    rows = facade.query_places(
        region=region,
        category=category,
        kind=args.get("kind"),
        q=(args.get("q") or "").strip()[:100] or None,
        sort=args.get("sort") if args.get("sort") in SORTS else None,
        limit=limit,
        open_from=open_from,
        open_to=open_to,
    )
    return jsonify([place_dict(*row) for row in rows])


@bp.route("/get_id")
def get_place_by_id():
    place = facade.get_place(request.args.get("id"))
    if place and not place.is_active:
        verify_jwt_in_request(optional=True)
        viewer = facade.get_user(get_jwt_identity()) if get_jwt_identity() else None
        if not viewer or (viewer.id != place.owner_user_id and viewer.role != "admin"):
            place = None
    if not place:
        raise common.ApiError("No place with specified id.", 404, "not_found")
    rows = facade.query_places(owner_id=place.owner_user_id, include_inactive=True)
    return jsonify(next(place_dict(*row) for row in rows if row[0].id == place.id))


@bp.route("/get_places_by_tags")
def get_places_by_tags():
    tags = request.args.getlist("tags")
    return jsonify([p.to_dict() for p in facade.places_by_tag(tags)])


@bp.route("/mine")
@jwt_required()
def my_places():
    user = common.current_user()
    rows = facade.query_places(owner_id=user.id, include_inactive=True)
    return jsonify([place_dict(*row) for row in rows])


@bp.route("/create", methods=["POST"])
@jwt_required()
def create_place():
    owner = common.current_user()
    if owner.role not in PARTNER_ROLES:
        raise common.ApiError("Only business owners and guides can create listings", 403, "forbidden")
    place = Place(owner_user_id=owner.id, tags=[], **_listing_fields(common.json_body(), owner))
    facade.create_place(place)
    return jsonify(place_dict(place, owner, 0, None, 0)), 200


@bp.route("/update", methods=["PUT"])
@jwt_required()
def update_place():
    user = common.current_user()
    data = common.json_body()
    place = _owned_place(data.get("id"), user)
    owner = facade.get_user(place.owner_user_id)
    updates = _listing_fields(data, owner, partial=True)
    if not updates:
        raise common.ApiError("No valid fields to update", 400, "nothing_to_update")
    updated = facade.update_place(place.id, updates)
    return jsonify(place_dict(updated, owner)), 200


@bp.route("/delete", methods=["POST"])
@jwt_required()
def delete_place():
    user = common.current_user()
    place = _owned_place(common.json_body().get("id"), user)
    facade.delete_place(place.id)
    return "", 200


@bp.route("/stats", methods=["GET"])
@jwt_required()
def get_owner_stats():
    owner = common.current_user()
    if owner.role not in PARTNER_ROLES:
        raise common.ApiError("Only business owners and guides can view stats", 403, "forbidden")

    place_stats = []
    for place, bookings, revenue, pending in facade.owner_stats(owner.id):
        place_stats.append({
            "place_id": place.id,
            "name": place.name,
            "bookings": bookings,
            "pending": pending,
            "revenue": float(revenue),
        })
    return jsonify({
        "places": place_stats,
        "total_bookings": sum(p["bookings"] for p in place_stats),
        "total_pending": sum(p["pending"] for p in place_stats),
        "total_revenue": sum(p["revenue"] for p in place_stats),
    }), 200


# Closed dates -------------------------------------

@bp.route("/<place_id>/closed", methods=["GET"])
@jwt_required()
def list_closed_periods(place_id):
    place = _owned_place(place_id, common.current_user())
    return jsonify([p.to_dict() for p in facade.closed_periods_for_place(place.id)]), 200


@bp.route("/<place_id>/closed", methods=["POST"])
@jwt_required()
def add_closed_period(place_id):
    place = _owned_place(place_id, common.current_user())
    data = common.json_body()
    start = common.date(data.get("start_date"), "start_date")
    end = common.date(data.get("end_date") or data.get("start_date"), "end_date")
    if end < start:
        raise common.ApiError("The end date is before the start date", 400, "checkout_before_checkin")
    if end < datetime.date.today():
        raise common.ApiError("The dates are in the past", 400, "date_in_past")
    if (end - start).days > 366:
        raise common.ApiError("Close at most one year at a time", 400, "stay_too_long")
    period = ClosedPeriod(place_id=place.id, start_date=start, end_date=end, note=common.text(data, "note", 200))
    facade.add_closed_period(period)
    return jsonify(period.to_dict()), 200


@bp.route("/closed/<period_id>", methods=["DELETE"])
@jwt_required()
def delete_closed_period(period_id):
    period = facade.get_closed_period(period_id)
    if not period:
        raise common.ApiError("Closed period not found", 404, "not_found")
    _owned_place(period.place_id, common.current_user())
    facade.delete_closed_period(period)
    return "", 200
