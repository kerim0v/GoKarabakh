from flask import Flask, jsonify, request
from flask_cors import CORS
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
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON"}), 400
    else:
        print(data)

    password = data.get("password")
    email = data.get("email")
    about_me = data.get("about_me")
    yob = data.get("year_of_birth")
    mob = data.get("month_of_birth")
    dob = data.get("day_of_birth")
    name = data.get("name")
    kx = data.get("kx_count")
    if kx == None:
        kx = 0

    print("Checking required fields.")

    if about_me == None or password == None or email == None or name == None or yob == None or mob == None or dob == None:
        return jsonify({"error": "Missing required fields"}), 400

    print("Instantiating.")

    user = User(kx, name, [], yob, mob, dob, email)
    user.hash_pwd(password)
    facade.create_user(user)
    return jsonify({"status": "User created successfully", "id": user.id}), 200

# Places -------------------------------------
@app.route("/api/v1/places/get_saved", methods=["GET"])
def saved_places_get():
    user_id = request.args.get("id")
    if not user_id:
        return jsonify({"status": "User id missing"}), 400
    user = facade.get_user(user_id)
    if not user:
        return jsonify({"status": "No user with such id"}), 404
    places = user.saved_places
    return jsonify(places), 200

@app.route("/api/v1/places/update_saved", methods=["POST"])
def saved_places_update():
    req = request.get_json(force=True)
    if not req:
        print("Request was missing...", flush=True)
        return jsonify({"status": "Missing request"}), 400
    userid = req.get("user_id")
    places = req.get("places")
    if userid == None or places == None:
        print("User ID and places were omitted", flush=True)
        print("UserID",userid)
        print("Places",places)
        return jsonify({"status": "User ID and places must be present"}), 400

    user = facade.get_user(userid)
    if not user:
        return jsonify({"status": "No user with such id"}), 404

    try:
        facade.delete_user(user.id)
        user.saved_places = places
        facade.create_user(user)
        return jsonify({"status": "Good!"}), 200
    except Exception as ex:
        print("FATAL UPDATE ERROR", flush=True)
        print(ex, flush=True)
        return jsonify({"status": "Critical error"}), 400

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
    return jsonify({"access_token": token, "id": user.id}), 200

if __name__ == "__main__":
    CORS(app)
    app.run(debug=config.is_debugging())
