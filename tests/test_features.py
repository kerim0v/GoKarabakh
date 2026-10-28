import io

from app.database import db
from app.models.booking_request import BookingRequest
from tests.conftest import days_from_now

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64


def outbox(app):
    return app.extensions.setdefault("mail_outbox", [])


def book(client, headers, place, **extra):
    body = {"place_id": place.id, "check_in": days_from_now(3), "check_out": days_from_now(4), **extra}
    res = client.post("/api/v1/places/book_request", headers=headers, json=body)
    assert res.status_code == 200, res.get_json()
    return res.get_json()


# Uploads

def test_upload_accepts_images_only(client, make_user, login):
    make_user()
    headers = login("traveller@example.com")
    res = client.post("/api/v1/uploads", headers=headers,
                      data={"file": (io.BytesIO(JPEG), "photo.png")}, content_type="multipart/form-data")
    assert res.status_code == 200
    url = res.get_json()["url"]
    assert url.startswith("/uploads/") and url.endswith(".jpg")
    assert client.get(url).data == JPEG

    bad = client.post("/api/v1/uploads", headers=headers,
                      data={"file": (io.BytesIO(b"<script>"), "x.jpg")}, content_type="multipart/form-data")
    assert bad.get_json()["code"] == "invalid_image"
    big = client.post("/api/v1/uploads", headers=headers,
                      data={"file": (io.BytesIO(JPEG + b"0" * 7_000_000), "x.jpg")}, content_type="multipart/form-data")
    assert big.status_code == 413
    assert client.post("/api/v1/uploads", data={"file": (io.BytesIO(JPEG), "x.jpg")}).status_code == 401


def test_trace_accepts_uploaded_photo(client, make_user, login):
    make_user()
    headers = login("traveller@example.com")
    url = client.post("/api/v1/uploads", headers=headers, data={"file": (io.BytesIO(JPEG), "a.jpg")},
                      content_type="multipart/form-data").get_json()["url"]
    res = client.post("/api/v1/community/traces", headers=headers,
                      json={"region_slug": "lachin", "caption": "River", "photo_url": url})
    assert res.status_code == 200
    assert res.get_json()["photo_url"] == url


# Booking lifecycle

def test_owner_gets_email_and_contacts_are_shared_after_confirm(app, client, make_user, make_place, login):
    owner = make_user(email="owner@example.com", role="owner")
    make_user()
    place = make_place(owner)
    booking = book(client, login("traveller@example.com"), place, contact_phone="+994 50 123", message="Late arrival")
    assert outbox(app)[-1]["to"] == "owner@example.com"

    inbox = client.get("/api/v1/places/book_requests", headers=login("owner@example.com")).get_json()
    assert inbox[0]["traveller_email"] == "traveller@example.com"
    assert inbox[0]["contact_phone"] == "+994 50 123"

    mine = client.get("/api/v1/places/my_book_requests", headers=login("traveller@example.com")).get_json()
    assert "partner_email" not in mine[0]
    client.post(f"/api/v1/places/book_requests/{booking['id']}/confirm", headers=login("owner@example.com"))
    assert outbox(app)[-1]["to"] == "traveller@example.com"
    mine = client.get("/api/v1/places/my_book_requests", headers=login("traveller@example.com")).get_json()
    assert mine[0]["partner_email"] == "owner@example.com"


def test_traveller_can_cancel_and_coins_are_settled(app, client, make_user, make_place, login):
    owner = make_user(email="owner@example.com", role="owner")
    traveller = make_user(kx=10)
    place = make_place(owner, cost=500)
    headers = login("traveller@example.com")
    booking = book(client, headers, place, use_kx=True)
    client.post(f"/api/v1/places/book_requests/{booking['id']}/confirm", headers=login("owner@example.com"))
    db.session.refresh(traveller)
    assert traveller.kx_count == round(490 * 0.02)

    res = client.post(f"/api/v1/places/book_requests/{booking['id']}/cancel", headers=headers)
    assert res.status_code == 200
    db.session.refresh(traveller)
    assert traveller.kx_count == 10  # used coins back, earned coins taken back
    assert outbox(app)[-1]["to"] == "owner@example.com"
    again = client.post(f"/api/v1/places/book_requests/{booking['id']}/cancel", headers=headers)
    assert again.get_json()["code"] == "not_cancellable"


