from app.api.auth import bp as auth_bp
from app.api.users import bp as users_bp
from app.api.places import bp as places_bp
from app.api.bookings import bp as bookings_bp
from app.api.partners import bp as partners_bp
from app.api.community import bp as community_bp

blueprints = (auth_bp, users_bp, places_bp, bookings_bp, partners_bp, community_bp)
