"""Writes static/openapi.json (served at /api/docs). Run after changing the API:  python scripts/build_openapi.py

tests/test_docs.py fails when a route is missing here.
"""
import json
import os

OUTPUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "openapi.json")

S = lambda t, **kw: {"type": t, **kw}
STR, INT, NUM, BOOL, DATE, DT = S("string"), S("integer"), S("number"), S("boolean"), S("string", format="date"), S("string", format="date-time")
REF = lambda name: {"$ref": f"#/components/schemas/{name}"}
ARR = lambda item: {"type": "array", "items": item}
REGIONS = ["shusha", "kalbajar", "lachin", "khankendi", "aghdam", "khojaly", "khojavend", "qubadli", "zangilan"]
CATS = ["hotel", "restaurant", "attraction", "tour"]

base = {"id": STR, "creation_date": DT, "modification_date": DT}
schemas = {
    "Error": {"type": "object", "properties": {"error": STR, "code": STR}},
    "User": {"type": "object", "properties": {**base, "kx_count": INT, "name": STR, "year_of_birth": INT, "month_of_birth": INT, "day_of_birth": INT, "email": S("string", format="email"), "role": S("string", enum=["user", "owner", "guide", "admin"])}},
    "PublicUser": {"type": "object", "properties": {"id": STR, "name": STR, "role": STR}},
    "Place": {"type": "object", "properties": {**base, "owner_user_id": STR, "name": STR, "region": S("string", enum=REGIONS), "category": S("string", enum=CATS), "subtitle": STR, "badge": STR, "cost": S("number", description="AZN; per night for hotels, per person otherwise"), "description": STR, "main_photo_url": STR, "tags": ARR(STR), "is_active": BOOL, "is_tour": BOOL, "is_bookable": BOOL, "owner_role": STR, "bookings_count": INT, "avg_rating": NUM, "review_count": INT}},
    "PlaceInput": {"type": "object", "required": ["name", "description", "cost", "main_photo_url", "region", "category"], "properties": {"name": STR, "description": STR, "cost": NUM, "main_photo_url": S("string", description="/uploads/..., a frontend path, or an https URL"), "region": S("string", enum=REGIONS), "category": S("string", enum=CATS, description="Guides can only create tours"), "subtitle": STR, "badge": STR, "tags": ARR(STR)}},
    "BookingRequest": {"type": "object", "properties": {**base, "place_id": STR, "user_id": STR, "check_in": DATE, "check_out": DATE, "guests": INT, "message": STR, "contact_phone": STR, "total_cost": NUM, "coins_used": INT, "coins_earned": INT, "status": S("string", enum=["pending", "confirmed", "declined", "cancelled"]), "place_name": STR, "place_photo_url": STR, "place_region": STR, "place_category": STR, "traveller_name": S("string", description="Owner inbox only"), "traveller_email": S("string", description="Owner inbox only"), "partner_name": S("string", description="Traveller list, once confirmed"), "partner_email": S("string", description="Traveller list, once confirmed"), "partner_phone": S("string", description="Traveller list, once confirmed")}},
    "PartnerApplication": {"type": "object", "properties": {**base, "user_id": STR, "target_role": S("string", enum=["owner", "guide"]), "company_name": STR, "tax_id": STR, "phone": STR, "bio": STR, "languages": STR, "status": S("string", enum=["pending", "approved", "rejected"]), "admin_note": STR, "user_name": STR, "user_email": STR}},
    "CommunityTrace": {"type": "object", "properties": {**base, "user_id": STR, "region_slug": S("string", enum=REGIONS), "caption": STR, "photo_url": STR, "author_name": STR}},
    "KxTransaction": {"type": "object", "properties": {**base, "user_id": STR, "amount": INT, "reason": STR}},
    "Review": {"type": "object", "properties": {**base, "place_id": STR, "user_id": STR, "rating": S("integer", minimum=1, maximum=5), "comment": STR, "author_name": STR}},
    "ItineraryItem": {"type": "object", "properties": {**base, "user_id": STR, "place_id": STR, "visit_date": S("string", format="date", nullable=True), "start_time": S("string", example="14:30", nullable=True), "note": STR, "place": REF("Place")}},
}

ERRORS = {422: "The AI declined", 503: "Unavailable", 400: "Invalid input", 401: "Not signed in", 403: "Not allowed", 404: "Not found", 409: "Conflict", 413: "Too large", 429: "Rate limited"}


def body(props, required=()):
    return {"required": True, "content": {"application/json": {"schema": {"type": "object", "required": list(required), "properties": props}}}}


