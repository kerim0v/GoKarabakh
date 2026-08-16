from app.models.place import Place
from app.models.user import User
from app.repository.base import *
from app.repository.memory import *


FACTORY = RepositoryFactory(lambda: MemoryRepository())


user_repository = FACTORY.create_repository()
place_repository = FACTORY.create_repository()


def get_user(id) -> User: return user_repository.get(id)
def create_user(user): user_repository.add(user)
def get_users() -> list[User]: return user_repository.get_all()
def delete_user_by_id_if_pwd(id, pwd):
    u = get_user(id)
    if u.check_pwd(pwd):
        delete_user(u)
        return True
    return False
def delete_user(u): user_repository.delete(u)


def get_place(id) -> Place: return place_repository.get(id)
def create_place(place): place_repository.add(place)
def get_places() -> list[Place]: return place_repository.get_all()

def places_by_tag(tag):
    places = []
    for place in get_places():
        if all(item in place.tags for item in tag):
            places.append(place)
    return place
