from app.database import db
from app.models.base import ModelBase


class AiPlanLog(ModelBase):
    """One AI trip plan request: used for the per-user daily limit and to watch token spend."""
    __tablename__ = "ai_plan_logs"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    model = db.Column(db.String(100), nullable=False)
    succeeded = db.Column(db.Boolean, nullable=False, default=False)
    input_tokens = db.Column(db.Integer, nullable=False, default=0)
    output_tokens = db.Column(db.Integer, nullable=False, default=0)
    cache_read_tokens = db.Column(db.Integer, nullable=False, default=0)
