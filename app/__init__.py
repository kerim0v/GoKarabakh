import os

from flask import Flask, jsonify
from flask_swagger_ui import get_swaggerui_blueprint
from sqlalchemy import event
from sqlalchemy.engine import Engine
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

import config
from app.database import db
from app.extensions import bcrypt, cors, jwt, migrate

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def create_app(overrides=None):
    app = Flask(__name__, static_folder=os.path.join(ROOT_DIR, "static"))
    app.config.update(
        DEBUG=config.DEBUG,
        SECRET_KEY=config.SECRET_KEY,
        JWT_SECRET_KEY=config.JWT_SECRET_KEY,
        JWT_ACCESS_TOKEN_EXPIRES=config.JWT_ACCESS_TOKEN_EXPIRES,
        SQLALCHEMY_DATABASE_URI=config.SQLALCHEMY_DATABASE_URI,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAX_CONTENT_LENGTH=config.MAX_CONTENT_LENGTH,
    )
    app.config.update(overrides or {})

    if not app.config["JWT_SECRET_KEY"]:
        if not (app.config["DEBUG"] or app.config.get("TESTING")):
            raise RuntimeError("JWT_SECRET_KEY is not set. Add it to .env (see .env.example).")
        app.config["JWT_SECRET_KEY"] = "dev-only-secret-do-not-use-in-production"
    app.config["SECRET_KEY"] = app.config["SECRET_KEY"] or app.config["JWT_SECRET_KEY"]

    if config.TRUST_PROXY:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    origins = config.CORS_ORIGINS.split(",") if config.CORS_ORIGINS != "*" else "*"
    cors.init_app(app, resources={r"/api/*": {"origins": origins}})

    from app import models  # noqa: F401  (registers the tables for migrations)
    from app.api import blueprints
    for blueprint in blueprints:
        app.register_blueprint(blueprint)

    app.register_blueprint(
        get_swaggerui_blueprint("/api/docs", "/static/openapi.json", config={"app_name": "GoKarabakh API"}),
        url_prefix="/api/docs",
    )

    _register_error_handlers(app)

    from app.cli import register_commands
    register_commands(app)

    @app.route("/")
    def home():
        return jsonify({"status": "ok", "docs": "/api/docs"})

    return app


def _register_error_handlers(app):
    from app.api.common import ApiError

    @app.errorhandler(ApiError)
    def api_error(error):
        return error.response()

    @app.errorhandler(HTTPException)
    def http_error(error):
        code = (error.name or "error").lower().replace(" ", "_")
        return jsonify({"error": error.description, "code": code}), error.code

    @app.errorhandler(Exception)
    def unexpected_error(error):
        app.logger.exception("Unhandled error")
        return jsonify({"error": "Something went wrong on our side.", "code": "server_error"}), 500

    @jwt.expired_token_loader
    def expired_token(_header, _payload):
        return jsonify({"error": "Your session has expired. Please sign in again.", "code": "token_expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({"error": "Invalid session. Please sign in again.", "code": "token_invalid"}), 401

    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({"error": "Please sign in first.", "code": "token_missing"}), 401


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _record):
    # SQLite ignores ON DELETE CASCADE unless this is switched on per connection
    if dbapi_connection.__class__.__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
