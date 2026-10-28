from app.database import db
from app.models.base import ModelBase


class ItineraryItem(ModelBase):
    __tablename__ = "itinerary_items"
    __table_args__ = (db.UniqueConstraint("user_id", "place_id", name="uq_itinerary_user_place"),)

    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    place_id = db.Column(db.String(36), db.ForeignKey("places.id", ondelete="CASCADE"), nullable=False)
    day = db.Column(db.Integer)  # trip day, None = not planned yet
    note = db.Column(db.String(500))
