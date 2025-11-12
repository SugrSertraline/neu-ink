"""
管理员论文库接口
负责公共论文的增删改查及统计。
"""
import json
from flask import Blueprint, request, g

from ..services.paperService import get_paper_service
from ..utils.auth import login_required, admin_required
from ..utils.common import (
    success_response,
    bad_request_response,
    validate_required_fields,
    internal_error_response,
    get_current_time, 
)
from ..config.constants import BusinessCode

bp = Blueprint("admin_papers", __name__)


def _parse_pagination_args():
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("pageSize", 20)), 100)
    return page, page_size


def _parse_sort_args():
    return request.args.get("sortBy", "createdAt"), request.args.get("sortOrder", "desc")


def _parse_admin_filters():
    """
    管理端筛选项：是否公开、解析状态等。
    可根据业务继续补充。
    """
    filters = {}
    if request.args.get("isPublic") is not None:
        filters["isPublic"] = request.args.get("isPublic").lower() == "true"
    if request.args.get("parseStatus"):
        filters["parseStatus"] = request.args["parseStatus"]
    if request.args.get("year"):
        filters["year"] = request.args.get("year", type=int)
    if request.args.get("articleType"):
        filters["articleType"] = request.args["articleType"]
    if request.args.get("tag"):
        filters["tag"] = request.args["tag"]
    # 若后续需要按创建者过滤，可接受 createdBy 查询参数。
    if request.args.get("createdBy"):
        filters["createdBy"] = request.args["createdBy"]
    return filters


