# neuink/api/routes/paper_attachments.py
import logging
import json
import base64
from flask import request, g, Blueprint
from neuink.services.paperService import get_paper_service
from neuink.services.userPaperService import get_user_paper_service
from neuink.utils.auth import login_required
from neuink.utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
)
from neuink.config.constants import BusinessCode

logger = logging.getLogger(__name__)

# 创建蓝图
bp = Blueprint("paper_attachments", __name__)


@bp.route("/admin/<paper_id>/pdf-content", methods=["GET"])
@login_required
def get_admin_paper_pdf_content(paper_id):
    """
    获取管理员论文的PDF文件内容（base64格式）
    """
    try:
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] != BusinessCode.SUCCESS:
            if result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(result["message"])
            if result["code"] == BusinessCode.PERMISSION_DENIED:
                return bad_request_response(result["message"])
            return internal_error_response(result["message"])

        paper = result["data"]
        attachments = paper.get("attachments", {})
        pdf_attachment = attachments.get("pdf", {})

        if not pdf_attachment or not pdf_attachment.get("url"):
            return bad_request_response("论文没有PDF附件")

        # 获取七牛云服务实例
        try:
            from ..services.qiniuService import get_qiniu_service
            qiniu_service = get_qiniu_service()
        except ImportError as e:
            return internal_error_response(f"七牛云服务不可用: {str(e)}")

        # 从七牛云获取PDF文件内容
        pdf_result = qiniu_service.fetch_file_content(pdf_attachment.get("url"))

        if not pdf_result["success"]:
            return internal_error_response(f"获取PDF内容失败: {pdf_result.get('error', '未知错误')}")

        return success_response({
            "pdfContent": pdf_result["content"],
            "attachment": pdf_attachment
        }, "成功获取PDF内容")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<entry_id>/pdf-content", methods=["GET"])
@login_required
def get_user_paper_pdf_content(entry_id):
    """
    获取用户论文的PDF文件内容（base64格式）
    """
    try:
        service = get_user_paper_service()
        result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] != BusinessCode.SUCCESS:
            if result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(result["message"])
            if result["code"] == BusinessCode.PERMISSION_DENIED:
                return bad_request_response(result["message"])
            return internal_error_response(result["message"])

        paper = result["data"]
        attachments = paper.get("attachments", {})
        pdf_attachment = attachments.get("pdf", {})

        if not pdf_attachment or not pdf_attachment.get("url"):
            return bad_request_response("论文没有PDF附件")

        # 获取七牛云服务实例
        try:
            from ..services.qiniuService import get_qiniu_service
            qiniu_service = get_qiniu_service()
        except ImportError as e:
            return internal_error_response(f"七牛云服务不可用: {str(e)}")

        # 从七牛云获取PDF文件内容
        pdf_result = qiniu_service.fetch_file_content(pdf_attachment.get("url"))

        if not pdf_result["success"]:
            return internal_error_response(f"获取PDF内容失败: {pdf_result.get('error', '未知错误')}")

        return success_response({
            "pdfContent": pdf_result["content"],
            "attachment": pdf_attachment
        }, "成功获取PDF内容")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/content-list", methods=["GET"])
