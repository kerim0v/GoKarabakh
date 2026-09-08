from app.database import db
from app.models.base import ModelBase


DISTRICT_SLUGS = (
    "shusha", "kalbajar", "lachin", "khankendi", "aghdam",
    "khojaly", "khojavend", "qubadli", "zangilan",
)


class CommunityTrace(ModelBase):
    __tablename__ = "community_traces"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    region_slug = db.Column(db.String(50), nullable=False)
    caption = db.Column(db.Text, nullable=False)
    photo_url = db.Column(db.Text)
