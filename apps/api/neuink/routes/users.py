"""
用户相关路由 - 只负责HTTP处理
"""
from flask import Blueprint, jsonify, request, g
from neuink.config.constants import ResponseCode
from neuink.services.userService import get_user_service
from neuink.utils.auth import login_required, admin_required
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
        
        print("路由层接收到登录请求")
        print(f"原始数据: {data}")
        
        if not data:
            return bad_request_response("请求数据格式错误")
        
        # 验证必需字段
        error_msg = validate_required_fields(data, ["username", "password"])
        if error_msg:
            return bad_request_response(error_msg)
        
        # 清理输入数据
        username = data["username"].strip()
        password = data["password"].strip()
        
        print(f"清理后数据: username='{username}', password='{password}'")
        
        # 调用Service处理业务逻辑
        result = user_service.login(username, password)
        
        # ✅ 返回标准两层嵌套结构
        return jsonify(create_response(
            code=ResponseCode.SUCCESS,
            message="请求处理完成",
            data=result
        )), ResponseCode.SUCCESS
        
    except Exception as e:
        print(f"Exception异常: {str(e)}")
        import traceback
        traceback.print_exc()
        
        from neuink.config.constants import BusinessCode, BusinessMessage
        error_result = {
            "code": BusinessCode.INTERNAL_ERROR,
            "message": BusinessMessage.INTERNAL_ERROR,
            "data": None
        }
        return jsonify(create_response(
            code=ResponseCode.SUCCESS,
            message="请求处理完成",
            data=error_result
        )), ResponseCode.SUCCESS

@bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """用户登出"""
    try:
        # 在JWT无状态认证中，登出主要在前端清除token
        # 后端可以记录登出事件用于审计
        user_id = g.current_user["user_id"]
        print(f"用户 {user_id} 登出")
        
        # 返回成功响应
        return success_response(None, "登出成功")
        
    except Exception as e:
        # 即使登出过程中出现错误，也不应该阻止用户登出
        print(f"登出过程中出现错误: {str(e)}")
        return success_response(None, "登出成功")


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
    """创建新用户"""
    try:
        user_service = get_user_service()  # ✅ 在函数内获取
        data = request.get_json()
        if not data:
            return bad_request_response("请求数据格式错误")
        
        error_msg = validate_required_fields(data, ["username", "password", "nickname"])
        if error_msg:
            return bad_request_response(error_msg)
        
        user = user_service.create_user(
            data["username"], 
            data["password"], 
            data["nickname"]
        )
        return created_response(user, "用户创建成功")
        
    except ValueError as e:
        return conflict_response(str(e))
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
        return bad_request_response(str(e))
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
        return bad_request_response(str(e))
    except Exception as e:
        return internal_error_response(f"修改密码失败: {str(e)}")
