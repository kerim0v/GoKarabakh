from app.database import db
from app.models.user import User
from tests.conftest import days_from_now


# Auth & accounts

def test_signup_normalises_email_and_grants_welcome_bonus(client):
    res = client.post("/api/v1/users/create", json={
        "email": "  New@Example.COM ", "password": "mountain-route-7", "about_me": {"name": "Leyla"},
    })
    assert res.status_code == 200
    user = User.query.one()
    assert user.email == "new@example.com"
    assert user.kx_count == 100

    dup = client.post("/api/v1/users/create", json={
        "email": "new@example.com", "password": "mountain-route-7", "about_me": {"name": "Leyla"},
    })
    assert dup.status_code == 409
    assert dup.get_json()["code"] == "email_taken"

    res = client.post("/api/v1/auth/login", json={"email": "NEW@example.com", "password": "mountain-route-7"})
    assert res.status_code == 200


def test_signup_validates_input(client):
    assert client.post("/api/v1/users/create", json={"email": "bad", "password": "password123",
                                                     "about_me": {"name": "A"}}).status_code == 400
    assert client.post("/api/v1/users/create", json={"email": "a@b.co", "password": "short",
                                                     "about_me": {"name": "A"}}).status_code == 400
    assert client.post("/api/v1/users/create", data="null",
                       content_type="application/json").status_code == 400


def test_common_passwords_are_rejected(client, make_user, login):
    for bad, code in (
        ("password123", "password_too_common"), ("Karabakh1", "password_too_common"), ("aaaaaaaa", "password_too_common"),
        ("23456789", "password_too_common"), ("leyla.m@example.com", "password_like_email"), ("leyla.m2024", "password_like_email"),
    ):
        res = client.post("/api/v1/users/create", json={"email": "leyla.m@example.com", "password": bad, "about_me": {"name": "L"}})
        assert res.get_json()["code"] == code, bad
    make_user()
    res = client.post("/api/v1/users/change-password", headers=login("traveller@example.com"),
                      json={"current_password": "password123", "new_password": "qwerty123"})
    assert res.get_json()["code"] == "password_too_common"


def test_login_is_rate_limited(client, make_user):
    make_user()
    for _ in range(10):
        client.post("/api/v1/auth/login", json={"email": "traveller@example.com", "password": "wrong"})
    res = client.post("/api/v1/auth/login", json={"email": "traveller@example.com", "password": "password123"})
    assert res.status_code == 429


def test_errors_are_json(client):
    res = client.get("/api/v1/users/me")
    assert res.status_code == 401
    assert res.get_json()["code"] == "token_missing"
    assert client.get("/api/v1/nope").get_json()["code"] == "not_found"


def test_user_list_is_admin_only(client, make_user, login):
    make_user()
    make_user(email="admin@example.com", role="admin")
    assert client.get("/api/v1/users/get").status_code == 401
    assert client.get("/api/v1/users/get", headers=login("traveller@example.com")).status_code == 403
    res = client.get("/api/v1/users/get", headers=login("admin@example.com"))
    assert res.status_code == 200
    assert all("pwd_hash" not in u for u in res.get_json())


def test_user_by_id_hides_private_fields_from_others(client, make_user, login):
    user = make_user()
    make_user(email="other@example.com")
    public = client.get(f"/api/v1/users/get_id?id={user.id}").get_json()
    assert public == {"id": user.id, "name": "Traveller", "role": "user"}
    own = client.get(f"/api/v1/users/get_id?id={user.id}", headers=login("traveller@example.com")).get_json()
    assert own["email"] == "traveller@example.com"
    other = client.get(f"/api/v1/users/get_id?id={user.id}", headers=login("other@example.com")).get_json()
    assert "email" not in other


def test_delete_account_cascades(client, make_user, make_place, login):
    owner = make_user(email="owner@example.com", role="owner")
    make_place(owner)
    headers = login("owner@example.com")
    assert client.post("/api/v1/users/delete", json={"password": "nope"}, headers=headers).status_code == 401
    assert client.post("/api/v1/users/delete", json={"password": "password123"}, headers=headers).status_code == 200
    assert client.get("/api/v1/places/get").get_json() == []