@login_required
def get_admin_paper_content_list(paper_id):
    """
    获取管理员论文的content_list.json文件内容
    """
    try:
        logger.info(f"获取管理员论文content_list - paper_id: {paper_id}, user_id: {g.current_user['user_id']}")
        
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] != BusinessCode.SUCCESS:
            if result["code"] == BusinessCode.PAPER_NOT_FOUND:
                logger.warning(f"论文不存在 - paper_id: {paper_id}")
                return bad_request_response(result["message"])
            if result["code"] == BusinessCode.PERMISSION_DENIED:
                logger.warning(f"无权限访问论文 - paper_id: {paper_id}, user_id: {g.current_user['user_id']}")
                return bad_request_response(result["message"])
            logger.error(f"获取论文详情失败 - paper_id: {paper_id}, error: {result['message']}")
            return internal_error_response(result["message"])

        paper = result["data"]
        attachments = paper.get("attachments", {})
        content_list_attachment = attachments.get("content_list", {})
        
        logger.info(f"论文附件信息 - paper_id: {paper_id}, content_list_attachment: {content_list_attachment}")

        if not content_list_attachment or not content_list_attachment.get("url"):
            logger.warning(f"论文没有content_list.json附件 - paper_id: {paper_id}")
            return bad_request_response("论文没有content_list.json附件")

        # 获取七牛云服务实例
        try:
            from ..services.qiniuService import get_qiniu_service
            qiniu_service = get_qiniu_service()
        except ImportError as e:
            logger.error(f"七牛云服务不可用 - paper_id: {paper_id}, error: {str(e)}")
            return internal_error_response(f"七牛云服务不可用: {str(e)}")

        # 从七牛云获取content_list.json文件内容
        content_url = content_list_attachment.get("url")
        logger.info(f"尝试获取content_list.json - paper_id: {paper_id}, url: {content_url}")
        
        content_result = qiniu_service.fetch_file_content(content_url)

        if not content_result["success"]:
            logger.error(f"获取content_list.json内容失败 - paper_id: {paper_id}, url: {content_url}, error: {content_result.get('error', '未知错误')}")
            return internal_error_response(f"获取content_list.json内容失败: {content_result.get('error', '未知错误')}")

        # 解析base64内容为JSON
        try:
            content_list_json = json.loads(base64.b64decode(content_result["content"]).decode('utf-8'))
            logger.info(f"成功解析content_list.json - paper_id: {paper_id}, 数据大小: {len(str(content_list_json))}")
        except Exception as e:
            logger.error(f"解析content_list.json内容失败 - paper_id: {paper_id}, error: {str(e)}")
            return internal_error_response(f"解析content_list.json内容失败: {str(e)}")

        return success_response({
            "contentList": content_list_json,
            "attachment": content_list_attachment
        }, "成功获取content_list.json内容")

    except Exception as exc:
        logger.error(f"获取content_list.json服务器错误 - paper_id: {paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<entry_id>/content-list", methods=["GET"])
@login_required
def get_user_paper_content_list(entry_id):
    """
    获取用户论文的content_list.json文件内容
    """
    try:
        logger.info(f"获取用户论文content_list - entry_id: {entry_id}, user_id: {g.current_user['user_id']}")
        
        service = get_user_paper_service()
        result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] != BusinessCode.SUCCESS:
            if result["code"] == BusinessCode.PAPER_NOT_FOUND:
                logger.warning(f"用户论文不存在 - entry_id: {entry_id}")
                return bad_request_response(result["message"])
            if result["code"] == BusinessCode.PERMISSION_DENIED:
                logger.warning(f"无权限访问用户论文 - entry_id: {entry_id}, user_id: {g.current_user['user_id']}")
                return bad_request_response(result["message"])
            logger.error(f"获取用户论文详情失败 - entry_id: {entry_id}, error: {result['message']}")
            return internal_error_response(result["message"])

        paper = result["data"]
        attachments = paper.get("attachments", {})
        content_list_attachment = attachments.get("content_list", {})
        
        logger.info(f"用户论文附件信息 - entry_id: {entry_id}, content_list_attachment: {content_list_attachment}")

        if not content_list_attachment or not content_list_attachment.get("url"):
            logger.warning(f"用户论文没有content_list.json附件 - entry_id: {entry_id}")
            return bad_request_response("论文没有content_list.json附件")

        # 获取七牛云服务实例
        try:
            from ..services.qiniuService import get_qiniu_service
            qiniu_service = get_qiniu_service()
        except ImportError as e:
            logger.error(f"七牛云服务不可用 - entry_id: {entry_id}, error: {str(e)}")
            return internal_error_response(f"七牛云服务不可用: {str(e)}")

        # 从七牛云获取content_list.json文件内容
        content_url = content_list_attachment.get("url")
        logger.info(f"尝试获取用户论文content_list.json - entry_id: {entry_id}, url: {content_url}")
        
        content_result = qiniu_service.fetch_file_content(content_url)

        if not content_result["success"]:
            logger.error(f"获取用户论文content_list.json内容失败 - entry_id: {entry_id}, url: {content_url}, error: {content_result.get('error', '未知错误')}")
            return internal_error_response(f"获取content_list.json内容失败: {content_result.get('error', '未知错误')}")

        # 解析base64内容为JSON
        try:
            content_list_json = json.loads(base64.b64decode(content_result["content"]).decode('utf-8'))
            logger.info(f"成功解析用户论文content_list.json - entry_id: {entry_id}, 数据大小: {len(str(content_list_json))}")
        except Exception as e:
            logger.error(f"解析用户论文content_list.json内容失败 - entry_id: {entry_id}, error: {str(e)}")
            return internal_error_response(f"解析content_list.json内容失败: {str(e)}")

        return success_response({
            "contentList": content_list_json,
            "attachment": content_list_attachment
        }, "成功获取content_list.json内容")

    except Exception as exc:
        logger.error(f"获取用户论文content_list.json服务器错误 - entry_id: {entry_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<user_paper_id>/markdown-content", methods=["GET"])
