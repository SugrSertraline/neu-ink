# neuink/api/admin_papers/sections.py
import logging
import traceback

from flask import request, g, jsonify

from . import bp
from ...models.paper import PaperModel
from ...models.section import get_section_model
from ...models.parseBlocks import get_parse_blocks_model
from ...models.parsingSession import get_parsing_session_model
from ...services.paperContentService import PaperContentService, get_parsed_blocks_from_cache
from ...services.paperService import get_paper_service
from ...utils.auth import login_required, admin_required
from ...utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
    ResponseCode,
)
from ...config.constants import BusinessCode

logger = logging.getLogger(__name__)


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
        
        # 添加调试日志
        logger.info(f"管理员添加章节 - paper_id: {paper_id}, position: {position}, section_data: {section_data}")

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

        # 验证section存在 - 不再从paper.get("sections")获取，因为sections字段已被移除
        # 应该通过section模型直接查询
        section_model = get_section_model()
        target_section = section_model.find_by_id(section_id)
        
        if not target_section or target_section.get("paperId") != paper_id:
            return bad_request_response("指定的section不存在或不属于该论文")

        # 获取解析会话
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

        # 验证section存在 - 不再从paper.get("sections")获取，因为sections字段已被移除
        # 应该通过section模型直接查询
        section_model = get_section_model()
        target_section = section_model.find_by_id(section_id)
        
        if not target_section or target_section.get("paperId") != paper_id:
            return bad_request_response("指定的section不存在或不属于该论文")

        # 获取解析会话
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

        # 验证section存在 - 不再从paper.get("sections")获取，因为sections字段已被移除
        # 应该通过section模型直接查询
        section_model = get_section_model()
        target_section = section_model.find_by_id(section_id)
        
        if not target_section or target_section.get("paperId") != paper_id:
            return bad_request_response("指定的section不存在或不属于该论文")

        # 获取解析会话
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
                section_model = get_section_model()
                target_section = section_model.find_by_id(section_id)
                
                if target_section:
                    content = target_section.get("content", [])
                    # 移除进度块
                    content = [block for block in content if block.get("id") != progress_block_id]
                    section_model.update(section_id, {"content": content})
            except Exception:
                # 如果更新失败，忽略错误，继续删除会话
                pass

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
