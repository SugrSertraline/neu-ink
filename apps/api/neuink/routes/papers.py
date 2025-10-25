"""
Paper 路由
处理论文相关的 API 请求
"""
from flask import Blueprint, request, g

from ..services.paperService import get_paper_service
from ..utils.auth import login_required, admin_required
from ..utils.common import (
    success_response,
    bad_request_response,
    validate_required_fields,
    internal_error_response,  # 修正：原为 internal_server_error_response
)
from ..config.constants import BusinessCode

# 创建蓝图
bp = Blueprint("papers", __name__)


@bp.route("", methods=["GET"])
def get_public_papers():
    """
    获取公开论文列表（无需认证）
    Query参数:
        - page: int (可选，默认1)
        - pageSize: int (可选，默认20)
        - sortBy: string (可选，默认createdAt)
        - sortOrder: string (可选，默认desc)
        - search: string (可选) - 搜索关键词
        - isPublic: boolean (可选) - 是否公开（固定为true）
        - 其他筛选参数...
    """
    try:
        # 获取查询参数
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("pageSize", 20))
        sort_by = request.args.get("sortBy", "createdAt")
        sort_order = request.args.get("sortOrder", "desc")
        search = request.args.get("search")

        # 其他筛选参数（公开接口固定只返回公开）
        # is_public_str = request.args.get("isPublic")  # 如需保留用户传参可解注
        is_public = True

        # 限制分页大小
        if page_size > 100:
            page_size = 100

        # 调用服务层，只获取公开论文
        paper_service = get_paper_service()
        result = paper_service.get_papers(
            is_public=is_public,  # 固定为True，只获取公开论文
            user_id=None,         # 无需用户信息
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        else:
            return bad_request_response(result["message"])

    except ValueError:
        return bad_request_response("无效的参数格式")
    except Exception as e:
        return internal_error_response(f"服务器错误: {str(e)}")


@bp.route("/all", methods=["GET"])
@login_required
@admin_required
def get_all_papers():
    """
    获取所有论文列表（仅管理员）
    Query参数:
        - isPublic: boolean (可选) - 是否公开
        - page: int (可选，默认1)
        - pageSize: int (可选，默认20)
        - sortBy: string (可选，默认createdAt)
        - sortOrder: string (可选，默认desc)
        - search: string (可选) - 搜索关键词
        - 其他筛选参数...
    """
    try:
        # 获取查询参数
        is_public_str = request.args.get("isPublic")
        is_public = None
        if is_public_str is not None:
            is_public = is_public_str.lower() == "true"

        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("pageSize", 20))
        sort_by = request.args.get("sortBy", "createdAt")
        sort_order = request.args.get("sortOrder", "desc")
        search = request.args.get("search")

        # 限制分页大小
        if page_size > 100:
            page_size = 100

        # 获取用户信息
        user_id = g.current_user["user_id"]

        # 调用服务层
        paper_service = get_paper_service()
        result = paper_service.get_papers(
            is_public=is_public,  # 管理员可以指定是否筛选公开论文
            user_id=user_id,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        else:
            return bad_request_response(result["message"])

    except ValueError:
        return bad_request_response("无效的参数格式")
    except Exception as e:
        return internal_error_response(f"服务器错误: {str(e)}")


@bp.route("/user", methods=["GET"])
@login_required
def get_user_papers():
    """
    获取用户个人论文列表（需要登录）
    包括公开论文和用户添加到个人库的论文
    Query参数:
        - page: int (可选，默认1)
        - pageSize: int (可选，默认20)
        - sortBy: string (可选，默认createdAt)
        - sortOrder: string (可选，默认desc)
        - search: string (可选) - 搜索关键词
        - 其他筛选参数...
    """
    try:
        # 获取查询参数
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("pageSize", 20))
        sort_by = request.args.get("sortBy", "createdAt")
        sort_order = request.args.get("sortOrder", "desc")
        search = request.args.get("search")

        # 限制分页大小
        if page_size > 100:
            page_size = 100

        # 获取用户信息
        user_id = g.current_user["user_id"]

        # 调用服务层，获取用户个人论文
        paper_service = get_paper_service()
        result = paper_service.get_user_papers(
            user_id=user_id,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        else:
            return bad_request_response(result["message"])

    except ValueError:
        return bad_request_response("无效的参数格式")
    except Exception as e:
        return internal_error_response(f"服务器错误: {str(e)}")


@bp.route("/search", methods=["GET"])
@login_required
def search_papers():
    """
    搜索论文
    Query参数:
        - keyword: string (必需) - 搜索关键词
        - isPublic: boolean (可选)
        - page: int (可选，默认1)
        - pageSize: int (可选，默认20)
    """
    try:
        keyword = request.args.get("keyword")
        if not keyword:
            return bad_request_response("缺少搜索关键词")

        is_public_str = request.args.get("isPublic")
        is_public = None
        if is_public_str is not None:
            is_public = is_public_str.lower() == "true"

        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("pageSize", 20))

        # 限制分页大小
        if page_size > 100:
            page_size = 100

        # 调用服务层
        paper_service = get_paper_service()
        result = paper_service.search_papers(
            keyword=keyword,
            is_public=is_public,
            page=page,
            page_size=page_size
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        else:
            return bad_request_response(result["message"])

    except ValueError:
        return bad_request_response("无效的参数格式")
    except Exception as e:
        return internal_error_response(f"服务器错误: {str(e)}")


@bp.route("/<paper_id>", methods=["GET"])
@login_required
def get_paper(paper_id):
    """
    获取论文详情
    """
    try:
        user_id = g.current_user["user_id"]

        # 调用服务层
        paper_service = get_paper_service()
        result = paper_service.get_paper_by_id(paper_id, user_id)

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        elif result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        elif result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        else:
            return internal_error_response(result["message"])

    except Exception as e:
        return internal_error_response(f"服务器错误: {str(e)}")


@bp.route("/<paper_id>/content", methods=["GET"])
@login_required
def get_paper_content(paper_id):
    """
    获取论文内容（用于阅读器）
    """
    try:
        user_id = g.current_user["user_id"]
        is_admin = g.current_user.get("is_admin", False)

        # 调用服务层
        paper_service = get_paper_service()
        result = paper_service.get_paper_by_id(paper_id, user_id)

        if result["code"] == BusinessCode.SUCCESS:
            paper = result["data"]
            
            # 构建论文内容对象
            content = {
                "metadata": paper.get("metadata", {}),
                "abstract": paper.get("abstract"),
                "keywords": paper.get("keywords", []),
                "sections": paper.get("sections", []),
                "references": paper.get("references", []),
                "blockNotes": paper.get("blockNotes", []),
                "checklistNotes": paper.get("checklistNotes", [])
            }
            
            return success_response(content, result["message"])
        elif result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        elif result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        else:
            return internal_error_response(result["message"])

    except Exception as e:
        return internal_error_response(f"服务器错误: {str(e)}")


@bp.route("", methods=["POST"])
@login_required
@admin_required
def create_paper():
    """
    创建论文（仅管理员）
    """
    try:
        data = request.get_json()

        # 验证必需字段
        required_fields = ["metadata"]
        error_msg = validate_required_fields(data, required_fields)
        if error_msg:
            return bad_request_response(error_msg)

        # 验证metadata必需字段
        metadata = data.get("metadata", {})
        if not metadata.get("title"):
            return bad_request_response("论文标题不能为空")

        user_id = g.current_user["user_id"]

        # 调用服务层
        paper_service = get_paper_service()
        result = paper_service.create_paper(data, user_id)

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        else:
            return internal_error_response(result["message"])

    except Exception as e:
        return internal_error_response(f"服务器错误: {str(e)}")


@bp.route("/<paper_id>", methods=["PUT"])
@login_required
@admin_required
def update_paper(paper_id):
    """
    更新论文（仅管理员）
    """
    try:
        data = request.get_json()

        if not data:
            return bad_request_response("更新数据不能为空")

        user_id = g.current_user["user_id"]
        is_admin = g.current_user.get("is_admin", False)

        # 调用服务层
        paper_service = get_paper_service()
        result = paper_service.update_paper(paper_id, data, user_id, is_admin)

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        elif result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        elif result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        else:
            return internal_error_response(result["message"])

    except Exception as e:
        return internal_error_response(f"服务器错误: {str(e)}")


@bp.route("/<paper_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_paper(paper_id):
    """
    删除论文（仅管理员）
    """
    try:
        user_id = g.current_user["user_id"]
        is_admin = g.current_user.get("is_admin", False)

        # 调用服务层
        paper_service = get_paper_service()
        result = paper_service.delete_paper(paper_id, user_id, is_admin)

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(None, result["message"])
        elif result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        elif result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        else:
            return internal_error_response(result["message"])

    except Exception as e:
        return internal_error_response(f"服务器错误: {str(e)}")


@bp.route("/statistics", methods=["GET"])
@login_required
@admin_required
def get_statistics():
    """
    获取论文统计信息（仅管理员）
    """
    try:
        # 调用服务层
        paper_service = get_paper_service()
        result = paper_service.get_statistics()

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        else:
            return internal_error_response(result["message"])

    except Exception as e:
        return internal_error_response(f"服务器错误: {str(e)}")
