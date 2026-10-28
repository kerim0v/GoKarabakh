from app.database import db
from app.models.base import ModelBase


class Review(ModelBase):
    __tablename__ = "reviews"
    __table_args__ = (db.UniqueConstraint("place_id", "user_id", name="uq_review_place_user"),)

    place_id = db.Column(db.String(36), db.ForeignKey("places.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
