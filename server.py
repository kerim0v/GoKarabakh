from flask import Flask, jsonify, request
from app.models.place import Place
from app.models.user import User
from app.models.partner_application import PartnerApplication
from app.services import facade
from app.share import share_init
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_swagger_ui import get_swaggerui_blueprint
import config


app = Flask(__name__)
share_init(app)

SWAGGER_URL = "/api/docs"
API_URL = "/static/openapi.json"
swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL, API_URL, config={"app_name": "GoKarabakh API"}
)
app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

@app.route("/")
def home():
    return "A server."

# API

@app.route("/api/v1/users/get")
def get_users_api():
    users = [user.to_dict() for user in facade.get_users()]
    return jsonify(users)

@app.route("/api/v1/users/get_id")
def get_user():
    if not request.args.get("id"):
        return jsonify({"status": "Provide the user ID"}), 400
    
    u = facade.get_user(request.args.get("id"))

    if not u:
        return jsonify({"status": "No user with specified id."}),404
        
    return jsonify(u.to_dict())

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
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON"}), 400

    password = data.get("password")
    email = data.get("email")
    about_me = data.get("about_me") or {}

    yob = about_me.get("year_of_birth")
    mob = about_me.get("month_of_birth")
    dob = about_me.get("day_of_birth")
    name = about_me.get("name")

    if not all([password, email, name]):
        return jsonify({"error": "Missing required fields"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if facade.get_user_by_email(email):
        return jsonify({"error": "Email is already registered"}), 409

    user = User(
        kx_count=0,
        name=name,
        year_of_birth=yob,
        month_of_birth=mob,
        day_of_birth=dob,
        email=email,
        role="user",
    )
    user.hash_pwd(password)
    facade.create_user(user)
    return jsonify({"status": "User created successfully"}), 200

@app.route("/api/v1/users/update", methods=["PUT"])
@jwt_required()
def update_user_route():
    current_user_id = get_jwt_identity()
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON"}), 400

    allowed_fields = {"name", "year_of_birth", "month_of_birth", "day_of_birth"}
    updates = {k: v for k, v in data.items() if k in allowed_fields}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    updated = facade.update_user(current_user_id, updates)
    if not updated:
        return jsonify({"error": "User not found"}), 404
    return jsonify(updated.to_dict()), 200

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

    if not owner_id:
        return jsonify({"error": "ID of owner was not provided"}), 400

    owner = facade.get_user(owner_id)
    if not owner or owner.role not in ("owner", "guide"):
        return jsonify({"error": "Only business owners and guides can create listings"}), 403

    desc = request.json.get("description")

    if not desc:
        return jsonify({"error": "Description was not provided"}), 400
    
    is_tour = request.json.get("is_tour")

    if not is_tour:
        is_tour = False    # default value
    
    cost = request.json.get("cost")

    if cost is None:
        return jsonify({"error": "Cost was not provided"}), 400
    
    name = request.json.get("name")

    if not name:
        return jsonify({"error": "Name was not provided"}), 400
    
    main_photo = request.json.get("main_photo_url")

    if not main_photo:
        return jsonify({"error": "Link to main photo was not provided"}), 400
    
    tags = request.json.get("tags")

    if not tags:
        tags = []    # default
    
    place = Place(
        owner_user_id=owner_id,
        name=name,
        is_tour=is_tour,
        cost=cost,
        description=desc,
        main_photo_url=main_photo,
        tags=tags,
    )
    facade.create_place(place)
    return jsonify(place.to_dict()), 200

@app.route("/api/v1/places/update", methods=["PUT"])
@jwt_required()
def update_place():
    current_user_id = get_jwt_identity()
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON"}), 400

    place_id = data.get("id")
    if not place_id:
        return jsonify({"error": "Place id was not provided"}), 400

    place = facade.get_place(place_id)
    if not place:
        return jsonify({"error": "No place with specified id."}), 404

    if place.owner_user_id != current_user_id:
        return jsonify({"error": "You are not the owner of this place"}), 403

    allowed_fields = {"name", "description", "cost", "main_photo_url", "tags", "is_tour"}
    updates = {k: v for k, v in data.items() if k in allowed_fields}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    updated = facade.update_place(place_id, updates)
    return jsonify(updated.to_dict()), 200


@app.route("/api/v1/places/delete", methods=["POST"])
@jwt_required()
def delete_place():
    current_user_id = get_jwt_identity()
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON"}), 400

    place_id = data.get("id")
    if not place_id:
        return jsonify({"error": "Place id was not provided"}), 400

    place = facade.get_place(place_id)
    if not place:
        return jsonify({"error": "No place with specified id."}), 404

    if place.owner_user_id != current_user_id:
        return jsonify({"error": "You are not the owner of this place"}), 403

    facade.delete_place(place_id)
    return "", 200

@app.route("/api/v1/places/book", methods=["POST"])
@jwt_required()
def book_place():
    user_id = get_jwt_identity()
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON"}), 400

    use_kx = data.get("use_kx", False)
    place_id = data.get("place_id")

    user = facade.get_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    place = facade.get_place(place_id)
    if not place:
        return jsonify({"error": "Place not found"}), 404

    cost = place.cost
    if use_kx:
        discount = min(user.kx_count, cost)
        real_cost = cost - discount
        user.kx_count -= discount
    else:
        real_cost = cost
        user.kx_count += cost * (config.PERCENTAGE_FEE / 100)

    user.bought_places.append(place)
    facade.commit()

    return jsonify({"status": "Booked", "amount_charged": real_cost}), 200

@app.route("/api/v1/users/bookings", methods=["GET"])
@jwt_required()
def get_user_bookings():
    user_id = get_jwt_identity()
    rows = facade.user_bookings(user_id)
    result = []
    for place, booked_at in rows:
        d = place.to_dict()
        d["booked_at"] = booked_at.isoformat() if booked_at else None
        result.append(d)
    return jsonify(result), 200

@app.route("/api/v1/places/stats", methods=["GET"])
@jwt_required()
def get_owner_stats():
    owner_id = get_jwt_identity()
    owner = facade.get_user(owner_id)
    if not owner or owner.role not in ("owner", "guide"):
        return jsonify({"error": "Only business owners and guides can view stats"}), 403

    places = facade.places_by_owner(owner_id)
    place_stats = []
    total_bookings = 0
    total_revenue = 0.0
    for p in places:
        count = len(p.buyers)
        revenue = p.cost * count
        total_bookings += count
        total_revenue += revenue
        place_stats.append({
            "place_id": p.id,
            "name": p.name,
            "bookings": count,
            "revenue": revenue,
        })

    return jsonify({
        "places": place_stats,
        "total_bookings": total_bookings,
        "total_revenue": total_revenue,
    }), 200

# Partner applications -------------------------------------

@app.route("/api/v1/partner-applications", methods=["POST"])
@jwt_required()
def create_partner_application():
    user_id = get_jwt_identity()
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON"}), 400

    target_role = data.get("target_role")
    if target_role not in ("owner", "guide"):
        return jsonify({"error": "target_role must be owner or guide"}), 400

    user = facade.get_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.role in ("owner", "guide"):
        return jsonify({"error": "Account is already a owner or guide"}), 400
    if facade.get_pending_application_for_user(user_id):
        return jsonify({"error": "You already have a pending application"}), 409

    application = PartnerApplication(
        user_id=user_id,
        target_role=target_role,
        company_name=data.get("company_name", ""),
        tax_id=data.get("tax_id", ""),
        phone=data.get("phone", ""),
        bio=data.get("bio", ""),
        languages=data.get("languages", ""),
        status="pending",
    )
    facade.create_partner_application(application)
    return jsonify(application.to_dict()), 200

@app.route("/api/v1/partner-applications", methods=["GET"])
@jwt_required()
def list_partner_applications():
    admin = facade.get_user(get_jwt_identity())
    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return jsonify([a.to_dict() for a in facade.get_partner_applications()]), 200

@app.route("/api/v1/partner-applications/<application_id>/approve", methods=["POST"])
@jwt_required()
def approve_partner_application(application_id):
    admin = facade.get_user(get_jwt_identity())
    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    application = facade.get_partner_application(application_id)
    if not application:
        return jsonify({"error": "Application not found"}), 404
    if application.status != "pending":
        return jsonify({"error": "Application has already been decided"}), 400

    facade.update_partner_application(application_id, {"status": "approved"})
    facade.update_user(application.user_id, {"role": application.target_role})
    return jsonify({"status": "Approved"}), 200

@app.route("/api/v1/partner-applications/<application_id>/reject", methods=["POST"])
@jwt_required()
def reject_partner_application(application_id):
    admin = facade.get_user(get_jwt_identity())
    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    application = facade.get_partner_application(application_id)
    if not application:
        return jsonify({"error": "Application not found"}), 404
    if application.status != "pending":
        return jsonify({"error": "Application has already been decided"}), 400

    facade.update_partner_application(application_id, {"status": "rejected"})
    return jsonify({"status": "Rejected"}), 200

@app.route("/api/v1/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON"}), 400

    email = data.get("email")
    password = data.get("password")

    user = facade.get_user_by_email(email)

    if not user or not user.check_pwd(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=user.id)
    return jsonify({"access_token": token, "user": user.to_dict()}), 200

@app.route("/api/v1/users/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user = facade.get_user(get_jwt_identity())
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200

if __name__ == "__main__":
    app.run(debug=config.is_debugging())
