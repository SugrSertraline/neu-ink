from flask import Flask
from dotenv import load_dotenv
import os

def create_app():
    load_dotenv()  # 读取 .env
    app = Flask(__name__)
    app.config["SECRET_KEY"]  = os.getenv("SECRET_KEY", "dev")
    app.config["MONGO_URI"]   = os.getenv("MONGO_URI", "mongodb://localhost:27017/NeuInk")
    app.config["API_PREFIX"]  = os.getenv("API_PREFIX", "/api/v1")

    # 注册蓝图
    from neuink.routes.health import bp as health_bp
    from neuink.routes.users import bp as users_bp
    prefix = app.config["API_PREFIX"]
    app.register_blueprint(health_bp, url_prefix=f"{prefix}/health")
    app.register_blueprint(users_bp,  url_prefix=f"{prefix}/users")

    return app
