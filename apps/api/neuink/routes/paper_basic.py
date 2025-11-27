# neuink/api/routes/paper_basic.py
import logging
from flask import request, g, Blueprint
from neuink.services.paperService import get_paper_service
from neuink.services.userPaperService import get_user_paper_service
from neuink.utils.auth import login_required
from neuink.utils.common import (
    success_response,
    bad_request_response,
    validate_required_fields,
    internal_error_response,
)
from neuink.config.constants import BusinessCode

logger = logging.getLogger(__name__)

# 创建蓝图
bp = Blueprint("paper_basic", __name__)

def _parse_pagination_args():
    """统一分页参数解析"""
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("pageSize", 20)), 100)
    return page, page_size

def _parse_sort_args():
    """统一排序参数解析"""
    sort_by = request.args.get("sortBy", "createdAt")
    sort_order = request.args.get("sortOrder", "desc")
    return sort_by, sort_order

def _parse_admin_filters():
    """管理员论文库筛选参数"""
    filters = {}
    
    if request.args.get("isPublic") is not None:
        filters["isPublic"] = request.args.get("isPublic").lower() == "true"
    
    if request.args.get("createdBy"):
        filters["createdBy"] = request.args.get("createdBy")
    
    if request.args.get("parseStatus"):
        filters["parseStatus"] = request.args.get("parseStatus")
    
    if request.args.get("translationStatus"):
        filters["translationStatus"] = request.args.get("translationStatus")
    
    return filters

def _parse_user_paper_filters():
    """个人论文库筛选参数"""
    filters = {}

    if request.args.get("readingStatus"):
        filters["readingStatus"] = request.args["readingStatus"]

    if request.args.get("priority"):
        filters["priority"] = request.args["priority"]

    if request.args.get("customTag"):
        filters["customTag"] = request.args["customTag"]

    # 是否来自公共论文库
    if request.args.get("hasSource") is not None:
        filters["hasSource"] = request.args.get("hasSource").lower() == "true"

    return filters


