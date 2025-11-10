"""
管理员论文库接口
负责公共论文的增删改查及统计。
"""
from flask import Blueprint, request, g

from ..services.paperService import get_paper_service
from ..utils.auth import login_required, admin_required
from ..utils.common import (
    success_response,
    bad_request_response,
    validate_required_fields,
    internal_error_response,
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
        "parentSectionId": "section_123",  // 可选：父章节ID
        "position": -1  // 可选：插入位置，-1为末尾
    }
    """
    try:
        data = request.get_json()
        if not data or not data.get("sectionData"):
            return bad_request_response("章节数据不能为空")
        
        section_data = data.get("sectionData")
        parent_section_id = data.get("parentSectionId")
        position = data.get("position", -1)
        
        service = get_paper_service()
        result = service.add_section(
            paper_id=paper_id,
            section_data=section_data,
            user_id=g.current_user["user_id"],
            is_admin=True,
            parent_section_id=parent_section_id,
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
            return success_response(result["data"], result["message"])
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
        
        if parse_result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(parse_result["message"])
        
        parsed_references = parse_result["data"]["references"]
        
        if not parsed_references:
            return bad_request_response("未能从文本中解析出有效的参考文献")
        
        # 将解析后的参考文献添加到论文中
        add_result = service.add_references_to_paper(
            paper_id=paper_id,
            references=parsed_references,
            user_id=g.current_user["user_id"],
            is_admin=True
        )
        
        if add_result["code"] == BusinessCode.SUCCESS:
            return success_response(add_result["data"], add_result["message"])
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


@bp.route("/<paper_id>/sections/<section_id>/blocks/<block_id>/parsing-status", methods=["GET"])
@login_required
@admin_required
def check_block_parsing_status(paper_id, section_id, block_id):
    """
    检查指定block的解析状态
    
    返回数据示例:
    {
        "status": "completed",  // "parsing", "completed", "failed"
        "progress": 100,        // 0-100
        "message": "解析完成",
        "blocks": [...]         // 如果解析完成，返回解析后的blocks
    }
    """
    try:
        # 使用paperService检查解析状态
        service = get_paper_service()
        result = service.check_loading_block_status(
            paper_id=paper_id,
            section_id=section_id,
            block_id=block_id,
            user_id=g.current_user["user_id"],
            is_admin=True
        )
        
        if result["code"] == BusinessCode.SUCCESS:
            # 如果解析完成，清除缓存
            if result["data"].get("status") == "completed":
                service.clear_loading_block_cache(paper_id)
            
            return success_response(result["data"], result["message"])
        
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
        
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")
        return internal_error_response(f"检查解析状态失败: {exc}")


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

