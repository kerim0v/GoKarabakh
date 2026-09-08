from __future__ import annotations

from datetime import datetime


class PartnerApplication:
    """Upgrade request submitted by a normal user."""

    VALID_STATUSES = {"pending", "approved", "rejected"}
    VALID_TARGET_ROLES = {"owner", "guide"}

    def __init__(
        self,
        user_id,
        target_role,
        details=None,
        status="pending",
        created_at=None,
        application_id=None,
    ):
        self.id = application_id
        self.user_id = user_id
        self.target_role = target_role if target_role in self.VALID_TARGET_ROLES else "owner"
        self.details = details or {}
        self.status = status if status in self.VALID_STATUSES else "pending"
        self.created_at = created_at or datetime.utcnow().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "target_role": self.target_role,
            "status": self.status,
            "details": self.details,
            "created_at": self.created_at,
        }
