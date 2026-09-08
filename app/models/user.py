from __future__ import annotations

from datetime import datetime

import bcrypt


class User:
    """Application user model."""

    VALID_ROLES = {"user", "owner", "guide", "admin"}

    def __init__(
        self,
        user_id,
        name,
        tags=None,
        year_of_birth=None,
        month_of_birth=None,
        day_of_birth=None,
        email=None,
        role="user",
        password=None,
        created_at=None,
    ):
        self.id = user_id
        self.name = name
        self.tags = tags or []
        self.year_of_birth = year_of_birth
        self.month_of_birth = month_of_birth
        self.day_of_birth = day_of_birth
        self.email = email
        self.role = role if role in self.VALID_ROLES else "user"
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.password_hash = None
        self.kx_count = 0
        self.bought_places = []
        if password:
            self.hash_pwd(password)

    def hash_pwd(self, password):
        self.password_hash = bcrypt.hashpw(
            str(password).encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_pwd(self, password):
        if not self.password_hash:
            return False
        return bcrypt.checkpw(str(password).encode("utf-8"), self.password_hash.encode("utf-8"))

    def to_dict(self, include_private=False):
        data = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at,
            "tags": self.tags,
            "year_of_birth": self.year_of_birth,
            "month_of_birth": self.month_of_birth,
            "day_of_birth": self.day_of_birth,
            "kx_count": self.kx_count,
            "bought_places": self.bought_places,
        }
        if include_private:
            data["password_hash"] = self.password_hash
        return data
