from flask import Flask, jsonify, request
from app.models.place import Place
from app.models.user import User
from app.services import facade
from app.share import share_init
import config


app = Flask(__name__)
share_init(app)

@app.route("/")
def home():
    return "A server."

# API

@app.route("/api/v1/users/get")
def get_users_api():
    users = []
    for user in facade.get_users():
        d: dict = user.__dict__
        d.pop("pwd_hash")
        users.append(d)
    return users

@app.route("/api/v1/users/get_id")
def get_user():
    u = facade.get_user(request.args.get("id"))
    if not u:
        return jsonify({"status": "No user with specified id."}),404
    d: dict = u.__dict__
    d.pop("pwd_hash", None)   # Don't return password hash
    return jsonify(d)

@app.route("/api/v1/users/delete")
def delete_user():
    if facade.delete_user_by_id_if_pwd(request.json.get("id"), request.json.get("password")):
        return 200
    else:
        return 400

@app.route("/api/v1/users/create", methods=["POST"])
def create_user():
    data = request.get_json(force=True)  # safer parsing

    if not data:
        return jsonify({"error": "Invalid or missing JSON"}), 400

    password = data.get("password")
    email = data.get("email")
    about_me = data.get("about_me")
    yob = about_me.get("year_of_birth")
    mob = about_me.get("month_of_birth")
    dob = about_me.get("day_of_birth")
    name = about_me.get("name")
    user = User(0, name, [], yob, mob, dob, email)
    user.hash_pwd(password)
    facade.create_user(user)
    return jsonify({"status":"User created successfully"}),200

# Place

@app.route("/api/v1/places/get")
def get_places(): return jsonify(facade.get_places())

@app.route("/api/v1/places/get_id")
def get_place_by_id(): return jsonify(facade.get_place(request.json.get("id")))

@app.route("/api/v1/places/create")
def create_place():
    owner_id = request.json.get("id")
    desc = request.json.get("description")
    is_tour = request.json.get("is_tour")
    cost = request.json.get("cost")
    name = request.json.get("name")
    main_photo = request.json.get("main_photo_url")
    tags = request.json.get("tags")
    place = Place(owner_id, name, is_tour, cost, desc, main_photo, tags)
    facade.create_place(place)
    return 200

@app.route("/api/v1/places/book")
def book_place():
    user_id = request.json.get("user_id")
    use_kx = request.json.get("use_kx")
    user = facade.get_user(user_id)
    if user:
        place_id = request.json.get("place_id")
        place = facade.get_place(place_id)
        if place:
            cost = place.cost
            real_cost = cost
            if use_kx:
                real_cost -= user.kx_count
                user.kx_count += cost * (config.PERCENTAGE_FEE / 100)
            user.bought_places.append(place)
            facade.update_user(user)
            return 200
    return 400

@app.route("/api/v1/places/get_places_by_tags")
def get_places_by_tags():
    tags = request.json.get("tags")
    return jsonify(facade.places_by_tag(tags))

if __name__ == "__main__":
    app.run(debug=config.is_debugging())
