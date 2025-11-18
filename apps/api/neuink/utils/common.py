"""
通用工具函数
"""

import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from flask import jsonify
from neuink.config.constants import ResponseCode, ResponseMessage


def generate_id() -> str:
    """
    生成唯一ID
    
    Returns:
        UUID字符串
    """
    return str(uuid.uuid4())


def get_current_time() -> datetime:
    """
    获取当前时间
    
    Returns:
        当前UTC时间
    """
    return datetime.utcnow()


def create_response(
    code: int = ResponseCode.SUCCESS,
    message: str = ResponseMessage.SUCCESS,
    data: Any = None
) -> Dict[str, Any]:
    """
    创建标准API响应格式
    
    Args:
        code: 响应码
        message: 响应消息
        data: 响应数据
    
    Returns:
        标准响应字典
    """
    return {
        "code": code,
        "message": message,
        "data": data
    }


def success_response(data: Any = None, message: str = ResponseMessage.SUCCESS, business_code: int = 0) -> tuple:
    """
    创建成功响应
    
    Args:
        data: 响应数据
        message: 响应消息
        business_code: 业务码，默认为0表示成功
    
    Returns:
        (响应字典, 状态码)
    """
    business_response = {
        "code": business_code,  # 使用传入的业务码，默认为BusinessCode.SUCCESS
        "message": message or ResponseMessage.SUCCESS,
        "data": data
    }
    
    return jsonify(business_response), ResponseCode.SUCCESS


def created_response(data: Any = None, message: str = ResponseMessage.CREATED) -> tuple:
    """
    创建资源创建成功响应
    
    Args:
        data: 响应数据
        message: 响应消息
    
    Returns:
        (响应字典, 状态码)
    """
    return jsonify(create_response(
        code=ResponseCode.CREATED,
        message=message,
        data=data
    )), ResponseCode.CREATED


def error_response(
    code: int,
    message: str,
    data: Any = None
) -> tuple:
    """
    创建错误响应
    
    Args:
        code: 错误码
        message: 错误消息
        data: 错误数据
    
    Returns:
        (响应字典, 状态码)
    """
    return jsonify(create_response(
        code=code,
        message=message,
        data=data
    )), code


def bad_request_response(message: str = ResponseMessage.INVALID_PARAMS) -> tuple:
    """
    创建参数错误响应
    
    Args:
        message: 错误消息
    
    Returns:
        (响应字典, 状态码)
    """
    # 确保错误消息不为空
    if not message:
        message = ResponseMessage.INVALID_PARAMS
    return error_response(ResponseCode.BAD_REQUEST, message)


def unauthorized_response(message: str = ResponseMessage.UNAUTHORIZED) -> tuple:
    """
    创建未授权响应
    
    Args:
        message: 错误消息
    
    Returns:
        (响应字典, 状态码)
    """
    return error_response(ResponseCode.UNAUTHORIZED, message)


def forbidden_response(message: str = ResponseMessage.FORBIDDEN) -> tuple:
    """
    创建禁止访问响应
    
    Args:
        message: 错误消息
    
    Returns:
        (响应字典, 状态码)
    """
    return error_response(ResponseCode.FORBIDDEN, message)


def not_found_response(message: str = ResponseMessage.NOT_FOUND) -> tuple:
    """
    创建资源不存在响应
    
    Args:
        message: 错误消息
    
    Returns:
        (响应字典, 状态码)
    """
    return error_response(ResponseCode.NOT_FOUND, message)


def conflict_response(message: str = ResponseMessage.USER_EXISTS) -> tuple:
    """
    创建资源冲突响应
    
    Args:
        message: 错误消息
    
    Returns:
        (响应字典, 状态码)
    """
    return error_response(ResponseCode.CONFLICT, message)


def internal_error_response(message: str = ResponseMessage.INTERNAL_ERROR) -> tuple:
    """
    创建服务器内部错误响应
    
    Args:
        message: 错误消息
    
    Returns:
        (响应字典, 状态码)
    """
    # 确保错误消息不为空
    if not message:
        message = ResponseMessage.INTERNAL_ERROR
    return error_response(ResponseCode.INTERNAL_ERROR, message)


def validate_required_fields(data: Dict[str, Any], required_fields: list) -> Optional[str]:
    """
    验证必需字段
    
    Args:
        data: 请求数据
        required_fields: 必需字段列表
    
    Returns:
        错误消息或None
    """
    missing_fields = []
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == "":
            missing_fields.append(field)
    
    if missing_fields:
        return f"缺少必需字段: {', '.join(missing_fields)}"
    
    return None


def sanitize_user_data(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    清理用户数据，移除敏感信息
    
    Args:
        user_data: 原始用户数据
    
    Returns:
        清理后的用户数据
    """
    safe_data = user_data.copy()
    
    # 移除敏感字段，但保留 role 字段
    if "password" in safe_data:
        del safe_data["password"]
    
    if "salt" in safe_data:
        del safe_data["salt"]
    
    # 确保时间字段为字符串格式
    if "createdAt" in safe_data and isinstance(safe_data["createdAt"], datetime):
        safe_data["createdAt"] = safe_data["createdAt"].isoformat()
    
    if "updatedAt" in safe_data and isinstance(safe_data["updatedAt"], datetime):
        safe_data["updatedAt"] = safe_data["updatedAt"].isoformat()
    
    # 确保 role 字段存在
    if "role" not in safe_data and "role" in user_data:
        safe_data["role"] = user_data["role"]
    
    return safe_data