def test_only_the_traveller_can_cancel(client, make_user, make_place, login):
    owner = make_user(email="owner@example.com", role="owner")
    make_user()
    make_user(email="other@example.com")
    booking = book(client, login("traveller@example.com"), make_place(owner))
    res = client.post(f"/api/v1/places/book_requests/{booking['id']}/cancel", headers=login("other@example.com"))
    assert res.status_code == 404


# Reviews

def test_reviews_need_a_confirmed_visit(client, make_user, make_place, login):
    owner = make_user(email="owner@example.com", role="owner")
    traveller = make_user()
    place = make_place(owner)
    headers = login("traveller@example.com")
    res = client.post(f"/api/v1/places/{place.id}/reviews", headers=headers, json={"rating": 5})
    assert res.get_json()["code"] == "no_confirmed_visit"

    import datetime
    db.session.add(BookingRequest(place_id=place.id, user_id=traveller.id, check_in=datetime.date.today(),
                                  check_out=datetime.date.today() + datetime.timedelta(days=1),
                                  guests=1, total_cost=100, status="confirmed"))
    db.session.commit()
    assert client.post(f"/api/v1/places/{place.id}/reviews", headers=headers,
                       json={"rating": 6}).status_code == 400
    res = client.post(f"/api/v1/places/{place.id}/reviews", headers=headers,
                      json={"rating": 4, "comment": "Lovely view"})
    assert res.status_code == 200
    assert client.post(f"/api/v1/places/{place.id}/reviews", headers=headers,
                       json={"rating": 4}).get_json()["code"] == "already_reviewed"

    listed = client.get(f"/api/v1/places/{place.id}/reviews").get_json()
    assert listed[0]["author_name"] == "Traveller"
    found = client.get("/api/v1/places/get?sort=rating").get_json()[0]
    assert found["avg_rating"] == 4.0 and found["review_count"] == 1


# Itinerary

def test_itinerary_is_saved_per_user_with_date_and_time(client, make_user, make_place, login):
    owner = make_user(email="owner@example.com", role="owner")
    make_user()
    make_user(email="other@example.com")
    hotel = make_place(owner)
    tour = make_place(owner, category="tour", name="Walk")
    headers = login("traveller@example.com")
    item = client.post("/api/v1/itinerary", headers=headers, json={"place_id": hotel.id}).get_json()
    again = client.post("/api/v1/itinerary", headers=headers, json={"place_id": hotel.id}).get_json()
    assert item["id"] == again["id"] and item["visit_date"] is None
    res = client.put(f"/api/v1/itinerary/{item['id']}", headers=headers,
                     json={"date": days_from_now(5), "time": "15:30", "note": "Check in"})
    assert res.get_json()["visit_date"] == days_from_now(5) and res.get_json()["start_time"] == "15:30"
    client.post("/api/v1/itinerary", headers=headers, json={"place_id": tour.id, "date": days_from_now(5), "time": "09:00"})
    assert [i["place"]["name"] for i in client.get("/api/v1/itinerary", headers=headers).get_json()] == ["Walk", "Test Stay"]

    for bad in ({"date": days_from_now(-1)}, {"date": "soon"}, {"time": "25:00"}):
        assert client.put(f"/api/v1/itinerary/{item['id']}", headers=headers, json=bad).status_code == 400
    cleared = client.put(f"/api/v1/itinerary/{item['id']}", headers=headers, json={"date": None, "time": ""}).get_json()
    assert cleared["visit_date"] is None and cleared["start_time"] is None

    assert client.get("/api/v1/itinerary", headers=login("other@example.com")).get_json() == []
    assert client.delete(f"/api/v1/itinerary/{item['id']}", headers=login("other@example.com")).status_code == 404
    assert client.delete(f"/api/v1/itinerary/{item['id']}", headers=headers).status_code == 200


# Passwords

def test_password_reset_link_works_once(app, client, make_user):
    make_user()
    res = client.post("/api/v1/auth/forgot-password", json={"email": "Traveller@example.com"})
    assert res.status_code == 200
    token = outbox(app)[-1]["body"].split("token=")[1].split()[0]
    assert client.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.com"}).status_code == 200
    assert len(outbox(app)) == 1

    assert client.post("/api/v1/auth/reset-password", json={"token": token, "password": "new-password"}).status_code == 200
    assert client.post("/api/v1/auth/login", json={"email": "traveller@example.com",
                                                   "password": "new-password"}).status_code == 200
    reused = client.post("/api/v1/auth/reset-password", json={"token": token, "password": "another-one"})
    assert reused.get_json()["code"] == "invalid_token"


