import datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

import config
from app.api import common
from app.api.places import place_dict
from app.models.ai_plan_log import AiPlanLog
from app.services import demo_planner, facade, trip_planner

bp = Blueprint("ai", __name__, url_prefix="/api/v1/ai")

MAX_TRIP_DAYS = 7


def _with_places(plan, rows, mode):
    places = {row[0].id: place_dict(*row) for row in rows}
    for day in plan["days"]:
        for stop in day["stops"]:
            stop["place"] = places[stop["place_id"]]
    plan["mode"] = mode
    return plan


def _demo_plan(rows, args):
    plan = demo_planner.plan_demo(rows, *args)
    if not plan["days"]:
        raise common.ApiError("No plan could be made from the current listings", 422, "ai_failed")
    return _with_places(plan, rows, "demo")


@bp.route("/plan", methods=["POST"])
@jwt_required()
def plan():
    user = common.current_user()
    data = common.json_body()

    start_date = common.date(data.get("start_date"), "start_date")
    today = datetime.date.today()
    if not today <= start_date <= today + datetime.timedelta(days=730):
        raise common.ApiError("Pick a start date from today up to two years ahead", 400, "date_in_past")
    days = common.integer(data.get("days"), "days", 1, MAX_TRIP_DAYS, default=2)
    guests = common.integer(data.get("guests"), "guests", 1, 20, default=2)
    budget = data.get("budget") if data.get("budget") in trip_planner.BUDGETS else "balanced"
    language = data.get("language") if data.get("language") in trip_planner.LANGUAGES else "en"
    wishes = common.text(data, "wishes", 1000)
    args = (wishes, start_date, days, guests, budget, language)
    rows = facade.query_places()

    # Without an API key the free rule-based planner answers instead of Claude
    if not trip_planner.is_enabled():
        common.rate_limit("demo-plan", 30, 3600)
        return jsonify(_demo_plan(rows, args)), 200

    used = facade.ai_plans_today(user.id)
    if used >= config.AI_DAILY_LIMIT:
        raise common.ApiError("You've used today's AI plans. Try again tomorrow.", 429, "ai_limit")

    entry = AiPlanLog(user_id=user.id, model=config.AI_MODEL)
    try:
        plan, usage = trip_planner.plan_trip(rows, *args)
    except trip_planner.PlannerError as error:
        facade.log_ai_plan(entry)
        if error.code in ("ai_busy", "ai_unavailable"):
            # Claude can't be reached: still give the traveller a plan
            fallback = _demo_plan(rows, args)
            fallback["fallback"] = True
            return jsonify(fallback), 200
        raise common.ApiError("The AI planner couldn't make a plan this time", error.status, error.code)

    entry.succeeded = True
    entry.input_tokens = usage.input_tokens or 0
    entry.output_tokens = usage.output_tokens or 0
    entry.cache_read_tokens = getattr(usage, "cache_read_input_tokens", 0) or 0
    facade.log_ai_plan(entry)

    plan = _with_places(plan, rows, "ai")
    plan["remaining_today"] = config.AI_DAILY_LIMIT - used - 1
    return jsonify(plan), 200
