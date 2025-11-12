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

def get_db_service():
    """
    返回数据库服务对象，提供基本的CRUD操作
    """
    class DBService:
        def __init__(self, db):
            self.db = db
        
        def find_one(self, collection_name, query):
            """查找单个文档"""
            return self.db[collection_name].find_one(query)
        
        def find(self, collection_name, query, sort=None):
            """查找多个文档"""
            cursor = self.db[collection_name].find(query)
            if sort:
                cursor = cursor.sort(sort)
            return cursor
        
        def insert_one(self, collection_name, document):
            """插入单个文档"""
            return self.db[collection_name].insert_one(document)
        
        def update_one(self, collection_name, query, update):
            """更新单个文档"""
            return self.db[collection_name].update_one(query, update)
        
        def delete_one(self, collection_name, query):
            """删除单个文档"""
            return self.db[collection_name].delete_one(query)
        
        def delete_many(self, collection_name, query):
            """删除多个文档"""
            return self.db[collection_name].delete_many(query)
    
    return DBService(get_db())

def ping():
    """
    用于健康检查：admin.ping
    """
    client = get_client()
    return client.admin.command("ping")
