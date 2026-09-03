from app.models.place import Place
from app.models.user import User, bookings as bookings_table
from app.models.partner_application import PartnerApplication
from app.repository.sqlalchemy_repo import SQLAlchemyRepository
from app.database import db


user_repository = SQLAlchemyRepository(User)
place_repository = SQLAlchemyRepository(Place)
partner_application_repository = SQLAlchemyRepository(PartnerApplication)

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

def places_by_tag(tag):
    places = []
    for place in get_places():
        if all(item in (place.tags or []) for item in tag):
            places.append(place)
    return places

def places_by_owner(owner_id):
    return [p for p in get_places() if p.owner_user_id == owner_id]

def user_bookings(user_id):
    return (
        db.session.query(Place, bookings_table.c.booked_at)
        .join(bookings_table, Place.id == bookings_table.c.place_id)
        .filter(bookings_table.c.user_id == user_id)
        .order_by(bookings_table.c.booked_at.desc())
        .all()
    )

# Partner applications

def create_partner_application(application): partner_application_repository.add(application)
def get_partner_application(id) -> PartnerApplication: return partner_application_repository.get(id)
def get_partner_applications() -> list[PartnerApplication]: return partner_application_repository.get_all()
def update_partner_application(id, data): return partner_application_repository.update(id, data)

def get_pending_application_for_user(user_id):
    for application in get_partner_applications():
        if application.user_id == user_id and application.status == "pending":
            return application
    return None
