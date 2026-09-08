from app.database import db
from app.models.base import ModelBase


class KxTransaction(ModelBase):
    __tablename__ = "kx_transactions"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    reason = db.Column(db.String(255), nullable=False)
