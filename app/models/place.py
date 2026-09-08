from __future__ import annotations


class Place:
    """Compatibility model representing a listing/place."""

    def __init__(self, owner_id, name, is_tour, cost, desc, main_photo_url, tags=None, place_id=None):
        self.id = place_id
        self.owner_id = owner_id
        self.name = name
        self.is_tour = bool(is_tour)
        self.cost = cost
        self.description = desc
        self.main_photo_url = main_photo_url
        self.tags = tags or []

    def to_dict(self):
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "name": self.name,
            "is_tour": self.is_tour,
            "cost": self.cost,
            "description": self.description,
            "main_photo_url": self.main_photo_url,
            "tags": self.tags,
        }
