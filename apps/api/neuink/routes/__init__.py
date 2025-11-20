# neuink/routes/__init__.py
from flask import Flask

from .public_papers import bp as public_papers_bp
from .admin_papers import bp as admin_papers_bp
from .user_papers import bp as user_papers_bp
from .upload import bp as upload_bp
from .parse_results import bp as parse_results_bp
from .parse_results import user_bp as user_parse_results_bp  # 为用户论文库创建另一个蓝图实例

def init_app(app: Flask, prefix: str) -> None:
    """注册论文相关蓝图"""
    app.register_blueprint(public_papers_bp, url_prefix=f"{prefix}/public/papers")
    # 先注册 parse_results_bp，确保更具体的路由先被匹配
    app.register_blueprint(parse_results_bp, url_prefix=f"{prefix}/admin/papers")
    app.register_blueprint(admin_papers_bp, url_prefix=f"{prefix}/admin/papers")
    app.register_blueprint(user_parse_results_bp, url_prefix=f"{prefix}/user/papers")  # 为用户论文库注册解析结果路由
    app.register_blueprint(user_papers_bp, url_prefix=f"{prefix}/user/papers")
    app.register_blueprint(upload_bp, url_prefix=f"{prefix}/upload")
