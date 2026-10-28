import datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.api import common
from app.api.places import place_dict
from app.services import facade

bp = Blueprint("itinerary", __name__, url_prefix="/api/v1/itinerary")

MAX_DAYS_AHEAD = 730


def item_dict(item, place):
    d = item.to_dict()
    d["place"] = place_dict(place)
    return d


def schedule_fields(data):
    """`date` (YYYY-MM-DD) and approximate `time` (HH:MM); empty values clear them."""
    fields = {}
    if "date" in data:
        if data["date"] in (None, ""):
            fields["visit_date"] = None
        else:
            visit_date = common.date(data["date"], "date")
            today = datetime.date.today()
            if not today <= visit_date <= today + datetime.timedelta(days=MAX_DAYS_AHEAD):
                raise common.ApiError("Pick a date from today up to two years ahead", 400, "date_in_past")
            fields["visit_date"] = visit_date
    if "time" in data:
        fields["start_time"] = None if data["time"] in (None, "") else common.time_of_day(data["time"], "time")
    return fields


def _own_item(item_id, user):
    item = facade.get_itinerary_item(item_id)
    if not item or item.user_id != user.id:
        raise common.ApiError("Itinerary item not found", 404, "not_found")
    return item


@bp.route("", methods=["GET"])
@jwt_required()
def get_itinerary():
    user = common.current_user()
    return jsonify([item_dict(item, place) for item, place in facade.itinerary_for_user(user.id)]), 200


@bp.route("", methods=["POST"])
@jwt_required()
def add_item():
    user = common.current_user()
    data = common.json_body()
    place = facade.get_place(data.get("place_id"))
    if not place or not place.is_active:
        raise common.ApiError("Place not found", 404, "not_found")
    item = facade.add_to_itinerary(user.id, place.id, **schedule_fields(data))
    return jsonify(item_dict(item, place)), 200


@bp.route("/<item_id>", methods=["PUT"])
@jwt_required()
def update_item(item_id):
    item = _own_item(item_id, common.current_user())
    data = common.json_body()
    updates = schedule_fields(data)
    if "note" in data:
        updates["note"] = common.text(data, "note", 500)
    item = facade.update_itinerary_item(item.id, updates)
    return jsonify(item_dict(item, facade.get_place(item.place_id))), 200


@bp.route("/<item_id>", methods=["DELETE"])
@jwt_required()
def delete_item(item_id):
    item = _own_item(item_id, common.current_user())
    facade.delete_itinerary_item(item.id)
    return "", 200
