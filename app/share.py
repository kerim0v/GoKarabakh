from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from app.database import db
import config

crypter: Bcrypt = None
jwt: JWTManager = None

def share_init(app):
    global crypter, jwt
    crypter = Bcrypt(app)

    app.config["JWT_SECRET_KEY"] = config.JWT_SECRET_KEY
    jwt = JWTManager(app)

    origins = config.CORS_ORIGINS.split(",") if config.CORS_ORIGINS != "*" else "*"
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)

    app.config["SQLALCHEMY_DATABASE_URI"] = config.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)

    with app.app_context():
        db.create_all()
