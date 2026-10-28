import os
import uuid

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required

import config
from app.api import common

bp = Blueprint("uploads", __name__)

# Detected from the file's first bytes, never from the name the browser sent
SIGNATURES = (
    (b"\xff\xd8\xff", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"GIF87a", "gif"),
    (b"GIF89a", "gif"),
)


def upload_folder():
    folder = current_app.config.get("UPLOAD_FOLDER") or config.UPLOAD_FOLDER \
        or os.path.join(current_app.instance_path, "uploads")
    os.makedirs(folder, exist_ok=True)
    return folder


def image_extension(head):
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    for signature, extension in SIGNATURES:
        if head.startswith(signature):
            return extension
    return None


@bp.route("/api/v1/uploads", methods=["POST"])
@jwt_required()
def upload_image():
    common.current_user()
    common.rate_limit("upload", 30, 600)
    file = request.files.get("file")
    if not file:
        raise common.ApiError("Choose an image to upload", 400, "missing_file")

    data = file.read(config.MAX_UPLOAD_MB * 1024 * 1024 + 1)
    if len(data) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise common.ApiError(f"Images must be under {config.MAX_UPLOAD_MB} MB", 413, "file_too_large")
    extension = image_extension(data[:16])
    if not extension:
        raise common.ApiError("Only JPEG, PNG, WebP or GIF images are allowed", 400, "invalid_image")

    name = f"{uuid.uuid4().hex}.{extension}"
    with open(os.path.join(upload_folder(), name), "wb") as out:
        out.write(data)
    return jsonify({"url": f"/uploads/{name}"}), 200


@bp.route("/uploads/<path:name>")
def serve_upload(name):
    return send_from_directory(upload_folder(), name, max_age=60 * 60 * 24 * 30)
