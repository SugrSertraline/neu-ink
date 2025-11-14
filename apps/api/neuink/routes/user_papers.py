"""
个人论文库接口
负责用户收藏公共论文、上传私有论文、管理个人笔记等功能
"""
import json
import logging
from datetime import datetime
from flask import Blueprint, request, g

from ..services.userPaperService import get_user_paper_service
from ..services.paperContentService import PaperContentService
from ..services.paperTranslationService import PaperTranslationService
from ..models.paper import PaperModel
from ..utils.auth import login_required
from ..utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
)
from ..config.constants import BusinessCode, ResponseCode

# 初始化logger
logger = logging.getLogger(__name__)

def _serialize_datetime_in_dict(data):
    """
    递归序列化字典中的所有datetime对象为ISO格式字符串
    """
    if isinstance(data, dict):
        return {key: _serialize_datetime_in_dict(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [_serialize_datetime_in_dict(item) for item in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    else:
        return data

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
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/add-section", methods=["POST"])
@login_required
def add_section_to_user_paper(entry_id):
    """
    用户向个人论文库中指定论文添加新章节
    
    请求体示例:
    {
        "sectionData": {
            "title": "New Section",
            "titleZh": "新章节",
            "content": []
        },
        "position": -1  // 可选：插入位置，-1为末尾
    }
    """
    try:
        data = request.get_json()
        if not data or not data.get("sectionData"):
            return bad_request_response("章节数据不能为空")
        
        section_data = data.get("sectionData")
        position = data.get("position", -1)
        
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            # 区分不同类型的错误
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id（可能是引用的公共论文，也可能是用户自己的论文）
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 使用paperContentService添加section（移除subsection支持）
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.add_section(
            paper_id=paper_id,
            section_data=section_data,
            user_id=g.current_user["user_id"],
            is_admin=False,
            parent_section_id=None,
            position=position
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
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/add-block", methods=["POST"])
@login_required
def add_block_to_user_paper_section(entry_id, section_id):
    """
    用户向个人论文库中指定论文的指定section直接添加一个block（不通过LLM解析）
    
    请求体示例:
    {
        "blockData": {
            "type": "paragraph",
            "content": {
                "en": [{"type": "text", "content": "English content"}],
                "zh": [{"type": "text", "content": "中文内容"}]
            },
            "metadata": {}
        },
        "afterBlockId": "block_123"  // 可选：指定在哪个block后插入
    }
    """
    try:
        data = request.get_json()
        if not data or not data.get("blockData"):
            return bad_request_response("block数据不能为空")
        
        block_data = data.get("blockData")
        after_block_id = data.get("afterBlockId")
        
        # 验证block数据
        if not block_data.get("type"):
            return bad_request_response("block类型不能为空")
        
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            # 区分不同类型的错误
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id（可能是引用的公共论文，也可能是用户自己的论文）
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 使用paperContentService直接添加block
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.add_block_directly(
            paper_id=paper_id,
            section_id=section_id,
            block_data=block_data,
            user_id=g.current_user["user_id"],
            is_admin=False,
            after_block_id=after_block_id
        )
        
        if result["code"] == BusinessCode.SUCCESS:
            # 确保返回的数据包含blockId
            response_data = result["data"]
            if "blockId" not in response_data and "addedBlock" in response_data:
                response_data["blockId"] = response_data["addedBlock"]["id"]
            
            # 如果成功，需要更新用户论文库中的paperData
            updated_paper = response_data["paper"]
            update_result = service.update_user_paper(
                entry_id=entry_id,
                user_id=g.current_user["user_id"],
                update_data={"paperData": updated_paper}
            )
           
            if update_result["code"] == BusinessCode.SUCCESS:
                return success_response(response_data, result["message"])
            else:
                return internal_error_response("更新用户论文库失败")
        
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
        
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/add-block-from-text", methods=["POST"])
@login_required
def add_block_from_text_to_user_paper_section(entry_id, section_id):
    """
    用户向个人论文库中指定论文的指定section中添加block（使用大模型解析文本）
    
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
            # 区分不同类型的错误
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id（可能是引用的公共论文，也可能是用户自己的论文）
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 使用paperContentService添加blocks
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.add_block_from_text(
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
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>", methods=["PUT"])
@login_required
def update_section_in_user_paper(entry_id, section_id):
    """
    用户更新个人论文库中指定论文的指定section
    
    请求体示例:
    {
        "title": "Updated Section",
        "titleZh": "更新的章节",
        "content": [
            {
                "id": "block_123",
                "type": "paragraph",
                "content": "更新的段落内容"
            }
        ]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return bad_request_response("更新数据不能为空")
        
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            # 区分不同类型的错误
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 使用paperContentService更新section
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        
        # 添加调试日志
        logger.info(f"用户论文章节更新请求 - entry_id: {entry_id}, section_id: {section_id}, paper_id: {paper_id}")
        logger.info(f"更新数据: {data}")
        
        result = content_service.update_section(
            paper_id=paper_id,
            section_id=section_id,
            update_data=data,
            user_id=g.current_user["user_id"],
            is_admin=False
        )
        
        logger.info(f"章节更新结果: {result}")
        
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
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>", methods=["DELETE"])
@login_required
def delete_section_in_user_paper(entry_id, section_id):
    """
    用户删除个人论文库中指定论文的指定section
    """
    try:
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            # 区分不同类型的错误
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 使用paperContentService删除section
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.delete_section(
            paper_id=paper_id,
            section_id=section_id,
            user_id=g.current_user["user_id"],
            is_admin=False
        )
        
        if result["code"] == BusinessCode.SUCCESS:
            # 如果成功，需要更新用户论文库中的paperData
            update_result = service.update_user_paper(
                entry_id=entry_id,
                user_id=g.current_user["user_id"],
                update_data={"paperData": result["data"]["updatedPaper"]}
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
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/blocks/<block_id>", methods=["PUT"])
@login_required
def update_block_in_user_paper(entry_id, section_id, block_id):
    """
    用户更新个人论文库中指定论文的指定section中的指定block
    
    请求体示例:
    {
        "content": "更新的block内容",
        "type": "paragraph",
        "metadata": {}
    }
    """
    try:
        data = request.get_json()
        if not data:
            return bad_request_response("更新数据不能为空")
        
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            # 区分不同类型的错误
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 使用paperContentService更新block
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.update_block(
            paper_id=paper_id,
            section_id=section_id,
            block_id=block_id,
            update_data=data,
            user_id=g.current_user["user_id"],
            is_admin=False
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
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/blocks/<block_id>", methods=["DELETE"])
@login_required
def delete_block_in_user_paper(entry_id, section_id, block_id):
    """
    用户删除个人论文库中指定论文的指定section中的指定block
    """
    try:
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            # 区分不同类型的错误
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 使用paperContentService删除block
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.delete_block(
            paper_id=paper_id,
            section_id=section_id,
            block_id=block_id,
            user_id=g.current_user["user_id"],
            is_admin=False
        )
        
        if result["code"] == BusinessCode.SUCCESS:
            # 如果成功，需要更新用户论文库中的paperData
            # 需要重新获取更新后的论文数据
            paper_model = PaperModel()
            paper_result = paper_model.get_paper_by_id(
                paper_id=paper_id,
                user_id=g.current_user["user_id"],
                is_admin=False
            )
            
            if paper_result["code"] == BusinessCode.SUCCESS:
                update_result = service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"paperData": paper_result["data"]}
                )
                
                if update_result["code"] == BusinessCode.SUCCESS:
                    return success_response(result["data"], result["message"])
                else:
                    return internal_error_response("更新用户论文库失败")
            else:
                return internal_error_response("获取更新后论文数据失败")
        
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
        
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")
        return internal_error_response(f"服务器错误: {exc}")

@bp.route("/<entry_id>/sections/<section_id>/add-block-directly", methods=["POST"])
@login_required
def add_block_directly_to_user_paper_section(entry_id, section_id):
    """
    用户向个人论文库中指定论文的指定section直接添加一个block（不通过LLM解析）
    
    请求体示例:
    {
        "blockData": {
            "type": "paragraph",
            "content": {
                "en": [{"type": "text", "content": "English content"}],
                "zh": [{"type": "text", "content": "中文内容"}]
            },
            "metadata": {}
        },
        "afterBlockId": "block_123"  // 可选：指定在哪个block后插入
    }
    """
    try:
        data = request.get_json()
        if not data or not data.get("blockData"):
            return bad_request_response("block数据不能为空")
        
        block_data = data.get("blockData")
        after_block_id = data.get("afterBlockId")
        
        # 验证block数据
        if not block_data.get("type"):
            return bad_request_response("block类型不能为空")
        
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            # 区分不同类型的错误
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id（可能是引用的公共论文，也可能是用户自己的论文）
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 使用paperContentService直接添加block
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.add_block_directly(
            paper_id=paper_id,
            section_id=section_id,
            block_data=block_data,
            user_id=g.current_user["user_id"],
            is_admin=False,
            after_block_id=after_block_id
        )
        
        if result["code"] == BusinessCode.SUCCESS:
            # 确保返回的数据包含blockId
            response_data = result["data"]
            if "blockId" not in response_data and "addedBlock" in response_data:
                response_data["blockId"] = response_data["addedBlock"]["id"]
            
            # 如果成功，需要更新用户论文库中的paperData
            updated_paper = response_data["paper"]
            update_result = service.update_user_paper(
                entry_id=entry_id,
                user_id=g.current_user["user_id"],
                update_data={"paperData": updated_paper}
            )
           
            if update_result["code"] == BusinessCode.SUCCESS:
                return success_response(response_data, result["message"])
            else:
                return internal_error_response("更新用户论文库失败")
        
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
        
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")

@bp.route("/test-prompts", methods=["GET"])
@login_required  
def get_test_prompts():
    """
    获取用于测试的提示词信息
    """
    try:
        from ..utils.llm_utils import get_llm_utils
        llm_utils = get_llm_utils()
        
        # 获取当前的提示词
        PARSER_SYSTEM_PROMPT = """你是一个专业的学术论文内容结构化助手，专注于将文本内容解析为标准化的block数组。

**核心任务：**
将输入的文本内容解析为符合学术论文编辑系统的block结构，每个block必须包含中英文内容。

**严格输出要求：**
1. **必须输出纯JSON数组格式** - 以[开头，]结尾，不允许任何其他文字或格式
2. **每个block的content必须同时包含en和zh两个语言数组**
3. **即使原始文本是纯中文，也要生成对应的英文翻译；反之亦然**
4. **不允许任何字段缺失或为空**

**Block类型及字段规范：**
- heading: 标题 (需要level字段1-6)
- paragraph: 段落 (content: {en: [...], zh: [...]})
- ordered-list: 有序列表 (items数组，每项包含content双语言)
- unordered-list: 无序列表 (items数组，每项包含content双语言)
- quote: 引用 (需要author字段，content双语言)
- math: 数学公式 (latex字段保留原始公式，content为解释文字)
- code: 代码 (language字段，code字段保留原始代码)
- figure: 图片 (src, alt, caption双语言)
- table: 表格 (headers, rows, align)
- divider: 分割线

**InlineContent类型：**
- text: 普通文本，可包含样式
- link: 链接
- inline-math: 行内数学公式
- citation: 引用

**翻译要求：**
- 如果原始内容是中文，zh数组放原文，en数组放准确英文翻译
- 如果原始内容是英文，en数组放原文，zh数组放准确中文翻译
- 保持学术术语的准确性和专业性
- 保持数学公式、代码、引用等特殊内容的格式

**重要提醒：**
- 每个block的content.en和content.zh都必须是数组，不能为空
- 如果无法翻译，复制原文到目标语言数组
- 严格遵循JSON格式，不能有注释或额外文字"""

        # 获取API配置信息
        api_config = llm_utils.get_api_config()
        return success_response({
            "parser_system_prompt": PARSER_SYSTEM_PROMPT,
            "text_length_limit": 40000,
            "api_endpoint": api_config["api_endpoint"],
            "api_key_status": api_config["api_key_status"],
            "model": api_config["model"],
            "max_tokens": 100000,
            "temperature": 0.2
        }, "成功获取提示词信息")
        
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")
        return internal_error_response(f"获取提示词信息失败: {exc}")


@bp.route("/test-parse", methods=["POST"])
@login_required
def test_parse_text():
    """
    测试文本解析功能
    """
    try:
        data = request.get_json()
        if not data or not data.get("text"):
            return bad_request_response("文本内容不能为空")
        
        text = data.get("text")
        section_context = data.get("sectionContext", "")
        
        from ..utils.llm_utils import get_llm_utils
        llm_utils = get_llm_utils()
        
        # 直接调用解析方法，但不保存到论文
        print("=" * 80)
        print("🧪 开始测试文本解析功能")
        print("=" * 80)
        print(f"📄 测试文本长度: {len(text)} 字符")
        print(f"📝 Section上下文: {section_context}")
        print("=" * 80)
        
        # 显示完整的提示词
        print("🤖 使用的系统提示词:")
        print("=" * 80)
        
        PARSER_SYSTEM_PROMPT = """你是一个专业的学术论文内容结构化助手，专注于将文本内容解析为标准化的block数组。

**核心任务：**
将输入的文本内容解析为符合学术论文编辑系统的block结构，每个block必须包含中英文内容。

**严格输出要求：**
1. **必须输出纯JSON数组格式** - 以[开头，]结尾，不允许任何其他文字或格式
2. **每个block的content必须同时包含en和zh两个语言数组**
3. **即使原始文本是纯中文，也要生成对应的英文翻译；反之亦然**
4. **不允许任何字段缺失或为空**

**Block类型及字段规范：**
- heading: 标题 (需要level字段1-6)
- paragraph: 段落 (content: {en: [...], zh: [...]})
- ordered-list: 有序列表 (items数组，每项包含content双语言)
- unordered-list: 无序列表 (items数组，每项包含content双语言)
- quote: 引用 (需要author字段，content双语言)
- math: 数学公式 (latex字段保留原始公式，content为解释文字)
- code: 代码 (language字段，code字段保留原始代码)
- figure: 图片 (src, alt, caption双语言)
- table: 表格 (headers, rows, align)
- divider: 分割线

**InlineContent类型：**
- text: 普通文本，可包含样式
- link: 链接
- inline-math: 行内数学公式
- citation: 引用

**翻译要求：**
- 如果原始内容是中文，zh数组放原文，en数组放准确英文翻译
- 如果原始内容是英文，en数组放原文，zh数组放准确中文翻译
- 保持学术术语的准确性和专业性
- 保持数学公式、代码、引用等特殊内容的格式

**重要提醒：**
- 每个block的content.en和content.zh都必须是数组，不能为空
- 如果无法翻译，复制原文到目标语言数组
- 严格遵循JSON格式，不能有注释或额外文字"""
        
        print(PARSER_SYSTEM_PROMPT)
        print("=" * 80)
        
        # 执行解析
        print("🚀 开始执行解析...")
        parsed_blocks = llm_utils.parse_text_to_blocks(text, section_context)
        print(f"✅ 解析完成，共生成 {len(parsed_blocks)} 个blocks")
        
        # 打印blocks的详细信息
        if parsed_blocks:
            print("\n📋 Blocks详情:")
            for i, block in enumerate(parsed_blocks[:5]):  # 只打印前5个
                print(f"  {i+1}. 类型: {block.get('type', 'unknown')}")
                print(f"     ID: {block.get('id', 'no-id')}")
                if 'content' in block:
                    content = block['content']
                    if isinstance(content, dict):
                        print(f"     内容: en={len(content.get('en', []))}项, zh={len(content.get('zh', []))}项")
                    else:
                        print(f"     内容: {type(content).__name__}")
                print()
        
        return success_response({
            "original_text": text,
            "original_length": len(text),
            "parsed_blocks": parsed_blocks,
            "blocks_count": len(parsed_blocks),
            "text_limit": 40000,
            "truncated": len(text) > 40000,
        }, f"测试完成，解析出 {len(parsed_blocks)} 个blocks")
        
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")
        return internal_error_response(f"测试解析失败: {exc}")
        return internal_error_response(f"服务器错误: {exc}")



@bp.route("/<entry_id>/parse-references", methods=["POST"])
@login_required
def parse_references_for_user_paper(entry_id):
    """
    用户解析参考文献文本并添加到个人论文中
    
    请求体示例:
    {
        "text": "[1] J. Smith, \"Title of paper,\" Journal Name, vol. 10, no. 2, pp. 123-145, 2020.\n[2] K. Johnson et al., \"Another paper title,\" Conference Name, 2019."
    }
    """
    try:
        data = request.get_json()
        if not data or not data.get("text"):
            return bad_request_response("参考文献文本不能为空")
        
        text = data.get("text")
        
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            # 区分不同类型的错误
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id（可能是引用的公共论文，也可能是用户自己的论文）
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 使用paperContentService解析参考文献
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        parse_result = content_service.parse_references(text)
        
        # 即使解析失败，也继续处理，因为解析结果中包含了错误信息
        # 这样前端可以显示部分解析成功的结果和错误信息
        
        parse_data = parse_result["data"]
        parsed_references = parse_data["references"]
        
        if not parsed_references and not parse_data["errors"]:
            return bad_request_response("未能从文本中解析出有效的参考文献")
        
        # 将解析后的参考文献添加到论文中
        add_result = content_service.add_references_to_paper(
            paper_id=paper_id,
            references=parsed_references,
            user_id=g.current_user["user_id"],
            is_admin=False
        )
        
        if add_result["code"] == BusinessCode.SUCCESS:
            # 如果成功，需要更新用户论文库中的paperData
            updated_paper = add_result["data"]["paper"]
            update_result = service.update_user_paper(
                entry_id=entry_id,
                user_id=g.current_user["user_id"],
                update_data={"paperData": updated_paper}
            )
           
            if update_result["code"] == BusinessCode.SUCCESS:
                # 在响应中包含解析结果（包括错误信息）
                response_data = add_result["data"].copy()
                response_data["parseResult"] = {
                    "references": parse_data["references"],
                    "count": parse_data["count"],
                    "errors": parse_data["errors"]
                }
                return success_response(response_data, add_result["message"])
            else:
                return internal_error_response("更新用户论文库失败")
        else:
            return bad_request_response(add_result["message"])
            
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/add-block-from-text-stream", methods=["GET", "POST"])
@login_required
def add_block_from_text_to_user_paper_section_stream(entry_id, section_id):
    """
    用户向个人论文库中指定论文的指定section中流式添加block（使用大模型解析文本）
    
    GET 请求参数示例:
    ?text=这是需要解析并添加到section中的文本内容...&afterBlockId=block_123&sessionId=session_123
    
    POST 请求体示例:
    {
        "text": "这是需要解析并添加到section中的文本内容...",
        "afterBlockId": "block_123",
        "sessionId": "session_123"
    }
    """
    try:
        # 根据请求方法获取参数
        if request.method == "POST":
            data = request.get_json() or {}
            text = data.get("text")
            after_block_id = data.get("afterBlockId")  # 获取插入位置
            session_id = data.get("sessionId")  # 获取会话ID，用于恢复连接
        else:  # GET
            text = request.args.get("text")
            after_block_id = request.args.get("afterBlockId")  # 获取插入位置
            session_id = request.args.get("sessionId")  # 获取会话ID，用于恢复连接
        
        if not text and not session_id:
            return bad_request_response("文本内容或会话ID不能为空")
        
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            # 区分不同类型的错误
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id（可能是引用的公共论文，也可能是用户自己的论文）
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 使用paperService的通用流式传输方法
        from ..services.paperService import get_paper_service
        paper_service = get_paper_service()
        
        # 检查文本中的特殊符号
        if text:
            import re
            special_chars_pattern = re.compile(r'[&?=%+]')
            if special_chars_pattern.search(text):
                logger.warning(f"检测到特殊符号在用户论文文本中: {text[:100]}...")
                special_positions = [i for i, char in enumerate(text) if special_chars_pattern.search(char)]
                logger.warning(f"特殊符号位置: {special_positions}")
        
        # 生成流式响应
        from flask import Response
        response = Response(
            paper_service.add_block_from_text_stream(
                paper_id=paper_id,
                section_id=section_id,
                text=text,
                user_id=g.current_user["user_id"],
                is_admin=False,
                after_block_id=after_block_id,
                session_id=session_id,
                user_paper_id=entry_id
            ),
            mimetype="text/event-stream"
        )
        
        # 设置正确的 SSE 头部
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['Connection'] = 'keep-alive'
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Cache-Control'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        return response
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")



@bp.route("/<entry_id>/sections/<section_id>/parsing-sessions", methods=["GET"])
@login_required
def get_parsing_sessions(entry_id, section_id):
    """
    获取指定section的所有解析会话
    
    返回数据示例:
    {
        "sessions": [
            {
                "sessionId": "session_123",
                "status": "processing",
                "progress": 50,
                "message": "解析中...",
                "createdAt": "2023-01-01T00:00:00Z",
                "updatedAt": "2023-01-01T00:05:00Z"
            }
        ]
    }
    """
    try:
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 验证section存在
        sections = paper_data.get("sections", [])
        target_section = None
        for section in sections:
            if section.get("id") == section_id:
                target_section = section
                break
        
        if not target_section:
            return bad_request_response("章节不存在")
        
        # 获取解析会话
        from ..models.parsingSession import get_parsing_session_model
        session_model = get_parsing_session_model()
        sessions = session_model.get_sessions_by_section(
            user_id=g.current_user["user_id"],
            paper_id=paper_id,
            section_id=section_id,
            is_admin=False
        )
        
        return success_response({"sessions": sessions}, "成功获取解析会话列表")
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/parsing-sessions/<session_id>", methods=["GET"])
@login_required
def get_parsing_session(entry_id, section_id, session_id):
    """
    获取指定的解析会话详情
    
    返回数据示例:
    {
        "sessionId": "session_123",
        "status": "processing",
        "progress": 50,
        "message": "解析中...",
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-01-01T00:05:00Z",
        "completedBlocks": [...],  // 如果已完成
        "paperData": {...}         // 如果已完成
    }
    """
    try:
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 验证section存在
        sections = paper_data.get("sections", [])
        target_section = None
        for section in sections:
            if section.get("id") == section_id:
                target_section = section
                break
        
        if not target_section:
            return bad_request_response("章节不存在")
        
        # 获取解析会话
        from ..models.parsingSession import get_parsing_session_model
        session_model = get_parsing_session_model()
        session = session_model.get_session(session_id)
        
        if not session:
            return bad_request_response("会话不存在或已过期")
        
        # 验证会话权限
        if session["userId"] != g.current_user["user_id"]:
            return bad_request_response("无权限访问此会话")
        
        if session["paperId"] != paper_id or session["sectionId"] != section_id:
            return bad_request_response("会话参数不匹配")
        
        return success_response(session, "成功获取解析会话详情")
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/parsing-sessions/<session_id>", methods=["DELETE"])
@login_required
def delete_parsing_session(entry_id, section_id, session_id):
    """
    删除指定的解析会话
    
    如果会话正在进行中，会尝试停止并清理相关资源
    """
    try:
        # 首先获取用户论文详情，确保用户有权限
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )
        
        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": user_paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(user_paper_result["message"])
        
        user_paper = user_paper_result["data"]
        paper_data = user_paper.get("paperData")
        
        if not paper_data:
            return bad_request_response("论文数据不存在")
        
        # 获取实际的paper_id
        paper_id = paper_data.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")
        
        # 验证section存在
        sections = paper_data.get("sections", [])
        target_section = None
        for section in sections:
            if section.get("id") == section_id:
                target_section = section
                break
        
        if not target_section:
            return bad_request_response("章节不存在")
        
        # 获取解析会话
        from ..models.parsingSession import get_parsing_session_model
        session_model = get_parsing_session_model()
        session = session_model.get_session(session_id)
        
        if not session:
            return bad_request_response("会话不存在或已过期")
        
        # 验证会话权限
        if session["userId"] != g.current_user["user_id"]:
            return bad_request_response("无权限访问此会话")
        
        if session["paperId"] != paper_id or session["sectionId"] != section_id:
            return bad_request_response("会话参数不匹配")
        
        # 如果会话正在进行中，尝试清理进度块
        if session["status"] == "processing" and session.get("progressBlockId"):
            progress_block_id = session["progressBlockId"]
            
            # 尝试从section中移除进度块
            try:
                updated_paper_data = paper_data.copy()
                sections = updated_paper_data.get("sections", [])
                
                for section in sections:
                    if section.get("id") == section_id:
                        content = section.get("content", [])
                        # 移除进度块
                        content = [block for block in content if block.get("id") != progress_block_id]
                        section["content"] = content
                        break
                
                # 更新用户论文库
                service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"paperData": updated_paper_data}
                )
            except:
                pass  # 如果更新失败，忽略错误，继续删除会话
        
        # 删除会话
        session_model.delete_session(session_id)
        
        return success_response(None, "成功删除解析会话")
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")