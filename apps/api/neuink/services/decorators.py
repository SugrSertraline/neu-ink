"""
权限装饰器
提供统一的权限检查机制
"""
from functools import wraps
from typing import Callable, Any, Dict
from flask import request, jsonify
from ..models.context import PaperContext, check_paper_permission


def paper_permission_required(operation: str = "read"):
    """
    论文权限装饰器
    
    Args:
        operation: 操作类型 ("read", "write", "delete", "admin")
    
    Usage:
        @paper_permission_required("read")
        def get_paper(paper_id: str):
            # 装查权限并获取论文
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            try:
                # 从请求中获取用户信息
                user_id = getattr(request, 'user_id', None)
                is_admin = getattr(request, 'is_admin', False)
                
                # 创建上下文
                context = PaperContext.create_admin_context(user_id) if is_admin else PaperContext.create_public_context(user_id)
                
                # 检查权限
                if not check_paper_permission(context, operation):
                    return jsonify({
                        "code": 1007,  # PERMISSION_DENIED
                        "message": f"无权执行{operation}操作",
                        "data": None
                    }), 403
                
                # 将上下文添加到kwargs中
                kwargs['context'] = context
                
                # 执行原函数
                return func(*args, **kwargs)
            except Exception as e:
                return jsonify({
                    "code": 1999,  # INTERNAL_ERROR
                    "message": f"权限检查失败: {str(e)}",
                    "data": None
                }), 500
        
        return wrapper
    return decorator


def admin_required(func: Callable) -> Callable:
    """
    管理员权限装饰器
    
    Usage:
        @admin_required
        def admin_only_function():
            # 只有管理员可以访问
            pass
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        try:
            # 检查是否为管理员
            is_admin = getattr(request, 'is_admin', False)
            if not is_admin:
                return jsonify({
                    "code": 1007,  # PERMISSION_DENIED
                    "message": "需要管理员权限",
                    "data": None
                }), 403
            
            # 执行原函数
            return func(*args, **kwargs)
        except Exception as e:
            return jsonify({
                "code": 1999,  # INTERNAL_ERROR
                "message": f"权限检查失败: {str(e)}",
                "data": None
            }), 500
    
    return wrapper


def login_required(func: Callable) -> Callable:
    """
    登录权限装饰器
    
    Usage:
        @login_required
        def protected_function():
            # 需要登录才能访问
            pass
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        try:
            # 检查是否已登录
            user_id = getattr(request, 'user_id', None)
            if not user_id:
                return jsonify({
                    "code": 1008,  # TOKEN_INVALID
                    "message": "需要登录",
                    "data": None
                }), 401
            
            # 执行原函数
            return func(*args, **kwargs)
        except Exception as e:
            return jsonify({
                "code": 1999,  # INTERNAL_ERROR
                "message": f"权限检查失败: {str(e)}",
                "data": None
            }), 500
    
    return wrapper


def get_user_context() -> PaperContext:
    """
    从请求中获取用户上下文
    
    Returns:
        PaperContext实例
    """
    user_id = getattr(request, 'user_id', None)
    is_admin = getattr(request, 'is_admin', False)
    
    if is_admin:
        return PaperContext.create_admin_context(user_id)
    else:
        return PaperContext.create_public_context(user_id)


def get_paper_context_from_request(paper_type: str) -> PaperContext:
    """
    从请求中获取论文上下文
    
    Args:
        paper_type: 论文类型 ("admin", "user")
    
    Returns:
        PaperContext实例
    """
    user_id = getattr(request, 'user_id', None)
    is_admin = getattr(request, 'is_admin', False)
    
    if paper_type == "admin":
        return PaperContext.create_admin_context(user_id)
    elif paper_type == "user":
        return PaperContext.create_user_context(user_id)
    else:
        return PaperContext.create_public_context(user_id)