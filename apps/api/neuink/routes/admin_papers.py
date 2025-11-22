"""
管理员论文库接口
负责公共论文的增删改查及统计。
"""
import json
import logging
from datetime import datetime
import time
from flask import Blueprint, request, g

from ..services.paperService import get_paper_service
from ..services.paperContentService import PaperContentService
from ..services.paperTranslationService import PaperTranslationService
from ..models.paper import PaperModel
from ..models.section import get_section_model
from ..utils.auth import login_required, admin_required
from ..utils.common import (
    success_response,
    bad_request_response,
    validate_required_fields,
    internal_error_response,
    get_current_time,
)
from ..config.constants import BusinessCode
from ..utils.common import ResponseCode

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
            return success_response(result["data"], result["message"], result["code"])
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
        return success_response(result["data"], result["message"], result["code"])
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
        return success_response(result["data"], result["message"], result["code"])
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
        
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.add_section(
            paper_id=paper_id,
            section_data=section_data,
            user_id=g.current_user["user_id"],
            is_admin=True,
            parent_section_id=None,
            position=position
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
            return success_response(result["data"], result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(result["data"], result["message"], result["code"])
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
            return success_response(None, result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(None, result["message"], result["code"])
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
        return success_response(result["data"], result["message"], result["code"])
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
            return success_response(result["data"], result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(result["data"], result["message"], result["code"])
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
        
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.add_block_directly(
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
            return success_response(result["data"], result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(result["data"], result["message"], result["code"])
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
        
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.add_block_from_text(
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
            return success_response(result["data"], result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(result["data"], result["message"], result["code"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/sections/<section_id>/blocks/<block_id>/parsing-status", methods=["GET"])
@login_required
@admin_required
def get_block_parsing_status(paper_id, section_id, block_id):
    """
    管理员查询指定section中解析block的进度状态

    返回结构符合 CheckBlockParsingStatusResult：
    {
        "status": "pending|processing|completed|failed",
        "progress": 0-100,
        "message": "...",
        "paper": { ... 可选，completed 时返回完整论文 ... },
        "error": "... 可选",
        "addedBlocks": [ ... 可选，当前实现为空，由前端通过paper数据同步 ]
    }
    """
    try:
        if not block_id or block_id == "null":
            return bad_request_response("blockId 无效")

        paper_model = PaperModel()
        section_model = get_section_model()

        # 校验论文是否存在
        paper = paper_model.find_by_id(paper_id)
        if not paper:
            return bad_request_response("论文不存在")

        # 获取 section 并校验归属
        section = section_model.find_by_id(section_id)
        if not section or section.get("paperId") != paper_id:
            return bad_request_response("指定的section不存在或不属于该论文")

        content = section.get("content", []) or []
        target_block = None
        for b in content:
            if b.get("id") == block_id:
                target_block = b
                break

        # 如果还能找到 parsing 类型的临时block，说明仍在进行中或失败
        if target_block and target_block.get("type") == "parsing":
            stage = target_block.get("stage", "structuring")
            message = target_block.get("message", "正在解析文本...")
            parse_id = target_block.get("parseId")  # 获取parseId

            # 如果有parseId，尝试从ParseBlocks表获取解析状态
            if parse_id:
                from ..models.parseBlocks import get_parse_blocks_model
                parse_model = get_parse_blocks_model()
                parse_record = parse_model.find_by_id(parse_id)
                
                if parse_record:
                    parse_status = parse_record.get("status", "pending")
                    
                    if parse_status == "processing":
                        data = {
                            "status": "processing",
                            "progress": 50,
                            "message": "正在解析文本...",
                            "paper": None,
                            "error": None,
                            "addedBlocks": None,
                            "parseId": parse_id
                        }
                        return success_response(data, "解析进行中")
                    
                    elif parse_status == "completed":
                        # 解析完成，从ParseBlocks表获取解析结果
                        parsed_blocks = parse_record.get("blocks", [])
                        data = {
                            "status": "completed",
                            "progress": 100,
                            "message": f"解析完成，生成了{len(parsed_blocks)}个段落",
                            "paper": None,
                            "error": None,
                            "addedBlocks": parsed_blocks,
                            "parseId": parse_id
                        }
                        return success_response(data, f"解析完成，生成了{len(parsed_blocks)}个段落")
                    
                    elif parse_status == "failed":
                        error_message = parse_record.get("error", "解析失败")
                        data = {
                            "status": "failed",
                            "progress": 0,
                            "message": error_message,
                            "paper": None,
                            "error": error_message,
                            "addedBlocks": None,
                            "parseId": parse_id
                        }
                        return success_response(data, "解析失败")

            # 兼容旧逻辑：如果没有parseId或ParseBlocks表中没有记录，使用原来的逻辑
            if stage in ("structuring", "translating"):
                status = "processing"
                progress = 50  # 简化为固定进度值
                data = {
                    "status": status,
                    "progress": progress,
                    "message": message,
                    "paper": None,
                    "error": None,
                    "addedBlocks": None,
                }
                return success_response(data, "解析进行中")

            if stage == "completed":
                # 解析完成,从临时block获取解析生成的block IDs
                parsed_block_ids = target_block.get("parsedBlockIds", [])
               
                # 重新获取section以获取最新内容
                updated_section = section_model.find_by_id(section_id)
                added_blocks = []
                if updated_section:
                    content = updated_section.get("content", [])
                    # 根据parsedBlockIds获取真正新添加的blocks
                    added_blocks = [block for block in content if block.get("id") in parsed_block_ids]
               
                data = {
                    "status": "completed",
                    "progress": 100,
                    "message": f"解析完成,成功添加了{len(added_blocks)}个段落",
                    "paper": None,  # 不返回整个paper，只返回addedBlocks
                    "error": None,
                    "addedBlocks": added_blocks,
                }
                return success_response(data, f"解析完成,成功添加了{len(added_blocks)}个段落")

            if stage == "failed":
                data = {
                    "status": "failed",
                    "progress": 0,
                    "message": message,
                    "paper": None,
                    "error": message,
                    "addedBlocks": None,
                }
                return success_response(data, "解析失败")

        # 否则视为解析已完成：临时block已被替换为真正内容
        # 尝试从内存缓存中获取解析结果
        try:
            from ..services.paperContentService import get_parsed_blocks_from_cache
            cache_data = get_parsed_blocks_from_cache(block_id)
            if cache_data:
                # 从缓存中获取解析结果
                parsed_block_ids = cache_data.get("parsedBlockIds", [])
                added_blocks = []
               
                # 重新获取section以获取最新内容
                updated_section = section_model.find_by_id(section_id)
                if updated_section:
                    content = updated_section.get("content", [])
                    # 根据parsedBlockIds获取真正新添加的blocks
                    added_blocks = [block for block in content if block.get("id") in parsed_block_ids]
               
                data = {
                    "status": "completed",
                    "progress": 100,
                    "message": f"解析完成,成功添加了{len(added_blocks)}个段落",
                    "paper": None,  # 不返回整个paper，只返回addedBlocks
                    "error": None,
                    "addedBlocks": added_blocks,
                }
                return success_response(data, f"解析完成,成功添加了{len(added_blocks)}个段落")
        except Exception as e:
            logger.warning(f"从缓存获取解析结果失败: {e}")
        
        # 如果缓存中没有，返回空列表，前端需要通过其他方式获取最新内容
        added_blocks = []
        
        data = {
            "status": "completed",
            "progress": 100,
            "message": "解析完成",
            "paper": None,  # 不返回整个paper
            "error": None,
            "addedBlocks": added_blocks
        }
        return success_response(data, "解析完成")
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
        
        # 添加详细的调试日志
        logger.info(f"管理员更新章节 - paper_id: {paper_id}, section_id: {section_id}, update_data: {data}")
        logger.info(f"请求数据解析成功: {data}")
        
        try:
            paper_model = PaperModel()
            logger.info(f"PaperModel初始化成功")
        except Exception as e:
            logger.error(f"PaperModel初始化失败: {e}")
            return internal_error_response(f"PaperModel初始化失败: {e}")
        
        try:
            content_service = PaperContentService(paper_model)
            logger.info(f"PaperContentService初始化成功")
        except Exception as e:
            logger.error(f"PaperContentService初始化失败: {e}")
            return internal_error_response(f"PaperContentService初始化失败: {e}")
        
        try:
            logger.info(f"开始调用update_section方法...")
            result = content_service.update_section(
                paper_id=paper_id,
                section_id=section_id,
                update_data=data,
                user_id=g.current_user["user_id"],
                is_admin=True
            )
            logger.info(f"update_section调用完成，结果: {result}")
        except Exception as e:
            logger.error(f"update_section调用异常: {e}")
            import traceback
            logger.error(f"异常详情: {traceback.format_exc()}")
            return internal_error_response(f"update_section调用失败: {e}")
        
        # 添加调试日志
        logger.info(f"管理员更新章节结果 - result: {result}")
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return success_response(result["data"], result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(result["data"], result["message"], result["code"])
        return internal_error_response(result["message"])
    except Exception as exc:
        logger.error(f"update_section路由异常: {exc}")
        import traceback
        logger.error(f"异常详情: {traceback.format_exc()}")
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/sections/<section_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_section(paper_id, section_id):
    """
    管理员删除指定论文的指定section
    """
    try:
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.delete_section(
            paper_id=paper_id,
            section_id=section_id,
            user_id=g.current_user["user_id"],
            is_admin=True
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
        
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.update_block(
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
            return success_response(result["data"], result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(result["data"], result["message"], result["code"])
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
            return success_response(result["data"], result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(result["data"], result["message"], result["code"])
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
        from ..services.paperReferenceService import get_paper_reference_service
        reference_service = get_paper_reference_service()
        parse_result = reference_service.parse_reference_text(text)
        
        # 即使解析失败，也继续处理，因为解析结果中包含了错误信息
        # 这样前端可以显示部分解析成功的结果和错误信息
        
        # parse_reference_text 直接返回包含 references, count, errors 的字典，不是包装在 data 中
        parsed_references = parse_result["references"]
        
        if not parsed_references and not parse_result["errors"]:
            return bad_request_response("未能从文本中解析出有效的参考文献")
        
        # 将解析后的参考文献添加到论文中
        add_result = reference_service.add_references_to_paper(
            paper_id=paper_id,
            references=parsed_references,
            user_id=g.current_user["user_id"],
            is_admin=True,
            is_user_paper=False
        )
        
        if add_result["code"] == BusinessCode.SUCCESS:
            # 在响应中包含解析结果（包括错误信息）
            response_data = add_result["data"].copy()
            response_data["parseResult"] = {
                "references": parse_result["references"],
                "count": parse_result["count"],
                "errors": parse_result["errors"]
            }
            return success_response(response_data, add_result["message"])
        else:
            return success_response(add_result["data"], add_result["message"], add_result["code"])
            
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
        paper_model = PaperModel()
        translation_service = PaperTranslationService(paper_model)
        result = translation_service.check_and_complete_translation(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return success_response(result["data"], result["message"], result["code"])
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
        paper_model = PaperModel()
        translation_service = PaperTranslationService(paper_model)
        result = translation_service.get_translation_status(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return success_response(result["data"], result["message"], result["code"])
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
        
        paper_model = PaperModel()
        translation_service = PaperTranslationService(paper_model)
        result = translation_service.migrate_title_format(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return success_response(result["data"], result["message"], result["code"])
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
        
        paper_model = PaperModel()
        translation_service = PaperTranslationService(paper_model)
        result = translation_service.migrate_abstract_format(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return success_response(result["data"], result["message"], result["code"])
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
        
        paper_model = PaperModel()
        translation_service = PaperTranslationService(paper_model)
        result = translation_service.migrate_paper_translation_status(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return success_response(result["data"], result["message"], result["code"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")

@bp.route("/<paper_id>/sections/<section_id>/add-block-from-text-stream", methods=["GET", "POST"])
@login_required
@admin_required
def add_block_from_text_to_section_stream(paper_id, section_id):
    """
    （已废弃）管理员流式添加 block 接口。

    流式解析功能已关闭，请改用非流式接口：
    POST /api/v1/admin/papers/<paper_id>/sections/<section_id>/add-block-from-text
    """
    from flask import jsonify

    return (
        jsonify(
            {
                "code": BusinessCode.BAD_REQUEST,
                "message": "流式解析接口已关闭，请使用 add-block-from-text 接口",
                "data": {
                    "paperId": paper_id,
                    "sectionId": section_id,
                    "streamSupported": False,
                },
            }
        ),
        400,
    )




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


@bp.route("/<paper_id>/attachments", methods=["PUT"])
@login_required
@admin_required
def update_paper_attachments(paper_id):
    """
    管理员更新论文附件
    
    请求体示例:
    {
        "attachments": {
            "pdf": {
                "url": "https://your-domain.com/neuink/pdf/12345678_abc123.pdf",
                "key": "neuink/pdf/12345678_abc123.pdf",
                "size": 1024000,
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            },
            "markdown": {
                "url": "https://your-domain.com/neuink/markdown/12345678_abc123.md",
                "key": "neuink/markdown/12345678_abc123.md",
                "size": 102400,
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    }
    """
    try:
        data = request.get_json()
        if not data or "attachments" not in data:
            return bad_request_response("attachments字段不能为空")
        
        attachments = data.get("attachments")
        
        # 验证attachments结构
        if not isinstance(attachments, dict):
            return bad_request_response("attachments必须是对象")
        
        # 验证PDF和Markdown附件结构
        for attachment_type in ["pdf", "markdown"]:
            if attachment_type in attachments:
                attachment = attachments[attachment_type]
                if not isinstance(attachment, dict):
                    return bad_request_response(f"{attachment_type}附件必须是对象")
                
                required_fields = ["url", "key", "size", "uploadedAt"]
                for field in required_fields:
                    if field not in attachment:
                        return bad_request_response(f"{attachment_type}附件缺少{field}字段")
        
        service = get_paper_service()
        result = service.update_paper_attachments(
            paper_id=paper_id,
            attachments=attachments,
            user_id=g.current_user["user_id"],
            is_admin=True
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


@bp.route("/<paper_id>/attachments/<attachment_type>", methods=["DELETE"])
@login_required
@admin_required
def delete_paper_attachment(paper_id, attachment_type):
    """
    管理员删除论文附件
    
    参数:
    attachment_type: 附件类型 (pdf 或 markdown)
    """
    try:
        if attachment_type not in ["pdf", "markdown"]:
            return bad_request_response("附件类型只能是pdf或markdown")
        
        service = get_paper_service()
        result = service.delete_paper_attachment(
            paper_id=paper_id,
            attachment_type=attachment_type,
            user_id=g.current_user["user_id"],
            is_admin=True
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


@bp.route("/<paper_id>/upload-pdf", methods=["POST"])
@login_required
@admin_required
def upload_admin_paper_pdf(paper_id):
   """
   管理员上传论文PDF附件
   
   请求格式: multipart/form-data
   参数:
       file: PDF文件
   """
   try:
       # 首先获取论文详情，确保管理员有权限
       from ..services.paperService import get_paper_service
       service = get_paper_service()
       paper_result = service.get_admin_paper_detail(
           paper_id=paper_id,
           user_id=g.current_user["user_id"]
       )
       
       if paper_result["code"] != BusinessCode.SUCCESS:
           if paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
               return bad_request_response(paper_result["message"])
           elif paper_result["code"] == BusinessCode.PERMISSION_DENIED:
               from flask import jsonify
               return jsonify({
                   "code": ResponseCode.FORBIDDEN,
                   "message": paper_result["message"],
                   "data": None
               }), ResponseCode.FORBIDDEN
           else:
               return bad_request_response(paper_result["message"])
       
       paper_data = paper_result["data"]
       
       # 检查是否有文件上传
       if 'file' not in request.files:
           return bad_request_response("没有选择文件")
       
       file = request.files['file']
       
       # 检查文件名是否为空
       if file.filename == '':
           return bad_request_response("没有选择文件")
       
       # 检查文件类型
       if file.content_type != 'application/pdf':
           return bad_request_response("请选择PDF文件")
       
       # 读取文件数据
       file_data = file.read()
       
       # 检查文件大小（50MB限制）
       max_size = 50 * 1024 * 1024  # 50MB
       if len(file_data) > max_size:
           return bad_request_response(f"文件大小超过限制，最大允许 {max_size // (1024*1024)}MB")
       
       # 导入上传服务
       from ..services.qiniuService import get_qiniu_service
       qiniu_service = get_qiniu_service()
       
       # 上传文件到七牛云，使用统一目录结构
       upload_result = qiniu_service.upload_file_data(
           file_data=file_data,
           file_extension=".pdf",
           file_type="unified_paper",
           filename=f"{paper_id}.pdf",
           paper_id=paper_id
       )
       
       if upload_result["success"]:
           # 使用paperService更新附件
           from ..services.paperService import get_paper_service
           paper_service = get_paper_service()
           
           # 构建附件数据
           attachments = paper_data.get("attachments", {})
           attachments["pdf"] = {
               "url": upload_result["url"],
               "key": upload_result["key"],
               "size": upload_result["size"],
               "uploadedAt": upload_result["uploadedAt"]
           }
           
           # 更新论文附件
           result = paper_service.update_paper_attachments(
               paper_id=paper_id,
               attachments=attachments,
               user_id=g.current_user["user_id"],
               is_admin=True
           )
           
           if result["code"] == BusinessCode.SUCCESS:
               return success_response(result["data"], "PDF上传成功")
           else:
               return bad_request_response(result["message"])
       else:
           return internal_error_response(f"PDF上传失败: {upload_result['error']}")
           
   except Exception as exc:
       return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/upload-markdown", methods=["POST"])
@login_required
@admin_required
def upload_admin_paper_markdown(paper_id):
   """
   管理员上传论文Markdown附件
   
   请求格式: multipart/form-data
   参数:
       file: Markdown文件
   """
   try:
       # 首先获取论文详情，确保管理员有权限
       from ..services.paperService import get_paper_service
       service = get_paper_service()
       paper_result = service.get_admin_paper_detail(
           paper_id=paper_id,
           user_id=g.current_user["user_id"]
       )
       
       if paper_result["code"] != BusinessCode.SUCCESS:
           if paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
               return bad_request_response(paper_result["message"])
           elif paper_result["code"] == BusinessCode.PERMISSION_DENIED:
               from flask import jsonify
               return jsonify({
                   "code": ResponseCode.FORBIDDEN,
                   "message": paper_result["message"],
                   "data": None
               }), ResponseCode.FORBIDDEN
           else:
               return bad_request_response(paper_result["message"])
       
       paper_data = paper_result["data"]
       
       # 检查是否有文件上传
       if 'file' not in request.files:
           return bad_request_response("没有选择文件")
       
       file = request.files['file']
       
       # 检查文件名是否为空
       if file.filename == '':
           return bad_request_response("没有选择文件")
       
       # 检查文件类型（允许.md和.markdown）
       file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
       if file_extension not in ['md', 'markdown']:
           return bad_request_response("请选择Markdown文件")
       
       # 导入上传服务
       from ..services.qiniuService import get_qiniu_service
       qiniu_service = get_qiniu_service()
       
       # 读取文件数据
       file_data = file.read()
       
       # 检查文件大小（50MB限制）
       max_size = 50 * 1024 * 1024  # 50MB
       if len(file_data) > max_size:
           return bad_request_response(f"文件大小超过限制，最大允许 {max_size // (1024*1024)}MB")
       
       # 上传文件到七牛云，使用统一目录结构
       upload_result = qiniu_service.upload_file_data(
           file_data=file_data,
           file_extension=".md",
           file_type="unified_paper",
           filename=f"{paper_id}.md",
           paper_id=paper_id
       )
       
       if upload_result["success"]:
           # 使用paperService更新附件
           from ..services.paperService import get_paper_service
           paper_service = get_paper_service()
           
           # 构建附件数据
           attachments = paper_data.get("attachments", {})
           attachments["markdown"] = {
               "url": upload_result["url"],
               "key": upload_result["key"],
               "size": upload_result["size"],
               "uploadedAt": upload_result["uploadedAt"]
           }
           
           # 更新论文附件
           result = paper_service.update_paper_attachments(
               paper_id=paper_id,
               attachments=attachments,
               user_id=g.current_user["user_id"],
               is_admin=True
           )
           
           if result["code"] == BusinessCode.SUCCESS:
               return success_response(result["data"], "Markdown文件上传成功")
           else:
               return bad_request_response(result["message"])
       else:
           return internal_error_response(f"Markdown文件上传失败: {upload_result['error']}")
           
   except Exception as exc:
       return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/parse-pdf-to-markdown", methods=["POST"])
@login_required
@admin_required
def parse_pdf_to_markdown(paper_id):
   """
   管理员通过PDF解析生成Markdown
   
   请求体示例:
   {
       "autoUpload": false  // 不再自动上传，改为手动查询
   }
   """
   try:
       # 首先获取论文详情，确保管理员有权限
       from ..services.paperService import get_paper_service
       service = get_paper_service()
       paper_result = service.get_admin_paper_detail(
           paper_id=paper_id,
           user_id=g.current_user["user_id"]
       )
       
       if paper_result["code"] != BusinessCode.SUCCESS:
           if paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
               return bad_request_response(paper_result["message"])
           elif paper_result["code"] == BusinessCode.PERMISSION_DENIED:
               from flask import jsonify
               return jsonify({
                   "code": ResponseCode.FORBIDDEN,
                   "message": paper_result["message"],
                   "data": None
               }), ResponseCode.FORBIDDEN
           else:
               return bad_request_response(paper_result["message"])
       
       paper_data = paper_result["data"]
       attachments = paper_data.get("attachments", {})
       
       # 检查是否有PDF文件
       if not attachments.get("pdf") or not attachments["pdf"].get("url"):
           return bad_request_response("论文没有PDF文件，无法解析")
       
       # 检查是否已有Markdown文件
       if attachments.get("markdown"):
           return bad_request_response("论文已有Markdown文件，无需重复解析")
       
       pdf_url = attachments["pdf"]["url"]
       
       # 获取请求数据
       data = request.get_json() or {}
       
       # 导入MinerU服务和任务模型
       from ..services.mineruService import get_mineru_service
       from ..models.pdfParseTask import get_pdf_parse_task_model
       
       mineru_service = get_mineru_service()
       task_model = get_pdf_parse_task_model()
       
       # 检查MinerU服务是否配置
       if not mineru_service.is_configured():
           return bad_request_response("PDF解析服务未配置，请联系管理员")
       
       # 检查是否已有进行中的解析任务
       existing_tasks = task_model.get_paper_tasks(paper_id, is_admin=True)
       for task in existing_tasks:
           if task["status"] in ["pending", "processing"]:
               return bad_request_response("该论文已有进行中的PDF解析任务")
       
       # 创建解析任务
       task = task_model.create_task(
           paper_id=paper_id,
           user_id=g.current_user["user_id"],
           pdf_url=pdf_url,
           is_admin=True
       )
       
       # 提交MinerU解析任务
       try:
           submit_result = mineru_service.submit_parsing_task(pdf_url)
           logger.info(f"MinerU提交结果: {submit_result}")
       except Exception as e:
           logger.error(f"提交MinerU解析任务异常: {str(e)}")
           # 更新任务状态为失败
           task_model.update_task_status(
               task_id=task["id"],
               status="failed",
               error=f"提交解析任务异常: {str(e)}"
           )
           return bad_request_response(f"提交PDF解析任务异常: {str(e)}")
       
       if not submit_result["success"]:
           # 更新任务状态为失败
           task_model.update_task_status(
               task_id=task["id"],
               status="failed",
               error=submit_result["error"]
           )
           return bad_request_response(f"提交PDF解析任务失败: {submit_result['error']}")
       
       # 更新任务状态为处理中
       try:
           update_success = task_model.update_task_status(
               task_id=task["id"],
               status="processing",
               progress=10,
               message="PDF解析任务已提交，正在处理中...",
               mineru_task_id=submit_result["task_id"]
           )
           if not update_success:
               logger.error(f"更新任务状态失败: task_id={task['id']}")
       except Exception as e:
           logger.error(f"更新任务状态异常: {str(e)}")
           # 即使更新状态失败，也继续执行，因为MinerU任务已经提交成功
           pass
       
       return success_response({
           "taskId": task["id"],
           "message": "PDF解析任务已提交，请手动点击查看解析进度"
       }, "PDF解析任务提交成功")
       
   except Exception as exc:
       logger.error(f"parse_pdf_to_markdown异常: {str(exc)}")
       import traceback
       logger.error(f"异常详情: {traceback.format_exc()}")
       return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/pdf-parse-tasks/<task_id>", methods=["GET"])
@login_required
@admin_required
def get_pdf_parse_task_status(paper_id, task_id):
   """
   管理员获取PDF解析任务状态，并在解析完成时自动上传Markdown文件
   
   返回数据示例:
   {
       "taskId": "task_123",
       "status": "processing",
       "progress": 50,
       "message": "PDF解析中...",
       "markdownContent": "...",  // 如果完成
       "markdownAttachment": {...}, // 如果已上传
       "createdAt": "2023-01-01T00:00:00Z",
       "updatedAt": "2023-01-01T00:05:00Z"
   }
   """
   try:
       from ..models.pdfParseTask import get_pdf_parse_task_model
       from ..services.mineruService import get_mineru_service
       from ..services.qiniuService import get_qiniu_service
       from ..services.paperService import get_paper_service
       
       task_model = get_pdf_parse_task_model()
       mineru_service = get_mineru_service()
       
       task = task_model.get_task(task_id)
       if not task:
           return bad_request_response("解析任务不存在")
       
       # 验证任务属于该论文
       if task["paperId"] != paper_id:
           return bad_request_response("任务不属于该论文")
       
       # 验证任务属于该用户
       if task["userId"] != g.current_user["user_id"]:
           return bad_request_response("无权限访问此任务")
       
       # 如果任务状态是processing，查询MinerU状态
       if task["status"] == "processing" and task.get("mineruTaskId"):
           try:
               status_result = mineru_service.get_parsing_status(task["mineruTaskId"])
               
               if status_result["success"]:
                   status = status_result["status"]
                   
                   if status == "processing":
                       # 更新任务状态为处理中
                       task_model.update_task_status(
                           task_id=task_id,
                           status="processing",
                           progress=50,
                           message="PDF解析中..."
                       )
                       task["status"] = "processing"
                       task["progress"] = 50
                       task["message"] = "PDF解析中..."
                       
                   elif status == "completed":
                       # 获取Markdown内容
                       full_zip_url = status_result.get("full_zip_url")
                       
                       if full_zip_url:
                           # 使用新的方法获取Markdown内容并上传
                           qiniu_service = get_qiniu_service()
                           result = mineru_service.fetch_markdown_content_and_upload(
                               result_url=full_zip_url,
                               paper_id=paper_id,
                               qiniu_service=qiniu_service
                           )
                           
                           if result["success"]:
                               markdown_content = result["markdown_content"]
                               markdown_attachment = result.get("markdown_attachment")
                               
                               if markdown_attachment:
                                   # 获取论文详情并更新附件
                                   paper_service = get_paper_service()
                                   paper_result = paper_service.get_admin_paper_detail(
                                       paper_id=paper_id,
                                       user_id=g.current_user["user_id"]
                                   )
                                   
                                   if paper_result["code"] == BusinessCode.SUCCESS:
                                       paper_data = paper_result["data"]
                                       attachments = paper_data.get("attachments", {})
                                       
                                       # 更新附件信息
                                       attachments["markdown"] = markdown_attachment
                                       
                                       # 如果有content_list.json附件，也更新
                                       content_list_attachment = result.get("content_list_attachment")
                                       if content_list_attachment:
                                           attachments["content_list"] = content_list_attachment
                                       
                                       # 更新论文附件
                                       update_result = paper_service.update_paper_attachments(
                                           paper_id=paper_id,
                                           attachments=attachments,
                                           user_id=g.current_user["user_id"],
                                           is_admin=True
                                       )
                                       
                                       if update_result["code"] == BusinessCode.SUCCESS:
                                           # 更新任务状态为完成
                                           task_model.update_task_status(
                                               task_id=task_id,
                                               status="completed",
                                               progress=100,
                                               message="PDF解析完成并已上传Markdown文件",
                                               markdown_content=markdown_content
                                           )
                                           
                                           # 更新附件信息
                                           task_model.update_markdown_attachment(
                                               task_id=task_id,
                                               attachment_info=attachments["markdown"]
                                           )
                                           
                                           # 更新返回的任务信息
                                           task["status"] = "completed"
                                           task["progress"] = 100
                                           task["message"] = "PDF解析完成并已上传Markdown文件"
                                           task["markdownContent"] = markdown_content
                                           task["markdownAttachment"] = attachments["markdown"]
                                           
                                           # 如果有content_list.json，也添加到返回信息中
                                           if content_list_attachment:
                                               task["contentListAttachment"] = content_list_attachment
                                               task["contentListContent"] = result.get("content_list_content")
                                       else:
                                           # 更新任务状态为失败
                                           task_model.update_task_status(
                                               task_id=task_id,
                                               status="failed",
                                               error="上传Markdown文件后更新论文附件失败"
                                           )
                                           task["status"] = "failed"
                                           task["error"] = "上传Markdown文件后更新论文附件失败"
                                   else:
                                       # 更新任务状态为失败
                                       task_model.update_task_status(
                                           task_id=task_id,
                                           status="failed",
                                           error="无法获取论文详情"
                                       )
                                       task["status"] = "failed"
                                       task["error"] = "无法获取论文详情"
                               else:
                                   # 更新任务状态为失败
                                   task_model.update_task_status(
                                       task_id=task_id,
                                       status="failed",
                                       error="上传Markdown文件失败"
                                   )
                                   task["status"] = "failed"
                                   task["error"] = "上传Markdown文件失败"
                           else:
                               # 更新任务状态为失败
                               task_model.update_task_status(
                                   task_id=task_id,
                                   status="failed",
                                   error=result["error"]
                               )
                               task["status"] = "failed"
                               task["error"] = result["error"]
                       else:
                           # 更新任务状态为失败
                           task_model.update_task_status(
                               task_id=task_id,
                               status="failed",
                               error="解析完成但未获取到ZIP文件URL"
                           )
                           task["status"] = "failed"
                           task["error"] = "解析完成但未获取到ZIP文件URL"
                           
                   elif status == "failed":
                       # 更新任务状态为失败
                       error_message = status_result.get("message", "PDF解析失败")
                       task_model.update_task_status(
                           task_id=task_id,
                           status="failed",
                           error=error_message
                       )
                       task["status"] = "failed"
                       task["error"] = error_message
                       
           except Exception as e:
               logger.error(f"查询MinerU状态异常: {str(e)}")
               # 继续返回当前任务状态
       
       return success_response(task, "获取解析任务状态成功")
       
   except Exception as exc:
       return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/pdf-parse-tasks", methods=["GET"])
@login_required
@admin_required
def get_pdf_parse_tasks(paper_id):
   """
   管理员获取论文的所有PDF解析任务
   
   返回数据示例:
   {
       "tasks": [
           {
               "taskId": "task_123",
               "status": "completed",
               "progress": 100,
               "message": "PDF解析完成",
               "createdAt": "2023-01-01T00:00:00Z"
           }
       ]
   }
   """
   try:
       from ..models.pdfParseTask import get_pdf_parse_task_model
       task_model = get_pdf_parse_task_model()
       
       tasks = task_model.get_paper_tasks(paper_id, is_admin=True)
       
       return success_response({"tasks": tasks}, "获取解析任务列表成功")
       
   except Exception as exc:
       return internal_error_response(f"服务器错误: {exc}")


@bp.route("/create-from-pdf", methods=["POST"])
@login_required
@admin_required
def create_paper_from_pdf():
   """
   管理员通过PDF创建公共论文
   
   请求格式: multipart/form-data
   参数:
       file: PDF文件
       extra: JSON字符串，包含额外的论文信息
   """
   try:
       # 检查是否有文件上传
       if 'file' not in request.files:
           return bad_request_response("没有选择文件")
       
       file = request.files['file']
       
       # 检查文件名是否为空
       if file.filename == '':
           return bad_request_response("没有选择文件")
       
       # 检查文件类型
       if file.content_type != 'application/pdf':
           return bad_request_response("请选择PDF文件")
       
       # 获取额外信息
       extra_data = {}
       if request.form.get('extra'):
           try:
               extra_data = json.loads(request.form.get('extra'))
           except json.JSONDecodeError:
               return bad_request_response("extra字段格式错误，应为JSON字符串")
       
       # 读取文件数据
       file_data = file.read()
       
       # 检查文件大小（50MB限制）
       max_size = 50 * 1024 * 1024  # 50MB
       if len(file_data) > max_size:
           return bad_request_response(f"文件大小超过限制，最大允许 {max_size // (1024*1024)}MB")
       
       # 首先创建一个基础论文，状态为"解析中"
       from ..services.paperService import get_paper_service
       paper_service = get_paper_service()
       
       # 创建基础论文数据
       paper_data = {
           "metadata": {
               "title": "解析中...",
               "titleZh": "解析中...",
               "authors": [],
               "year": None,
               "journal": None,
               "abstract": "正在解析PDF文件，请稍候...",
               "abstractZh": "正在解析PDF文件，请稍候...",
               "keywords": [],
               "keywordsZh": []
           },
           "isPublic": True,
           "parseStatus": "parsing",  # 设置解析状态
           "attachments": {}
       }
       
       # 创建论文
       create_result = paper_service.create_paper(paper_data, g.current_user["user_id"])
       
       if create_result["code"] != BusinessCode.SUCCESS:
           return bad_request_response(f"创建论文失败: {create_result['message']}")
       
       paper = create_result["data"]
       paper_id = paper["id"]
       
       # 导入上传服务
       from ..services.qiniuService import get_qiniu_service
       qiniu_service = get_qiniu_service()
       
       # 上传PDF文件到七牛云
       upload_result = qiniu_service.upload_file_data(
           file_data=file_data,
           file_extension=".pdf",
           file_type="unified_paper",
           filename=f"{paper_id}.pdf",
           paper_id=paper_id
       )
       
       if not upload_result["success"]:
           # 如果上传失败，删除已创建的论文
           paper_service.delete_paper(paper_id, g.current_user["user_id"], is_admin=True)
           return internal_error_response(f"PDF上传失败: {upload_result['error']}")
       
       # 更新论文附件信息
       attachments = {
           "pdf": {
               "url": upload_result["url"],
               "key": upload_result["key"],
               "size": upload_result["size"],
               "uploadedAt": upload_result["uploadedAt"]
           }
       }
       
       update_result = paper_service.update_paper_attachments(
           paper_id=paper_id,
           attachments=attachments,
           user_id=g.current_user["user_id"],
           is_admin=True
       )
       
       if update_result["code"] != BusinessCode.SUCCESS:
           # 如果更新失败，删除已创建的论文和上传的文件
           paper_service.delete_paper(paper_id, g.current_user["user_id"], is_admin=True)
           qiniu_service.delete_file(upload_result["key"])
           return bad_request_response(f"更新论文附件失败: {update_result['message']}")
       
       # 提交PDF解析任务
       from ..services.mineruService import get_mineru_service
       from ..models.pdfParseTask import get_pdf_parse_task_model
       
       mineru_service = get_mineru_service()
       task_model = get_pdf_parse_task_model()
       
       # 检查MinerU服务是否配置
       if not mineru_service.is_configured():
           # 如果没有配置解析服务，论文创建成功但需要手动解析
           return success_response({
               "paper": update_result["data"],
               "message": "论文创建成功，但PDF解析服务未配置，请手动上传Markdown文件或联系管理员配置解析服务"
           }, "论文创建成功")
       
       # 创建解析任务
       task = task_model.create_task(
           paper_id=paper_id,
           user_id=g.current_user["user_id"],
           pdf_url=upload_result["url"],
           is_admin=True
       )
       
       # 提交MinerU解析任务
       try:
           submit_result = mineru_service.submit_parsing_task(upload_result["url"])
           
           if not submit_result["success"]:
               # 更新任务状态为失败
               task_model.update_task_status(
                   task_id=task["id"],
                   status="failed",
                   error=submit_result["error"]
               )
               # 论文创建成功，但解析失败
               return success_response({
                   "paper": update_result["data"],
                   "taskId": task["id"],
                   "message": f"论文创建成功，但PDF解析任务提交失败: {submit_result['error']}，您可以稍后手动重试解析"
               }, "论文创建成功")
           
           # 更新任务状态为处理中
           task_model.update_task_status(
               task_id=task["id"],
               status="processing",
               progress=10,
               message="PDF解析任务已提交，正在处理中...",
               mineru_task_id=submit_result["task_id"]
           )
           
           # 启动后台任务监控解析进度
           from ..utils.background_tasks import get_task_manager
           task_manager = get_task_manager()
           
           # 在定义后台函数之前获取用户ID和任务ID
           current_user_id = g.current_user["user_id"]
           task_id_for_bg = task["id"]
           paper_id_for_bg = paper_id
           pdf_url_for_bg = upload_result["url"]
           
           def background_pdf_parsing():
               """后台PDF解析任务"""
               try:
                   # 创建应用上下文
                   try:
                       from flask import current_app
                       app_context = current_app.app_context()
                   except (RuntimeError, ImportError):
                       from neuink import create_app
                       app = create_app()
                       app_context = app.app_context()
                   
                   with app_context:
                       # 设置用户ID到应用上下文中
                       from flask import g
                       g.current_user = {"user_id": current_user_id}
                       
                       # 轮询解析状态
                       max_wait_time = 600  # 10分钟
                       start_time = time.time()
                       
                       # 从任务模型重新获取任务信息，确保使用正确的任务ID
                       from ..models.pdfParseTask import get_pdf_parse_task_model
                       task_model_bg = get_pdf_parse_task_model()
                       task_info = task_model_bg.get_task(task_id_for_bg)
                       
                       if not task_info:
                           logger.error(f"后台任务找不到任务信息: {task_id_for_bg}")
                           return
                           
                       mineru_task_id = task_info.get("mineruTaskId")
                       if not mineru_task_id:
                           logger.error(f"任务没有MinerU任务ID: {task_id_for_bg}")
                           return
                       
                       while time.time() - start_time < max_wait_time:
                           status_result = mineru_service.get_parsing_status(mineru_task_id)
                           
                           if not status_result["success"]:
                               task_model_bg.update_task_status(
                                   task_id=task_id_for_bg,
                                   status="failed",
                                   error=status_result["error"]
                               )
                               break
                           
                           status = status_result["status"]
                           
                           if status == "processing":
                               task_model_bg.update_task_status(
                                   task_id=task_id_for_bg,
                                   status="processing",
                                   progress=50,
                                   message="PDF解析中..."
                               )
                           elif status == "completed":
                               # 获取ZIP文件URL
                               full_zip_url = status_result.get("full_zip_url")
                               
                               if not full_zip_url:
                                   task_model.update_task_status(
                                       task_id=task["id"],
                                       status="failed",
                                       error="解析完成但未获取到ZIP文件URL"
                                   )
                                   break
                               
                               # 获取Markdown内容并上传
                               result = mineru_service.fetch_markdown_content_and_upload(
                                   result_url=full_zip_url,
                                   paper_id=paper_id_for_bg,
                                   qiniu_service=qiniu_service
                               )
                               
                               if result["success"]:
                                   markdown_content = result["markdown_content"]
                                   markdown_attachment = result.get("markdown_attachment")
                                   
                                   if markdown_attachment:
                                       # 更新论文附件
                                       attachments = update_result["data"].get("attachments", {})
                                       attachments["markdown"] = markdown_attachment
                                       
                                       # 如果有content_list.json附件，也更新
                                       content_list_attachment = result.get("content_list_attachment")
                                       if content_list_attachment:
                                           attachments["content_list"] = content_list_attachment
                                       
                                       # 更新论文附件
                                       paper_service.update_paper_attachments(
                                           paper_id=paper_id_for_bg,
                                           attachments=attachments,
                                           user_id=current_user_id,
                                           is_admin=True
                                       )
                                       
                                       # 使用Markdown内容创建论文内容
                                       try:
                                           # ✅ 改成：只解析，不创建paper
                                           parse_result = paper_service.parse_paper_from_text(
                                               text=markdown_content
                                           )
                                           
                                           if parse_result["code"] == BusinessCode.SUCCESS:
                                               # 获取解析后的论文数据
                                               parsed_paper = parse_result["data"]
                                               
                                               # 更新原论文的元数据和内容
                                               update_data = {
                                                   "metadata": parsed_paper.get("metadata", {}),
                                                   "abstract": parsed_paper.get("abstract", ""),
                                                   "keywords": parsed_paper.get("keywords", []),
                                                   "sections": parsed_paper.get("sections", []),
                                                   "references": parsed_paper.get("references", []),
                                                   "parseStatus": "completed"
                                               }
                                               
                                               paper_service.update_paper(
                                                   paper_id=paper_id_for_bg,
                                                   update_data=update_data,
                                                   user_id=current_user_id,
                                                   is_admin=True
                                               )
                                               
                                               # 更新任务状态为完成
                                               task_model.update_task_status(
                                                   task_id=task["id"],
                                                   status="completed",
                                                   progress=100,
                                                   message="PDF解析完成并已更新论文内容",
                                                   markdown_content=markdown_content
                                               )
                                           else:
                                               # 如果解析失败，只更新附件信息
                                               paper_service.update_paper(
                                                   paper_id=paper_id_for_bg,
                                                   update_data={"parseStatus": "completed"},
                                                   user_id=current_user_id,
                                                   is_admin=True
                                               )
                                               
                                               task_model.update_task_status(
                                                   task_id=task["id"],
                                                   status="completed",
                                                   progress=100,
                                                   message="PDF解析完成但内容解析失败，已上传Markdown文件",
                                                   markdown_content=markdown_content
                                               )
                                       except Exception as e:
                                           logger.error(f"从Markdown创建论文内容失败: {str(e)}")
                                           # 即使解析失败，也标记为完成
                                           paper_service.update_paper(
                                               paper_id=paper_id_for_bg,
                                               update_data={"parseStatus": "completed"},
                                               user_id=current_user_id,
                                               is_admin=True
                                           )
                                           
                                           task_model.update_task_status(
                                               task_id=task["id"],
                                               status="completed",
                                               progress=100,
                                               message="PDF解析完成但内容解析失败，已上传Markdown文件",
                                               markdown_content=markdown_content
                                           )
                                   else:
                                       task_model.update_task_status(
                                           task_id=task["id"],
                                           status="failed",
                                           error="上传Markdown文件失败"
                                       )
                               else:
                                   task_model_bg.update_task_status(
                                       task_id=task_id_for_bg,
                                       status="failed",
                                       error=result["error"]
                                   )
                               break
                           elif status == "failed":
                               task_model_bg.update_task_status(
                                   task_id=task_id_for_bg,
                                   status="failed",
                                   error=status_result.get("message", "PDF解析失败")
                               )
                               break
                           
                           # 等待一段时间再查询
                           time.sleep(10)
                       else:
                           # 超时
                           task_model_bg.update_task_status(
                               task_id=task_id_for_bg,
                               status="failed",
                               error="PDF解析超时"
                           )
               
               except Exception as e:
                   logger.error(f"后台PDF解析任务异常: {str(e)}")
                   task_model_bg.update_task_status(
                       task_id=task_id_for_bg,
                       status="failed",
                       error=f"后台任务异常: {str(e)}"
                   )
           
           # 提交后台任务
           task_manager.submit_task(
               task_id=task["id"],
               func=background_pdf_parsing,
               callback=lambda task_id, result: None
           )
           
           return success_response({
               "paper": update_result["data"],
               "taskId": task["id"],
               "message": "论文创建成功，PDF解析任务已提交，请稍后查看解析进度"
           }, "论文创建成功")
           
       except Exception as e:
           logger.error(f"提交MinerU解析任务异常: {str(e)}")
           # 更新任务状态为失败
           task_model.update_task_status(
               task_id=task["id"],
               status="failed",
               error=f"提交解析任务异常: {str(e)}"
           )
           # 论文创建成功，但解析失败
           return success_response({
               "paper": update_result["data"],
               "taskId": task["id"],
               "message": f"论文创建成功，但PDF解析任务提交失败: {str(e)}，您可以稍后手动重试解析"
           }, "论文创建成功")
       
   except Exception as exc:
       return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/content-list", methods=["GET"])
@login_required
@admin_required
def get_admin_paper_content_list(paper_id):
   """
   管理员获取论文的content_list.json文件内容
   
   返回数据示例:
   {
       "contentList": {...},  // content_list.json的内容
       "attachment": {...}   // 附件信息
   }
   """
   try:
       # 首先获取论文详情，确保管理员有权限
       from ..services.paperService import get_paper_service
       service = get_paper_service()
       paper_result = service.get_admin_paper_detail(
           paper_id=paper_id,
           user_id=g.current_user["user_id"]
       )
       
       if paper_result["code"] != BusinessCode.SUCCESS:
           if paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
               return bad_request_response(paper_result["message"])
           elif paper_result["code"] == BusinessCode.PERMISSION_DENIED:
               from flask import jsonify
               return jsonify({
                   "code": ResponseCode.FORBIDDEN,
                   "message": paper_result["message"],
                   "data": None
               }), ResponseCode.FORBIDDEN
           else:
               return bad_request_response(paper_result["message"])
       
       paper_data = paper_result["data"]
       attachments = paper_data.get("attachments", {})
       
       # 检查是否有content_list文件
       if not attachments.get("content_list") or not attachments["content_list"].get("url"):
           return bad_request_response("论文没有content_list文件")
       
       content_list_url = attachments["content_list"]["url"]
       
       # 从七牛云获取content_list.json内容
       from ..services.qiniuService import get_qiniu_service
       qiniu_service = get_qiniu_service()
       
       try:
           # 直接使用数据库中的URL获取content_list.json内容
           logger.info(f"开始获取content_list文件，URL: {content_list_url}")
           content_list_result = qiniu_service.fetch_file_content(content_list_url)
           
           if not content_list_result["success"]:
               logger.error(f"获取content_list文件失败: {content_list_result['error']}")
               return bad_request_response(f"获取content_list文件失败: {content_list_result['error']}")
           
           # 解码base64内容
           import base64
           import json
           try:
               content_list_json = json.loads(base64.b64decode(content_list_result["content"]).decode('utf-8'))
           except Exception as decode_error:
               logger.error(f"解析content_list.json失败: {str(decode_error)}")
               return bad_request_response(f"解析content_list.json失败: {str(decode_error)}")
           
           return success_response({
               "contentList": content_list_json,
               "attachment": attachments["content_list"]
           }, "成功获取content_list文件")
           
       except Exception as e:
           logger.error(f"获取content_list文件异常: {str(e)}")
           import traceback
           logger.error(f"异常详情: {traceback.format_exc()}")
           return internal_error_response(f"获取content_list文件异常: {str(e)}")
       
   except Exception as exc:
       return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/pdf-content", methods=["GET"])
@login_required
@admin_required
def get_admin_paper_pdf_content_proxy(paper_id):
   """
   管理员获取论文PDF文件内容（以base64格式返回）
   
   返回数据示例:
   {
       "pdfContent": "base64编码的PDF内容",
       "attachment": {...}   // PDF附件信息
   }
   """
   try:
       # 首先获取论文详情，确保管理员有权限
       from ..services.paperService import get_paper_service
       service = get_paper_service()
       paper_result = service.get_admin_paper_detail(
           paper_id=paper_id,
           user_id=g.current_user["user_id"]
       )
       
       if paper_result["code"] != BusinessCode.SUCCESS:
           if paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
               return bad_request_response(paper_result["message"])
           elif paper_result["code"] == BusinessCode.PERMISSION_DENIED:
               from flask import jsonify
               return jsonify({
                   "code": ResponseCode.FORBIDDEN,
                   "message": paper_result["message"],
                   "data": None
               }), ResponseCode.FORBIDDEN
           else:
               return bad_request_response(paper_result["message"])
       
       paper_data = paper_result["data"]
       attachments = paper_data.get("attachments", {})
       
       # 检查是否有PDF文件
       if not attachments.get("pdf") or not attachments["pdf"].get("url"):
           return bad_request_response("论文没有PDF文件")
       
       pdf_url = attachments["pdf"]["url"]
       
       # 添加调试日志
       logger.info(f"管理员获取PDF内容 - paper_id: {paper_id}")
       logger.info(f"PDF URL: {pdf_url}")
       
       # 从七牛云获取PDF文件内容
       from ..services.qiniuService import get_qiniu_service
       qiniu_service = get_qiniu_service()
       
       try:
           logger.info(f"开始获取管理员论文PDF文件内容...")
           logger.info(f"PDF URL: {pdf_url}")
           
           # 直接使用数据库中的URL获取PDF文件内容
           pdf_content = qiniu_service.fetch_file_content(pdf_url)
           logger.info(f"七牛云返回结果: {pdf_content}")
           
           if not pdf_content["success"]:
               logger.error(f"获取PDF文件失败: {pdf_content['error']}")
               return bad_request_response(f"获取PDF文件失败: {pdf_content['error']}")
           
           logger.info(f"成功获取PDF内容，大小: {pdf_content.get('size', 0)} 字节")
           return success_response({
               "pdfContent": pdf_content["content"],
               "attachment": attachments["pdf"]
           }, "成功获取PDF文件")
           
       except Exception as e:
           logger.error(f"获取PDF文件异常: {str(e)}")
           import traceback
           logger.error(f"异常详情: {traceback.format_exc()}")
           return internal_error_response(f"获取PDF文件异常: {str(e)}")
       
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
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.delete_block(
            paper_id=paper_id,
            section_id=section_id,
            block_id=block_id,
            user_id=g.current_user["user_id"],
            is_admin=True
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

