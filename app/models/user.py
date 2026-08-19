from app.models.place import Place
from app.models.base import ModelBase


class User(ModelBase):
    def __init__(
            self,
            kx_count: float,
            name: str,
            bought_places: list[Place],
            year_of_birth: int,
            month_of_birth: int,
            day_of_birth: int,
            email: str):
        super().__init__()
        self.kx_count = kx_count
        self.name = name
        self.bought_places = bought_places
        self.year_of_birth = year_of_birth
        self.month_of_birth = month_of_birth
        self.day_of_birth = day_of_birth
        self.email = email

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
