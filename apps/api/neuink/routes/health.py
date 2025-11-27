from flask import Blueprint, jsonify
from neuink.utils.db import ping

bp = Blueprint("health", __name__)

@bp.get("/")
def health():
    try:
        pong = ping()  # {'ok': 1.0} 即连通
        return jsonify(status="ok", mongo=pong), 200
    except Exception as e:
        return jsonify(status="error", error=str(e)), 500
