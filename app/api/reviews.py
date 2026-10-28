import datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.api import common
from app.models.review import Review
from app.services import facade

bp = Blueprint("reviews", __name__, url_prefix="/api/v1")


def review_dict(review, author_name):
    d = review.to_dict()
    d["author_name"] = author_name
    return d


@bp.route("/places/<place_id>/reviews", methods=["GET"])
def list_reviews(place_id):
    if not facade.get_place(place_id):
        raise common.ApiError("Place not found", 404, "not_found")
    return jsonify([review_dict(r, name) for r, name in facade.reviews_for_place(place_id)]), 200


@bp.route("/places/<place_id>/reviews", methods=["POST"])
@jwt_required()
def create_review(place_id):
    user = common.current_user()
    data = common.json_body()
    place = facade.get_place(place_id)
    if not place:
        raise common.ApiError("Place not found", 404, "not_found")
    if not facade.has_stayed(user.id, place.id, datetime.date.today()):
        raise common.ApiError("You can review a place after a confirmed visit", 403, "no_confirmed_visit")
    if facade.get_user_review(place.id, user.id):
        raise common.ApiError("You have already reviewed this place", 409, "already_reviewed")

    review = Review(
        place_id=place.id,
        user_id=user.id,
        rating=common.integer(data.get("rating"), "rating", 1, 5),
        comment=common.text(data, "comment", 2000),
    )
    facade.create_review(review)
    return jsonify(review_dict(review, user.name)), 200


@bp.route("/reviews/<review_id>", methods=["DELETE"])
@jwt_required()
def delete_review(review_id):
    user = common.current_user()
    review = facade.get_review(review_id)
    if not review:
        raise common.ApiError("Review not found", 404, "not_found")
    if review.user_id != user.id and user.role != "admin":
        raise common.ApiError("You can't remove this review", 403, "forbidden")
    facade.delete_review(review_id)
    return "", 200
