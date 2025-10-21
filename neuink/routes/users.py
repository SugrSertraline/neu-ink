from flask import Blueprint, jsonify
from neuink.services.db import get_user_col

bp = Blueprint("users", __name__)

@bp.get("/ping")
def users_ping():
    """
    读取 NeuInk.User 的统计信息，验证集合可访问。
    """
    col = get_user_col()
    # 简单统计：文档总数（不会全量扫描，Mongo 会维护元数据）
    try:
        total = col.estimated_document_count()
        # 如果集合不存在，访问时 Mongo 会懒创建；这里仍然可返回 0
        return jsonify(collection="User", db="NeuInk", estimated_count=total), 200
    except Exception as e:
        return jsonify(error=str(e)), 500
