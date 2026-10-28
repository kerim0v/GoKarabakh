"""
Sample accounts and activity for showing GoKarabakh to people: a traveller with bookings and an
itinerary, a verified business owner with a booking request waiting, a pending partner application,
a review and a community trace. Run once, after `flask --app server seed`:

    flask --app server demo-data

All demo accounts share the password you type. Running it again changes nothing.
"""
import datetime
import os
import shutil

from flask import current_app

from app.database import db
from app.models import BookingRequest, ClosedPeriod, CommunityTrace, PartnerApplication, Place, User
from app.models.itinerary_item import ItineraryItem
from app.models.review import Review
from app.services import facade

ACCOUNTS = [
    # email, name, role, coins
    ("admin@example.com", "Aysel Admin", "admin", 100),
    ("owner@example.com", "Rauf Owner", "owner", 100),
    ("traveller@example.com", "Leyla Traveller", "user", 140),
    ("applicant@example.com", "Nigar Applicant", "user", 100),
]


def create_demo_data(password):
    """Returns False when the demo accounts already exist."""
    if facade.get_user_by_email(ACCOUNTS[0][0]):
        return False
    today = datetime.date.today()
    users = {}
    for email, name, role, coins in ACCOUNTS:
        user = User(email=email, name=name, role=role, kx_count=coins)
        user.hash_pwd(password)
        db.session.add(user)
        users[role if role != "user" else email.split("@")[0]] = user
    owner, traveller, applicant, admin = users["owner"], users["traveller"], users["applicant"], users["admin"]
    owner.id_verified = True
    db.session.flush()

    db.session.add(PartnerApplication(user_id=owner.id, target_role="owner", company_name="Shusha Inns", tax_id="1234567890",
                                      phone="+994 50 111 22 33", bio="Family guesthouses in Shusha", languages="AZ, EN, RU",
                                      status="approved"))
    db.session.add(PartnerApplication(user_id=applicant.id, target_role="guide", phone="+994 55 444 55 66",
                                      bio="Mountain guide in Kalbajar for 8 years.", languages="AZ, EN", status="pending"))

    guesthouse = Place(owner_user_id=owner.id, name="Old Town Guesthouse", region="shusha", category="hotel",
                       subtitle="Old town • 4 rooms", badge="New", cost=95, tags=[], main_photo_url="/shusha/shusha2.JPG",
                       description="Stone house with a garden near the fortress.")
    db.session.add(guesthouse)
    db.session.flush()
    db.session.add(ClosedPeriod(place_id=guesthouse.id, start_date=today + datetime.timedelta(days=20),
                                end_date=today + datetime.timedelta(days=22), note="Family wedding"))
    db.session.add(BookingRequest(place_id=guesthouse.id, user_id=traveller.id, guests=2, total_cost=190,
                                  check_in=today + datetime.timedelta(days=10), check_out=today + datetime.timedelta(days=12),
                                  contact_phone="+994 70 000 11 22", message="We arrive late in the evening.", status="pending"))
    db.session.add(BookingRequest(place_id=guesthouse.id, user_id=traveller.id, guests=2, total_cost=190, coins_earned=4,
                                  check_in=today - datetime.timedelta(days=5), check_out=today - datetime.timedelta(days=3),
                                  status="confirmed"))
    db.session.add(Review(place_id=guesthouse.id, user_id=admin.id, rating=5, comment="Wonderful hosts and a quiet garden."))

    # A traveller photo in the community archive, copied from the frontend images if they're on this server
    photo = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "public", "lacin", "lacin2.jpeg")
    photo_url = None
    if os.path.exists(photo):
        from app.api.uploads import upload_folder
        shutil.copy(photo, os.path.join(upload_folder(), "demo-lachin.jpg"))
        photo_url = "/uploads/demo-lachin.jpg"
    db.session.add(CommunityTrace(user_id=traveller.id, region_slug="lachin", caption="Morning fog over the river", photo_url=photo_url))

    db.session.add(ItineraryItem(user_id=traveller.id, place_id=guesthouse.id, visit_date=today + datetime.timedelta(days=10),
                                 start_time=datetime.time(15, 0), note="Check in after lunch"))
    sight = Place.query.filter_by(region="shusha", category="attraction").first()
    if sight:
        db.session.add(ItineraryItem(user_id=traveller.id, place_id=sight.id, visit_date=today + datetime.timedelta(days=11),
                                     start_time=datetime.time(9, 30)))
    db.session.commit()
    current_app.logger.info("Demo data created")
    return True
