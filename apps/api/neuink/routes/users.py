"""
用户相关路由 - 只负责HTTP处理
"""
import os
import jwt
from flask import Blueprint, jsonify, request, g
from neuink.config.constants import ResponseCode, BusinessCode, JWT_ALGORITHM
from neuink.services.userService import get_user_service
from neuink.utils.auth import login_required, admin_required, generate_token, get_token_from_request
from neuink.utils.common import (
    create_response, success_response, created_response, bad_request_response,
    unauthorized_response, not_found_response, conflict_response,
    internal_error_response, validate_required_fields
)

bp = Blueprint("users", __name__)


@bp.route("/login", methods=["POST"])
def login():
    """用户登录"""
    try:
        user_service = get_user_service()
        data = request.get_json()
        
        if not data:
            return bad_request_response("请求数据格式错误")
        
        # 验证必需字段
        error_msg = validate_required_fields(data, ["username", "password"])
        if error_msg:
            return bad_request_response(error_msg)
        
        # 清理输入数据
        username = data["username"].strip()
        password = data["password"].strip()
        
        # 调用Service处理业务逻辑
        result = user_service.login(username, password)
        
        # 检查登录是否成功
        if result.get("code") == BusinessCode.SUCCESS:
            # 登录成功，返回成功响应
            # 按照API文档的格式，data字段应该包含业务响应格式
            return jsonify(create_response(
                code=ResponseCode.SUCCESS,
                message="登录成功",
                data={
                    "code": BusinessCode.SUCCESS,
                    "message": "登录成功",
                    "data": result.get("data")
                }
            )), ResponseCode.SUCCESS
        else:
            # 登录失败，返回401状态码
            # 确保错误信息格式正确，包含业务错误码和消息
            error_data = {
                "code": result.get("code", BusinessCode.LOGIN_FAILED),
                "message": result.get("message", "登录失败"),
                "data": None
            }
            return jsonify(create_response(
                code=ResponseCode.UNAUTHORIZED,
                message="登录失败",
                data=error_data
            )), ResponseCode.UNAUTHORIZED
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        from neuink.config.constants import BusinessMessage
        error_result = {
            "code": BusinessCode.INTERNAL_ERROR,
            "message": BusinessMessage.INTERNAL_ERROR,
            "data": None
        }
        return jsonify(create_response(
            code=ResponseCode.INTERNAL_ERROR,
            message="服务器内部错误",
            data=error_result
        )), ResponseCode.INTERNAL_ERROR

@bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """用户登出"""
    try:
        # 在JWT无状态认证中，登出主要在前端清除token
        # 后端可以记录登出事件用于审计
        user_id = g.current_user["user_id"]
        
        # 返回成功响应
        return success_response(None, "登出成功")
        
    except Exception as e:
        # 即使登出过程中出现错误，也不应该阻止用户登出
        return success_response(None, "登出成功")


@bp.route("/refresh", methods=["POST"])
def refresh_token():
    """刷新JWT token"""
    try:
        token = get_token_from_request()
        if not token:
            return unauthorized_response("未提供token")
        
        # 验证当前token（即使过期也要尝试解析）
        try:
            secret_key = os.getenv("JWT_SECRET_KEY", "default-secret")
            payload = jwt.decode(token, secret_key, algorithms=[JWT_ALGORITHM], options={"verify_exp": False})
        except jwt.InvalidTokenError:
            return unauthorized_response("无效的token")
        
        # 检查用户是否仍然存在且有效
        user_service = get_user_service()
        user = user_service.get_user_by_id(payload["user_id"])
        
        if not user:
            return unauthorized_response("用户不存在")
        
        # 生成新的token
        new_token = generate_token({
            "id": user["id"],
            "username": user["username"]
        })
        
        return success_response({
            "token": new_token,
            "user": user
        }, "Token刷新成功")
        
    except Exception as e:
        return internal_error_response(f"刷新token失败: {str(e)}")


@bp.route("/current", methods=["GET"])
@login_required
def get_current_user():
    """获取当前用户信息"""
    try:
        user_service = get_user_service()  # ✅ 在函数内获取
        user_id = g.current_user["user_id"]
        user = user_service.get_user_by_id(user_id)
        return success_response(user)
        
    except ValueError as e:
        return not_found_response(str(e))
    except Exception as e:
        return internal_error_response(f"获取用户信息失败: {str(e)}")


@bp.route("/", methods=["POST"])
@admin_required
def create_user():
    """创建新用户（仅管理员；可指定 role，默认 user）"""
    try:
        user_service = get_user_service()  # ✅ 在函数内获取
        data = request.get_json()
        if not data:
            return bad_request_response("请求数据格式错误")
        
        error_msg = validate_required_fields(data, ["username", "password", "nickname"])
        if error_msg:
            return bad_request_response(error_msg)

        # role 可选；如果不传，默认 user。此路由已是管理员保护。
        role = (data.get("role") or "user").lower()
        operator_role = g.current_user.get("role", "user")
        
        user = user_service.create_user(
            data["username"].strip(), 
            data["password"].strip(), 
            data["nickname"].strip(),
            role=role,
            operator_role=operator_role
        )
        return created_response(user, "用户创建成功")
        
    except ValueError as e:
        # 对于用户已存在的情况，返回200状态码但在响应体中包含业务错误码
        return success_response(None, str(e), BusinessCode.USER_EXISTS)
    except Exception as e:
        return internal_error_response(f"创建用户失败: {str(e)}")


