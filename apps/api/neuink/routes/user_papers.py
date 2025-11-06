"""
个人论文库接口
负责用户收藏公共论文、上传私有论文、管理个人笔记等功能
"""
from flask import Blueprint, request, g

from ..services.userPaperService import get_user_paper_service
from ..utils.auth import login_required
from ..utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
)
from ..config.constants import BusinessCode

bp = Blueprint("user_papers", __name__)


def _parse_pagination_args():
    """统一分页参数解析"""
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("pageSize", 20)), 100)
    return page, page_size


def _parse_sort_args():
    """统一排序参数解析"""
    sort_by = request.args.get("sortBy", "addedAt")
    sort_order = request.args.get("sortOrder", "desc")
    return sort_by, sort_order


def _parse_user_paper_filters():
    """
    个人论文库筛选参数
    """
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


@bp.route("", methods=["GET"])
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


@bp.route("", methods=["POST"])
@login_required
def add_public_paper_to_library():
    """
    将公共论文添加到个人论文库（创建副本）
    
    请求体示例:
    {
        "paperId": "paper_123",
        "extra": {
            "customTags": ["重要", "机器学习"],
            "readingStatus": "unread",
            "priority": "high"
        }
    }
    """
    try:
        payload = request.get_json() or {}
        paper_id = payload.get("paperId")
        
        if not paper_id:
            return bad_request_response("paperId 不能为空")

        service = get_user_paper_service()
        result = service.add_public_paper(
            user_id=g.current_user["user_id"],
            paper_id=paper_id,
            extra=payload.get("extra"),
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        return bad_request_response(result["message"])
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/create-from-text", methods=["POST"])
@login_required
def create_user_paper_from_text():
    """
    用户通过文本创建个人论文（使用大模型解析）
    
    请求体示例:
    {
        "text": "这是一段论文文本内容...",
        "extra": {
            "customTags": ["重要", "机器学习"],
            "readingStatus": "unread",
            "priority": "high"
        }
    }
    """
    try:
        data = request.get_json()
        if not data or not data.get("text"):
            return bad_request_response("文本内容不能为空")
        
        text = data.get("text")
        extra = data.get("extra", {})
        
        # 使用PaperService创建论文（设为非公开）
        from ..services.paperService import get_paper_service
        paper_service = get_paper_service()
        
        # 首先创建论文数据
        paper_result = paper_service.create_paper_from_text(
            text=text,
            creator_id=g.current_user["user_id"],
            is_public=False  # 个人论文设为非公开
        )
        
        if paper_result["code"] != BusinessCode.SUCCESS:
            return internal_error_response(paper_result["message"])
        
        # 然后添加到个人论文库
        paper_data = paper_result["data"]
        service = get_user_paper_service()
        result = service.add_uploaded_paper(
            user_id=g.current_user["user_id"],
            paper_data=paper_data,
            extra=extra
        )
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        return bad_request_response(result["message"])
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")

@bp.route("/create-from-metadata", methods=["POST"])
@login_required
def create_user_paper_from_metadata():
    """
    用户通过元数据创建个人论文
    
    请求体示例:
    {
        "metadata": {
            "title": "论文标题",
            "authors": ["作者1", "作者2"],
            "year": 2023,
            "journal": "期刊名称",
            "abstract": "摘要内容",
            "keywords": ["关键词1", "关键词2"]
        },
        "extra": {
            "customTags": ["重要", "机器学习"],
            "readingStatus": "unread",
            "priority": "high"
        }
    }
    """
    try:
        data = request.get_json()
        if not data or not data.get("metadata"):
            return bad_request_response("元数据不能为空")
        
        metadata = data.get("metadata")
        extra = data.get("extra", {})
        
        # 使用PaperService创建论文（设为非公开）
        from ..services.paperService import get_paper_service
        paper_service = get_paper_service()
        
        # 首先创建论文数据
        paper_result = paper_service.create_paper_from_metadata(
            metadata=metadata,
            creator_id=g.current_user["user_id"],
            is_public=False  # 个人论文设为非公开
        )
        
        if paper_result["code"] != BusinessCode.SUCCESS:
            return internal_error_response(paper_result["message"])
        
        # 然后添加到个人论文库
        paper_data = paper_result["data"]
        service = get_user_paper_service()
        result = service.add_uploaded_paper(
            user_id=g.current_user["user_id"],
            paper_data=paper_data,
            extra=extra
        )
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        return bad_request_response(result["message"])
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")





@bp.route("/<entry_id>", methods=["GET"])
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


@bp.route("/<entry_id>", methods=["PUT"])
@login_required
def update_user_paper(entry_id):
    """
    更新个人论文库条目
    
    可更新的字段:
    - paperData: 论文内容（完整副本可修改）
    - customTags: 自定义标签
    - readingStatus: 阅读状态
    - priority: 优先级
    
    请求体示例:
    {
        "customTags": ["已读", "重要"],
        "readingStatus": "finished",
        "priority": "high",
        "paperData": {
            "metadata": {...},
            "sections": [...]
        }
    }
    """
    try:
        payload = request.get_json() or {}
        
        if not payload:
            return bad_request_response("更新数据不能为空")

        service = get_user_paper_service()
        result = service.update_user_paper(
            entry_id=entry_id,
            user_id=g.current_user["user_id"],
            update_data=payload,
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
@bp.route("/<entry_id>/progress", methods=["PATCH"])
@login_required
def update_reading_progress(entry_id):
    """
    快速更新阅读进度
    
    请求体示例:
    {
        "readingPosition": "block_123",  // 当前阅读的 blockId
        "readingTime": 300               // 本次阅读时长（秒）
    }
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
            return success_response(result["data"], result["message"])
        
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        
        return internal_error_response(result["message"])
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")



@bp.route("/<entry_id>", methods=["DELETE"])
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


@bp.route("/statistics", methods=["GET"])
@login_required
def get_user_statistics():
    """
    获取用户的统计信息
    
    返回数据示例:
    {
        "total": 50,
        "readingStatus": {
            "unread": 20,
            "reading": 15,
            "finished": 15
        },
        "priority": {
            "high": 10,
            "medium": 30,
            "low": 10
        },
        "fromPublic": 40,
        "uploaded": 10,
        "totalNotes": 123
    }
    """
    try:
        service = get_user_paper_service()
        result = service.get_user_statistics(
            user_id=g.current_user["user_id"]
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        
        return internal_error_response(result["message"])
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/add-blocks", methods=["POST"])
@login_required
def add_blocks_to_user_paper_section(entry_id, section_id):
    """
    用户向个人论文库中指定论文的指定section中添加blocks（使用大模型解析文本）
    
    请求体示例:
    {
        "text": "这是需要解析并添加到section中的文本内容...",
        "afterBlockId": "block_123"  // 可选：指定在哪个block后插入
    }
    """
    try:
        data = request.get_json()
        if not data or not data.get("text"):
            return bad_request_response("文本内容不能为空")
        
        text = data.get("text")
        after_block_id = data.get("afterBlockId")  # 获取插入位置
        
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id（可能是引用的公共论文，也可能是用户自己的论文）
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 使用paperService添加blocks
        from ..services.paperService import get_paper_service
        paper_service = get_paper_service()
        result = paper_service.add_blocks_to_section(
            paper_id=paper_id,
            section_id=section_id,
            text=text,
            user_id=g.current_user["user_id"],
            is_admin=False,
            after_block_id=after_block_id
        )
        
        if result["code"] == BusinessCode.SUCCESS:
            # 如果成功，需要更新用户论文库中的paperData
            updated_paper = result["data"]["paper"]
            update_result = service.update_user_paper(
                entry_id=entry_id,
                user_id=g.current_user["user_id"],
                update_data={"paperData": updated_paper}
            )
            
            if update_result["code"] == BusinessCode.SUCCESS:
                return success_response(result["data"], result["message"])
            else:
                return internal_error_response("更新用户论文库失败")
        
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
        
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")