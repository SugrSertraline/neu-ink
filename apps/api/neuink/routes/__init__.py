# neuink/routes/__init__.py
from flask import Flask

from .public_papers import bp as public_papers_bp
from .parse_results import bp as parse_results_bp, user_bp as user_parse_results_bp
from .paper_basic import bp as paper_basic_bp
from .paper_content import bp as paper_content_bp
from .paper_upload import bp as paper_upload_bp
from .paper_attachments import bp as paper_attachments_bp
from .sections import bp as sections_bp
from .notes import bp as notes_bp
from .parsing import bp as parsing_bp
from .translation import bp as translation_bp


def init_app(app: Flask, prefix: str) -> None:
    """注册论文相关蓝图"""
    # 注册公共论文库蓝图
    app.register_blueprint(public_papers_bp, url_prefix=f"{prefix}/public-papers")
    # 注册新的拆分后的路由
    app.register_blueprint(paper_basic_bp, url_prefix=f"{prefix}/papers")
    app.register_blueprint(paper_content_bp, url_prefix=f"{prefix}/papers")
    app.register_blueprint(paper_upload_bp, url_prefix=f"{prefix}/papers")
    app.register_blueprint(paper_attachments_bp, url_prefix=f"{prefix}/papers")
    app.register_blueprint(sections_bp, url_prefix=f"{prefix}/sections")
    app.register_blueprint(notes_bp, url_prefix=f"{prefix}/notes")
    app.register_blueprint(parsing_bp, url_prefix=f"{prefix}/parsing")
    app.register_blueprint(translation_bp, url_prefix=f"{prefix}/translation")
