"""AI trip planner: asks Claude to build a day-by-day plan using only GoKarabakh's own listings."""
import datetime
import json
import logging

import anthropic

import config

log = logging.getLogger(__name__)

LANGUAGES = {"en": "English", "az": "Azerbaijani", "ru": "Russian"}
BUDGETS = {
    "economy": "keep costs low - prefer cheaper stays and free sights",
    "balanced": "a mix of comfort and value",
    "premium": "comfort first - the best-rated stays and experiences",
}
# Models that accept the server-side refusal fallback (`fallbacks: "default"`)
FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"}

SYSTEM_PROMPT = """You are the trip planner of GoKarabakh, a booking site for travel in the Karabakh region of Azerbaijan.
You build realistic day-by-day itineraries for travellers using only the places in the catalogue below.

How to plan:
- Use only place_id values from the catalogue. Never invent places, prices, opening hours or facts.
- Respect the traveller's wishes, group size and budget. Prices are in AZN: hotels per night, restaurants and tours per person, attractions are free when the price is 0.
- Keep each day's route sensible: stay within one region or neighbouring regions, and leave travel time between regions.
- Give every stop an approximate start time (HH:MM, 24-hour) in a natural order: sights and tours by day, meals at meal times, the hotel check-in in the afternoon or evening. Put a hotel on each night of a multi-day trip.
- Two to five stops per day. Fewer is fine when the catalogue doesn't offer more that fits.
- In "reason", tell the traveller in one sentence why this stop fits their wishes.
- Write all text (summary, titles, reasons, tips) in the language requested.
- If the wishes can't be met with the catalogue, say so in the summary and plan the closest good trip.

Catalogue (one place per line: place_id | name | region | category | price AZN | rating):
"""

PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "days": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "YYYY-MM-DD"},
                    "title": {"type": "string"},
                    "stops": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "place_id": {"type": "string"},
                                "time": {"type": "string", "description": "HH:MM, 24-hour"},
                                "reason": {"type": "string"},
                            },
                            "required": ["place_id", "time", "reason"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["date", "title", "stops"],
                "additionalProperties": False,
            },
        },
        "tips": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "days", "tips"],
    "additionalProperties": False,
}


class PlannerError(Exception):
    """A plan couldn't be made; `code` is shown to the traveller (translated in the frontend)."""

    def __init__(self, code, status=502):
        super().__init__(code)
        self.code = code
        self.status = status


def is_enabled():
    return bool(config.ANTHROPIC_API_KEY)


def catalogue_text(rows):
    """Stable, sorted listing of the places, so the cached prompt prefix only changes when listings do."""
    lines = []
    for place, _role, _bookings, avg_rating, review_count in sorted(rows, key=lambda row: row[0].id):
        rating = f"{float(avg_rating):.1f} ({review_count})" if review_count else "no reviews"
        lines.append(f"{place.id} | {place.name} | {place.region} | {place.category} | {float(place.cost):g} | {rating}")
    return "\n".join(lines)


def _create_message(**kwargs):
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY, timeout=120.0, max_retries=1)
    return client.beta.messages.create(**kwargs)


def plan_trip(rows, wishes, start_date, days, guests, budget, language):
    """Returns (plan dict, usage). `rows` are facade.query_places() rows of active places."""
    request = (
        f"Wishes: {wishes or 'no special wishes - show the highlights'}\n"
        f"Dates: {days} day(s), from {start_date.isoformat()} "
        f"({', '.join((start_date + datetime.timedelta(days=i)).isoformat() for i in range(days))})\n"
        f"Group: {guests} traveller(s)\n"
        f"Budget: {budget} - {BUDGETS[budget]}\n"
        f"Answer in {LANGUAGES[language]}."
    )
    params = dict(
        model=config.AI_MODEL,
        max_tokens=16000,
        # The catalogue is the same for every traveller, so it's cached between requests
        system=[{"type": "text", "text": SYSTEM_PROMPT + catalogue_text(rows), "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": request}],
        output_config={"effort": config.AI_EFFORT, "format": {"type": "json_schema", "schema": PLAN_SCHEMA}},
    )
    if config.AI_MODEL in FALLBACK_MODELS:
        params.update(betas=["server-side-fallback-2026-07-01"], fallbacks="default")

    try:
        response = _create_message(**params)
    except anthropic.RateLimitError:
        raise PlannerError("ai_busy", 503)
    except anthropic.APIConnectionError:
        raise PlannerError("ai_unavailable", 503)
    except anthropic.APIStatusError as error:
        log.error("Claude API error %s: %s", error.status_code, error.message)
        raise PlannerError("ai_unavailable", 503 if error.status_code >= 500 else 502)

    usage = response.usage
    if response.stop_reason == "refusal":
        raise PlannerError("ai_refused", 422)
    if response.stop_reason == "max_tokens":
        raise PlannerError("ai_failed")
    text = next((block.text for block in response.content if block.type == "text"), "")
    try:
        plan = json.loads(text)
    except json.JSONDecodeError:
        raise PlannerError("ai_failed")
    return clean_plan(plan, rows, start_date, days), usage


def clean_plan(plan, rows, start_date, days):
    """Keep only stops that point at real places on the requested dates, with valid times."""
    places = {row[0].id: row[0] for row in rows}
    allowed_dates = {(start_date + datetime.timedelta(days=i)).isoformat() for i in range(days)}
    clean_days = []
    for day in plan.get("days", []):
        if day.get("date") not in allowed_dates:
            continue
        stops = []
        for stop in day.get("stops", []):
            if stop.get("place_id") not in places:
                continue
            try:
                time = datetime.time.fromisoformat(stop.get("time", "")).strftime("%H:%M")
            except ValueError:
                time = None
            stops.append({"place_id": stop["place_id"], "time": time, "reason": str(stop.get("reason", ""))[:500]})
        stops.sort(key=lambda s: s["time"] or "99")
        if stops:
            clean_days.append({"date": day["date"], "title": str(day.get("title", ""))[:200], "stops": stops})
    clean_days.sort(key=lambda d: d["date"])
    if not clean_days:
        raise PlannerError("ai_failed")
    return {
        "summary": str(plan.get("summary", ""))[:2000],
        "days": clean_days,
        "tips": [str(tip)[:300] for tip in plan.get("tips", [])][:6],
    }
