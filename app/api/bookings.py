import datetime
import math

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

import config
from app.api import common
from app.models.booking_request import BookingRequest
from app.services import facade
from app.services.mailer import frontend_link, send_mail

bp = Blueprint("bookings", __name__, url_prefix="/api/v1/places")

MAX_NIGHTS = 60


def booking_total(place, check_in, check_out, guests):
    """Hotels charge per night, restaurants and tours per guest."""
    if place.category == "hotel":
        return place.cost * (check_out - check_in).days
    return place.cost * guests


def earned_coins(booking):
    paid = float(booking.total_cost) - booking.coins_used
    return max(0, round(paid * config.PERCENTAGE_FEE / 100))


def request_dict(booking, place):
    d = booking.to_dict()
    d["place_name"] = place.name
    d["place_photo_url"] = place.main_photo_url
    d["place_region"] = place.region
    d["place_category"] = place.category
    return d


def describe(booking, place):
    dates = booking.check_in.isoformat()
    if booking.check_out:
        dates += f" – {booking.check_out.isoformat()}"
    return f"{place.name}, {dates}, {booking.guests} guest(s), {float(booking.total_cost):.2f} AZN"


def notify_traveller(booking, place, subject, text):
    traveller = facade.get_user(booking.user_id)
    if traveller:
        send_mail(traveller.email, subject,
                  f"Hi {traveller.name},\n\n{text}\n\n{describe(booking, place)}\n\n"
                  f"Your bookings: {frontend_link('/profile')}")


def decline_and_refund(booking, place, reason="declined"):
    """Close a request that won't go ahead and give back any coins it held or earned."""
    facade.update_booking_request(booking.id, {"status": reason})
    traveller = facade.get_user(booking.user_id)
    if traveller:
        facade.grant_kx(traveller, booking.coins_used, f"Refund for {place.name}")
        # Coins earned on a confirmed booking are taken back, but never below zero
        facade.grant_kx(traveller, -min(booking.coins_earned, traveller.kx_count), f"Cancelled {place.name}")
    if reason == "declined":
        notify_traveller(booking, place, f"Booking declined: {place.name}",
                         "Unfortunately the partner can't take your booking request. Any coins you used are back in your account.")


def _owned_request(request_id, owner):
    booking = facade.get_booking_request(request_id)
    if not booking:
        raise common.ApiError("Booking request not found", 404, "not_found")
    place = facade.get_place(booking.place_id)
    if not place or place.owner_user_id != owner.id:
        raise common.ApiError("You are not the owner of this place", 403, "forbidden")
    if booking.status != "pending":
        raise common.ApiError("Booking request already decided", 400, "already_decided")
    return booking, place


@bp.route("/book_request", methods=["POST"])
@jwt_required()
def create_booking_request():
    user = common.current_user()
    data = common.json_body()

    place = facade.get_place(data.get("place_id"))
    if not place or not place.is_active:
        raise common.ApiError("Place not found", 404, "not_found")
    if not place.is_bookable:
        raise common.ApiError("This place can't be booked", 400, "not_bookable")
    if place.owner_user_id == user.id:
        raise common.ApiError("You can't book your own listing", 400, "own_listing")

    check_in = common.date(data.get("check_in"), "check_in")
    if check_in < datetime.date.today():
        raise common.ApiError("The date is in the past", 400, "date_in_past")
    check_out = None
    if place.category == "hotel":
        check_out = common.date(data.get("check_out"), "check_out")
        nights = (check_out - check_in).days
        if nights < 1:
            raise common.ApiError("Check-out must be after check-in", 400, "checkout_before_checkin")
        if nights > MAX_NIGHTS:
            raise common.ApiError(f"Stays are limited to {MAX_NIGHTS} nights", 400, "stay_too_long")
    guests = common.integer(data.get("guests"), "guests", 1, 50, default=1)
    last_day = check_out - datetime.timedelta(days=1) if check_out else check_in
    if facade.is_closed(place.id, check_in, last_day):
        raise common.ApiError("This place is closed on those dates", 400, "place_closed")

    total = booking_total(place, check_in, check_out, guests)
    coins_used = min(user.kx_count, math.floor(total)) if data.get("use_kx") else 0

    booking = BookingRequest(
        place_id=place.id,
        user_id=user.id,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        message=common.text(data, "message", 1000),
        contact_phone=common.text(data, "contact_phone", 50),
        total_cost=total,
        coins_used=coins_used,
        status="pending",
    )
    facade.create_booking_request(booking)
    # Coins are held when the request is made and given back if it doesn't go ahead
    facade.grant_kx(user, -coins_used, f"Used on booking {place.name}")

    owner = facade.get_user(place.owner_user_id)
    if owner:
        send_mail(owner.email, f"New booking request: {place.name}",
                  f"{user.name} asked to book {describe(booking, place)}.\n\n"
                  f"Confirm or decline it in your workspace: {frontend_link('/owner-dashboard' if owner.role == 'owner' else '/guide-dashboard')}")
    return jsonify(request_dict(booking, place)), 200


