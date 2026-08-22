import uuid
import datetime
from app.database import db


class ModelBase(db.Model):
    __abstract__ = True

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    creation_date = db.Column(db.DateTime, default=datetime.datetime.now)
    modification_date = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)

    def update(self, props: dict):
        for k, v in props.items():
            if hasattr(self, k) and getattr(self, k) != v:
                setattr(self, k, v)
        self.modification_date = datetime.datetime.now()
        db.session.commit()

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
