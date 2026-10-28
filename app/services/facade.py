from sqlalchemy import func

from app.models.place import Place
from app.models.user import User
from app.models.partner_application import PartnerApplication
from app.models.booking_request import BookingRequest
from app.models.community_trace import CommunityTrace
from app.models.kx_transaction import KxTransaction
from app.models.review import Review
from app.models.itinerary_item import ItineraryItem
from app.repository.sqlalchemy_repo import SQLAlchemyRepository
from app.database import db


user_repository = SQLAlchemyRepository(User)
place_repository = SQLAlchemyRepository(Place)
partner_application_repository = SQLAlchemyRepository(PartnerApplication)
booking_request_repository = SQLAlchemyRepository(BookingRequest)
community_trace_repository = SQLAlchemyRepository(CommunityTrace)
kx_transaction_repository = SQLAlchemyRepository(KxTransaction)
review_repository = SQLAlchemyRepository(Review)
itinerary_repository = SQLAlchemyRepository(ItineraryItem)

def commit():
    db.session.commit()

# Users

def get_user(id) -> User: return user_repository.get(id)
def get_user_by_email(email) -> User: return User.query.filter_by(email=email).first()
def create_user(user): user_repository.add(user)
def get_users() -> list[User]: return user_repository.get_all()
def update_user(user_id, data): return user_repository.update(user_id, data)
def delete_user(user_id): user_repository.delete(user_id)

# Places

def get_place(id) -> Place: return place_repository.get(id)
def create_place(place): place_repository.add(place)
def get_places() -> list[Place]: return place_repository.get_all()
def update_place(place_id, data): return place_repository.update(place_id, data)
def delete_place(place_id): place_repository.delete(place_id)

PLACE_KINDS = {
    "stays": lambda q: q.filter(Place.category == "hotel"),
    "routes": lambda q: q.filter(Place.category.in_(("tour", "attraction")), User.role != "guide"),
    "guides": lambda q: q.filter(Place.category == "tour", User.role == "guide"),
}

def query_places(region=None, category=None, kind=None, q=None, owner_id=None,
                 include_inactive=False, sort=None, limit=None):
    """Places with owner role and stats, as (place, owner_role, bookings, avg_rating, review_count) rows."""
    bookings = (
        db.session.query(BookingRequest.place_id, func.count(BookingRequest.id).label("count"))
        .filter(BookingRequest.status == "confirmed")
        .group_by(BookingRequest.place_id)
        .subquery()
    )
    reviews = (
        db.session.query(Review.place_id, func.avg(Review.rating).label("avg"), func.count(Review.id).label("count"))
        .group_by(Review.place_id)
        .subquery()
    )
    booking_count = func.coalesce(bookings.c.count, 0)
    query = (
        db.session.query(Place, User.role, booking_count, reviews.c.avg, func.coalesce(reviews.c.count, 0))
        .join(User, User.id == Place.owner_user_id)
        .outerjoin(bookings, bookings.c.place_id == Place.id)
        .outerjoin(reviews, reviews.c.place_id == Place.id)
    )
    if not include_inactive:
        query = query.filter(Place.is_active.is_(True))
    if region:
        query = query.filter(Place.region == region)
    if category:
        query = query.filter(Place.category == category)
    if kind in PLACE_KINDS:
        query = PLACE_KINDS[kind](query)
    if owner_id:
        query = query.filter(Place.owner_user_id == owner_id)
    if q:
        pattern = f"%{q.lower()}%"
        query = query.filter(func.lower(Place.name).like(pattern) | Place.region.like(pattern))

    if sort == "popular":
        query = query.order_by(booking_count.desc(), func.coalesce(reviews.c.avg, 0).desc(), Place.creation_date)
    elif sort == "rating":
        query = query.order_by(func.coalesce(reviews.c.avg, 0).desc(), Place.name)
    elif sort == "price_asc":
        query = query.order_by(Place.cost, Place.name)
    elif sort == "price_desc":
        query = query.order_by(Place.cost.desc(), Place.name)
    else:
        query = query.order_by(Place.creation_date, Place.name)
    if limit:
        query = query.limit(limit)
    return query.all()

def places_by_tag(tags):
    return [p for p in get_places() if p.is_active and all(t in (p.tags or []) for t in tags)]

def places_by_owner(owner_id):
    return Place.query.filter_by(owner_user_id=owner_id).order_by(Place.creation_date).all()

def set_owner_places_active(owner_id, active):
    Place.query.filter_by(owner_user_id=owner_id).update({"is_active": active})
    commit()

def owner_stats(owner_id):
    rows = (
        db.session.query(
            Place,
            func.count(BookingRequest.id).filter(BookingRequest.status == "confirmed"),
            func.coalesce(func.sum(BookingRequest.total_cost).filter(BookingRequest.status == "confirmed"), 0),
            func.count(BookingRequest.id).filter(BookingRequest.status == "pending"),
        )
        .outerjoin(BookingRequest, BookingRequest.place_id == Place.id)
        .filter(Place.owner_user_id == owner_id)
        .group_by(Place.id)
        .order_by(Place.creation_date)
        .all()
    )
    return rows

# Partner applications

def create_partner_application(application): partner_application_repository.add(application)
def get_partner_application(id) -> PartnerApplication: return partner_application_repository.get(id)
def update_partner_application(id, data): return partner_application_repository.update(id, data)

def get_partner_applications(user_id=None):
    query = PartnerApplication.query
    if user_id:
        query = query.filter_by(user_id=user_id)
    return query.order_by(PartnerApplication.creation_date.desc()).all()