@bp.route("/admin", methods=["GET"])
@login_required
def list_admin_papers():
    """
    管理员查看自己管理范围内的论文。
    默认仅返回本人创建的条目，如需查看他人创建的论文，可在 filters 中扩展。
    """
    try:
        page, page_size = _parse_pagination_args()
        sort_by, sort_order = _parse_sort_args()
        search = request.args.get("search")
        filters = _parse_admin_filters()

        service = get_paper_service()
        result = service.get_admin_papers(
            user_id=g.current_user["user_id"],
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search,
            filters=filters,
        )

        if result["code"] != BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"], result["code"])
        return success_response(result["data"], result["message"])
    except ValueError:
        return bad_request_response("无效的参数格式")
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user", methods=["GET"])
@login_required
def list_user_papers():
    """
    个人论文库列表：包括收藏的公共论文和上传的私有论文
    """
    try:
        page, page_size = _parse_pagination_args()
        sort_by, sort_order = _parse_sort_args()
        search = request.args.get("search")
        filters = _parse_user_paper_filters()

        service = get_user_paper_service()
        result = service.get_user_papers(
            user_id=g.current_user["user_id"],
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search,
            filters=filters,
        )

        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        return success_response(result["data"], result["message"])

    except ValueError:
        return bad_request_response("无效的参数格式")
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin", methods=["POST"])
@login_required
def create_admin_paper():
    """
    管理员创建公共论文。
    """
    try:
        data = request.get_json()
        required = ["metadata"]
        error_msg = validate_required_fields(data, required)
        if error_msg:
            return bad_request_response(error_msg)
        if not data.get("metadata", {}).get("title"):
            return bad_request_response("论文标题不能为空")

        # 确保管理员创建的论文是公开的
        data["isPublic"] = True

        service = get_paper_service()
        result = service.create_paper(data, g.current_user["user_id"])

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return success_response(result["data"], result["message"], result["code"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user", methods=["POST"])
@login_required
def add_public_paper_to_library():
    """
    将公共论文添加到个人论文库（创建副本）
    """
    try:
        payload = request.get_json() or {}
        paper_id = payload.get("paperId")

        if not paper_id:
            return bad_request_response("paperId 不能为空")

        logger.info(f"尝试添加论文到个人库: userId={g.current_user['user_id']}, paperId={paper_id}")

        service = get_user_paper_service()
        result = service.add_public_paper(
            user_id=g.current_user["user_id"],
            paper_id=paper_id,
            extra=payload.get("extra"),
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])

        # 对于论文已存在的情况，返回200状态码但在响应体中包含业务错误码
        if result["code"] == BusinessCode.INVALID_PARAMS and "该论文已在您的个人库中" in result["message"]:
            return success_response(result["data"], result["message"], BusinessCode.INVALID_PARAMS)

        logger.error(f"添加论文失败: {result['message']}, code={result['code']}")
        return bad_request_response(result["message"])

    except Exception as exc:
        logger.error(f"添加论文异常: {exc}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/create", methods=["POST"])
@login_required
def create_user_paper():
    """
    创建用户个人论文
    """
    try:
        data = request.get_json()
        required = ["metadata"]
        error_msg = validate_required_fields(data, required)
        if error_msg:
            return bad_request_response(error_msg)
        if not data.get("metadata", {}).get("title"):
            return bad_request_response("论文标题不能为空")

        service = get_user_paper_service()
        result = service.create_user_paper(data, g.current_user["user_id"])

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return success_response(result["data"], result["message"], result["code"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/create-from-text", methods=["POST"])
@login_required
def create_admin_paper_from_text():
    """
    管理员通过文本创建公共论文（使用大模型解析）
    
    请求体示例:
    {
        "text": "这是一段论文文本内容...",
        "isPublic": true
    }
    """
    try:
        data = request.get_json()
        if not data or not data.get("text"):
            return bad_request_response("文本内容不能为空")

        text = data.get("text")
        is_public = data.get("isPublic", True)

        service = get_paper_service()
        result = service.create_paper_from_text(
            text=text,
            creator_id=g.current_user["user_id"],
            is_public=is_public
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return success_response(result["data"], result["message"], result["code"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/create-from-text", methods=["POST"])
@login_required
def create_user_paper_from_text():
    """
    用户通过文本创建个人论文（使用大模型解析）
    """
    try:
        data = request.get_json()
        if not data or not data.get("text"):
            return bad_request_response("文本内容不能为空")

        text = data.get("text")
        extra = data.get("extra", {})

        # 直接解析文本，不在Paper集合中创建记录
        # 已经在文件顶部导入了get_paper_service

        paper_service = get_paper_service()

        # 仅解析文本，获取论文结构数据
        parse_result = paper_service.parse_paper_from_text(text)

        if parse_result["code"] != BusinessCode.SUCCESS:
            return internal_error_response(parse_result["message"])

        # 直接添加到个人论文库，不经过Paper集合
        paper_data = parse_result["data"]
        service = get_user_paper_service()
        result = service.add_uploaded_paper(
            user_id=g.current_user["user_id"],
            paper_data=paper_data,
            extra=extra,
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])

        return bad_request_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>", methods=["GET"])
@login_required
def get_admin_paper_detail(paper_id):
    """
    管理员查看论文详情。
    """
    try:
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return success_response(result["data"], result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(result["data"], result["message"], result["code"])
        return internal_error_response(result["message"])
    except Exception as exc:  # pylint: disable=broad-except
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<entry_id>", methods=["GET"])
@login_required
def get_user_paper_detail(entry_id):
    """
    获取个人论文详情（包括笔记）
    """
    try:
        service = get_user_paper_service()
        result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])

        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])

        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>", methods=["DELETE"])
@login_required
def delete_admin_paper(paper_id):
    """
    管理员删除公共论文。
    """
    try:
        service = get_paper_service()
        result = service.delete_paper(
            paper_id=paper_id,
            user_id=g.current_user["user_id"],
            is_admin=True,
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(None, result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return success_response(None, result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(None, result["message"], result["code"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<entry_id>", methods=["DELETE"])
@login_required
def remove_user_paper(entry_id):
    """
    从个人论文库移除条目（同时删除关联的笔记）
    """
    try:
        service = get_user_paper_service()
        result = service.delete_user_paper(
            entry_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])

        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])

        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/visibility", methods=["PUT"])
@login_required
def update_admin_paper_visibility(paper_id):
    """
    管理员修改论文的可见状态
    
    请求体示例:
    {
        "isPublic": true  // true: 设为公开, false: 设为私有
    }
    """
    try:
        data = request.get_json()
        if not data or "isPublic" not in data:
            return bad_request_response("isPublic字段不能为空")

        is_public = data["isPublic"]
        if not isinstance(is_public, bool):
            return bad_request_response("isPublic字段必须是布尔值")

        service = get_paper_service()
        result = service.update_paper_visibility(
            paper_id=paper_id,
            is_public=is_public,
            user_id=g.current_user["user_id"]
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return success_response(result["data"], result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(result["data"], result["message"], result["code"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<entry_id>/progress", methods=["PATCH"])
@login_required
def update_user_reading_progress(entry_id):
    """
    快速更新阅读进度
    """
    try:
        payload = request.get_json() or {}

        reading_position = payload.get("readingPosition")
        reading_time = payload.get("readingTime", 0)

        # 验证 readingTime 为非负整数
        if not isinstance(reading_time, (int, float)) or reading_time < 0:
            return bad_request_response("readingTime 必须是非负数")

        service = get_user_paper_service()
        result = service.update_reading_progress(
            entry_id=entry_id,
            user_id=g.current_user["user_id"],
            reading_position=reading_position,
            reading_time=int(reading_time),
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response({"success": True}, result["message"])

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])

        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])

        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/statistics", methods=["GET"])
@login_required
def get_admin_statistics():
    """
    管理员统计信息。
    """
    try:
        service = get_paper_service()
        result = service.get_statistics()

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return success_response(result["data"], result["message"], result["code"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/statistics", methods=["GET"])
@login_required
def get_user_statistics():
    """
    获取用户的统计信息
    """
    try:
        service = get_user_paper_service()
        result = service.get_user_statistics(user_id=g.current_user["user_id"])

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])

        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/debug-attachments", methods=["GET"])
@login_required
def debug_admin_paper_attachments(paper_id):
    """
    调试管理员论文的附件信息
    """
    try:
        logger.info(f"调试管理员论文附件 - paper_id: {paper_id}, user_id: {g.current_user['user_id']}")
        
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] != BusinessCode.SUCCESS:
            return success_response({
                "error": result["message"],
                "code": result["code"]
            }, "获取论文详情失败")

        paper = result["data"]
        attachments = paper.get("attachments", {})
        
        return success_response({
            "paperId": paper_id,
            "title": paper.get("metadata", {}).get("title", "无标题"),
            "attachments": attachments,
            "hasContentList": bool(attachments.get("content_list")),
            "contentListUrl": attachments.get("content_list", {}).get("url"),
            "contentListKey": attachments.get("content_list", {}).get("key"),
        }, "成功获取论文附件信息")

    except Exception as exc:
        logger.error(f"调试管理员论文附件服务器错误 - paper_id: {paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")