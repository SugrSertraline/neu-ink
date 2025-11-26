# neuink/api/routes/notes.py
import logging
from flask import request, g, Blueprint

from neuink.models.context import create_paper_context
from neuink.services.noteService import get_note_service
from neuink.services.paperService import get_paper_service
from neuink.services.userPaperService import get_user_paper_service
from neuink.utils.auth import login_required
from neuink.utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
    validate_required_fields,
)
from neuink.config.constants import BusinessCode

logger = logging.getLogger(__name__)

# 创建蓝图
bp = Blueprint("notes", __name__)


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


# ==================== 用户论文笔记操作 ====================

@bp.route("/user/<entry_id>", methods=["GET"])
@login_required
def get_user_paper_notes(entry_id):
    """
    获取用户论文的所有笔记
    """
    try:
        page, page_size = _parse_pagination_args()
        sort_by, sort_order = _parse_sort_args()
        search = request.args.get("search")

        # 先获取用户论文详情
        user_paper_service = get_user_paper_service()
        user_paper_result = user_paper_service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            return success_response(user_paper_result["data"], user_paper_result["message"], user_paper_result["code"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        # 创建上下文
        context = create_paper_context(
            user_id=g.current_user["user_id"],
            paper_type="user",
            paper_id=paper_id,
            user_paper_id=entry_id
        )

        service = get_note_service()
        result = service.get_notes_by_paper(
            paper_id=paper_id,
            context=context,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return success_response(result["data"], result["message"], result["code"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<entry_id>", methods=["POST"])
@login_required
def create_user_paper_note(entry_id):
    """
    为用户论文创建笔记
    """
    try:
        data = request.get_json()
        error_msg = validate_required_fields(data, ["blockId", "content"])
        if error_msg:
            return bad_request_response(error_msg)

        # 验证用户论文是否存在且有权限
        user_paper_service = get_user_paper_service()
        user_paper_result = user_paper_service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            return success_response(user_paper_result["data"], user_paper_result["message"], user_paper_result["code"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        # 创建上下文
        context = create_paper_context(
            user_id=g.current_user["user_id"],
            paper_type="user",
            paper_id=paper_id,
            user_paper_id=entry_id
        )

        service = get_note_service()
        result = service.create_note(
            paper_id=paper_id,
            context=context,
            block_id=data["blockId"],
            content=data["content"]
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return success_response(result["data"], result["message"], result["code"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<entry_id>/<note_id>", methods=["PUT"])
@login_required
def update_user_paper_note(entry_id, note_id):
    """
    更新用户论文的笔记
    """
    try:
        data = request.get_json()
        if not data:
            return bad_request_response("更新数据不能为空")

        # 验证用户论文是否存在且有权限
        user_paper_service = get_user_paper_service()
        user_paper_result = user_paper_service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            return success_response(user_paper_result["data"], user_paper_result["message"], user_paper_result["code"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        # 创建上下文
        context = create_paper_context(
            user_id=g.current_user["user_id"],
            paper_type="user",
            paper_id=paper_id,
            user_paper_id=entry_id
        )

        service = get_note_service()
        result = service.update_note(
            note_id=note_id,
            context=context,
            update_data=data
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return success_response(result["data"], result["message"], result["code"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<entry_id>/<note_id>", methods=["DELETE"])
@login_required
def delete_user_paper_note(entry_id, note_id):
    """
    删除用户论文的笔记
    """
    try:
        # 验证用户论文是否存在且有权限
        user_paper_service = get_user_paper_service()
        user_paper_result = user_paper_service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            return success_response(user_paper_result["data"], user_paper_result["message"], user_paper_result["code"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        # 创建上下文
        context = create_paper_context(
            user_id=g.current_user["user_id"],
            paper_type="user",
            paper_id=paper_id,
            user_paper_id=entry_id
        )

        service = get_note_service()
        result = service.delete_note(
            note_id=note_id,
            context=context
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return success_response(result["data"], result["message"], result["code"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


# ==================== 通用笔记操作 ====================

@bp.route("/user/<note_id>", methods=["GET"])
@login_required
def get_note_detail(note_id):
    """
    获取笔记详情（仅限用户论文）
    """
    try:
        # 创建上下文
        context = create_paper_context(
            user_id=g.current_user["user_id"],
            paper_type="user"  # 仅支持用户论文笔记
        )

        service = get_note_service()
        result = service.get_note_detail(
            note_id=note_id,
            context=context
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return success_response(result["data"], result["message"], result["code"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/all", methods=["GET"])
@login_required
def get_user_all_notes():
    """
    获取用户的所有笔记（跨论文）
    """
    try:
        page, page_size = _parse_pagination_args()
        sort_by, sort_order = _parse_sort_args()
        search = request.args.get("search")

        # 创建上下文
        context = create_paper_context(
            user_id=g.current_user["user_id"],
            paper_type="user"
        )

        service = get_note_service()
        result = service.get_user_all_notes(
            context=context,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return success_response(result["data"], result["message"], result["code"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")