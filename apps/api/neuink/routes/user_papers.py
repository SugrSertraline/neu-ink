"""
个人论文库接口
未来用于“收藏公共论文”、“上传私有论文”、“管理个人笔记”等。
当前实现主要提供结构与示例，具体业务逻辑会在后续服务层补充。
"""
from flask import Blueprint, request, g

from ..utils.auth import login_required
from ..utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
)

# 预留服务层接口，真正实现时会在 services.userPaperService 中提供。
try:
    from ..services.userPaperService import get_user_paper_service  # noqa: F401
except ImportError:  # 服务尚未落地时避免导入失败
    get_user_paper_service = None  # type: ignore

bp = Blueprint("user_papers", __name__)


def _require_service():
    """
    在服务还未实现时，给出明确提示；避免路由被调用时直接抛异常。
    """
    if get_user_paper_service is None:
        return None, bad_request_response("个人论文库功能尚未启用")
    return get_user_paper_service(), None


@bp.route("", methods=["GET"])
@login_required
def list_user_papers():
    """
    个人论文库列表：用户收藏 + 用户上传。
    """
    service, error = _require_service()
    if error:
        return error

    try:
        page = int(request.args.get("page", 1))
        page_size = min(int(request.args.get("pageSize", 20)), 100)
        sort_by = request.args.get("sortBy", "addedAt")
        sort_order = request.args.get("sortOrder", "desc")
        search = request.args.get("search")

        result = service.get_user_papers(
            user_id=g.current_user["user_id"],
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search,
        )

        if result["code"] != 0:  # 使用 BusinessCode 前请在服务层统一
            return bad_request_response(result["message"])
        return success_response(result["data"], result["message"])
    except ValueError:
        return bad_request_response("无效的参数格式")
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("", methods=["POST"])
@login_required
def add_public_paper_to_library():
    """
    将公共论文加入个人论文库。
    请求体需要携带 paperId，以及可选的自定义标签等。
    """
    service, error = _require_service()
    if error:
        return error

    try:
        payload = request.get_json() or {}
        paper_id = payload.get("paperId")
        if not paper_id:
            return bad_request_response("paperId 不能为空")

        result = service.add_public_paper(
            user_id=g.current_user["user_id"],
            paper_id=paper_id,
            extra=payload.get("extra"),  # 预留字段：自定义标签、笔记等
        )

        if result["code"] != 0:
            return bad_request_response(result["message"])
        return success_response(result["data"], result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/uploads", methods=["POST"])
@login_required
def upload_private_paper():
    """
    用户上传个人论文（例如 PDF）。
    具体解析和存储逻辑将在服务层实现，这里仅保留路由结构。
    """
    service, error = _require_service()
    if error:
        return error

    try:
        # 具体的文件接收、解析逻辑待 services.userPaperService 实现。
        result = service.upload_private_paper(
            user_id=g.current_user["user_id"],
            request=request,
        )

        if result["code"] != 0:
            return bad_request_response(result["message"])
        return success_response(result["data"], result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>", methods=["PUT"])
@login_required
def update_user_paper(entry_id):
    """
    更新个人论文库条目的用户自定义字段（笔记、标签等）。
    """
    service, error = _require_service()
    if error:
        return error

    try:
        payload = request.get_json() or {}
        result = service.update_user_paper(
            entry_id=entry_id,
            user_id=g.current_user["user_id"],
            update_data=payload,
        )

        if result["code"] != 0:
            return bad_request_response(result["message"])
        return success_response(result["data"], result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>", methods=["DELETE"])
@login_required
def remove_user_paper(entry_id):
    """
    从个人论文库移除条目。
    """
    service, error = _require_service()
    if error:
        return error

    try:
        result = service.delete_user_paper(
            entry_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] != 0:
            return bad_request_response(result["message"])
        return success_response(None, result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")