def test_change_password(client, make_user, login):
    make_user()
    headers = login("traveller@example.com")
    assert client.post("/api/v1/users/change-password", headers=headers,
                       json={"current_password": "wrong", "new_password": "new-password"}).status_code == 401
    assert client.post("/api/v1/users/change-password", headers=headers,
                       json={"current_password": "password123", "new_password": "new-password"}).status_code == 200
    login("traveller@example.com", "new-password")


# Partners & admin

def test_leaving_partnership_hides_listings_and_declines_requests(client, make_user, make_place, login):
    owner = make_user(email="owner@example.com", role="owner")
    traveller = make_user(kx=20)
    place = make_place(owner, cost=50)
    book(client, login("traveller@example.com"), place, use_kx=True)

    res = client.post("/api/v1/users/leave-partnership", headers=login("owner@example.com"))
    assert res.get_json()["role"] == "user"
    assert client.get("/api/v1/places/get").get_json() == []
    db.session.refresh(traveller)
    assert traveller.kx_count == 20
    assert BookingRequest.query.one().status == "declined"


def test_admin_endpoints(app, client, make_user, make_place, login):
    admin = make_user(email="admin@example.com", role="admin", name="Admin")
    user = make_user()
    headers = login("admin@example.com")
    assert client.get("/api/v1/admin/overview", headers=login("traveller@example.com")).status_code == 403
    assert client.get("/api/v1/admin/overview", headers=headers).get_json()["users"] == 2
    assert [u["email"] for u in client.get("/api/v1/admin/users?q=travel", headers=headers).get_json()] == \
        ["traveller@example.com"]
    assert client.put(f"/api/v1/admin/users/{user.id}/role", headers=headers,
                      json={"role": "guide"}).get_json()["role"] == "guide"
    assert client.put(f"/api/v1/admin/users/{admin.id}/role", headers=headers,
                      json={"role": "user"}).get_json()["code"] == "own_role"

    applicant = make_user(email="applicant@example.com")
    a_headers = login("applicant@example.com")
    app_id = client.post("/api/v1/partner-applications", headers=a_headers, json={
        "target_role": "owner", "company_name": "Inn", "tax_id": "123", "phone": "1", "bio": "b", "languages": "AZ",
    }).get_json()["id"]
    client.post(f"/api/v1/partner-applications/{app_id}/reject", headers=headers, json={"note": "Add a licence"})
    assert "Add a licence" in outbox(app)[-1]["body"]
    listed = client.get("/api/v1/partner-applications", headers=headers).get_json()
    assert listed[0]["user_email"] == "applicant@example.com" and listed[0]["admin_note"] == "Add a licence"


def test_meta(client):
    data = client.get("/api/v1/meta").get_json()
    assert "shusha" in data["regions"]
    assert data["currency"]["rates"]["AZN"] == 1


def test_verification_badges(client, make_user, make_place, login):
    make_user(email="admin@example.com", role="admin", name="Admin")
    guide = make_user(email="guide@example.com", name="Guide")
    admin = login("admin@example.com")
    app_id = client.post("/api/v1/partner-applications", headers=login("guide@example.com"), json={
        "target_role": "guide", "phone": "1", "bio": "Guide", "languages": "AZ",
    }).get_json()["id"]
    client.post(f"/api/v1/partner-applications/{app_id}/approve", headers=admin,
                json={"id_verified": True, "licensed": True})
    make_place(guide, category="tour", name="Hike")
    listed = client.get("/api/v1/places/get").get_json()[0]
    assert listed["owner_verified"] is True and listed["owner_licensed"] is True

    res = client.put(f"/api/v1/admin/users/{guide.id}/verification", headers=admin, json={"licensed": False})
    assert res.get_json()["licensed"] is False and res.get_json()["id_verified"] is True
    assert client.put(f"/api/v1/admin/users/{guide.id}/verification", headers=login("guide@example.com"),
                      json={"licensed": True}).status_code == 403
