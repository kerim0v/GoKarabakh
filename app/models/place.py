from app.models.base import ModelBase


class Place(ModelBase):
    def __init__(self, owner_user_id: str, name: str, is_tour: bool, cost: float, description: str, main_photo_url: str, tags: list[str]):
        super().__init__()
        self.owner_user_id = owner_user_id
        self.is_tour = is_tour
        self.cost = cost
        self.name = name
        self.description = description
        self.main_photo_url = main_photo_url
        self.tags = tags
