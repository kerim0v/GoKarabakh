from app.models.place import Place
from app.models.user import User
from app.repository.sqlalchemy_repo import SQLAlchemyRepository
from app.database import db


user_repository = SQLAlchemyRepository(User)
place_repository = SQLAlchemyRepository(Place)

def commit():
    db.session.commit()

# Users

def get_user(id) -> User: return user_repository.get(id)
def create_user(user): user_repository.add(user)
def get_users() -> list[User]: return user_repository.get_all()
def update_user(user):
    db.session.commit()
def delete_user(user_id): user_repository.delete(user_id)

# Places

def get_place(id) -> Place: return place_repository.get(id)
def create_place(place): place_repository.add(place)
def get_places() -> list[Place]: return place_repository.get_all()

def places_by_tag(tag):
    places = []
    for place in get_places():
        if all(item in (place.tags or []) for item in tag):
            places.append(place)
    return places
