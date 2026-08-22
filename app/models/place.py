from app.database import db
from app.models.base import ModelBase


class Place(ModelBase):
    __tablename__ = "places"

    owner_user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    is_tour = db.Column(db.Boolean, default=False)
    cost = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    main_photo_url = db.Column(db.String(500))
    tags = db.Column(db.JSON, default=list)
