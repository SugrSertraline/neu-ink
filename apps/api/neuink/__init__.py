from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

def create_app():
    load_dotenv()  # 读取 .env
    app = Flask(__name__)
    app.config["SECRET_KEY"]  = os.getenv("SECRET_KEY", "dev")
    app.config["MONGO_URI"]   = os.getenv("MONGO_URI", "mongodb://localhost:27017/NeuInk")
    app.config["API_PREFIX"]  = os.getenv("API_PREFIX", "/api/v1")

    # 配置 CORS - 允许前端跨域访问
    CORS(app, resources={
        r"/*": {
            "origins": [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",  # 如果前端运行在其他端口
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # 注册蓝图
    from neuink.routes.health import bp as health_bp
    from neuink.routes.users import bp as users_bp
    from neuink.routes.papers import bp as papers_bp
    prefix = app.config["API_PREFIX"]
    app.register_blueprint(health_bp, url_prefix=f"{prefix}/health")
    app.register_blueprint(users_bp,  url_prefix=f"{prefix}/users")
    app.register_blueprint(papers_bp,  url_prefix=f"{prefix}/papers")

    # 添加请求和响应日志（用于调试）
    @app.before_request
    def log_request():
        from flask import request
        print(f"📥 {request.method} {request.path}")
        if request.get_json(silent=True):
            print(f"   Body: {request.get_json()}")

    @app.after_request
    def log_response(response):
        from flask import request
        print(f"📤 {request.method} {request.path} -> {response.status_code}")
        return response

    return app
