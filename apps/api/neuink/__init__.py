from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
import sys

def create_app():
    # 解决Windows下Python输出缓冲问题
    if sys.platform == "win32":
        # 在Windows环境下禁用输出缓冲
        import builtins
        # 重写print函数，添加flush=True参数
        original_print = builtins.print
        def print(*args, **kwargs):
            kwargs.setdefault('flush', True)
            return original_print(*args, **kwargs)
        builtins.print = print
    
    load_dotenv()
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev")
    app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/NeuInk")
    app.config["API_PREFIX"] = os.getenv("API_PREFIX", "/api/v1")
    app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100MB 最大上传文件大小
    
    # 配置日志，确保在Windows环境下也能立即输出
    import logging
    
    # 设置日志级别
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    app.logger.setLevel(getattr(logging, log_level))
    
    # 添加StreamHandler，确保日志立即输出
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, log_level))
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    app.logger.addHandler(handler)
    
    # 在Windows环境下确保日志不被缓冲
    if sys.platform == "win32":
        # 设置流为行缓冲模式
        if hasattr(handler.stream, 'reconfigure'):
            handler.stream.reconfigure(line_buffering=True)
        else:
            # 对于不支持reconfigure的Python版本，设置缓冲区大小为1
            import io
            handler.stream = io.TextIOWrapper(
                handler.stream.buffer,
                encoding=handler.stream.encoding,
                newline=None,
                line_buffering=True
            )

    # 检查是否为开发环境
    is_development = os.getenv("FLASK_ENV", "development") == "development" or os.getenv("DEBUG", "0") == "1"
    
    if is_development:
        # 开发环境：允许所有来源，方便局域网访问
        print("[CONFIG] Development mode detected: allowing all CORS origins")
        CORS(app, resources={
            r"/*": {
                "origins": "*",
                "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                "allow_headers": "*",
                "expose_headers": [
                    "Content-Type",
                    "Authorization",
                    "X-Total-Count",
                    "Cache-Control",
                    "Connection"
                ],
                "supports_credentials": True
            }
        })
    else:
        # 生产环境：从环境变量读取CORS配置
        cors_origins = os.getenv("CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3002,http://localhost:8000,http://127.0.0.1:8000,http://localhost:8080,http://127.0.0.1:8080")
        
        # 将逗号分隔的字符串转换为列表
        origins_list = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
        
        print(f"[CONFIG] Production mode: CORS origins: {origins_list}")
        
        CORS(app, resources={
            r"/*": {
                "origins": origins_list,
                "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                "allow_headers": "*",
                "expose_headers": [
                    "Content-Type",
                    "Authorization",
                    "X-Total-Count",
                    "Cache-Control",
                    "Connection"
                ],
                "supports_credentials": True
            }
        })

    prefix = app.config["API_PREFIX"]

    # 注册基础模块
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

    @app.before_request
    def log_request():
        from flask import request
        print(f"[IN] {request.method} {request.path}")
        payload = request.get_json(silent=True)
        if payload is not None:
            print(f"   Body: {payload}")

    @app.after_request
    def log_response(response):
        from flask import request
        print(f"[OUT] {request.method} {request.path} -> {response.status_code}")
        return response

    # 添加413错误处理
    @app.errorhandler(413)
    def handle_file_too_large(e):
        from flask import jsonify
        return jsonify({
            "code": 413,
            "message": "上传的文件过大，请确保文件大小不超过100MB",
            "data": None
        }), 413

    return app
