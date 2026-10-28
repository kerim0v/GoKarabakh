import datetime

import pytest

from app import create_app
from app.database import db
from app.models.place import Place
from app.models.user import User
from app.services.ratelimit import limiter


@pytest.fixture
def app(tmp_path):
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'test.db'}",
        "JWT_SECRET_KEY": "test-secret-key-that-is-long-enough-for-hs256",
        "SECRET_KEY": "test-secret-key-that-is-long-enough-for-hs256",
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
        "BCRYPT_LOG_ROUNDS": 4,
    })
    with app.app_context():
        db.create_all()
        limiter.reset()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def make_user(app):
    def make(email="traveller@example.com", role="user", password="password123", kx=0, name="Traveller"):
        user = User(email=email, name=name, role=role, kx_count=kx)
        user.hash_pwd(password)
        db.session.add(user)
        db.session.commit()
        return user
    return make


@pytest.fixture
def login(client):
    def do_login(email, password="password123"):
        res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert res.status_code == 200, res.get_json()
        return {"Authorization": f"Bearer {res.get_json()['access_token']}"}
    return do_login


@pytest.fixture
def make_place(app):
    def make(owner, category="hotel", cost=100, region="shusha", name="Test Stay", active=True):
        place = Place(owner_user_id=owner.id, name=name, region=region, category=category,
                      cost=cost, description="Nice", main_photo_url="/x.jpg", tags=[], is_active=active)
        db.session.add(place)
        db.session.commit()
        return place
    return make


def days_from_now(days):
    return (datetime.date.today() + datetime.timedelta(days=days)).isoformat()
