from flask import Flask, Response, jsonify, request
from datetime import datetime, timezone
from html import escape
import json
from pathlib import Path
from app.models.place import Place
from app.models.user import User
from app.services import facade
from app.share import share_init
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import config


app = Flask(__name__)
share_init(app)
GOOGLE_PLACES_FIXTURE = Path(__file__).parent / "app" / "data" / "google_places.json"
TRIPS_FIXTURE = Path(__file__).parent / "app" / "data" / "mockData.json"
MOCK_PHOTO_IDS = {
    place["place_id"]
    for place in json.loads(GOOGLE_PLACES_FIXTURE.read_text(encoding="utf-8"))
}
TRIPS = json.loads(TRIPS_FIXTURE.read_text(encoding="utf-8"))
CART_ITEMS = []

@app.route("/")
def home():
    return "A server."


@app.route("/api/v1/google-places/search")
def search_google_places():
    query = request.args.get("query", "").strip()
    category = request.args.get("category", "").strip().lower()
    district = request.args.get("district", "Karabakh").strip()
    if not query:
        return jsonify({"error": "A search query is required"}), 400

    places = json.loads(GOOGLE_PLACES_FIXTURE.read_text(encoding="utf-8"))
    category_filter = {
        "hotels": "hotels",
        "restaurants": "restaurants",
    }.get(category)
    query_terms = f"{query} {district}".casefold()
    filtered_places = [
        place for place in places
        if (not category_filter or place["category"] == category_filter)
        and (not district or district.casefold() in place["district"].casefold())
        and any(term.casefold() in query_terms for term in (place["name"], place["district"], place["address"]))
    ]
    return jsonify(filtered_places)


