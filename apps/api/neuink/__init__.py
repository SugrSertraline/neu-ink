from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
import sys
import logging


def create_app():
    # 如果以后还想用安全 print，可以在这里重新启用
    # from neuink.utils.print_utils import setup_safe_print
    # setup_safe_print()

    load_dotenv()
    app = Flask(__name__)

    # 基础配置
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev")
    app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/NeuInk")
    app.config["API_PREFIX"] = os.getenv("API_PREFIX", "/api/v1")
    app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100MB 最大上传文件大小

    # -----------------------
    # 日志配置（简单、稳定）
    # -----------------------
    log_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_name, logging.INFO)

    app.logger.setLevel(log_level)

    # 避免重复添加 handler（例如 debug 热重载时）
    if not app.logger.handlers:
        try:
            # 在 Windows 环境下，尝试使用 NullHandler 避免输出问题
            if sys.platform == "win32":
                handler = logging.StreamHandler()
                # 不指定流，让 Python 自动选择
            else:
                handler = logging.StreamHandler(sys.stdout)
        except (OSError, ValueError, AttributeError):
            # stdout 不可用就退回 stderr
            try:
                handler = logging.StreamHandler(sys.stderr)
            except (OSError, ValueError, AttributeError):
                # 如果都不可用，使用 NullHandler
                handler = logging.NullHandler()

        handler.setLevel(log_level)
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        app.logger.addHandler(handler)

    # ❗去掉 Windows 下对 handler.stream 的 reconfigure，避免 Errno 22
    # if sys.platform == "win32":
    #     ...（这一整块不再需要）

    # -----------------------
    # CORS 配置
    # -----------------------
    is_development = (
        os.getenv("FLASK_ENV", "development") == "development"
        or os.getenv("DEBUG", "0") == "1"
    )

    if is_development:
        app.logger.info("[CONFIG] Development mode detected: allowing all CORS origins")
        CORS(
            app,
            resources={
                r"/*": {
                    "origins": "*",
                    "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                    "allow_headers": "*",
                    "expose_headers": [
                        "Content-Type",
                        "Authorization",
                        "X-Total-Count",
                        "Cache-Control",
                        "Connection",
                    ],
                    "supports_credentials": True,
                }
            },
        )
    else:
        cors_origins = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,"
            "http://localhost:3001,http://localhost:3002,"
            "http://127.0.0.1:3002,http://localhost:8000,"
            "http://127.0.0.1:8000,http://localhost:8080,"
            "http://127.0.0.1:8080",
        )

        origins_list = [
            origin.strip()
            for origin in cors_origins.split(",")
            if origin.strip()
        ]

        app.logger.info("[CONFIG] Production mode: CORS origins: %s", origins_list)

        CORS(
            app,
            resources={
                r"/*": {
                    "origins": origins_list,
                    "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                    "allow_headers": "*",
                    "expose_headers": [
                        "Content-Type",
                        "Authorization",
                        "X-Total-Count",
                        "Cache-Control",
                        "Connection",
                    ],
                    "supports_credentials": True,
                }
            },
        )

    prefix = app.config["API_PREFIX"]

    # -----------------------
    # 注册蓝图
    # -----------------------
    from neuink.routes.health import bp as health_bp
    from neuink.routes.users import bp as users_bp
    from neuink.routes import notes
    from neuink.routes.translation import bp as translation_bp

    app.register_blueprint(health_bp, url_prefix=f"{prefix}/health")
    app.register_blueprint(users_bp, url_prefix=f"{prefix}/users")
    app.register_blueprint(notes.bp, url_prefix=f"{prefix}/notes")
    app.register_blueprint(translation_bp, url_prefix=f"{prefix}/translation")

    # 注册论文相关蓝图
    from neuink.routes import init_app as init_paper_routes

    init_paper_routes(app, prefix)

    # -----------------------
    # 请求/响应日志：改用 app.logger
    # -----------------------
    # 在 Windows 环境下，暂时禁用请求日志以避免 OSError
    if sys.platform != "win32":
        @app.before_request
        def log_request():
            from flask import request, has_request_context

            try:
                if has_request_context():
                    app.logger.info("[IN] %s %s", request.method, request.path)
                    payload = request.get_json(silent=True)
                    if payload is not None:
                        app.logger.info("   Body: %s", payload)
            except Exception as e:
                # 日志不应该影响正常请求
                pass  # 在 Windows 下静默处理日志错误

        @app.after_request
        def log_response(response):
            from flask import request, has_request_context

            try:
                if has_request_context():
                    app.logger.info(
                        "[OUT] %s %s -> %s",
                        request.method,
                        request.path,
                        response.status_code,
                    )
            except Exception as e:
                pass  # 在 Windows 下静默处理日志错误
            return response

    # -----------------------
    # 413 文件过大错误处理
    # -----------------------
    @app.errorhandler(413)
    def handle_file_too_large(e):
        from flask import jsonify

        return (
            jsonify(
                {
                    "code": 413,
                    "message": "上传的文件过大，请确保文件大小不超过100MB",
                    "data": None,
                }
            ),
            413,
        )

    return app
