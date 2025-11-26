# neuink/routes/__init__.py
from flask import Flask

from .public_papers import bp as public_papers_bp
# from .admin_papers import bp as admin_papers_bp  # 暂时注释掉，因为qiniu模块缺失
# from .user_papers import bp as user_papers_bp  # 暂时注释掉，因为依赖admin_papers
from .upload import bp as upload_bp  # 取消注释，已修复qiniu导入问题
from .parse_results import bp as parse_results_bp, user_bp as user_parse_results_bp
from .papers import bp as papers_bp
from .sections import bp as sections_bp
from .notes import bp as notes_bp
from .parsing import bp as parsing_bp
from .translation import bp as translation_bp


def init_app(app: Flask, prefix: str) -> None:
    """注册论文相关蓝图"""
    # 保留旧路由以保持向后兼容性
    app.register_blueprint(public_papers_bp, url_prefix=f"{prefix}/public-papers")
    app.register_blueprint(parse_results_bp, url_prefix=f"{prefix}/admin/papers")
    # app.register_blueprint(admin_papers_bp, url_prefix=f"{prefix}/admin/papers")  # 暂时注释掉
    # app.register_blueprint(user_papers_bp, url_prefix=f"{prefix}/user/papers")  # 暂时注释掉
    app.register_blueprint(user_parse_results_bp, url_prefix=f"{prefix}/user/papers")
    app.register_blueprint(upload_bp, url_prefix=f"{prefix}/upload")  # 取消注释，已修复qiniu导入问题
    
    # 注册新的统一路由
    app.register_blueprint(papers_bp, url_prefix=f"{prefix}/papers")
    app.register_blueprint(sections_bp, url_prefix=f"{prefix}/sections")
    app.register_blueprint(notes_bp, url_prefix=f"{prefix}/notes")
    app.register_blueprint(parsing_bp, url_prefix=f"{prefix}/parsing")
    app.register_blueprint(translation_bp, url_prefix=f"{prefix}/translation")
