from flask import Blueprint, jsonify

import config
from app.models.place import BOOKABLE_CATEGORIES, CATEGORIES
from app.models.regions import REGIONS
from app.services import trip_planner

bp = Blueprint("meta", __name__, url_prefix="/api/v1")


@bp.route("/meta", methods=["GET"])
def meta():
    """Constants the frontend needs: regions, categories, coin rules and display currency rates."""
    return jsonify({
        "regions": REGIONS,
        "categories": CATEGORIES,
        "bookable_categories": BOOKABLE_CATEGORIES,
        "coins": {
            "welcome_bonus": config.WELCOME_BONUS,
            "first_trace_bonus": config.FIRST_TRACE_BONUS,
            "percentage_fee": config.PERCENTAGE_FEE,
        },
        "ai": {"enabled": trip_planner.is_enabled(), "daily_limit": config.AI_DAILY_LIMIT},
        "currency": {
            "base": "AZN",
            # how many units of each currency one AZN buys
            "rates": {
                "AZN": 1,
                "USD": round(1 / config.AZN_PER_USD, 4),
                "EUR": round(1 / config.AZN_PER_EUR, 4),
            },
        },
    }), 200