@app.route("/api/v1/google-places/photo")
def google_place_photo():
    photo_name = request.args.get("name", "").strip()
    if not photo_name:
        return jsonify({"error": "A Google photo reference is required"}), 400
    if photo_name not in MOCK_PHOTO_IDS:
        return jsonify({"error": "Unknown mock photo reference"}), 404
    label = escape(photo_name.removeprefix("mock-").replace("-", " ").title())
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
<rect width="800" height="500" fill="#d9e5dc"/><path d="M0 370 190 210l120 100 130-160 360 220v130H0Z" fill="#6f9079"/>
<circle cx="650" cy="115" r="58" fill="#f7c873"/><text x="40" y="440" fill="#17352c" font-family="sans-serif" font-size="28">{label}</text></svg>'''
    return Response(svg, mimetype="image/svg+xml")


@app.route("/api/v1/trips/search")
def search_trips():
    query = request.args.get("query", "").strip().casefold()
    category = request.args.get("category", "").strip().casefold()
    category_aliases = {"hotels": "hotel", "stays": "hotel", "tours": "tour", "routes": "tour"}
    category = category_aliases.get(category, category)
    results = [
        trip for trip in TRIPS
        if (not category or trip["category"] == category)
        and (not query or query in " ".join((trip["title"], trip["category"], trip["location"], trip["address"], trip["description"])).casefold())
    ]
    return jsonify(results)


@app.route("/api/v1/cart", methods=["GET"])
def get_cart():
    return jsonify({"items": CART_ITEMS, "count": len(CART_ITEMS)})


@app.route("/api/v1/cart/add", methods=["POST"])
def add_to_cart():
    data = request.get_json(silent=True) or {}
    item_id = str(data.get("item_id", "")).strip()
    item = next((trip for trip in TRIPS if trip["id"] == item_id), None)
    if not item:
        return jsonify({"error": "Trip or hotel was not found"}), 404
    if not any(cart_item["id"] == item_id for cart_item in CART_ITEMS):
        CART_ITEMS.append(item)
    return jsonify({"items": CART_ITEMS, "count": len(CART_ITEMS)}), 201


@app.route("/api/v1/cart/<item_id>", methods=["DELETE"])
def remove_from_cart(item_id):
    original_count = len(CART_ITEMS)
    CART_ITEMS[:] = [item for item in CART_ITEMS if item["id"] != item_id]
    if len(CART_ITEMS) == original_count:
        return jsonify({"error": "Cart item was not found"}), 404
    return jsonify({"items": CART_ITEMS, "count": len(CART_ITEMS)})


@app.route("/api/v1/cart/checkout", methods=["POST"])
def checkout_cart_item():
    data = request.get_json(silent=True) or {}
    item_id = str(data.get("item_id", "")).strip()
    item = next((cart_item for cart_item in CART_ITEMS if cart_item["id"] == item_id), None)
    if not item:
        return jsonify({"error": "Cart item was not found"}), 404
    CART_ITEMS.remove(item)
    return jsonify({
        "status": "Payment completed",
        "receipt_id": f"mock-receipt-{item_id}",
        "item": item,
        "items": CART_ITEMS,
        "count": len(CART_ITEMS),
    }), 201

# API

@app.route("/api/v1/users/get")
def get_users_api():
    users = []
    for user in facade.get_users():
        d: dict = dict(user.__dict__)
        d.pop("pwd_hash", None)
        users.append(d)
    return jsonify(users)

@app.route("/api/v1/users/get_id")
def get_user():
    if not request.args.get("id"):
        return jsonify({"status": "Provide the user ID"}), 400
    
    u = facade.get_user(request.args.get("id"))

    if not u:
        return jsonify({"status": "No user with specified id."}),404
        
    d: dict = dict(u.__dict__)
    d.pop("pwd_hash", None)   # Don't return password hash
    return jsonify(d)

@app.route("/api/v1/users/delete", methods=["POST"])
@jwt_required()
def delete_user():
    current_user_id = get_jwt_identity()
    data = request.get_json(force=True)
    password = data.get("password")

    user = facade.get_user(current_user_id)
    if not user or not user.check_pwd(password):
        return jsonify({"error": "Invalid password"}), 401

    facade.delete_user(current_user_id)
    return "", 200

@app.route("/api/v1/users/create", methods=["POST"])
def create_user():
    data = request.get_json(silent=True) or {}
    if not data:
        return jsonify({"error": "Invalid or missing JSON"}), 400

    password = data.get("password")
    email = data.get("email")
    name = data.get("name")

    if not all([password, email, name]):
        return jsonify({"error": "Missing required fields"}), 400

    about_me = data.get("about_me") or {}
    user = User(
        0,
        name,
        [],
        about_me.get("year_of_birth", 0),
        about_me.get("month_of_birth", 0),
        about_me.get("day_of_birth", 0),
        email,
    )
    user.hash_pwd(password)
    try:
        facade.create_user(user)
    except ValueError as error:
        return jsonify({"error": str(error)}), 409
    return jsonify({"status": "User created successfully", "user": user.to_dict()}), 201

# Places -------------------------------------

@app.route("/api/v1/places/get")
def get_places():
    return jsonify([p.to_dict() for p in facade.get_places()])

@app.route("/api/v1/places/get_id")
def get_place_by_id():
    p = facade.get_place(request.args.get("id"))
    if not p:
        return jsonify({"error": "No place with specified id."}), 404
    return jsonify(p.to_dict())

@app.route("/api/v1/places/get_places_by_tags")
def get_places_by_tags():
    tags = request.args.getlist("tags")
    return jsonify([p.to_dict() for p in facade.places_by_tag(tags)])

@app.route("/api/v1/places/create", methods=["POST"])
@jwt_required()
def create_place():
    owner_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    if not owner_id:
        return jsonify({"error": "ID of owner was not provided"}), 400
    
    desc = data.get("description")

    if not desc:
        return jsonify({"error": "Description was not provided"}), 400
    
    is_tour = data.get("is_tour", False)

    cost = data.get("cost")

    if cost is None:
        return jsonify({"error": "Cost was not provided"}), 400
    
    name = data.get("name")

    if not name:
        return jsonify({"error": "Name was not provided"}), 400
    
    main_photo = data.get("main_photo_url")

    if not main_photo:
        return jsonify({"error": "Link to main photo was not provided"}), 400
    
    tags = data.get("tags", [])
    if not isinstance(tags, list):
        return jsonify({"error": "Tags must be a list"}), 400
    
    place = Place(owner_id, name, is_tour, cost, desc, main_photo, tags)
    facade.create_place(place)
    return jsonify({"status": "Place created successfully", "place": place.to_dict()}), 201

@app.route("/api/v1/places/book", methods=["POST"])
@jwt_required()
def book_place():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    use_kx = data.get("use_kx", False)
    place_id = data.get("place_id")

    user = facade.get_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    place = facade.get_place(place_id) if place_id else None
    venue_name = data.get("venue_name")
    if not place and not venue_name:
        return jsonify({"error": "Place not found"}), 404

    try:
        guests = int(data.get("guests", 1))
    except (TypeError, ValueError):
        return jsonify({"error": "Guests must be a positive integer"}), 400
    if guests < 1:
        return jsonify({"error": "Guests must be a positive integer"}), 400

    try:
        arrival_date = datetime.fromisoformat(data.get("start_date", "")).replace(tzinfo=timezone.utc)
    except ValueError:
        return jsonify({"error": "A valid start date is required"}), 400

    cost = place.cost if place else float(data.get("amount", 0))
    if use_kx:
        discount = min(user.kx_count, cost)
        real_cost = cost - discount
        user.kx_count -= discount
    else:
        real_cost = cost
        user.kx_count += cost * (config.PERCENTAGE_FEE / 100)

    if place:
        user.bought_places.append(place)
    facade.update_user(user)
    booking_id = facade.booking_repository.create(user_id, place_id, guests, arrival_date, real_cost, venue_name)
    return jsonify({"status": "Booked", "booking_id": booking_id, "amount_charged": real_cost}), 201

@app.route("/api/v1/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    user = facade.get_user_by_email(email) if email else None

    if not user or not user.check_pwd(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=user.id)
    return jsonify({"access_token": token, "user": user.to_dict()}), 200

if __name__ == "__main__":
    app.run(debug=config.is_debugging())
