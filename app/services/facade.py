from app.models.place import Place
from app.models.user import User
from app.repository.base import *
from app.repository.postgres import PostgresBookingRepository, PostgresPlaceRepository, PostgresUserRepository


user_repository = PostgresUserRepository()
place_repository = PostgresPlaceRepository()
booking_repository = PostgresBookingRepository()

# Users

def get_user(id) -> User: return user_repository.get(id)
def create_user(user): user_repository.add(user)
def get_users() -> list[User]: return user_repository.get_all()
def get_user_by_email(email) -> User: return user_repository.get_by_email(email)
# added a missing function update_user
def update_user(user): 
    user_repository.update(user.id, user.__dict__)

#def delete_user_by_id_if_pwd(id, pwd): this function is no longer called anywhere, we might delete this
#    u = get_user(id)
#   if u.check_pwd(pwd):
#        delete_user(u)
#        return True
#    return False
def delete_user(user_id): user_repository.delete(user_id)

# Places

def get_place(id) -> Place: return place_repository.get(id)
def create_place(place): place_repository.add(place)
def get_places() -> list[Place]: return place_repository.get_all()

def places_by_tag(tag):
    places = []
    for place in get_places():
        if all(item in place.tags for item in tag):
            places.append(place)
    return places 

def create_booking(user_id, place_id, guests, arrival_date, amount):
    return booking_repository.create(user_id, place_id, guests, arrival_date, amount)
