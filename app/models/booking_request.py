from app.database import db
from app.models.base import ModelBase


BOOKING_STATUSES = ("pending", "confirmed", "declined", "cancelled")


class BookingRequest(ModelBase):
    __tablename__ = "booking_requests"

    place_id = db.Column(db.String(36), db.ForeignKey("places.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    check_in = db.Column(db.Date, nullable=False)
    check_out = db.Column(db.Date)
    guests = db.Column(db.Integer, nullable=False, default=1)
    message = db.Column(db.Text)
    contact_phone = db.Column(db.String(50))
    total_cost = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    coins_used = db.Column(db.Integer, nullable=False, default=0)
    coins_earned = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default="pending")
