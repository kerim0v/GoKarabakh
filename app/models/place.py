from app.database import db
from app.models.base import ModelBase


CATEGORIES = ("hotel", "restaurant", "attraction", "tour")
BOOKABLE_CATEGORIES = ("hotel", "restaurant", "tour")


class Place(ModelBase):
    __tablename__ = "places"

    owner_user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    region = db.Column(db.String(50), nullable=False, index=True)
    category = db.Column(db.String(20), nullable=False)
    subtitle = db.Column(db.String(255))
    badge = db.Column(db.String(100))
    cost = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    description = db.Column(db.Text)
    main_photo_url = db.Column(db.String(500))
    tags = db.Column(db.JSON, default=list)
    # False while the owner is no longer a partner; hidden from travellers
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    @property
    def is_bookable(self):
        return self.category in BOOKABLE_CATEGORIES

    def to_dict(self):
        d = super().to_dict()
        d["is_tour"] = self.category == "tour"
        d["is_bookable"] = self.is_bookable
        return d
