import uuid
import datetime
from decimal import Decimal
from app.database import db


def utcnow():
    return datetime.datetime.now(datetime.UTC).replace(tzinfo=None)


def serialize(value):
    if isinstance(value, datetime.datetime):
        return value.isoformat() + "Z"
    if isinstance(value, datetime.date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


class ModelBase(db.Model):
    __abstract__ = True

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    creation_date = db.Column(db.DateTime, default=utcnow)
    modification_date = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def update(self, props: dict):
        for k, v in props.items():
            if hasattr(self, k) and getattr(self, k) != v:
                setattr(self, k, v)
        self.modification_date = utcnow()
        db.session.commit()

    def to_dict(self):
        return {c.name: serialize(getattr(self, c.name)) for c in self.__table__.columns}
