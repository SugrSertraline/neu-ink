# user_papers/sections.py
import logging
import time

from flask import request, g, jsonify

from ...services.userPaperService import get_user_paper_service
from ...services.paperContentService import PaperContentService
from ...models.paper import PaperModel
from ...models.section import get_section_model
from ...utils.auth import login_required
from ...utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
)
from ...config.constants import BusinessCode, ResponseCode
from . import bp

logger = logging.getLogger(__name__)


@bp.route("/<entry_id>/add-section", methods=["POST"])
@login_required
def add_section_to_user_paper(entry_id):
    """
    向个人论文库中指定论文添加新章节
    """
    try:
        data = request.get_json()
        if not data or not data.get("sectionData"):
            return bad_request_response("章节数据不能为空")

        section_data = data.get("sectionData")
        position = data.get("position", -1)
        
        # 添加调试日志
        logger.info(f"用户添加章节 - entry_id: {entry_id}, position: {position}, section_data: {section_data}")

        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.add_section(
            paper_id=paper_id,
            section_data=section_data,
            user_id=g.current_user["user_id"],
            is_admin=False,
            parent_section_id=None,
            position=position,
            is_user_paper=True,
        )

        if result["code"] == BusinessCode.SUCCESS:
            updated_paper = result["data"]["paper"]
            section_ids = [section.get("id") for section in updated_paper.get("sections", [])]
            update_result = service.update_user_paper(
                entry_id=entry_id,
                user_id=g.current_user["user_id"],
                update_data={"sectionIds": section_ids},
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


@bp.route("/<entry_id>/sections/<section_id>/add-block", methods=["POST"])
@login_required
def add_block_to_user_paper_section(entry_id, section_id):
    """
    向指定section直接添加一个block（不通过LLM解析）
    """
    try:
        data = request.get_json()
        if not data or not data.get("blockData"):
            return bad_request_response("block数据不能为空")

        block_data = data.get("blockData")
        after_block_id = data.get("afterBlockId")

        if not block_data.get("type"):
            return bad_request_response("block类型不能为空")

        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.add_block_directly(
            paper_id=paper_id,
            section_id=section_id,
            block_data=block_data,
            user_id=g.current_user["user_id"],
            is_admin=False,
            after_block_id=after_block_id,
            is_user_paper=True,
        )

        if result["code"] == BusinessCode.SUCCESS:
            response_data = result["data"]
            if "blockId" not in response_data and "addedBlock" in response_data:
                response_data["blockId"] = response_data["addedBlock"]["id"]

            updated_paper = response_data.get("paper")
            if updated_paper:
                section_ids = [section.get("id") for section in updated_paper.get("sections", [])]
                update_result = service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"sectionIds": section_ids},
                )

                if update_result["code"] == BusinessCode.SUCCESS:
                    return success_response(response_data, result["message"])
                else:
                    return internal_error_response("更新用户论文库失败")
            else:
                return success_response(response_data, result["message"])

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/add-block-from-text", methods=["POST"])
@login_required
def add_block_from_text_to_user_paper_section(entry_id, section_id):
    """
    使用大模型解析文本并添加 blocks 到指定 section
    """
    try:
        data = request.get_json()
        if not data or not data.get("text"):
            return bad_request_response("文本内容不能为空")

        text = data.get("text")
        after_block_id = data.get("afterBlockId")

        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.add_block_from_text(
            paper_id=paper_id,
            section_id=section_id,
            text=text,
            user_id=g.current_user["user_id"],
            is_admin=False,
            after_block_id=after_block_id,
            is_user_paper=True,
        )

        if result["code"] == BusinessCode.SUCCESS:
            updated_paper = result["data"].get("paper")
            if updated_paper:
                section_ids = [section.get("id") for section in updated_paper.get("sections", [])]
                update_result = service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"sectionIds": section_ids},
                )

                if update_result["code"] == BusinessCode.SUCCESS:
                    return success_response(result["data"], result["message"])
                else:
                    return internal_error_response("更新用户论文库失败")
            else:
                return success_response(result["data"], result["message"])

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/blocks/<block_id>/parsing-status", methods=["GET"])
@login_required
def get_user_block_parsing_status(entry_id, section_id, block_id):
    """
    查询解析 block 的进度状态
    """
    try:
        if not block_id or block_id == "null":
            return bad_request_response("blockId 无效")

        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            if user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return bad_request_response(user_paper_result["message"])
            return internal_error_response(user_paper_result["message"])

        paper_id = entry_id

        section_model = get_section_model()
        section = section_model.find_by_id(section_id)

        if not section:
            return bad_request_response("指定的section不存在")

        if section.get("paperId") != paper_id:
            return bad_request_response("指定的section不属于该论文")

        content = section.get("content", []) or []
        target_block = None
        for b in content:
            if b.get("id") == block_id:
                target_block = b
                break

        if target_block and target_block.get("type") == "parsing":
            stage = target_block.get("stage", "structuring")
            message = target_block.get("message", "正在解析文本...")
            parse_id = target_block.get("parseId")

            if parse_id:
                from ...models.parseBlocks import get_parse_blocks_model

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
                            "parseId": parse_id,
                        }
                        return success_response(data, "解析进行中")

                    elif parse_status == "completed":
                        parsed_blocks = parse_record.get("blocks", [])
                        data = {
                            "status": "completed",
                            "progress": 100,
                            "message": f"解析完成，生成了{len(parsed_blocks)}个段落",
                            "paper": None,
                            "error": None,
                            "addedBlocks": parsed_blocks,
                            "parseId": parse_id,
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
                            "parseId": parse_id,
                        }
                        return success_response(data, "解析失败")

            if stage in ("structuring", "translating"):
                data = {
                    "status": "processing",
                    "progress": 50,
                    "message": message,
                    "paper": None,
                    "error": None,
                    "addedBlocks": None,
                }
                return success_response(data, "解析进行中")

            if stage == "completed":
                parsed_block_ids = target_block.get("parsedBlockIds", [])

                updated_section = section_model.find_by_id(section_id)
                added_blocks = []
                if updated_section:
                    content = updated_section.get("content", [])
                    added_blocks = [block for block in content if block.get("id") in parsed_block_ids]

                data = {
                    "status": "completed",
                    "progress": 100,
                    "message": f"解析完成,成功添加了{len(added_blocks)}个段落",
                    "paper": None,
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

        try:
            from ...services.paperContentService import get_parsed_blocks_from_cache

            cache_data = get_parsed_blocks_from_cache(block_id)
            if cache_data:
                parsed_block_ids = cache_data.get("parsedBlockIds", [])
                added_blocks = []

                updated_section = section_model.find_by_id(section_id)
                if updated_section:
                    content = updated_section.get("content", [])
                    added_blocks = [block for block in content if block.get("id") in parsed_block_ids]

                data = {
                    "status": "completed",
                    "progress": 100,
                    "message": f"解析完成,成功添加了{len(added_blocks)}个段落",
                    "paper": None,
                    "error": None,
                    "addedBlocks": added_blocks,
                }
                return success_response(data, f"解析完成,成功添加了{len(added_blocks)}个段落")
        except Exception as e:
            logger.warning(f"从缓存获取解析结果失败: {e}")

        data = {
            "status": "completed",
            "progress": 100,
            "message": "解析完成",
            "paper": None,
            "error": None,
            "addedBlocks": [],
        }
        return success_response(data, "解析完成")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>", methods=["PUT"])
@login_required
def update_section_in_user_paper(entry_id, section_id):
    """
    更新指定 section
    """
    try:
        data = request.get_json()
        if not data:
            return bad_request_response("更新数据不能为空")

        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)

        logger.info(f"用户论文章节更新请求 - entry_id: {entry_id}, section_id: {section_id}, paper_id: {paper_id}")
        logger.info(f"更新数据: {data}")

        result = content_service.update_section(
            paper_id=paper_id,
            section_id=section_id,
            update_data=data,
            user_id=g.current_user["user_id"],
            is_admin=False,
            is_user_paper=True,
        )

        logger.info(f"章节更新结果: {result}")

        if result["code"] == BusinessCode.SUCCESS:
            updated_paper = result["data"].get("paper")
            if updated_paper:
                section_ids = [section.get("id") for section in updated_paper.get("sections", [])]
                update_result = service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"sectionIds": section_ids},
                )

                if update_result["code"] == BusinessCode.SUCCESS:
                    return success_response(result["data"], result["message"])
                else:
                    return internal_error_response("更新用户论文库失败")
            else:
                return success_response(result["data"], result["message"])

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>", methods=["DELETE"])
@login_required
def delete_section_in_user_paper(entry_id, section_id):
    """
    删除指定 section
    """
    try:
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.delete_section(
            paper_id=paper_id,
            section_id=section_id,
            user_id=g.current_user["user_id"],
            is_admin=False,
            is_user_paper=True,
        )

        if result["code"] == BusinessCode.SUCCESS:
            updated_paper = result["data"].get("paper")
            if updated_paper:
                section_ids = [section.get("id") for section in updated_paper.get("sections", [])]
                update_result = service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"sectionIds": section_ids},
                )

                if update_result["code"] == BusinessCode.SUCCESS:
                    return success_response(result["data"], result["message"])
                else:
                    return internal_error_response("更新用户论文库失败")
            else:
                return success_response(result["data"], result["message"])

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/blocks/<block_id>", methods=["PUT"])
@login_required
def update_block_in_user_paper(entry_id, section_id, block_id):
    """
    更新指定 block
    """
    try:
        data = request.get_json()
        if not data:
            return bad_request_response("更新数据不能为空")

        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.update_block(
            paper_id=paper_id,
            section_id=section_id,
            block_id=block_id,
            update_data=data,
            user_id=g.current_user["user_id"],
            is_admin=False,
            is_user_paper=True,
        )

        if result["code"] == BusinessCode.SUCCESS:
            updated_paper = result["data"].get("paper")
            if updated_paper:
                section_ids = [section.get("id") for section in updated_paper.get("sections", [])]
                update_result = service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"sectionIds": section_ids},
                )

                if update_result["code"] == BusinessCode.SUCCESS:
                    return success_response(result["data"], result["message"])
                else:
                    return internal_error_response("更新用户论文库失败")
            else:
                return success_response(result["data"], result["message"])

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/blocks/<block_id>", methods=["DELETE"])
@login_required
def delete_block_in_user_paper(entry_id, section_id, block_id):
    """
    删除指定 block
    """
    try:
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.delete_block(
            paper_id=paper_id,
            section_id=section_id,
            block_id=block_id,
            user_id=g.current_user["user_id"],
            is_admin=False,
            is_user_paper=True,
        )

        if result["code"] == BusinessCode.SUCCESS:
            paper_model = PaperModel()
            paper_result = paper_model.get_paper_by_id(
                paper_id=paper_id,
                user_id=g.current_user["user_id"],
                is_admin=False,
            )

            if paper_result["code"] == BusinessCode.SUCCESS:
                section_ids = [section.get("id") for section in paper_result["data"].get("sections", [])]
                update_result = service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"sectionIds": section_ids},
                )

                if update_result["code"] == BusinessCode.SUCCESS:
                    return success_response(result["data"], result["message"])
                else:
                    return internal_error_response("更新用户论文库失败")
            else:
                return success_response(result["data"], result["message"])

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")




