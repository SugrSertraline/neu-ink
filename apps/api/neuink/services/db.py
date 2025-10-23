import os
from flask import current_app, g
from pymongo import MongoClient

_client = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        _client = MongoClient(uri, uuidRepresentation="standard", connect=True)
    return _client

def get_db():
    """
    返回 NeuInk 数据库句柄（已通过 URI 指明 NeuInk）
    """
    if "db" not in g:
        client = get_client()
        # 直接使用 NeuInk 数据库
        g.db = client["NeuInk"]
    return g.db

def get_user_col():
    """
    返回 User 集合（单数、首字母大写，按你的要求）
    """
    return get_db()["User"]

def ping():
    """
    用于健康检查：admin.ping
    """
    client = get_client()
    return client.admin.command("ping")