def test_missing_jwt_secret_refuses_to_start(monkeypatch):
    import config
    from app import create_app
    import pytest
    monkeypatch.setattr(config, "JWT_SECRET_KEY", None)
    with pytest.raises(RuntimeError):
        create_app({"JWT_SECRET_KEY": None, "DEBUG": False, "SQLALCHEMY_DATABASE_URI": "sqlite://"})


# Places

def test_partner_listing_is_found_by_region_and_category(client, make_user, login):
    make_user(email="owner@example.com", role="owner")
    headers = login("owner@example.com")
    res = client.post("/api/v1/places/create", headers=headers, json={
        "name": "Hill Hotel", "description": "Rooms", "cost": "85.5", "main_photo_url": "/uploads/a.jpg",
        "region": "lachin", "category": "hotel",
    })
    assert res.status_code == 200, res.get_json()
    found = client.get("/api/v1/places/get?region=lachin&category=hotel").get_json()
    assert [p["name"] for p in found] == ["Hill Hotel"]
    assert found[0]["cost"] == 85.5


def test_listing_validation_and_roles(client, make_user, login):
    make_user()
    make_user(email="guide@example.com", role="guide")
    body = {"name": "Walk", "description": "x", "cost": 10, "main_photo_url": "/a.jpg",
            "region": "shusha", "category": "hotel"}
    assert client.post("/api/v1/places/create", json=body,
                       headers=login("traveller@example.com")).status_code == 403
    guide = login("guide@example.com")
    res = client.post("/api/v1/places/create", json=body, headers=guide)
    assert res.get_json()["category"] == "tour"  # guides only list tours
    for bad in ({"cost": -1}, {"cost": "abc"}, {"region": "paris"}, {"main_photo_url": "javascript:alert(1)"},
                {"main_photo_url": "data:image/png;base64,xx"}):
        assert client.post("/api/v1/places/create", json={**body, **bad}, headers=guide).status_code == 400


def test_only_owner_or_admin_can_edit(client, make_user, make_place, login):
    owner = make_user(email="owner@example.com", role="owner")
    make_user(email="other@example.com", role="owner")
    make_user(email="admin@example.com", role="admin")
    place = make_place(owner)
    body = {"id": place.id, "name": "Renamed"}
    assert client.put("/api/v1/places/update", json=body, headers=login("other@example.com")).status_code == 403
    assert client.put("/api/v1/places/update", json=body, headers=login("owner@example.com")).status_code == 200
    assert client.post("/api/v1/places/delete", json={"id": place.id},
                       headers=login("admin@example.com")).status_code == 200


def test_inactive_places_are_hidden(client, make_user, make_place):
    owner = make_user(email="owner@example.com", role="owner")
    place = make_place(owner, active=False)
    assert client.get("/api/v1/places/get").get_json() == []
    assert client.get(f"/api/v1/places/get_id?id={place.id}").status_code == 404


# Bookings & coins

def test_booking_lifecycle_records_every_coin_change(client, make_user, make_place, login):
    owner = make_user(email="owner@example.com", role="owner")
    traveller = make_user(kx=30)
    place = make_place(owner, cost=100)
    t_headers = login("traveller@example.com")

    res = client.post("/api/v1/places/book_request", headers=t_headers, json={
        "place_id": place.id, "check_in": days_from_now(3), "check_out": days_from_now(5),
        "guests": 2, "use_kx": True,
    })
    assert res.status_code == 200, res.get_json()
    booking = res.get_json()
    assert booking["total_cost"] == 200 and booking["coins_used"] == 30
    db.session.refresh(traveller)
    assert traveller.kx_count == 0

    assert client.post(f"/api/v1/places/book_requests/{booking['id']}/confirm",
                       headers=login("owner@example.com")).status_code == 200
    db.session.refresh(traveller)
    assert traveller.kx_count == round(170 * 0.02)  # earned on what was paid

    txs = client.get("/api/v1/users/kx_transactions", headers=t_headers).get_json()
    assert sum(t["amount"] for t in txs) == traveller.kx_count - 30  # started with 30, no tx for that

    stats = client.get("/api/v1/places/stats", headers=login("owner@example.com")).get_json()
    assert stats["total_bookings"] == 1 and stats["total_revenue"] == 200


