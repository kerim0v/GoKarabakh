from app.database import db
from app.models.base import ModelBase


class ClosedPeriod(ModelBase):
    """Dates (inclusive) when a listing can't take guests: closed, fully booked, on holiday."""
    __tablename__ = "closed_periods"

    place_id = db.Column(db.String(36), db.ForeignKey("places.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    note = db.Column(db.String(200))
