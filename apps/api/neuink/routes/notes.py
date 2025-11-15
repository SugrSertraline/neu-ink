"""
笔记管理接口
处理用户笔记的增删改查
"""
from flask import Blueprint, request, g

from ..services.noteService import get_note_service
from ..utils.auth import login_required
from ..utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
    validate_required_fields,
)
from ..config.constants import BusinessCode

bp = Blueprint("notes", __name__)


def _parse_pagination_args():
    """统一分页参数解析"""
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("pageSize", 50)), 100)
    return page, page_size


@bp.route("", methods=["POST"])
@login_required
def create_note():
    """
    创建笔记
    
    请求体示例:
    {
        "userPaperId": "user_paper_123",
        "blockId": "block_456",
        "content": [
            {
                "type": "text",
                "content": "这是我的笔记",
                "style": {"bold": true, "color": "#ff0000"}
            },
            {
                "type": "link",
                "url": "https://example.com",
                "children": [
                    {"type": "text", "content": "参考链接"}
                ]
            }
        ]
    }
    """
    try:
        data = request.get_json() or {}
        
        # 验证必需字段
        required = ["userPaperId", "blockId", "content"]
        error_msg = validate_required_fields(data, required)
        if error_msg:
            return bad_request_response(error_msg)
        
        # 验证 content 是数组
        if not isinstance(data["content"], list):
            return bad_request_response("content 必须是数组")

        service = get_note_service()
        result = service.create_note(
            user_id=g.current_user["user_id"],
            user_paper_id=data["userPaperId"],
            block_id=data["blockId"],
            content=data["content"],
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        return bad_request_response(result["message"])
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/paper/<user_paper_id>", methods=["GET"])
@login_required
def get_notes_by_paper(user_paper_id):
    """
    获取某篇论文的所有笔记
    """
    try:
        page, page_size = _parse_pagination_args()

        service = get_note_service()
        result = service.get_notes_by_paper(
            user_id=g.current_user["user_id"],
            user_paper_id=user_paper_id,
            page=page,
            page_size=page_size,
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        return bad_request_response(result["message"])
    
    except ValueError:
        return bad_request_response("无效的参数格式")
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/paper/<user_paper_id>/block/<block_id>", methods=["GET"])
@login_required
def get_notes_by_block(user_paper_id, block_id):
    """
    获取某个 block 的所有笔记
    """
    try:
        service = get_note_service()
        result = service.get_notes_by_block(
            user_id=g.current_user["user_id"],
            user_paper_id=user_paper_id,
            block_id=block_id,
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        return bad_request_response(result["message"])
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user", methods=["GET"])
@login_required
def get_user_notes():
    """
    获取用户的所有笔记（跨论文）
    """
    try:
        page, page_size = _parse_pagination_args()

        service = get_note_service()
        result = service.get_user_notes(
            user_id=g.current_user["user_id"],
            page=page,
            page_size=page_size,
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        return bad_request_response(result["message"])
    
    except ValueError:
        return bad_request_response("无效的参数格式")
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/search", methods=["GET"])
@login_required
def search_notes():
    """
    搜索笔记内容
    
    查询参数:
    - keyword: 搜索关键词（必需）
    - page: 页码
    - pageSize: 每页数量
    """
    try:
        keyword = request.args.get("keyword")
        if not keyword:
            return bad_request_response("搜索关键词不能为空")
        
        page, page_size = _parse_pagination_args()

        service = get_note_service()
        result = service.search_notes(
            user_id=g.current_user["user_id"],
            keyword=keyword,
            page=page,
            page_size=page_size,
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        return bad_request_response(result["message"])
    
    except ValueError:
        return bad_request_response("无效的参数格式")
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<note_id>", methods=["PUT"])
@login_required
def update_note(note_id):
    """
    更新笔记内容
    
    请求体示例:
    {
        "content": [
            {
                "type": "text",
                "content": "更新后的笔记内容",
                "style": {"bold": true}
            }
        ]
    }
    """
    try:
        data = request.get_json() or {}
        
        if not data:
            return bad_request_response("更新数据不能为空")
        
        # 验证 content 格式
        if "content" in data and not isinstance(data["content"], list):
            return bad_request_response("content 必须是数组")

        service = get_note_service()
        result = service.update_note(
            note_id=note_id,
            user_id=g.current_user["user_id"],
            update_data=data,
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        if result["code"] == BusinessCode.NOTE_NOT_FOUND:
            return bad_request_response(result["message"])
        
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        
        return internal_error_response(result["message"])
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<note_id>", methods=["DELETE"])
@login_required
def delete_note(note_id):
    """
    删除笔记
    """
    try:
        service = get_note_service()
        result = service.delete_note(
            note_id=note_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        if result["code"] == BusinessCode.NOTE_NOT_FOUND:
            return bad_request_response(result["message"])
        
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        
        return internal_error_response(result["message"])
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/paper/<user_paper_id>", methods=["DELETE"])
@login_required
def delete_notes_by_paper(user_paper_id):
    """
    删除某篇论文的所有笔记
    """
    try:
        service = get_note_service()
        result = service.delete_notes_by_paper(
            user_paper_id=user_paper_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        return bad_request_response(result["message"])
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")