def note_body():
    return {"required": False, "content": {"application/json": {"schema": {"type": "object", "properties": {"note": STR}}}}}


def op(tag, summary, auth=False, req=None, resp=None, params=(), desc=None, errors=(400,)):
    o = {"tags": [tag], "summary": summary}
    if desc:
        o["description"] = desc
    if auth:
        o["security"] = [{"bearerAuth": []}]
    if params:
        o["parameters"] = [{"name": n, "in": where, "required": r, "schema": sch} for n, where, r, sch in params]
    if req:
        o["requestBody"] = req
    ok = {"description": "OK"}
    if resp:
        ok["content"] = {"application/json": {"schema": resp}}
    o["responses"] = {"200": ok}
    for code in tuple(errors) + ((401, 403) if auth else ()):
        o["responses"][str(code)] = {"description": ERRORS[code], "content": {"application/json": {"schema": REF("Error")}}}
    return o


ID = lambda name: (name, "path", True, STR)
QID = ("id", "query", True, STR)
STATUS = {"type": "object", "properties": {"status": STR}}
LIST_PARAMS = (
    ("region", "query", False, S("string", enum=REGIONS)),
    ("category", "query", False, S("string", enum=CATS)),
    ("kind", "query", False, S("string", enum=["stays", "routes", "guides"])),
    ("q", "query", False, STR),
    ("sort", "query", False, S("string", enum=["popular", "rating", "price_asc", "price_desc"])),
    ("limit", "query", False, INT),
)

