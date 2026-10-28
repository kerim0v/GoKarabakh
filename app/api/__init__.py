from app.api.admin import bp as admin_bp
from app.api.ai import bp as ai_bp
from app.api.auth import bp as auth_bp
from app.api.bookings import bp as bookings_bp
from app.api.community import bp as community_bp
from app.api.itinerary import bp as itinerary_bp
from app.api.meta import bp as meta_bp
from app.api.partners import bp as partners_bp
from app.api.places import bp as places_bp
from app.api.reviews import bp as reviews_bp
from app.api.uploads import bp as uploads_bp
from app.api.users import bp as users_bp

blueprints = (
    auth_bp, users_bp, places_bp, bookings_bp, partners_bp, community_bp,
    reviews_bp, itinerary_bp, uploads_bp, admin_bp, meta_bp, ai_bp,
)
