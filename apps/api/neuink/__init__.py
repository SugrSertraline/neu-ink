from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev")
    app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/NeuInk")
    app.config["API_PREFIX"] = os.getenv("API_PREFIX", "/api/v1")

    CORS(app, resources={
        r"/*": {
            "origins": [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://localhost:3002",
                "http://127.0.0.1:3002",
                "http://localhost:8000",
                "http://127.0.0.1:8000",
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True,
        }
    })

    prefix = app.config["API_PREFIX"]

    # 注册基础模块
    from neuink.routes.health import bp as health_bp
    from neuink.routes.users import bp as users_bp
    from neuink.routes import notes
    app.register_blueprint(health_bp, url_prefix=f"{prefix}/health")
    app.register_blueprint(users_bp, url_prefix=f"{prefix}/users")
    app.register_blueprint(notes.bp, url_prefix=f"{prefix}/notes")

    # 注册论文相关蓝图
    from neuink.routes import init_app as init_paper_routes
    init_paper_routes(app, prefix)

    @app.before_request
    def log_request():
        from flask import request
        print(f"📥 {request.method} {request.path}")
        payload = request.get_json(silent=True)
        if payload is not None:
            print(f"   Body: {payload}")

    @app.after_request
    def log_response(response):
        from flask import request
        print(f"📤 {request.method} {request.path} -> {response.status_code}")
        return response

    return app
