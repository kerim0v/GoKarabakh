from app.database import db
from app.models.base import ModelBase
import datetime


bookings = db.Table(
    "bookings",
    db.Column("user_id", db.String(36), db.ForeignKey("users.id"), primary_key=True),
    db.Column("place_id", db.String(36), db.ForeignKey("places.id"), primary_key=True),
    db.Column("booked_at", db.DateTime, default=datetime.datetime.now)
)


class User(ModelBase):
    __tablename__ = "users"

    kx_count = db.Column(db.Float, default=0)
    name = db.Column(db.String(255), nullable=False)
    year_of_birth = db.Column(db.Integer)
    month_of_birth = db.Column(db.Integer)
    day_of_birth = db.Column(db.Integer)
    email = db.Column(db.String(255), unique=True, nullable=False)
    pwd_hash = db.Column(db.String(255))

    bought_places = db.relationship("Place", secondary=bookings, backref="buyers")

    def hash_pwd(self, pwd):
        from app.share import crypter
        if crypter is None:
            raise RuntimeError("Crypter not initialized. Did you call share_init(app)?")
        self.pwd_hash = crypter.generate_password_hash(pwd).decode('utf-8')

    def check_pwd(self, pwd):
        from app.share import crypter
        return crypter.check_password_hash(self.pwd_hash, pwd)

    def to_dict(self):
        d = super().to_dict()
        d.pop("pwd_hash", None)
        return d

