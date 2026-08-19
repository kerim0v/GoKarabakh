from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
import config

crypter: Bcrypt = None
jwt: JWTManager = None

def share_init(app):
    global crypter, jwt
    crypter = Bcrypt(app)
    app.config["JWT_SECRET_KEY"] = config.JWT_SECRET_KEY
    jwt = JWTManager(app)
