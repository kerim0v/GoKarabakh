from app.database import db
from app.models.base import ModelBase
from app.models.regions import REGIONS as DISTRICT_SLUGS


class CommunityTrace(ModelBase):
    __tablename__ = "community_traces"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    region_slug = db.Column(db.String(50), nullable=False)
    caption = db.Column(db.Text, nullable=False)
    photo_url = db.Column(db.String(500))