@bp.route("/<user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    """删除用户"""
    try:
        user_service = get_user_service()  # ✅ 在函数内获取
        operator_id = g.current_user["user_id"]
        user_service.delete_user(user_id, operator_id)
        return success_response(None, "用户删除成功")
        
    except ValueError as e:
        # 对于业务逻辑错误，返回200状态码但在响应体中包含业务错误码
        return success_response(None, str(e), BusinessCode.INVALID_PARAMS)
    except Exception as e:
        return internal_error_response(f"删除用户失败: {str(e)}")


@bp.route("/password", methods=["PUT"])
@login_required
def change_password():
    """修改密码"""
    try:
        user_service = get_user_service()  # ✅ 在函数内获取
        data = request.get_json()
        if not data:
            return bad_request_response("请求数据格式错误")
        
        error_msg = validate_required_fields(data, ["oldPassword", "newPassword"])
        if error_msg:
            return bad_request_response(error_msg)
        
        user_id = g.current_user["user_id"]
        user_service.change_password(
            user_id, 
            data["oldPassword"], 
            data["newPassword"]
        )
        return success_response(None, "密码修改成功")
        
    except ValueError as e:
        # 对于业务逻辑错误，返回200状态码但在响应体中包含业务错误码
        return success_response(None, str(e), BusinessCode.OLD_PASSWORD_WRONG)
    except Exception as e:
        return internal_error_response(f"修改密码失败: {str(e)}")


@bp.route("/<user_id>/role", methods=["PATCH"])
@admin_required
def change_role(user_id: str):
    """变更用户角色（仅管理员）"""
    try:
        user_service = get_user_service()
        data = request.get_json() or {}
        error_msg = validate_required_fields(data, ["role"])
        if error_msg:
            return bad_request_response(error_msg)

        operator_id = g.current_user["user_id"]
        updated_user = user_service.change_user_role(
            target_user_id=user_id,
            new_role=(data.get("role") or "").lower(),
            operator_id=operator_id
        )
        return success_response(updated_user, "角色更新成功")

    except ValueError as e:
        # 对于业务逻辑错误，返回200状态码但在响应体中包含业务错误码
        return success_response(None, str(e), BusinessCode.INVALID_PARAMS)
    except Exception as e:
        return internal_error_response(f"角色更新失败: {str(e)}")


@bp.route("/", methods=["GET"])
@admin_required
def get_users():
    """获取用户列表（仅管理员）"""
    try:
        user_service = get_user_service()
        
        # 获取查询参数
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        keyword = request.args.get("keyword", "").strip()
        
        # 调用服务层获取用户列表
        result = user_service.get_users_paginated(page, limit, keyword if keyword else None)
        
        return success_response(result, "获取用户列表成功")
        
    except ValueError as e:
        # 对于业务逻辑错误，返回200状态码但在响应体中包含业务错误码
        return success_response(None, f"参数错误: {str(e)}", BusinessCode.INVALID_PARAMS)
    except Exception as e:
        return internal_error_response(f"获取用户列表失败: {str(e)}")


@bp.route("/<user_id>", methods=["GET"])
@admin_required
def get_user(user_id):
    """获取单个用户详情（仅管理员）"""
    try:
        user_service = get_user_service()
        user = user_service.get_user_by_id(user_id)
        return success_response(user, "获取用户详情成功")
        
    except ValueError as e:
        # 对于业务逻辑错误，返回200状态码但在响应体中包含业务错误码
        return success_response(None, str(e), BusinessCode.USER_NOT_FOUND)
    except Exception as e:
        return internal_error_response(f"获取用户详情失败: {str(e)}")


@bp.route("/<user_id>", methods=["PUT"])
@admin_required
def update_user(user_id):
    """更新用户信息（仅管理员）"""
    try:
        user_service = get_user_service()
        data = request.get_json()
        if not data:
            return bad_request_response("请求数据格式错误")
        
        # 过滤允许更新的字段
        allowed_fields = ["username", "nickname"]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return bad_request_response("没有可更新的字段")
        
        updated_user = user_service.update_user(user_id, update_data)
        return success_response(updated_user, "用户信息更新成功")
        
    except ValueError as e:
        # 对于业务逻辑错误，返回200状态码但在响应体中包含业务错误码
        return success_response(None, str(e), BusinessCode.INVALID_PARAMS)
    except Exception as e:
        return internal_error_response(f"更新用户信息失败: {str(e)}")
