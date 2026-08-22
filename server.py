from flask import Flask, jsonify, request
from app.models.place import Place
from app.models.user import User
from app.services import facade
from app.share import share_init
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import config


app = Flask(__name__)
share_init(app)

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
    about_me = data.get("about_me")

    if not about_me:
        return jsonify({"error": "Missing 'about_me' field"}), 400

    yob = about_me.get("year_of_birth")
    mob = about_me.get("month_of_birth")
    dob = about_me.get("day_of_birth")
    name = about_me.get("name")

    if not all([password, email, name, yob, mob, dob]):
        return jsonify({"error": "Missing required fields"}), 400

    user = User(
        kx_count=0,
        name=name,
        year_of_birth=yob,
        month_of_birth=mob,
        day_of_birth=dob,
        email=email,
    )
    user.hash_pwd(password)
    facade.create_user(user)
    return jsonify({"status": "User created successfully"}), 200

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
    return 200

@app.route("/api/v1/places/book", methods=["POST"])
@jwt_required()
def book_place():
    user_id = get_jwt_identity()
    data = request.get_json(force=True)
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

@app.route("/api/v1/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    email = data.get("email")
    password = data.get("password")

    user = None
    for u in facade.get_users():
        if u.email == email:
            user = u
            break

    if not user or not user.check_pwd(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=user.id)
    return jsonify({"access_token": token}), 200

if __name__ == "__main__":
    app.run(debug=config.is_debugging())
