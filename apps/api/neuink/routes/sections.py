# neuink/api/routes/sections.py
import logging
import time

from flask import request, g, Blueprint

from neuink.services.paperService import get_paper_service
from neuink.services.userPaperService import get_user_paper_service
from neuink.services.paperContentService import PaperContentService, get_parsed_blocks_from_cache
from neuink.models.adminPaper import AdminPaperModel
from neuink.models.section import get_section_model
from neuink.models.parseBlocks import get_parse_blocks_model
from neuink.models.parsingSession import get_parsing_session_model
from neuink.utils.auth import login_required, admin_required
from neuink.utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
    ResponseCode,
)
from neuink.config.constants import BusinessCode

logger = logging.getLogger(__name__)

# 创建蓝图
bp = Blueprint("sections", __name__)


# ==================== 管理员论文章节操作 ====================

@bp.route("/admin/<paper_id>/add-section", methods=["POST"])
@login_required
@admin_required
def add_admin_section(paper_id):
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

        paper_model = AdminPaperModel()
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


@bp.route("/admin/<paper_id>/sections/<section_id>/add-block", methods=["POST"])
@login_required
@admin_required
def add_block_to_admin_section(paper_id, section_id):
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

        paper_model = AdminPaperModel()
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


@bp.route("/admin/<paper_id>/sections/<section_id>/add-block-from-text", methods=["POST"])
@login_required
@admin_required
def add_block_from_text_to_admin_section(paper_id, section_id):
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

        paper_model = AdminPaperModel()
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


@bp.route("/admin/<paper_id>/sections/<section_id>", methods=["GET"])
@login_required
@admin_required
def get_admin_section(paper_id, section_id):
    """
    管理员获取指定论文的指定section详情
    """
    try:
        # 验证论文存在且有权限
        service = get_paper_service()
        paper = service.paper_model.find_by_id(paper_id)
        if not paper:
            return bad_request_response("论文不存在")

        # 验证section存在
        section_model = get_section_model()
        section = section_model.find_by_id(section_id)
        
        if not section or section.get("paperId") != paper_id:
            return bad_request_response("指定的section不存在或不属于该论文")

        return success_response(section, "成功获取章节详情")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/sections/<section_id>", methods=["PUT"])
@login_required
@admin_required
def update_admin_section(paper_id, section_id):
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
            paper_model = AdminPaperModel()
            logger.info(f"AdminPaperModel初始化成功")
        except Exception as e:
            logger.error(f"AdminPaperModel初始化失败: {e}")
            return internal_error_response(f"AdminPaperModel初始化失败: {e}")

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
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/sections/<section_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_admin_section(paper_id, section_id):
    """
    管理员删除指定论文的指定section
    """
    try:
        paper_model = AdminPaperModel()
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


@bp.route("/admin/<paper_id>/sections/<section_id>/blocks/<block_id>", methods=["PUT"])
@login_required
@admin_required
def update_admin_block(paper_id, section_id, block_id):
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

        paper_model = AdminPaperModel()
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