def get_pending_application_for_user(user_id):
    return PartnerApplication.query.filter_by(user_id=user_id, status="pending").first()

def get_approved_application_for_user(user_id):
    return (
        PartnerApplication.query.filter_by(user_id=user_id, status="approved")
        .order_by(PartnerApplication.creation_date.desc())
        .first()
    )

# Booking requests

def create_booking_request(booking_request): booking_request_repository.add(booking_request)
def get_booking_request(id) -> BookingRequest: return booking_request_repository.get(id)
def update_booking_request(id, data): return booking_request_repository.update(id, data)

def booking_requests_for_owner(owner_id):
    """(request, place, traveller) rows for every request on the owner's places, newest first."""
    return (
        db.session.query(BookingRequest, Place, User)
        .join(Place, Place.id == BookingRequest.place_id)
        .join(User, User.id == BookingRequest.user_id)
        .filter(Place.owner_user_id == owner_id)
        .order_by(BookingRequest.creation_date.desc())
        .all()
    )

def booking_requests_for_user(user_id):
    """(request, place, owner) rows for the traveller's requests, newest first."""
    return (
        db.session.query(BookingRequest, Place, User)
        .join(Place, Place.id == BookingRequest.place_id)
        .join(User, User.id == Place.owner_user_id)
        .filter(BookingRequest.user_id == user_id)
        .order_by(BookingRequest.creation_date.desc())
        .all()
    )

def pending_requests_for_owner(owner_id):
    return [r for r, _, _ in booking_requests_for_owner(owner_id) if r.status == "pending"]

# Community traces

def create_community_trace(trace): community_trace_repository.add(trace)
def get_community_trace(id) -> CommunityTrace: return community_trace_repository.get(id)
def delete_community_trace(id): community_trace_repository.delete(id)

def get_community_traces(region=None, limit=200):
    query = db.session.query(CommunityTrace, User.name).join(User, User.id == CommunityTrace.user_id)
    if region:
        query = query.filter(CommunityTrace.region_slug == region)
    return query.order_by(CommunityTrace.creation_date.desc()).limit(limit).all()

# Kx transactions

def kx_transactions_for_user(user_id):
    return (
        KxTransaction.query.filter_by(user_id=user_id)
        .order_by(KxTransaction.creation_date.desc())
        .all()
    )

def has_kx_transaction_reason(user_id, reason):
    return db.session.query(
        KxTransaction.query.filter_by(user_id=user_id, reason=reason).exists()
    ).scalar()

def grant_kx(user, amount, reason):
    """Change a user's coin balance and record why. Negative amounts spend coins."""
    if not amount:
        return
    user.kx_count = (user.kx_count or 0) + amount
    kx_transaction_repository.add(KxTransaction(user_id=user.id, amount=amount, reason=reason))

# Reviews

def create_review(review): review_repository.add(review)
def get_review(id) -> Review: return review_repository.get(id)
def delete_review(id): review_repository.delete(id)

def reviews_for_place(place_id):
    return (
        db.session.query(Review, User.name)
        .join(User, User.id == Review.user_id)
        .filter(Review.place_id == place_id)
        .order_by(Review.creation_date.desc())
        .all()
    )

def get_user_review(place_id, user_id):
    return Review.query.filter_by(place_id=place_id, user_id=user_id).first()

def has_stayed(user_id, place_id, today):
    """A confirmed booking whose date has arrived - the condition for leaving a review."""
    return db.session.query(
        BookingRequest.query.filter(
            BookingRequest.user_id == user_id,
            BookingRequest.place_id == place_id,
            BookingRequest.status == "confirmed",
            BookingRequest.check_in <= today,
        ).exists()
    ).scalar()

# Itinerary

def get_itinerary_item(id) -> ItineraryItem: return itinerary_repository.get(id)
def update_itinerary_item(id, data): return itinerary_repository.update(id, data)
def delete_itinerary_item(id): itinerary_repository.delete(id)

def itinerary_for_user(user_id):
    return (
        db.session.query(ItineraryItem, Place)
        .join(Place, Place.id == ItineraryItem.place_id)
        .filter(ItineraryItem.user_id == user_id, Place.is_active.is_(True))
        .order_by(func.coalesce(ItineraryItem.day, 999), ItineraryItem.creation_date)
        .all()
    )

def add_to_itinerary(user_id, place_id, day=None):
    item = ItineraryItem.query.filter_by(user_id=user_id, place_id=place_id).first()
    if item:
        return item
    item = ItineraryItem(user_id=user_id, place_id=place_id, day=day)
    itinerary_repository.add(item)
    return item

# Admin

def search_users(q=None, limit=200):
    query = User.query
    if q:
        pattern = f"%{q.lower()}%"
        query = query.filter(func.lower(User.email).like(pattern) | func.lower(User.name).like(pattern))
    return query.order_by(User.creation_date.desc()).limit(limit).all()

def overview_counts():
    return {
        "users": User.query.count(),
        "partners": User.query.filter(User.role.in_(("owner", "guide"))).count(),
        "places": Place.query.count(),
        "pending_applications": PartnerApplication.query.filter_by(status="pending").count(),
        "pending_bookings": BookingRequest.query.filter_by(status="pending").count(),
        "confirmed_bookings": BookingRequest.query.filter_by(status="confirmed").count(),
        "traces": CommunityTrace.query.count(),
        "reviews": Review.query.count(),
    }
