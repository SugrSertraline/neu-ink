"""
认证相关工具函数
"""

import os
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from functools import wraps
from flask import request, jsonify, current_app, g
from neuink.config.constants import ResponseCode, ResponseMessage, JWT_ALGORITHM, ADMIN_USERNAME, JWT_ACCESS_TOKEN_EXPIRES_DEFAULT

# neuink/utils/auth.py

def generate_token(user_data: Dict[str, Any]) -> str:
    secret_key = os.getenv("JWT_SECRET_KEY", "default-secret")
    expires_in = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", str(JWT_ACCESS_TOKEN_EXPIRES_DEFAULT)))

    # 根据你现在的管理员判定逻辑：用户名等于 ADMIN_USERNAME 就是管理员
    is_admin = user_data.get("username") == ADMIN_USERNAME

    payload = {
        "user_id": user_data["id"],
        "username": user_data["username"],
        "is_admin": is_admin,            # 新增：把权限放进 token
        "exp": datetime.utcnow() + timedelta(seconds=expires_in),  # ✓ 修复
        "iat": datetime.utcnow()  # ✓ 修复
    }
    return jwt.encode(payload, secret_key, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    验证JWT token
    
    Args:
        token: JWT token字符串
    
    Returns:
        解码后的用户信息，验证失败返回None
    """
    try:
        secret_key = os.getenv("JWT_SECRET_KEY", "default-secret")
        payload = jwt.decode(token, secret_key, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_token_from_request() -> Optional[str]:
    """
    从请求中获取token
    
    Returns:
        token字符串或None
    """
    # 从Authorization头获取
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]  # 去掉 "Bearer " 前缀
    
    # 从查询参数获取
    return request.args.get("token")

def login_required(f):
    """
    登录验证装饰器
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_request()
        if not token:
            return jsonify({
                "code": ResponseCode.UNAUTHORIZED,
                "message": ResponseMessage.UNAUTHORIZED,
                "data": None
            }), ResponseCode.UNAUTHORIZED
        
        user_info = verify_token(token)
        if not user_info:
            return jsonify({
                "code": ResponseCode.UNAUTHORIZED,
                "message": ResponseMessage.TOKEN_INVALID,
                "data": None
            }), ResponseCode.UNAUTHORIZED
        
        # 将用户信息存储到g对象中
        g.current_user = user_info
        return f(*args, **kwargs)
    
    return decorated_function

def admin_required(f):
    """
    管理员权限验证装饰器
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_request()
        if not token:
            return jsonify({
                "code": ResponseCode.UNAUTHORIZED,
                "message": ResponseMessage.UNAUTHORIZED,
                "data": None
            }), ResponseCode.UNAUTHORIZED
        
        user_info = verify_token(token)
        if not user_info:
            return jsonify({
                "code": ResponseCode.UNAUTHORIZED,
                "message": ResponseMessage.TOKEN_INVALID,
                "data": None
            }), ResponseCode.UNAUTHORIZED
        
        # ✓ 优先检查 token 中的 is_admin 字段，回退到用户名检查
        if not user_info.get("is_admin", False):
            return jsonify({
                "code": ResponseCode.FORBIDDEN,
                "message": ResponseMessage.FORBIDDEN,
                "data": None
            }), ResponseCode.FORBIDDEN
        
        # 将用户信息存储到g对象中
        g.current_user = user_info
        return f(*args, **kwargs)
    
    return decorated_function

def is_admin(user_info: Dict[str, Any]) -> bool:
    """
    检查用户是否为管理员
    
    Args:
        user_info: 用户信息
    
    Returns:
        是否为管理员
    """
    return user_info.get("username") == ADMIN_USERNAME