def test_decline_refunds_coins(client, make_user, make_place, login):
    owner = make_user(email="owner@example.com", role="owner")
    traveller = make_user(kx=50)
    place = make_place(owner, category="restaurant", cost=20)
    res = client.post("/api/v1/places/book_request", headers=login("traveller@example.com"), json={
        "place_id": place.id, "check_in": days_from_now(1), "guests": 2, "use_kx": True,
    })
    booking = res.get_json()
    assert booking["total_cost"] == 40 and booking["coins_used"] == 40
    client.post(f"/api/v1/places/book_requests/{booking['id']}/decline", headers=login("owner@example.com"))
    db.session.refresh(traveller)
    assert traveller.kx_count == 50


def test_booking_validation(client, make_user, make_place, login):
    owner = make_user(email="owner@example.com", role="owner")
    make_user()
    hotel = make_place(owner)
    sight = make_place(owner, category="attraction", name="View")
    headers = login("traveller@example.com")
    cases = [
        ({"check_in": days_from_now(-1), "check_out": days_from_now(1)}, "date_in_past"),
        ({"check_in": days_from_now(3), "check_out": days_from_now(2)}, "checkout_before_checkin"),
        ({"check_in": days_from_now(1), "check_out": days_from_now(2), "guests": "abc"}, "invalid_field"),
        ({"check_in": "tomorrow"}, "invalid_date"),
    ]
    for body, code in cases:
        res = client.post("/api/v1/places/book_request", headers=headers, json={"place_id": hotel.id, **body})
        assert res.get_json()["code"] == code
    res = client.post("/api/v1/places/book_request", headers=headers,
                      json={"place_id": sight.id, "check_in": days_from_now(1)})
    assert res.get_json()["code"] == "not_bookable"
    res = client.post("/api/v1/places/book_request", headers=login("owner@example.com"),
                      json={"place_id": hotel.id, "check_in": days_from_now(1), "check_out": days_from_now(2)})
    assert res.get_json()["code"] == "own_listing"


# Partners & community

def test_partner_application_approval(client, make_user, login):
    applicant = make_user()
    make_user(email="admin@example.com", role="admin")
    headers = login("traveller@example.com")
    res = client.post("/api/v1/partner-applications", headers=headers, json={
        "target_role": "guide", "phone": "+994", "bio": "Hiking guide", "languages": "AZ, EN",
    })
    assert res.status_code == 200, res.get_json()
    app_id = res.get_json()["id"]
    assert client.post(f"/api/v1/partner-applications/{app_id}/approve", headers=headers).status_code == 403
    assert client.post(f"/api/v1/partner-applications/{app_id}/approve",
                       headers=login("admin@example.com")).status_code == 200
    db.session.refresh(applicant)
    assert applicant.role == "guide"


def test_first_trace_bonus_only_once(client, make_user, login):
    user = make_user()
    headers = login("traveller@example.com")
    for _ in range(2):
        res = client.post("/api/v1/community/traces", headers=headers,
                          json={"region_slug": "shusha", "caption": "Sunset"})
        assert res.status_code == 200
    db.session.refresh(user)
    assert user.kx_count == 50
    bad = client.post("/api/v1/community/traces", headers=headers,
                      json={"region_slug": "shusha", "caption": "x", "photo_url": "data:image/jpeg;base64,AAAA"})
    assert bad.status_code == 400
    assert len(client.get("/api/v1/community/traces?region=shusha").get_json()) == 2


def test_seed_is_idempotent_and_content_account_cannot_log_in(app, client):
    from seed_places import seed
    created = seed()
    assert created > 80
    assert seed() == 0
    res = client.post("/api/v1/auth/login", json={"email": "content@gokarabakh.local", "password": "ContentSeed123"})
    assert res.status_code == 401
    shusha_hotels = client.get("/api/v1/places/get?region=shusha&category=hotel").get_json()
    assert len(shusha_hotels) == 3