@login_required
def get_user_paper_markdown_content(user_paper_id):
    """
    获取用户论文的Markdown文件内容（base64格式）
    """
    try:
        logger.info(f"获取用户论文Markdown内容 - user_paper_id: {user_paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证用户论文是否存在
        service = get_user_paper_service()
        result = service.get_user_paper_detail(
            user_paper_id=user_paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        user_paper = result["data"]
        attachments = user_paper.get("attachments", {})
        markdown_attachment = attachments.get("markdown", {})
        
        if not markdown_attachment or not markdown_attachment.get("url"):
            return bad_request_response("论文没有Markdown附件")
        
        # 获取七牛云服务实例
        try:
            from ..services.qiniuService import get_qiniu_service
            qiniu_service = get_qiniu_service()
        except ImportError as e:
            return internal_error_response(f"七牛云服务不可用: {str(e)}")
        
        # 从七牛云获取Markdown文件内容
        markdown_result = qiniu_service.fetch_file_content(markdown_attachment.get("url"))
        
        if not markdown_result["success"]:
            return internal_error_response(f"获取Markdown内容失败: {markdown_result.get('error', '未知错误')}")
        
        return success_response({
            "markdownContent": markdown_result["content"],
            "attachment": markdown_attachment
        }, "成功获取Markdown内容")
    
    except Exception as exc:
        logger.error(f"获取用户论文Markdown内容异常 - user_paper_id: {user_paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/markdown-content", methods=["GET"])
@login_required
def get_admin_paper_markdown_content(paper_id):
    """
    获取管理员论文的Markdown文件内容（base64格式）
    """
    try:
        logger.info(f"获取管理员论文Markdown内容 - paper_id: {paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证管理员论文是否存在
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        paper = result["data"]
        attachments = paper.get("attachments", {})
        markdown_attachment = attachments.get("markdown", {})
        
        if not markdown_attachment or not markdown_attachment.get("url"):
            return bad_request_response("论文没有Markdown附件")
        
        # 获取七牛云服务实例
        try:
            from ..services.qiniuService import get_qiniu_service
            qiniu_service = get_qiniu_service()
        except ImportError as e:
            return internal_error_response(f"七牛云服务不可用: {str(e)}")
        
        # 从七牛云获取Markdown文件内容
        markdown_result = qiniu_service.fetch_file_content(markdown_attachment.get("url"))
        
        if not markdown_result["success"]:
            return internal_error_response(f"获取Markdown内容失败: {markdown_result.get('error', '未知错误')}")
        
        return success_response({
            "markdownContent": markdown_result["content"],
            "attachment": markdown_attachment
        }, "成功获取Markdown内容")
    
    except Exception as exc:
        logger.error(f"获取管理员论文Markdown内容异常 - paper_id: {paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")