@bp.route("", methods=["GET"])
@login_required
@admin_required
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
            return bad_request_response(result["message"])
        return success_response(result["data"], result["message"])
    except ValueError:
        return bad_request_response("无效的参数格式")
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("", methods=["POST"])
@login_required
@admin_required
def create_paper():
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
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/create-from-text", methods=["POST"])
@login_required
@admin_required
def create_paper_from_text():
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
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/add-section", methods=["POST"])
@login_required
@admin_required
def add_section(paper_id):
    """
    管理员向指定论文添加新章节
    
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
        
        service = get_paper_service()
        result = service.add_section(
            paper_id=paper_id,
            section_data=section_data,
            user_id=g.current_user["user_id"],
            is_admin=True,
            position=position
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


@bp.route("/<paper_id>", methods=["PUT"])
@login_required
@admin_required
def update_paper(paper_id):
    """
    管理员更新公共论文。
    """
    try:
        data = request.get_json()
        if not data:
            return bad_request_response("更新数据不能为空")

        service = get_paper_service()
        result = service.update_paper(
            paper_id=paper_id,
            update_data=data,
            user_id=g.current_user["user_id"],
            is_admin=True,
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


@bp.route("/<paper_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_paper(paper_id):
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
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/statistics", methods=["GET"])
@login_required
@admin_required
def get_statistics():
    """
    管理员统计信息。
    """
    try:
        service = get_paper_service()
        result = service.get_statistics()

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>", methods=["GET"])
@login_required
@admin_required
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
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:  # pylint: disable=broad-except
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/sections/<section_id>/add-block", methods=["POST"])
@login_required
@admin_required
def add_block_to_section(paper_id, section_id):
    """
    管理员向指定论文的指定section直接添加一个block（不通过LLM解析）
    
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
        
        service = get_paper_service()
        result = service.add_block_directly(
            paper_id=paper_id,
            section_id=section_id,
            block_data=block_data,
            user_id=g.current_user["user_id"],
            is_admin=True,
            after_block_id=after_block_id
        )
        
        if result["code"] == BusinessCode.SUCCESS:
            # 确保返回的数据包含blockId
            response_data = result["data"]
            if "blockId" not in response_data and "addedBlock" in response_data:
                response_data["blockId"] = response_data["addedBlock"]["id"]
            return success_response(response_data, result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/sections/<section_id>/add-block-from-text", methods=["POST"])
@login_required
@admin_required
def add_block_from_text_to_section(paper_id, section_id):
    """
    管理员向指定论文的指定section中添加block（使用大模型解析文本）
    
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
        
        service = get_paper_service()
        result = service.add_block_from_text(
            paper_id=paper_id,
            section_id=section_id,
            text=text,
            user_id=g.current_user["user_id"],
            is_admin=True,
            after_block_id=after_block_id
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


@bp.route("/<paper_id>/sections/<section_id>", methods=["PUT"])
@login_required
@admin_required
def update_section(paper_id, section_id):
    """
    管理员更新指定论文的指定section
    
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
        
        service = get_paper_service()
        result = service.update_section(
            paper_id=paper_id,
            section_id=section_id,
            update_data=data,
            user_id=g.current_user["user_id"],
            is_admin=True
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


@bp.route("/<paper_id>/sections/<section_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_section(paper_id, section_id):
    """
    管理员删除指定论文的指定section
    """
    try:
        service = get_paper_service()
        result = service.delete_section(
            paper_id=paper_id,
            section_id=section_id,
            user_id=g.current_user["user_id"],
            is_admin=True
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


@bp.route("/<paper_id>/sections/<section_id>/blocks/<block_id>", methods=["PUT"])
@login_required
@admin_required
def update_block(paper_id, section_id, block_id):
    """
    管理员更新指定论文的指定section中的指定block
    
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
        
        service = get_paper_service()
        result = service.update_block(
            paper_id=paper_id,
            section_id=section_id,
            block_id=block_id,
            update_data=data,
            user_id=g.current_user["user_id"],
            is_admin=True
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


@bp.route("/<paper_id>/visibility", methods=["PUT"])
@login_required
@admin_required
def update_paper_visibility(paper_id):
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
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/parse-references", methods=["POST"])
@login_required
@admin_required
def parse_references(paper_id):
    """
    管理员解析参考文献文本并添加到论文中
    
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
        
        # 首先解析参考文献
        service = get_paper_service()
        parse_result = service.parse_references(text)
        
        # 即使解析失败，也继续处理，因为解析结果中包含了错误信息
        # 这样前端可以显示部分解析成功的结果和错误信息
        
        parse_data = parse_result["data"]
        parsed_references = parse_data["references"]
        
        if not parsed_references and not parse_data["errors"]:
            return bad_request_response("未能从文本中解析出有效的参考文献")
        
        # 将解析后的参考文献添加到论文中
        add_result = service.add_references_to_paper(
            paper_id=paper_id,
            references=parsed_references,
            user_id=g.current_user["user_id"],
            is_admin=True
        )
        
        if add_result["code"] == BusinessCode.SUCCESS:
            # 在响应中包含解析结果（包括错误信息）
            response_data = add_result["data"].copy()
            response_data["parseResult"] = {
                "references": parse_data["references"],
                "count": parse_data["count"],
                "errors": parse_data["errors"]
            }
            return success_response(response_data, add_result["message"])
        else:
            return bad_request_response(add_result["message"])
            
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/translation/check-and-complete", methods=["POST"])
@login_required
@admin_required
def check_and_complete_translation(paper_id):
    """
    管理员检查论文的翻译完整性并补全缺失的翻译
    
    该接口会：
    1. 检查论文各个字段的zh和en翻译是否完整
    2. 对于缺失的翻译，使用LLM自动翻译补全
    3. 更新论文数据和翻译状态
    """
    try:
        service = get_paper_service()
        result = service.check_and_complete_translation(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/translation/status", methods=["GET"])
@login_required
@admin_required
def get_translation_status(paper_id):
    """
    管理员获取论文的翻译状态
    
    返回翻译状态信息，包括：
    - isComplete: 翻译是否完整
    - lastChecked: 最后检查时间
    - missingFields: 缺失的翻译字段列表
    - updatedAt: 最后更新时间
    """
    try:
        service = get_paper_service()
        result = service.get_translation_status(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/migrate-title-format", methods=["POST"])
@login_required
@admin_required
def migrate_title_format():
    """
    管理员迁移论文的标题格式，从旧的 {en: "...", zh: "..."} 格式转换为新的 title 和 titleZh 格式
    
    请求体示例:
    {
        "paperId": "paper_123"  // 可选：指定论文ID，不传则迁移所有论文
    }
    """
    try:
        data = request.get_json()
        paper_id = data.get("paperId") if data else None
        
        service = get_paper_service()
        result = service.migrate_title_format(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/migrate-abstract-format", methods=["POST"])
@login_required
@admin_required
def migrate_abstract_format():
    """
    管理员迁移论文的摘要格式，确保使用字符串而不是数组
    
    请求体示例:
    {
        "paperId": "paper_123"  // 可选：指定论文ID，不传则迁移所有论文
    }
    """
    try:
        data = request.get_json()
        paper_id = data.get("paperId") if data else None
        
        service = get_paper_service()
        result = service.migrate_abstract_format(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/migrate-translation-status", methods=["POST"])
@login_required
@admin_required
def migrate_translation_status():
    """
    管理员为论文添加或更新translationStatus字段
    
    请求体示例:
    {
        "paperId": "paper_123"  // 可选：指定论文ID，不传则迁移所有论文
    }
    """
    try:
        data = request.get_json()
        paper_id = data.get("paperId") if data else None
        
        service = get_paper_service()
        result = service.migrate_paper_translation_status(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/sections/<section_id>/add-block-from-text-stream", methods=["GET"])
@login_required
@admin_required
def add_block_from_text_to_section_stream(paper_id, section_id):
    """
    管理员向指定论文的指定section中流式添加block（使用大模型解析文本）
    
    请求参数示例:
    ?text=这是需要解析并添加到section中的文本内容...&afterBlockId=block_123&sessionId=session_123
    """
    try:
        text = request.args.get("text")
        after_block_id = request.args.get("afterBlockId")  # 获取插入位置
        session_id = request.args.get("sessionId")  # 获取会话ID，用于恢复连接
        
        if not text and not session_id:
            return bad_request_response("文本内容或会话ID不能为空")
        
        # 添加调试日志
        print(f"DEBUG: 收到流式请求 - sessionId: {session_id}, paper_id: {paper_id}, section_id: {section_id}")
        
        # 导入会话模型和后台任务管理器
        from ..models.parsingSession import get_parsing_session_model
        from ..utils.common import generate_id
        from ..utils.background_tasks import get_task_manager
        
        session_model = get_parsing_session_model()
        task_manager = get_task_manager()
        existing_session = None
        progress_block_id = None
        insert_index = None
        
        # 检查是否为恢复会话
        if session_id:
            print(f"DEBUG: 尝试恢复会话 - sessionId: {session_id}")
            existing_session = session_model.get_session(session_id)
            if not existing_session:
                print(f"DEBUG: 会话不存在 - sessionId: {session_id}")
                return bad_request_response("会话不存在或已过期")
            
            print(f"DEBUG: 找到会话 - status: {existing_session.get('status')}, progress: {existing_session.get('progress')}")
            
            # 验证会话权限
            if existing_session["userId"] != g.current_user["user_id"]:
                print(f"DEBUG: 权限不匹配 - sessionUserId: {existing_session['userId']}, currentUserId: {g.current_user['user_id']}")
                return bad_request_response("无权限访问此会话")
            
            if existing_session["paperId"] != paper_id or existing_session["sectionId"] != section_id:
                print(f"DEBUG: 参数不匹配 - sessionPaperId: {existing_session['paperId']}, requestPaperId: {paper_id}")
                return bad_request_response("会话参数不匹配")
            
            # 如果会话已完成或失败，直接返回结果
            if existing_session["status"] == "completed":
                print(f"DEBUG: 会话已完成，返回结果")
                return success_response({
                    "type": "complete",
                    "blocks": existing_session.get("completedBlocks", []),
                    "paper": existing_session.get("paperData"),
                    "message": "会话已完成"
                }, "会话已完成")
            elif existing_session["status"] == "failed":
                print(f"DEBUG: 会话已失败 - error: {existing_session.get('error')}")
                return bad_request_response(existing_session.get("error", "解析失败"))
            
            # 检查是否有后台任务正在运行
            task = task_manager.get_task(session_id)
            if task and task.status.value in ["pending", "running"]:
                print(f"DEBUG: 任务正在运行 - status: {task.status.value}, progress: {task.progress}")
                # 任务正在运行，返回当前状态
                return success_response({
                    "type": "resume",
                    "sessionId": session_id,
                    "status": task.status.value,
                    "progress": task.progress,
                    "message": task.message
                }, "恢复会话成功")
            
            # 获取已保存的进度块ID
            progress_block_id = existing_session.get("progressBlockId")
            text = existing_session["text"]
            after_block_id = existing_session.get("afterBlockId")
            print(f"DEBUG: 恢复会话数据 - progressBlockId: {progress_block_id}, textLength: {len(text) if text else 0}")
        
        # 验证论文存在且有权限
        service = get_paper_service()
        paper = service.paper_model.find_by_id(paper_id)
        if not paper:
            return bad_request_response("论文不存在")
        
        # 验证section存在
        sections = paper.get("sections", [])
        target_section = None
        for section in sections:
            if section.get("id") == section_id:
                target_section = section
                break
        
        if not target_section:
            return bad_request_response("章节不存在")
        
        # 如果是新会话，创建会话和进度块
        if not existing_session:
            # 生成会话ID
            session_id = generate_id()
            
            # 创建会话
            session_model.create_session(
                session_id=session_id,
                user_id=g.current_user["user_id"],
                paper_id=paper_id,
                section_id=section_id,
                text=text,
                after_block_id=after_block_id,
                is_admin=True
            )
            
            # 创建进度块ID
            progress_block_id = generate_id()
            
            # 将progress block添加到section中
            if "content" not in target_section:
                target_section["content"] = []
            
            # 确定插入位置
            insert_index = len(target_section["content"])  # 默认在末尾
            if after_block_id:
                for i, block in enumerate(target_section["content"]):
                    if block.get("id") == after_block_id:
                        insert_index = i + 1  # 插入到指定block后面
                        break
            
            # 创建progress block
            progress_block = {
                "id": progress_block_id,
                "type": "loading",
                "status": "pending",
                "message": "准备解析文本...",
                "progress": 0,
                "originalText": text,
                "sessionId": session_id,  # 添加会话ID到进度块
                "createdAt": get_current_time().isoformat()
            }
            
            # 插入progress block
            target_section["content"].insert(insert_index, progress_block)
            
            # 更新论文
            update_result = service.paper_model.update(paper_id, {"sections": sections})
            if not update_result:
                return bad_request_response("添加进度块失败")
            
            # 更新会话状态，记录进度块ID
            session_model.update_progress(
                session_id=session_id,
                status="processing",
                progress=0,
                message="准备解析文本...",
                progress_block_id=progress_block_id
            )
        
        # 定义后台解析任务
        def background_parsing_task():
            """后台解析任务"""
            try:
                from ..utils.llm_utils import get_llm_utils
                llm_utils = get_llm_utils()
                
                # 获取section上下文
                section_title = target_section.get("title", "") or target_section.get("titleZh", "")
                section_context = f"章节: {section_title}"
                
                # 获取任务对象以便更新进度
                task = task_manager.get_task(session_id)
                
                # 流式解析文本
                for chunk in llm_utils.parse_text_to_blocks_stream(text, section_context):
                    if chunk.get("type") == "error":
                        # 更新会话状态为错误
                        session_model.fail_session(session_id, chunk.get("message", "解析失败"))
                        
                        # 更新progress block为错误状态
                        progress_block = {
                            "id": progress_block_id,
                            "type": "loading",
                            "status": "failed",
                            "message": chunk.get("message", "解析失败"),
                            "progress": 0,
                            "sessionId": session_id  # 保留sessionId
                        }
                        
                        # 更新论文中的progress block
                        _update_progress_block_in_paper(service, paper_id, section_id, progress_block_id, progress_block)
                        break
                    
                    elif chunk.get("type") == "progress":
                        # 更新会话进度
                        session_model.update_progress(
                            session_id=session_id,
                            status="processing",
                            progress=chunk.get("progress", 0),
                            message=chunk.get("message", "处理中...")
                        )
                        
                        # 更新任务进度
                        if task:
                            task.update_progress(chunk.get("progress", 0), chunk.get("message", "处理中..."))
                        
                        # 更新progress block
                        progress_block = {
                            "id": progress_block_id,
                            "type": "loading",
                            "status": chunk.get("stage", "processing"),
                            "message": chunk.get("message", "处理中..."),
                            "progress": chunk.get("progress", 0),
                            "sessionId": session_id  # 保留sessionId
                        }
                        
                        # 更新论文中的progress block
                        _update_progress_block_in_paper(service, paper_id, section_id, progress_block_id, progress_block)
                    
                    elif chunk.get("type") == "complete":
                        # 解析完成，移除progress block并添加解析后的blocks
                        parsed_blocks = chunk.get("blocks", [])
                        
                        # 更新section：移除progress block，添加解析后的blocks
                        _complete_parsing_in_paper(
                            service, paper_id, section_id, progress_block_id,
                            insert_index, parsed_blocks, session_model, session_id
                        )
                        break
            
            except Exception as e:
                # 更新会话状态为错误
                session_model.fail_session(session_id, f"流式解析失败: {str(e)}")
                
                # 更新progress block为错误状态
                progress_block = {
                    "id": progress_block_id,
                    "type": "loading",
                    "status": "failed",
                    "message": f"流式解析失败: {str(e)}",
                    "progress": 0,
                    "sessionId": session_id  # 保留sessionId
                }
                
                # 更新论文中的progress block
                try:
                    _update_progress_block_in_paper(service, paper_id, section_id, progress_block_id, progress_block)
                except:
                    pass  # 如果更新失败，忽略错误
        
        # 提交后台任务
        task_manager.submit_task(
            task_id=session_id,
            func=background_parsing_task,
            callback=lambda task_id, result: None  # 不需要额外的回调
        )
        
        # 使用Server-Sent Events (SSE)进行流式响应
        def generate():
            try:
                print(f"DEBUG: 开始生成流式响应 - sessionId: {session_id}")
                
                # 获取任务对象
                task = task_manager.get_task(session_id)
                if not task:
                    print(f"DEBUG: 任务不存在 - sessionId: {session_id}")
                    yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '任务不存在', 'error': '任务不存在', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                    return
                
                print(f"DEBUG: 找到任务 - status: {task.status.value}, progress: {task.progress}")
                
                # 定期检查任务状态
                last_progress = -1
                last_message = ""
                check_count = 0
                
                while True:
                    check_count += 1
                    current_task = task_manager.get_task(session_id)
                    if not current_task:
                        print(f"DEBUG: 任务在检查过程中消失 - sessionId: {session_id}")
                        break
                    
                    # 检查任务状态
                    if current_task.status.value == "completed":
                        print(f"DEBUG: 任务完成 - sessionId: {session_id}")
                        # 获取最新的会话数据
                        completed_session = session_model.get_session(session_id)
                        if completed_session and completed_session["status"] == "completed":
                            yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'completed', 'progress': 100, 'message': '解析完成', 'paper': completed_session.get('paperData'), 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                        break
                    elif current_task.status.value == "failed":
                        print(f"DEBUG: 任务失败 - sessionId: {session_id}, error: {current_task.error}")
                        yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': current_task.error or '任务失败', 'error': current_task.error or '任务失败', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                        break
                    elif current_task.status.value == "cancelled":
                        print(f"DEBUG: 任务取消 - sessionId: {session_id}")
                        yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '任务已取消', 'error': '任务已取消', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                        break
                    
                    # 检查进度是否有更新
                    if (current_task.progress != last_progress or
                        current_task.message != last_message):
                        
                        last_progress = current_task.progress
                        last_message = current_task.message
                        
                        print(f"DEBUG: 发送进度更新 - sessionId: {session_id}, progress: {current_task.progress}, message: {current_task.message}")
                        yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'processing', 'progress': current_task.progress, 'message': current_task.message, 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                    
                    # 等待一段时间再检查
                    import time
                    time.sleep(0.5)  # 每0.5秒检查一次
                    
                    # 防止无限循环
                    if check_count > 1200:  # 最多检查10分钟
                        print(f"DEBUG: 检查超时 - sessionId: {session_id}")
                        yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '检查超时', 'error': '检查超时', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                        break
            
            except Exception as e:
                print(f"DEBUG: 流式响应异常 - sessionId: {session_id}, error: {str(e)}")
                yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': f'流式响应失败: {str(e)}', 'error': f'流式响应失败: {str(e)}', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
        
        from flask import Response
        return Response(generate(), mimetype="text/event-stream")
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")

def _update_progress_block_in_paper(service, paper_id, section_id, progress_block_id, progress_block):
    """更新论文中进度块的辅助函数"""
    paper = service.paper_model.find_by_id(paper_id)
    if not paper:
        return
    
    sections = paper.get("sections", [])
    for section in sections:
        if section.get("id") == section_id:
            for i, block in enumerate(section.get("content", [])):
                if block.get("id") == progress_block_id:
                    section["content"][i] = progress_block
                    break
            break
    
    service.paper_model.update(paper_id, {"sections": sections})

def _complete_parsing_in_paper(service, paper_id, section_id, progress_block_id, insert_index, parsed_blocks, session_model, session_id):
    """完成论文解析的辅助函数"""
    # 更新section：移除progress block，添加解析后的blocks
    paper = service.paper_model.find_by_id(paper_id)
    if not paper:
        return
    
    sections = paper.get("sections", [])
    for section in sections:
        if section.get("id") == section_id:
            content = section.get("content", [])
            # 移除progress block
            content = [block for block in content if block.get("id") != progress_block_id]
            # 添加解析后的blocks
            content[insert_index:insert_index] = parsed_blocks
            section["content"] = content
            break
    
    # 更新论文
    updated_paper = service.paper_model.update(paper_id, {"sections": sections})
    
    # 验证更新是否成功
    if updated_paper:
        # 确认更新成功，获取最新的论文数据
        verify_paper = service.paper_model.find_by_id(paper_id)
        
        if verify_paper:
            # 使用验证后的最新数据完成会话
            session_model.complete_session(session_id, parsed_blocks, verify_paper)
        else:
            # 获取最新数据失败，但仍使用当前数据完成会话
            session_model.complete_session(session_id, parsed_blocks, updated_paper)
    else:
        # 更新失败，标记会话失败
        session_model.fail_session(session_id, "更新论文数据失败")


@bp.route("/<paper_id>/sections/<section_id>/parsing-sessions", methods=["GET"])
@login_required
@admin_required
def get_parsing_sessions(paper_id, section_id):
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
        # 验证论文存在且有权限
        service = get_paper_service()
        paper = service.paper_model.find_by_id(paper_id)
        if not paper:
            return bad_request_response("论文不存在")
        
        # 验证section存在
        sections = paper.get("sections", [])
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
            is_admin=True
        )
        
        return success_response({"sessions": sessions}, "成功获取解析会话列表")
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/sections/<section_id>/parsing-sessions/<session_id>", methods=["GET"])
@login_required
@admin_required
def get_parsing_session(paper_id, section_id, session_id):
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
        # 验证论文存在且有权限
        service = get_paper_service()
        paper = service.paper_model.find_by_id(paper_id)
        if not paper:
            return bad_request_response("论文不存在")
        
        # 验证section存在
        sections = paper.get("sections", [])
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


@bp.route("/<paper_id>/sections/<section_id>/parsing-sessions/<session_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_parsing_session(paper_id, section_id, session_id):
    """
    删除指定的解析会话
    
    如果会话正在进行中，会尝试停止并清理相关资源
    """
    try:
        # 验证论文存在且有权限
        service = get_paper_service()
        paper = service.paper_model.find_by_id(paper_id)
        if not paper:
            return bad_request_response("论文不存在")
        
        # 验证section存在
        sections = paper.get("sections", [])
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
                updated_sections = sections.copy()
                
                for section in updated_sections:
                    if section.get("id") == section_id:
                        content = section.get("content", [])
                        # 移除进度块
                        content = [block for block in content if block.get("id") != progress_block_id]
                        section["content"] = content
                        break
                
                # 更新论文
                service.paper_model.update(paper_id, {"sections": updated_sections})
            except:
                pass  # 如果更新失败，忽略错误，继续删除会话
        
        # 删除会话
        session_model.delete_session(session_id)
        
        return success_response(None, "成功删除解析会话")
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")



@bp.route("/<paper_id>/sections/<section_id>/blocks/<block_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_block(paper_id, section_id, block_id):
    """
    管理员删除指定论文的指定section中的指定block
    """
    try:
        service = get_paper_service()
        result = service.delete_block(
            paper_id=paper_id,
            section_id=section_id,
            block_id=block_id,
            user_id=g.current_user["user_id"],
            is_admin=True
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

