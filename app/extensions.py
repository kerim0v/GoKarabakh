from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

bcrypt = Bcrypt()
jwt = JWTManager()
cors = CORS()
migrate = Migrate()
