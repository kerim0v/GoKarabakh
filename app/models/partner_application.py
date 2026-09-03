from app.database import db
from app.models.base import ModelBase


APPLICATION_STATUSES = ("pending", "approved", "rejected")


class PartnerApplication(ModelBase):
    __tablename__ = "partner_applications"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    target_role = db.Column(db.String(20), nullable=False)
    company_name = db.Column(db.String(255))
    tax_id = db.Column(db.String(100))
    phone = db.Column(db.String(50))
    bio = db.Column(db.Text)
    languages = db.Column(db.String(255))
    status = db.Column(db.String(20), nullable=False, default="pending")
