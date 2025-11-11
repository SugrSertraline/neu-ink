# neuink/routes/__init__.py
from flask import Flask

from .public_papers import bp as public_papers_bp
from .admin_papers import bp as admin_papers_bp
from .user_papers import bp as user_papers_bp
from .upload import bp as upload_bp

def init_app(app: Flask, prefix: str) -> None:
    """注册论文相关蓝图"""
    app.register_blueprint(public_papers_bp, url_prefix=f"{prefix}/public/papers")
    app.register_blueprint(admin_papers_bp, url_prefix=f"{prefix}/admin/papers")
    app.register_blueprint(user_papers_bp, url_prefix=f"{prefix}/user/papers")
    app.register_blueprint(upload_bp, url_prefix=f"{prefix}/upload")