@bp.route("/admin/<paper_id>/sections/<section_id>/blocks/<block_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_admin_block(paper_id, section_id, block_id):
    """
    管理员删除指定论文的指定section中的指定block
    """
    try:
        paper_model = AdminPaperModel()
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


# ==================== 用户论文章节操作 ====================

@bp.route("/user/<entry_id>/add-section", methods=["POST"])
@login_required
def add_user_section(entry_id):
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
                    {
                        "code": ResponseCode.FORBIDDEN,
                        "message": user_paper_result["message"],
                        "data": None,
                    },
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

        paper_model = AdminPaperModel()
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


@bp.route("/user/<entry_id>/sections/<section_id>/add-block", methods=["POST"])
@login_required
def add_block_to_user_section(entry_id, section_id):
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
                    {
                        "code": ResponseCode.FORBIDDEN,
                        "message": user_paper_result["message"],
                        "data": None,
                    },
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

        paper_model = AdminPaperModel()
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


@bp.route("/user/<entry_id>/sections/<section_id>/add-block-from-text", methods=["POST"])
@login_required
def add_block_from_text_to_user_section(entry_id, section_id):
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
                    {
                        "code": ResponseCode.FORBIDDEN,
                        "message": user_paper_result["message"],
                        "data": None,
                    },
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

        paper_model = AdminPaperModel()
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


@bp.route("/user/<entry_id>/sections/<section_id>", methods=["GET"])
@login_required
def get_user_section(entry_id, section_id):
    """
    获取用户论文的指定section详情
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
                    {
                        "code": ResponseCode.FORBIDDEN,
                        "message": user_paper_result["message"],
                        "data": None,
                    },
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

        # 验证section存在
        section_model = get_section_model()
        section = section_model.find_by_id(section_id)
        
        if not section or section.get("paperId") != paper_id:
            return bad_request_response("指定的section不存在或不属于该论文")

        return success_response(section, "成功获取章节详情")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<entry_id>/sections/<section_id>", methods=["PUT"])
@login_required
def update_user_section(entry_id, section_id):
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
                    {
                        "code": ResponseCode.FORBIDDEN,
                        "message": user_paper_result["message"],
                        "data": None,
                    },
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

        paper_model = AdminPaperModel()
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


@bp.route("/user/<entry_id>/sections/<section_id>", methods=["DELETE"])
@login_required
def delete_user_section(entry_id, section_id):
    """
    删除指定 section
    """
    try:
        logger.info(f"删除用户论文章节 - entry_id: {entry_id}, section_id: {section_id}, user_id: {g.current_user['user_id']}")
        
        # 直接使用entry_id作为paper_id，因为对于用户论文库，entry_id就是paper_id
        # 不需要再通过get_user_paper_detail获取论文详情，这会导致"论文不存在"的错误
        paper_id = entry_id
        
        logger.info(f"准备删除章节 - paper_id: {paper_id}, section_id: {section_id}")
        logger.info(f"请求头信息: {dict(request.headers)}")
        
        paper_model = AdminPaperModel()
        content_service = PaperContentService(paper_model)
        result = content_service.delete_section(
            paper_id=paper_id,
            section_id=section_id,
            user_id=g.current_user["user_id"],
            is_admin=False,
            is_user_paper=True,
        )

        logger.info(f"删除章节结果: {result}")

        if result["code"] == BusinessCode.SUCCESS:
            updated_paper = result["data"].get("paper")
            if updated_paper:
                section_ids = [section.get("id") for section in updated_paper.get("sections", [])]
                logger.info(f"更新后的section_ids: {section_ids}")
                
                # 更新用户论文库的sectionIds
                service = get_user_paper_service()
                update_result = service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"sectionIds": section_ids},
                )

                logger.info(f"更新用户论文库结果: {update_result}")

                if update_result["code"] == BusinessCode.SUCCESS:
                    return success_response(result["data"], result["message"])
                else:
                    logger.error(f"更新用户论文库失败: {update_result['message']}")
                    return internal_error_response("更新用户论文库失败")
            else:
                logger.info("删除章节成功，但没有返回更新后的论文数据")
                return success_response(result["data"], result["message"])

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            logger.error(f"删除章节失败 - 论文不存在: {result['message']}")
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            logger.error(f"删除章节失败 - 权限被拒绝: {result['message']}")
            return bad_request_response(result["message"])
        
        logger.error(f"删除章节失败 - 未知错误: {result['message']}")
        return internal_error_response(result["message"])

    except Exception as exc:
        logger.error(f"删除用户论文章节异常: {exc}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<entry_id>/sections/<section_id>/blocks/<block_id>", methods=["PUT"])
@login_required
def update_user_block(entry_id, section_id, block_id):
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
                    {
                        "code": ResponseCode.FORBIDDEN,
                        "message": user_paper_result["message"],
                        "data": None,
                    },
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

        paper_model = AdminPaperModel()
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


@bp.route("/user/<entry_id>/sections/<section_id>/blocks/<block_id>", methods=["DELETE"])
@login_required
def delete_user_block(entry_id, section_id, block_id):
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
                    {
                        "code": ResponseCode.FORBIDDEN,
                        "message": user_paper_result["message"],
                        "data": None,
                    },
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

        paper_model = AdminPaperModel()
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
            paper_model = AdminPaperModel()
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