@bp.route("/book_requests", methods=["GET"])
@jwt_required()
def list_owner_booking_requests():
    owner = common.current_user()
    result = []
    for booking, place, traveller in facade.booking_requests_for_owner(owner.id):
        d = request_dict(booking, place)
        d["traveller_name"] = traveller.name
        d["traveller_email"] = traveller.email
        result.append(d)
    return jsonify(result), 200


@bp.route("/my_book_requests", methods=["GET"])
@jwt_required()
def list_my_booking_requests():
    user = common.current_user()
    result = []
    for booking, place, owner in facade.booking_requests_for_user(user.id):
        d = request_dict(booking, place)
        # The partner's contact details are shared once they've accepted
        if booking.status == "confirmed":
            application = facade.get_approved_application_for_user(owner.id)
            d["partner_name"] = (application and application.company_name) or owner.name
            d["partner_email"] = owner.email
            d["partner_phone"] = application.phone if application else None
        result.append(d)
    return jsonify(result), 200


@bp.route("/book_requests/<request_id>/confirm", methods=["POST"])
@jwt_required()
def confirm_booking_request(request_id):
    booking, place = _owned_request(request_id, common.current_user())
    coins = earned_coins(booking)
    facade.update_booking_request(booking.id, {"status": "confirmed", "coins_earned": coins})
    traveller = facade.get_user(booking.user_id)
    if traveller:
        facade.grant_kx(traveller, coins, f"Booked {place.name}")
    notify_traveller(booking, place, f"Booking confirmed: {place.name}",
                     f"Good news - your booking is confirmed and you earned {coins} coins. "
                     "The partner's contact details are on your profile.")
    return jsonify({"status": "Confirmed"}), 200


@bp.route("/book_requests/<request_id>/decline", methods=["POST"])
@jwt_required()
def decline_booking_request(request_id):
    booking, place = _owned_request(request_id, common.current_user())
    decline_and_refund(booking, place)
    return jsonify({"status": "Declined"}), 200


@bp.route("/book_requests/<request_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_booking_request(request_id):
    user = common.current_user()
    booking = facade.get_booking_request(request_id)
    if not booking or booking.user_id != user.id:
        raise common.ApiError("Booking request not found", 404, "not_found")
    if booking.status not in ("pending", "confirmed"):
        raise common.ApiError("This booking can't be cancelled", 400, "not_cancellable")
    if booking.status == "confirmed" and booking.check_in <= datetime.date.today():
        raise common.ApiError("Confirmed bookings can only be cancelled before the day", 400, "too_late")

    place = facade.get_place(booking.place_id)
    decline_and_refund(booking, place, reason="cancelled")
    owner = facade.get_user(place.owner_user_id)
    if owner:
        send_mail(owner.email, f"Booking cancelled: {place.name}",
                  f"{user.name} cancelled their booking: {describe(booking, place)}.")
    return jsonify({"status": "Cancelled"}), 200