@bp.route("/<entry_id>/sections/<section_id>/parsing-sessions", methods=["GET"])
@login_required
def get_parsing_sessions(entry_id, section_id):
    """
    获取指定 section 的所有解析会话
    """
    try:
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        section_model = get_section_model()
        section = section_model.find_by_id(section_id)

        if not section:
            return bad_request_response("章节不存在")

        if section.get("paperId") != paper_id:
            return bad_request_response("指定的section不属于该论文")

        from ...models.parsingSession import get_parsing_session_model

        session_model = get_parsing_session_model()
        sessions = session_model.get_sessions_by_section(
            user_id=g.current_user["user_id"],
            paper_id=paper_id,
            section_id=section_id,
            is_admin=False,
        )

        return success_response({"sessions": sessions}, "成功获取解析会话列表")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/sections/<section_id>/parsing-sessions/<session_id>", methods=["GET"])
@login_required
def get_parsing_session(entry_id, section_id, session_id):
    """
    获取指定解析会话详情
    """
    try:
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        section_model = get_section_model()
        section = section_model.find_by_id(section_id)

        if not section:
            return bad_request_response("章节不存在")

        if section.get("paperId") != paper_id:
            return bad_request_response("指定的section不属于该论文")

        from ...models.parsingSession import get_parsing_session_model

        session_model = get_parsing_session_model()
        session = session_model.get_session(session_id)

        if not session:
            return bad_request_response("会话不存在或已过期")

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
    删除指定解析会话
    """
    try:
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        section_model = get_section_model()
        section = section_model.find_by_id(section_id)

        if not section:
            return bad_request_response("章节不存在")

        if section.get("paperId") != paper_id:
            return bad_request_response("指定的section不属于该论文")

        from ...models.parsingSession import get_parsing_session_model

        session_model = get_parsing_session_model()
        session = session_model.get_session(session_id)

        if not session:
            return bad_request_response("会话不存在或已过期")

        if session["userId"] != g.current_user["user_id"]:
            return bad_request_response("无权限访问此会话")

        if session["paperId"] != paper_id or session["sectionId"] != section_id:
            return bad_request_response("会话参数不匹配")

        if session["status"] == "processing" and session.get("progressBlockId"):
            progress_block_id = session["progressBlockId"]

            try:
                section_model = get_section_model()
                section = section_model.find_by_id(section_id)

                if section and section.get("paperId") == paper_id:
                    content = section.get("content", [])
                    content = [block for block in content if block.get("id") != progress_block_id]
                    section_model.update_section(section_id, {"content": content})
            except Exception:
                pass

        session_model.delete_session(session_id)

        return success_response(None, "成功删除解析会话")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")