paths = {
    "/api/v1/auth/login": {"post": op("Auth", "Sign in", req=body({"email": STR, "password": STR}, ["email", "password"]), resp={"type": "object", "properties": {"access_token": STR, "user": REF("User")}}, errors=(400, 401, 429))},
    "/api/v1/auth/forgot-password": {"post": op("Auth", "Email a password reset link", req=body({"email": STR}, ["email"]), resp=STATUS, desc="Always answers 200 so it does not reveal which emails have accounts.", errors=(429,))},
    "/api/v1/auth/reset-password": {"post": op("Auth", "Set a new password with a reset token", req=body({"token": STR, "password": STR}, ["token", "password"]), resp=STATUS, errors=(400, 429))},
    "/api/v1/users/create": {"post": op("Users", "Sign up (100 welcome coins)", req=body({"email": STR, "password": S("string", minLength=8), "about_me": {"type": "object", "required": ["name"], "properties": {"name": STR, "year_of_birth": INT, "month_of_birth": INT, "day_of_birth": INT}}}, ["email", "password", "about_me"]), resp=STATUS, errors=(400, 409, 429))},
    "/api/v1/users/me": {"get": op("Users", "Signed-in user", auth=True, resp=REF("User"), errors=())},
    "/api/v1/users/update": {"put": op("Users", "Update name or birth date", auth=True, req=body({"name": STR, "year_of_birth": INT, "month_of_birth": INT, "day_of_birth": INT}), resp=REF("User"))},
    "/api/v1/users/change-password": {"post": op("Users", "Change password", auth=True, req=body({"current_password": STR, "new_password": STR}, ["current_password", "new_password"]), resp=STATUS)},
    "/api/v1/users/delete": {"post": op("Users", "Delete own account", auth=True, req=body({"password": STR}, ["password"]))},
    "/api/v1/users/leave-partnership": {"post": op("Users", "Stop being a partner", auth=True, resp=REF("User"), desc="Hides the user's listings and declines their pending requests (coins refunded).")},
    "/api/v1/users/kx_transactions": {"get": op("Users", "Coin history", auth=True, resp=ARR(REF("KxTransaction")), errors=())},
    "/api/v1/users/get": {"get": op("Users", "All users (admin)", auth=True, resp=ARR(REF("User")), errors=())},
    "/api/v1/users/get_id": {"get": op("Users", "One user", params=(QID,), resp={"oneOf": [REF("User"), REF("PublicUser")]}, desc="Full profile for the user themself or an admin (send a token); name and role for everyone else.", errors=(400, 404))},
    "/api/v1/places/get": {"get": op("Places", "Search listings", params=LIST_PARAMS, resp=ARR(REF("Place")))},
    "/api/v1/places/get_id": {"get": op("Places", "One listing", params=(QID,), resp=REF("Place"), errors=(404,))},
    "/api/v1/places/get_places_by_tags": {"get": op("Places", "Listings having all tags", params=(("tags", "query", False, ARR(STR)),), resp=ARR(REF("Place")), errors=())},
    "/api/v1/places/mine": {"get": op("Places", "Own listings, hidden ones included", auth=True, resp=ARR(REF("Place")), errors=())},
    "/api/v1/places/create": {"post": op("Places", "Create a listing (owner/guide)", auth=True, req={"required": True, "content": {"application/json": {"schema": REF("PlaceInput")}}}, resp=REF("Place"))},
    "/api/v1/places/update": {"put": op("Places", "Edit a listing (owner or admin)", auth=True, req=body({"id": STR, **schemas["PlaceInput"]["properties"]}, ["id"]), resp=REF("Place"), errors=(400, 404))},
    "/api/v1/places/delete": {"post": op("Places", "Delete a listing (owner or admin)", auth=True, req=body({"id": STR}, ["id"]), errors=(400, 404))},
    "/api/v1/places/stats": {"get": op("Places", "Booking stats for own listings", auth=True, resp={"type": "object", "properties": {"places": ARR({"type": "object", "properties": {"place_id": STR, "name": STR, "bookings": INT, "pending": INT, "revenue": NUM}}), "total_bookings": INT, "total_pending": INT, "total_revenue": NUM}}, errors=())},
    "/api/v1/places/book_request": {"post": op("Bookings", "Request a booking", auth=True, req=body({"place_id": STR, "check_in": DATE, "check_out": S("string", format="date", description="Hotels only"), "guests": INT, "message": STR, "contact_phone": STR, "use_kx": S("boolean", description="Spend coins, 1 coin = 1 AZN")}, ["place_id", "check_in"]), resp=REF("BookingRequest"), desc="Emails the owner. Hotels are priced per night, restaurants and tours per guest. Coins used are held until the request is declined or cancelled.", errors=(400, 404))},
    "/api/v1/places/book_requests": {"get": op("Bookings", "Requests on own listings", auth=True, resp=ARR(REF("BookingRequest")), errors=())},
    "/api/v1/places/my_book_requests": {"get": op("Bookings", "Own booking requests", auth=True, resp=ARR(REF("BookingRequest")), errors=())},
    "/api/v1/places/book_requests/{request_id}/confirm": {"post": op("Bookings", "Confirm a request (owner)", auth=True, params=(ID("request_id"),), resp=STATUS, desc="Credits the traveller 2% of the paid amount in coins and emails them.", errors=(400, 404))},
    "/api/v1/places/book_requests/{request_id}/decline": {"post": op("Bookings", "Decline a request (owner)", auth=True, params=(ID("request_id"),), resp=STATUS, desc="Refunds held coins and emails the traveller.", errors=(400, 404))},
    "/api/v1/places/book_requests/{request_id}/cancel": {"post": op("Bookings", "Cancel own booking", auth=True, params=(ID("request_id"),), resp=STATUS, desc="Pending bookings any time, confirmed ones before the check-in day. Settles coins and emails the owner.", errors=(400, 404))},
    "/api/v1/places/{place_id}/reviews": {
        "get": op("Reviews", "Reviews of a listing", params=(ID("place_id"),), resp=ARR(REF("Review")), errors=(404,)),
        "post": op("Reviews", "Review a listing", auth=True, params=(ID("place_id"),), req=body({"rating": S("integer", minimum=1, maximum=5), "comment": STR}, ["rating"]), resp=REF("Review"), desc="Needs a confirmed booking whose date has arrived; one review per place.", errors=(400, 404, 409)),
    },
    "/api/v1/reviews/{review_id}": {"delete": op("Reviews", "Delete a review (author or admin)", auth=True, params=(ID("review_id"),), errors=(404,))},
    "/api/v1/itinerary": {
        "get": op("Itinerary", "Saved places", auth=True, resp=ARR(REF("ItineraryItem")), errors=()),
        "post": op("Itinerary", "Save a place", auth=True, req=body({"place_id": STR, "date": DATE, "time": S("string", example="14:30")}, ["place_id"]), resp=REF("ItineraryItem"), errors=(400, 404)),
    },
    "/api/v1/itinerary/{item_id}": {
        "put": op("Itinerary", "Set date, approximate time or note", auth=True, params=(ID("item_id"),), req=body({"date": S("string", format="date", nullable=True), "time": S("string", example="14:30", nullable=True), "note": STR}), resp=REF("ItineraryItem"), errors=(400, 404)),
        "delete": op("Itinerary", "Remove a saved place", auth=True, params=(ID("item_id"),), errors=(404,)),
    },
    "/api/v1/partner-applications": {
        "post": op("Partners", "Apply to become an owner or guide", auth=True, req=body({"target_role": S("string", enum=["owner", "guide"]), "company_name": S("string", description="Required for owners"), "tax_id": S("string", description="Required for owners"), "phone": STR, "bio": STR, "languages": STR}, ["target_role", "phone", "bio", "languages"]), resp=REF("PartnerApplication"), errors=(400, 409)),
        "get": op("Partners", "Own applications (all of them for admins)", auth=True, resp=ARR(REF("PartnerApplication")), errors=()),
    },
    "/api/v1/partner-applications/{application_id}/approve": {"post": op("Partners", "Approve (admin)", auth=True, params=(ID("application_id"),), req=note_body(), resp=STATUS, desc="Emails the applicant, including the optional note.", errors=(400, 404))},
    "/api/v1/partner-applications/{application_id}/reject": {"post": op("Partners", "Reject (admin)", auth=True, params=(ID("application_id"),), req=note_body(), resp=STATUS, desc="Emails the applicant, including the optional note.", errors=(400, 404))},
    "/api/v1/community/traces": {
        "get": op("Community", "Traces, newest first", params=(("region", "query", False, S("string", enum=REGIONS)), ("limit", "query", False, INT)), resp=ARR(REF("CommunityTrace"))),
        "post": op("Community", "Leave a trace (50 coins the first time)", auth=True, req=body({"region_slug": S("string", enum=REGIONS), "caption": STR, "photo_url": S("string", description="From POST /api/v1/uploads")}, ["region_slug", "caption"]), resp=REF("CommunityTrace")),
    },
    "/api/v1/community/traces/{trace_id}": {"delete": op("Community", "Delete a trace (author or admin)", auth=True, params=(ID("trace_id"),), errors=(404,))},
    "/api/v1/uploads": {"post": op("Uploads", "Upload an image", auth=True, req={"required": True, "content": {"multipart/form-data": {"schema": {"type": "object", "properties": {"file": S("string", format="binary")}}}}}, resp={"type": "object", "properties": {"url": S("string", example="/uploads/3f2a.jpg")}}, desc="JPEG, PNG, WebP or GIF up to 5 MB, checked by content. The returned path is served by the API at /uploads/<name>.", errors=(400, 413, 429))},
    "/api/v1/admin/overview": {"get": op("Admin", "Counts for the admin dashboard", auth=True, resp={"type": "object", "additionalProperties": INT}, errors=())},
    "/api/v1/admin/users": {"get": op("Admin", "Search users", auth=True, params=(("q", "query", False, STR),), resp=ARR(REF("User")), errors=())},
    "/api/v1/admin/users/{user_id}/role": {"put": op("Admin", "Change a user's role", auth=True, params=(ID("user_id"),), req=body({"role": S("string", enum=["user", "owner", "guide", "admin"])}, ["role"]), resp=REF("User"), errors=(400, 404))},
    "/api/v1/admin/places": {"get": op("Admin", "All listings, hidden ones included", auth=True, params=(("q", "query", False, STR),), resp=ARR(REF("Place")), errors=())},
    "/api/v1/ai/plan": {"post": op("AI planner", "Plan a trip with AI", auth=True, req=body({"start_date": DATE, "days": S("integer", minimum=1, maximum=7), "guests": S("integer", minimum=1, maximum=20), "budget": S("string", enum=["economy", "balanced", "premium"]), "language": S("string", enum=["en", "az", "ru"]), "wishes": S("string", maxLength=1000)}, ["start_date"]), resp={"type": "object", "properties": {"summary": STR, "tips": ARR(STR), "remaining_today": INT, "days": ARR({"type": "object", "properties": {"date": DATE, "title": STR, "stops": ARR({"type": "object", "properties": {"place_id": STR, "time": S("string", nullable=True), "reason": STR, "place": REF("Place")}})}})}}, desc="Claude builds a day-by-day plan from the active listings only. Off (503 ai_disabled) without ANTHROPIC_API_KEY; limited per user per day (429 ai_limit).", errors=(400, 422, 429, 503))},
    "/api/v1/meta": {"get": op("Meta", "Regions, categories, coin rules and currency rates", resp={"type": "object"}, errors=())},
}

spec = {
    "openapi": "3.0.3",
    "info": {
        "title": "GoKarabakh API",
        "description": "Booking platform for tours, hotels, and guides in Karabakh. Errors are JSON: {\"error\": message, \"code\": machine-readable code}.",
        "version": "2.0.0",
    },
    "servers": [{"url": "http://localhost:5000"}],
    "components": {"securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}}, "schemas": schemas},
    "paths": paths,
}
with open(OUTPUT, "w", encoding="utf-8", newline="\n") as f:
    json.dump(spec, f, indent=2, ensure_ascii=False)
    f.write("\n")
print(len(paths), "paths")
