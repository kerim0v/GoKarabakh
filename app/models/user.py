from app.database import db
from app.models.base import ModelBase


ROLES = ("user", "owner", "guide", "admin")
PARTNER_ROLES = ("owner", "guide")


class User(ModelBase):
    __tablename__ = "users"

    kx_count = db.Column(db.Integer, nullable=False, default=0)
    name = db.Column(db.String(255), nullable=False)
    year_of_birth = db.Column(db.Integer)
    month_of_birth = db.Column(db.Integer)
    day_of_birth = db.Column(db.Integer)
    email = db.Column(db.String(255), unique=True, nullable=False)
    pwd_hash = db.Column(db.String(255))
    role = db.Column(db.String(20), nullable=False, default="user")
    # Set by an admin after checking documents; shown as badges on the partner's listings
    id_verified = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    licensed = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())

    def hash_pwd(self, pwd):
        from app.extensions import bcrypt
        self.pwd_hash = bcrypt.generate_password_hash(pwd).decode('utf-8')

    def check_pwd(self, pwd):
        from app.extensions import bcrypt
        if not pwd or not self.pwd_hash:
            return False
        return bcrypt.check_password_hash(self.pwd_hash, pwd)

    def to_dict(self):
        d = super().to_dict()
        d.pop("pwd_hash", None)
        return d

    def public_dict(self):
        return {"id": self.id, "name": self.name, "role": self.role}
