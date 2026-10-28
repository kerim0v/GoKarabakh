import json
from types import SimpleNamespace

import anthropic
import httpx2
import pytest

import config
from app.models.ai_plan_log import AiPlanLog
from app.services import trip_planner
from tests.conftest import days_from_now


def fake_response(payload, stop_reason="end_turn"):
    return SimpleNamespace(
        stop_reason=stop_reason,
        content=[SimpleNamespace(type="text", text=json.dumps(payload))],
        usage=SimpleNamespace(input_tokens=1200, output_tokens=300, cache_read_input_tokens=1000),
    )


@pytest.fixture
def ai(monkeypatch):
    """Enable the planner and capture what would be sent to Claude."""
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "test-key")
    calls = []
    state = {"response": None, "error": None}

    def create(**kwargs):
        calls.append(kwargs)
        if state["error"]:
            raise state["error"]
        return state["response"]

    monkeypatch.setattr(trip_planner, "_create_message", create)
    return SimpleNamespace(calls=calls, state=state)


@pytest.fixture
def places(make_user, make_place):
    owner = make_user(email="owner@example.com", role="owner")
    return {
        "hotel": make_place(owner, name="Hill Hotel"),
        "sight": make_place(owner, category="attraction", cost=0, name="Jidir Plain"),
        "food": make_place(owner, category="restaurant", cost=30, name="Qala"),
    }


def plan_body(**extra):
    return {"start_date": days_from_now(3), "days": 2, "guests": 2, "budget": "balanced",
            "language": "az", "wishes": "History and sunsets", **extra}


def test_disabled_without_api_key(client, make_user, login, monkeypatch):
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", None)
    make_user()
    assert client.get("/api/v1/meta").get_json()["ai"]["enabled"] is False
    res = client.post("/api/v1/ai/plan", headers=login("traveller@example.com"), json=plan_body())
    assert res.status_code == 503 and res.get_json()["code"] == "ai_disabled"


def test_plan_uses_only_real_places_and_requested_dates(client, make_user, login, ai, places):
    make_user()
    first, second = days_from_now(3), days_from_now(4)
    ai.state["response"] = fake_response({
        "summary": "Plan",
        "days": [
            {"date": first, "title": "Shusha", "stops": [
                {"place_id": places["hotel"].id, "time": "17:00", "reason": "Rest"},
                {"place_id": places["sight"].id, "time": "09:30", "reason": "Views"},
                {"place_id": "made-up-place", "time": "12:00", "reason": "Invented"},
            ]},
            {"date": second, "title": "Food", "stops": [{"place_id": places["food"].id, "time": "noon", "reason": "Lunch"}]},
            {"date": days_from_now(9), "title": "Outside the trip", "stops": [{"place_id": places["sight"].id, "time": "10:00", "reason": "x"}]},
        ],
        "tips": ["Bring a jacket"],
    })
    res = client.post("/api/v1/ai/plan", headers=login("traveller@example.com"), json=plan_body())
    assert res.status_code == 200, res.get_json()
    plan = res.get_json()
    assert [d["date"] for d in plan["days"]] == [first, second]
    assert [s["place"]["name"] for s in plan["days"][0]["stops"]] == ["Jidir Plain", "Hill Hotel"]  # invented stop dropped, sorted by time
    assert plan["days"][1]["stops"][0]["time"] is None
    assert plan["remaining_today"] == config.AI_DAILY_LIMIT - 1

    sent = ai.calls[0]
    assert sent["model"] == config.AI_MODEL
    assert sent["system"][0]["cache_control"] == {"type": "ephemeral"}
    assert places["hotel"].id in sent["system"][0]["text"]
    assert "Azerbaijani" in sent["messages"][0]["content"]
    assert sent["output_config"]["format"]["type"] == "json_schema"
    assert sent["fallbacks"] == "default"

    entry = AiPlanLog.query.one()
    assert entry.succeeded and entry.cache_read_tokens == 1000


def test_refusal_and_api_errors_are_reported(client, make_user, login, ai, places):
    make_user()
    headers = login("traveller@example.com")
    ai.state["response"] = fake_response({}, stop_reason="refusal")
    res = client.post("/api/v1/ai/plan", headers=headers, json=plan_body())
    assert res.status_code == 422 and res.get_json()["code"] == "ai_refused"

    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    ai.state["error"] = anthropic.APIConnectionError(request=request)
    res = client.post("/api/v1/ai/plan", headers=headers, json=plan_body())
    assert res.status_code == 503 and res.get_json()["code"] == "ai_unavailable"
    assert AiPlanLog.query.count() == 2  # failed attempts count towards the limit


def test_daily_limit(client, make_user, login, ai, places, monkeypatch):
    monkeypatch.setattr(config, "AI_DAILY_LIMIT", 1)
    make_user()
    headers = login("traveller@example.com")
    ai.state["response"] = fake_response({"summary": "", "tips": [], "days": [
        {"date": days_from_now(3), "title": "", "stops": [{"place_id": places["sight"].id, "time": "10:00", "reason": ""}]}]})
    assert client.post("/api/v1/ai/plan", headers=headers, json=plan_body()).status_code == 200
    res = client.post("/api/v1/ai/plan", headers=headers, json=plan_body())
    assert res.status_code == 429 and res.get_json()["code"] == "ai_limit"
    assert len(ai.calls) == 1


def test_plan_input_validation(client, make_user, login, ai, places):
    make_user()
    headers = login("traveller@example.com")
    assert client.post("/api/v1/ai/plan", headers=headers, json=plan_body(start_date=days_from_now(-1))).status_code == 400
    assert client.post("/api/v1/ai/plan", headers=headers, json=plan_body(days=30)).status_code == 400
    assert client.post("/api/v1/ai/plan", headers=headers, json=plan_body(wishes="x" * 2000)).status_code == 400
    assert client.post("/api/v1/ai/plan", json=plan_body()).status_code == 401
    assert ai.calls == []
