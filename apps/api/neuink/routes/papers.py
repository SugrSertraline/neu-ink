# neuink/api/routes/papers.py
import logging
import json
import os
import uuid
from werkzeug.utils import secure_filename
from flask import request, g, Blueprint
from neuink.models.context import create_paper_context
from neuink.services.paperService import get_paper_service
from neuink.services.userPaperService import get_user_paper_service
from neuink.utils.auth import login_required
from neuink.utils.common import (
    success_response,
    bad_request_response,
    validate_required_fields,
    internal_error_response,
)
from neuink.config.constants import BusinessCode

# 导入七牛云服务相关模块
try:
    from ..services.qiniuService import get_qiniu_service, is_qiniu_configured
    QINIU_AVAILABLE = True
except ImportError as e:
    QINIU_AVAILABLE = False
    get_qiniu_service = None
    is_qiniu_configured = None
    print(f"警告: 七牛云服务不可用，相关功能将被禁用: {str(e)}")

logger = logging.getLogger(__name__)

# 创建蓝图
bp = Blueprint("papers", __name__)

def _parse_pagination_args():
    """统一分页参数解析"""
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("pageSize", 20)), 100)
    return page, page_size

def _parse_sort_args():
    """统一排序参数解析"""
    sort_by = request.args.get("sortBy", "createdAt")
    sort_order = request.args.get("sortOrder", "desc")
    return sort_by, sort_order

def _parse_admin_filters():
    """管理员论文库筛选参数"""
    filters = {}
    
    if request.args.get("isPublic") is not None:
        filters["isPublic"] = request.args.get("isPublic").lower() == "true"
    
    if request.args.get("createdBy"):
        filters["createdBy"] = request.args.get("createdBy")
    
    if request.args.get("parseStatus"):
        filters["parseStatus"] = request.args.get("parseStatus")
    
    if request.args.get("translationStatus"):
        filters["translationStatus"] = request.args.get("translationStatus")
    
    return filters

def _parse_user_paper_filters():
    """个人论文库筛选参数"""
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


@bp.route("/admin", methods=["GET"])
@login_required
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


@bp.route("/user", methods=["GET"])
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


@bp.route("/admin", methods=["POST"])
@login_required
def create_admin_paper():
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


@bp.route("/user", methods=["POST"])
@login_required
def add_public_paper_to_library():
    """
    将公共论文添加到个人论文库（创建副本）
    """
    try:
        payload = request.get_json() or {}
        paper_id = payload.get("paperId")

        if not paper_id:
            return bad_request_response("paperId 不能为空")

        logger.info(f"尝试添加论文到个人库: userId={g.current_user['user_id']}, paperId={paper_id}")

        service = get_user_paper_service()
        result = service.add_public_paper(
            user_id=g.current_user["user_id"],
            paper_id=paper_id,
            extra=payload.get("extra"),
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])

        # 对于论文已存在的情况，返回200状态码但在响应体中包含业务错误码
        if result["code"] == BusinessCode.INVALID_PARAMS and "该论文已在您的个人库中" in result["message"]:
            return success_response(result["data"], result["message"], BusinessCode.INVALID_PARAMS)

        logger.error(f"添加论文失败: {result['message']}, code={result['code']}")
        return bad_request_response(result["message"])

    except Exception as exc:
        logger.error(f"添加论文异常: {exc}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/create", methods=["POST"])
@login_required
def create_user_paper():
    """
    创建用户个人论文
    """
    try:
        data = request.get_json()
        required = ["metadata"]
        error_msg = validate_required_fields(data, required)
        if error_msg:
            return bad_request_response(error_msg)
        if not data.get("metadata", {}).get("title"):
            return bad_request_response("论文标题不能为空")

        service = get_user_paper_service()
        result = service.create_user_paper(data, g.current_user["user_id"])

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        return success_response(result["data"], result["message"], result["code"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/create-from-text", methods=["POST"])
@login_required
def create_admin_paper_from_text():
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


@bp.route("/user/create-from-text", methods=["POST"])
@login_required
def create_user_paper_from_text():
    """
    用户通过文本创建个人论文（使用大模型解析）
    """
    try:
        data = request.get_json()
        if not data or not data.get("text"):
            return bad_request_response("文本内容不能为空")

        text = data.get("text")
        extra = data.get("extra", {})

        # 直接解析文本，不在Paper集合中创建记录
        # 已经在文件顶部导入了get_paper_service

        paper_service = get_paper_service()

        # 仅解析文本，获取论文结构数据
        parse_result = paper_service.parse_paper_from_text(text)

        if parse_result["code"] != BusinessCode.SUCCESS:
            return internal_error_response(parse_result["message"])

        # 直接添加到个人论文库，不经过Paper集合
        paper_data = parse_result["data"]
        service = get_user_paper_service()
        result = service.add_uploaded_paper(
            user_id=g.current_user["user_id"],
            paper_data=paper_data,
            extra=extra,
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])

        return bad_request_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>", methods=["GET"])
@login_required
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


@bp.route("/user/<entry_id>", methods=["GET"])
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


@bp.route("/admin/<paper_id>", methods=["DELETE"])
@login_required
def delete_admin_paper(paper_id):
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


@bp.route("/user/<entry_id>", methods=["DELETE"])
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


@bp.route("/admin/<paper_id>/visibility", methods=["PUT"])
@login_required
def update_admin_paper_visibility(paper_id):
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


@bp.route("/user/<entry_id>/progress", methods=["PATCH"])
@login_required
def update_user_reading_progress(entry_id):
    """
    快速更新阅读进度
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
            return success_response({"success": True}, result["message"])

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])

        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])

        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/statistics", methods=["GET"])
@login_required
def get_admin_statistics():
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


@bp.route("/user/statistics", methods=["GET"])
@login_required
def get_user_statistics():
    """
    获取用户的统计信息
    """
    try:
        service = get_user_paper_service()
        result = service.get_user_statistics(user_id=g.current_user["user_id"])

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])

        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/check-in-library", methods=["GET"])
@login_required
def check_paper_in_library():
    """
    检查论文是否已在个人论文库中
    """
    try:
        paper_id = request.args.get("paperId")
        if not paper_id:
            return bad_request_response("paperId 不能为空")

        service = get_user_paper_service()
        existing = service.user_paper_model.find_by_user_and_source(
            user_id=g.current_user["user_id"],
            source_paper_id=paper_id,
        )

        if existing:
            return success_response(
                {
                    "inLibrary": True,
                    "userPaperId": existing.get("id"),
                },
                "论文已在个人库中",
            )
        else:
            return success_response(
                {
                    "inLibrary": False,
                    "userPaperId": None,
                },
                "论文不在个人库中",
            )

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<entry_id>/metadata", methods=["PUT"])
@login_required
def update_user_paper_metadata(entry_id):
    """
    更新个人论文的metadata
    
    请求体示例:
    {
        "metadata": {
            "title": "论文标题",
            "titleZh": "论文中文标题",
            "authors": [{"name": "作者名", "affiliation": "机构"}],
            "publication": "期刊名称",
            "year": 2023,
            "doi": "10.1000/182"
        }
    }
    """
    try:
        data = request.get_json()
        if not data or "metadata" not in data:
            return bad_request_response("metadata字段不能为空")
        
        metadata = data["metadata"]
        if not isinstance(metadata, dict):
            return bad_request_response("metadata必须是对象类型")
        
        service = get_user_paper_service()
        result = service.update_user_paper(
            entry_id=entry_id,
            user_id=g.current_user["user_id"],
            update_data={"metadata": metadata}
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


@bp.route("/user/<entry_id>/abstract-keywords", methods=["PUT"])
@login_required
def update_user_paper_abstract_and_keywords(entry_id):
    """
    更新个人论文的abstract和keywords
    
    请求体示例:
    {
        "abstract": {
            "en": "This is the English abstract.",
            "zh": "这是中文摘要"
        },
        "keywords": ["keyword1", "keyword2", "关键词1", "关键词2"]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return bad_request_response("更新数据不能为空")
        
        update_data = {}
        
        if "abstract" in data:
            abstract = data["abstract"]
            if not isinstance(abstract, dict):
                return bad_request_response("abstract必须是对象类型")
            update_data["abstract"] = abstract
        
        if "keywords" in data:
            keywords = data["keywords"]
            if not isinstance(keywords, list):
                return bad_request_response("keywords必须是数组类型")
            update_data["keywords"] = keywords
        
        if not update_data:
            return bad_request_response("至少需要提供abstract或keywords字段")
        
        service = get_user_paper_service()
        result = service.update_user_paper(
            entry_id=entry_id,
            user_id=g.current_user["user_id"],
            update_data=update_data
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


@bp.route("/user/<entry_id>/references", methods=["PUT"])
@login_required
def update_user_paper_references(entry_id):
    """
    更新个人论文的references
    
    请求体示例:
    {
        "references": [
            {
                "id": "1",
                "type": "article",
                "title": "Reference Title",
                "authors": ["Author1", "Author2"],
                "publication": "Journal Name",
                "year": 2023,
                "pages": "1-10"
            }
        ]
    }
    """
    try:
        data = request.get_json()
        if not data or "references" not in data:
            return bad_request_response("references字段不能为空")
        
        references = data["references"]
        if not isinstance(references, list):
            return bad_request_response("references必须是数组类型")
        
        service = get_user_paper_service()
        result = service.update_user_paper(
            entry_id=entry_id,
            user_id=g.current_user["user_id"],
            update_data={"references": references}
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


@bp.route("/admin/<paper_id>/metadata", methods=["PUT"])
@login_required
def update_admin_paper_metadata(paper_id):
    """
    更新管理员论文的metadata
    
    请求体示例:
    {
        "metadata": {
            "title": "论文标题",
            "titleZh": "论文中文标题",
            "authors": [{"name": "作者名", "affiliation": "机构"}],
            "publication": "期刊名称",
            "year": 2023,
            "doi": "10.1000/182"
        }
    }
    """
    try:
        data = request.get_json()
        if not data or "metadata" not in data:
            return bad_request_response("metadata字段不能为空")
        
        metadata = data["metadata"]
        if not isinstance(metadata, dict):
            return bad_request_response("metadata必须是对象类型")
        
        service = get_paper_service()
        result = service.update_paper(
            paper_id=paper_id,
            update_data={"metadata": metadata},
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


@bp.route("/admin/<paper_id>/abstract-keywords", methods=["PUT"])
@login_required
def update_admin_paper_abstract_and_keywords(paper_id):
    """
    更新管理员论文的abstract和keywords
    
    请求体示例:
    {
        "abstract": {
            "en": "This is the English abstract.",
            "zh": "这是中文摘要"
        },
        "keywords": ["keyword1", "keyword2", "关键词1", "关键词2"]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return bad_request_response("更新数据不能为空")
        
        update_data = {}
        
        if "abstract" in data:
            abstract = data["abstract"]
            if not isinstance(abstract, dict):
                return bad_request_response("abstract必须是对象类型")
            update_data["abstract"] = abstract
        
        if "keywords" in data:
            keywords = data["keywords"]
            if not isinstance(keywords, list):
                return bad_request_response("keywords必须是数组类型")
            update_data["keywords"] = keywords
        
        if not update_data:
            return bad_request_response("至少需要提供abstract或keywords字段")
        
        service = get_paper_service()
        result = service.update_paper(
            paper_id=paper_id,
            update_data=update_data,
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


@bp.route("/admin/<paper_id>/references", methods=["PUT"])
@login_required
def update_admin_paper_references(paper_id):
    """
    更新管理员论文的references
    
    请求体示例:
    {
        "references": [
            {
                "id": "1",
                "type": "article",
                "title": "Reference Title",
                "authors": ["Author1", "Author2"],
                "publication": "Journal Name",
                "year": 2023,
                "pages": "1-10"
            }
        ]
    }
    """
    try:
        data = request.get_json()
        if not data or "references" not in data:
            return bad_request_response("references字段不能为空")
        
        references = data["references"]
        if not isinstance(references, list):
            return bad_request_response("references必须是数组类型")
        
        service = get_paper_service()
        result = service.update_paper(
            paper_id=paper_id,
            update_data={"references": references},
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
        import base64
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
        import base64
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


@bp.route("/admin/<paper_id>/debug-attachments", methods=["GET"])
@login_required
def debug_admin_paper_attachments(paper_id):
    """
    调试管理员论文的附件信息
    """
    try:
        logger.info(f"调试管理员论文附件 - paper_id: {paper_id}, user_id: {g.current_user['user_id']}")
        
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"],
        )

        if result["code"] != BusinessCode.SUCCESS:
            return success_response({
                "error": result["message"],
                "code": result["code"]
            }, "获取论文详情失败")

        paper = result["data"]
        attachments = paper.get("attachments", {})
        
        return success_response({
            "paperId": paper_id,
            "title": paper.get("metadata", {}).get("title", "无标题"),
            "attachments": attachments,
            "hasContentList": bool(attachments.get("content_list")),
            "contentListUrl": attachments.get("content_list", {}).get("url"),
            "contentListKey": attachments.get("content_list", {}).get("key"),
        }, "成功获取论文附件信息")

    except Exception as exc:
        logger.error(f"调试管理员论文附件服务器错误 - paper_id: {paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


# ------------------------------------------------------------------
# PDF上传和解析相关路由
# ------------------------------------------------------------------

@bp.route("/user/<user_paper_id>/upload-pdf", methods=["POST"])
@login_required
def upload_user_paper_pdf(user_paper_id):
    """
    用户论文PDF上传接口
    """
    try:
        logger.info(f"用户论文PDF上传 - user_paper_id: {user_paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证文件是否存在
        if 'file' not in request.files:
            return bad_request_response("没有上传文件")
        
        file = request.files['file']
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 验证文件类型
        if not file.filename.lower().endswith('.pdf'):
            return bad_request_response("只支持PDF文件")
        
        # 获取用户论文详情
        service = get_user_paper_service()
        result = service.get_user_paper_detail(
            user_paper_id=user_paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        user_paper = result["data"]
        
        # 获取七牛云服务实例
        try:
            from ..services.qiniuService import get_qiniu_service
            qiniu_service = get_qiniu_service()
        except ImportError as e:
            return internal_error_response(f"七牛云服务不可用: {str(e)}")
        
        # 读取文件数据
        file_data = file.read()
        
        # 上传PDF到七牛云
        pdf_result = qiniu_service.upload_file_data(
            file_data=file_data,
            file_extension=".pdf",
            file_type="unified_paper",
            filename=f"{user_paper_id}.pdf",
            paper_id=user_paper_id,
            overwrite=True
        )
        
        if not pdf_result["success"]:
            return internal_error_response(f"PDF上传失败: {pdf_result['error']}")
        
        # 更新论文附件
        current_attachments = user_paper.get("attachments", {})
        updated_attachments = current_attachments.copy()
        updated_attachments["pdf"] = {
            "url": pdf_result["url"],
            "key": pdf_result["key"],
            "size": pdf_result["size"],
            "uploadedAt": pdf_result["uploadedAt"]
        }
        
        # 更新用户论文附件
        update_result = service.update_user_paper(
            entry_id=user_paper_id,
            user_id=g.current_user["user_id"],
            update_data={"attachments": updated_attachments}
        )
        
        if update_result["code"] != BusinessCode.SUCCESS:
            return internal_error_response(f"更新论文附件失败: {update_result['message']}")
        
        # 创建PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        from ..services.mineruService import get_mineru_service
        
        task_model = get_pdf_parse_task_model()
        mineru_service = get_mineru_service()
        
        # 创建解析任务
        task = task_model.create_task(
            paper_id=user_paper_id,
            user_id=g.current_user["user_id"],
            pdf_url=pdf_result["url"],
            is_admin=False,
            user_paper_id=user_paper_id
        )
        
        # 提交MinerU解析任务
        mineru_result = mineru_service.submit_parsing_task(pdf_result["url"])
        
        if mineru_result["success"]:
            # 更新任务状态
            task_model.update_task_status(
                task_id=task["id"],
                status="processing",
                message="PDF解析已提交，正在处理中...",
                mineru_task_id=mineru_result["task_id"]
            )
            
            return success_response({
                "taskId": task["id"],
                "status": "processing",
                "message": "PDF上传成功，解析已开始",
                "pdfAttachment": updated_attachments["pdf"]
            }, "PDF上传成功")
        else:
            # 如果MinerU提交失败，更新任务状态为失败
            task_model.update_task_status(
                task_id=task["id"],
                status="failed",
                message=f"提交解析任务失败: {mineru_result['error']}",
                error=mineru_result["error"]
            )
            
            return success_response({
                "taskId": task["id"],
                "status": "failed",
                "message": f"PDF上传成功，但解析失败: {mineru_result['error']}",
                "pdfAttachment": updated_attachments["pdf"]
            }, "PDF上传成功，但解析失败")
    
    except Exception as exc:
        logger.error(f"用户论文PDF上传异常 - user_paper_id: {user_paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/upload-pdf", methods=["POST"])
@login_required
def upload_admin_paper_pdf(paper_id):
    """
    管理员论文PDF上传接口
    """
    try:
        logger.info(f"管理员论文PDF上传 - paper_id: {paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证文件是否存在
        if 'file' not in request.files:
            return bad_request_response("没有上传文件")
        
        file = request.files['file']
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 验证文件类型
        if not file.filename.lower().endswith('.pdf'):
            return bad_request_response("只支持PDF文件")
        
        # 获取管理员论文详情
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        paper = result["data"]
        
        # 获取七牛云服务实例
        try:
            from ..services.qiniuService import get_qiniu_service
            qiniu_service = get_qiniu_service()
        except ImportError as e:
            return internal_error_response(f"七牛云服务不可用: {str(e)}")
        
        # 读取文件数据
        file_data = file.read()
        
        # 上传PDF到七牛云
        pdf_result = qiniu_service.upload_file_data(
            file_data=file_data,
            file_extension=".pdf",
            file_type="unified_paper",
            filename=f"{paper_id}.pdf",
            paper_id=paper_id,
            overwrite=True
        )
        
        if not pdf_result["success"]:
            return internal_error_response(f"PDF上传失败: {pdf_result['error']}")
        
        # 更新论文附件
        current_attachments = paper.get("attachments", {})
        updated_attachments = current_attachments.copy()
        updated_attachments["pdf"] = {
            "url": pdf_result["url"],
            "key": pdf_result["key"],
            "size": pdf_result["size"],
            "uploadedAt": pdf_result["uploadedAt"]
        }
        
        # 更新管理员论文附件
        update_result = service.update_paper_attachments(
            paper_id=paper_id,
            attachments=updated_attachments,
            user_id=g.current_user["user_id"],
            is_admin=True
        )
        
        if update_result["code"] != BusinessCode.SUCCESS:
            return internal_error_response(f"更新论文附件失败: {update_result['message']}")
        
        # 创建PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        from ..services.mineruService import get_mineru_service
        
        task_model = get_pdf_parse_task_model()
        mineru_service = get_mineru_service()
        
        # 创建解析任务
        task = task_model.create_task(
            paper_id=paper_id,
            user_id=g.current_user["user_id"],
            pdf_url=pdf_result["url"],
            is_admin=True
        )
        
        # 提交MinerU解析任务
        mineru_result = mineru_service.submit_parsing_task(pdf_result["url"])
        
        if mineru_result["success"]:
            # 更新任务状态
            task_model.update_task_status(
                task_id=task["id"],
                status="processing",
                message="PDF解析已提交，正在处理中...",
                mineru_task_id=mineru_result["task_id"]
            )
            
            return success_response({
                "taskId": task["id"],
                "status": "processing",
                "message": "PDF上传成功，解析已开始",
                "pdfAttachment": updated_attachments["pdf"]
            }, "PDF上传成功")
        else:
            # 如果MinerU提交失败，更新任务状态为失败
            task_model.update_task_status(
                task_id=task["id"],
                status="failed",
                message=f"提交解析任务失败: {mineru_result['error']}",
                error=mineru_result["error"]
            )
            
            return success_response({
                "taskId": task["id"],
                "status": "failed",
                "message": f"PDF上传成功，但解析失败: {mineru_result['error']}",
                "pdfAttachment": updated_attachments["pdf"]
            }, "PDF上传成功，但解析失败")
    
    except Exception as exc:
        logger.error(f"管理员论文PDF上传异常 - paper_id: {paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<user_paper_id>/pdf-parse-status", methods=["GET"])
@login_required
def get_user_paper_pdf_parse_status(user_paper_id):
    """
    获取用户论文PDF解析状态
    """
    try:
        logger.info(f"获取用户论文PDF解析状态 - user_paper_id: {user_paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证用户论文是否存在
        service = get_user_paper_service()
        result = service.get_user_paper_detail(
            user_paper_id=user_paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        # 获取PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        from ..services.mineruService import get_mineru_service
        
        task_model = get_pdf_parse_task_model()
        mineru_service = get_mineru_service()
        
        # 获取最新的解析任务
        tasks = task_model.get_paper_tasks(
            paper_id=user_paper_id,
            is_admin=False
        )
        
        if not tasks:
            return success_response({
                "hasTask": False,
                "message": "没有找到PDF解析任务"
            }, "没有找到PDF解析任务")
        
        # 获取最新的任务
        latest_task = tasks[0]
        
        # 如果任务状态是processing，查询MinerU状态
        if latest_task["status"] == "processing" and latest_task.get("mineruTaskId"):
            mineru_status = mineru_service.get_parsing_status(latest_task["mineruTaskId"])
            
            if mineru_status["success"]:
                # 更新任务状态
                task_model.update_task_status(
                    task_id=latest_task["id"],
                    status=mineru_status["status"],
                    progress=mineru_status.get("progress", 0),
                    message=mineru_status.get("message", "")
                )
                
                latest_task["status"] = mineru_status["status"]
                latest_task["progress"] = mineru_status.get("progress", 0)
                latest_task["message"] = mineru_status.get("message", "")
                
                # 如果MinerU解析完成，启动后台任务处理结果
                if mineru_status["status"] == "completed" and mineru_status.get("full_zip_url"):
                    from ..utils.background_tasks import get_task_manager
                    
                    task_manager = get_task_manager()
                    
                    # 定义后台处理任务
                    def process_mineru_result():
                        try:
                            # 获取七牛云服务实例
                            from ..services.qiniuService import get_qiniu_service
                            qiniu_service = get_qiniu_service()
                            
                            # 下载并处理MinerU结果
                            result = mineru_service.fetch_markdown_content_and_upload(
                                result_url=mineru_status["full_zip_url"],
                                paper_id=user_paper_id,
                                qiniu_service=qiniu_service
                            )
                            
                            if result["success"]:
                                # 更新论文附件
                                new_attachments = result["data"]["attachments"]
                                
                                # 获取当前论文附件
                                paper_result = service.get_user_paper_detail(
                                    user_paper_id=user_paper_id,
                                    user_id=g.current_user["user_id"]
                                )
                                
                                if paper_result["code"] == BusinessCode.SUCCESS:
                                    paper = paper_result["data"]
                                    current_attachments = paper.get("attachments", {})
                                    
                                    # 合并附件信息 - 确保正确更新每个附件类型
                                    for attachment_type, attachment_data in new_attachments.items():
                                        if attachment_data:  # 只更新非空的附件
                                            current_attachments[attachment_type] = attachment_data
                                    
                                    # 更新论文附件
                                    service.update_user_paper(
                                        entry_id=user_paper_id,
                                        user_id=g.current_user["user_id"],
                                        update_data={"attachments": current_attachments}
                                    )
                                    
                                    # 更新任务状态为完成
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="completed",
                                        progress=100,
                                        message="PDF解析完成，结果已上传"
                                    )
                                else:
                                    # 更新任务状态为失败
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="更新论文附件失败"
                                    )
                            else:
                                # 更新任务状态为失败
                                task_model.update_task_status(
                                    task_id=latest_task["id"],
                                    status="failed",
                                    message=f"处理解析结果失败: {result['error']}",
                                    error=result["error"]
                                )
                        except Exception as e:
                            logger.error(f"处理MinerU结果异常: {str(e)}", exc_info=True)
                            # 更新任务状态为失败
                            task_model.update_task_status(
                                task_id=latest_task["id"],
                                status="failed",
                                message=f"处理解析结果异常: {str(e)}",
                                error=str(e)
                            )
                    
                    # 提交后台任务
                    task_manager.submit_task(
                        task_id=f"process_mineru_{latest_task['id']}",
                        func=process_mineru_result,
                        callback=lambda task_id, result: None
                    )
        
        return success_response({
            "hasTask": True,
            "task": latest_task
        }, "获取PDF解析状态成功")
    
    except Exception as exc:
        logger.error(f"获取用户论文PDF解析状态异常 - user_paper_id: {user_paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/pdf-parse-status", methods=["GET"])
@login_required
def get_admin_paper_pdf_parse_status(paper_id):
    """
    获取管理员论文PDF解析状态
    """
    try:
        logger.info(f"获取管理员论文PDF解析状态 - paper_id: {paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证管理员论文是否存在
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        # 获取PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        from ..services.mineruService import get_mineru_service
        
        task_model = get_pdf_parse_task_model()
        mineru_service = get_mineru_service()
        
        # 获取最新的解析任务
        tasks = task_model.get_paper_tasks(
            paper_id=paper_id,
            is_admin=True
        )
        
        if not tasks:
            return success_response({
                "hasTask": False,
                "message": "没有找到PDF解析任务"
            }, "没有找到PDF解析任务")
        
        # 获取最新的任务
        latest_task = tasks[0]
        
        # 如果任务状态是processing，查询MinerU状态
        if latest_task["status"] == "processing" and latest_task.get("mineruTaskId"):
            mineru_status = mineru_service.get_parsing_status(latest_task["mineruTaskId"])
            
            if mineru_status["success"]:
                # 更新任务状态
                task_model.update_task_status(
                    task_id=latest_task["id"],
                    status=mineru_status["status"],
                    progress=mineru_status.get("progress", 0),
                    message=mineru_status.get("message", "")
                )
                
                latest_task["status"] = mineru_status["status"]
                latest_task["progress"] = mineru_status.get("progress", 0)
                latest_task["message"] = mineru_status.get("message", "")
                
                # 如果MinerU解析完成，启动后台任务处理结果
                if mineru_status["status"] == "completed" and mineru_status.get("full_zip_url"):
                    from ..utils.background_tasks import get_task_manager
                    
                    task_manager = get_task_manager()
                    
                    # 定义后台处理任务
                    def process_mineru_result():
                        try:
                            # 获取七牛云服务实例
                            from ..services.qiniuService import get_qiniu_service
                            qiniu_service = get_qiniu_service()
                            
                            # 下载并处理MinerU结果
                            result = mineru_service.fetch_markdown_content_and_upload(
                                result_url=mineru_status["full_zip_url"],
                                paper_id=paper_id,
                                qiniu_service=qiniu_service
                            )
                            
                            if result["success"]:
                                # 更新论文附件
                                new_attachments = result["data"]["attachments"]
                                
                                # 获取当前论文附件
                                paper_result = service.get_admin_paper_detail(
                                    paper_id=paper_id,
                                    user_id=g.current_user["user_id"]
                                )
                                
                                if paper_result["code"] == BusinessCode.SUCCESS:
                                    paper = paper_result["data"]
                                    current_attachments = paper.get("attachments", {})
                                    
                                    # 合并附件信息 - 确保正确更新每个附件类型
                                    for attachment_type, attachment_data in new_attachments.items():
                                        if attachment_data:  # 只更新非空的附件
                                            current_attachments[attachment_type] = attachment_data
                                    
                                    # 更新论文附件
                                    service.update_paper_attachments(
                                        paper_id=paper_id,
                                        attachments=current_attachments,
                                        user_id=g.current_user["user_id"],
                                        is_admin=True
                                    )
                                    
                                    # 更新任务状态为完成
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="completed",
                                        progress=100,
                                        message="PDF解析完成，结果已上传"
                                    )
                                else:
                                    # 更新任务状态为失败
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="更新论文附件失败"
                                    )
                            else:
                                # 更新任务状态为失败
                                task_model.update_task_status(
                                    task_id=latest_task["id"],
                                    status="failed",
                                    message=f"处理解析结果失败: {result['error']}",
                                    error=result["error"]
                                )
                        except Exception as e:
                            logger.error(f"处理MinerU结果异常: {str(e)}", exc_info=True)
                            # 更新任务状态为失败
                            task_model.update_task_status(
                                task_id=latest_task["id"],
                                status="failed",
                                message=f"处理解析结果异常: {str(e)}",
                                error=str(e)
                            )
                    
                    # 提交后台任务
                    task_manager.submit_task(
                        task_id=f"process_mineru_{latest_task['id']}",
                        func=process_mineru_result,
                        callback=lambda task_id, result: None
                    )
        
        return success_response({
            "hasTask": True,
            "task": latest_task
        }, "获取PDF解析状态成功")
    
    except Exception as exc:
        logger.error(f"获取管理员论文PDF解析状态异常 - paper_id: {paper_id}, error: {str(exc)}", exc_info=True)
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


@bp.route("/user/<user_paper_id>/pdf-parse-tasks", methods=["GET"])
@login_required
def get_user_paper_pdf_parse_tasks(user_paper_id):
    """
    获取用户论文PDF解析任务列表
    """
    try:
        logger.info(f"获取用户论文PDF解析任务列表 - user_paper_id: {user_paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证用户论文是否存在
        service = get_user_paper_service()
        result = service.get_user_paper_detail(
            user_paper_id=user_paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        # 获取PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        task_model = get_pdf_parse_task_model()
        
        tasks = task_model.get_paper_tasks(
            paper_id=user_paper_id,
            is_admin=False
        )
        
        return success_response({
            "tasks": tasks
        }, "获取PDF解析任务列表成功")
    
    except Exception as exc:
        logger.error(f"获取用户论文PDF解析任务列表异常 - user_paper_id: {user_paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/pdf-parse-tasks", methods=["GET"])
@login_required
def get_admin_paper_pdf_parse_tasks(paper_id):
    """
    获取管理员论文PDF解析任务列表
    """
    try:
        logger.info(f"获取管理员论文PDF解析任务列表 - paper_id: {paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证管理员论文是否存在
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        # 获取PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        task_model = get_pdf_parse_task_model()
        
        tasks = task_model.get_paper_tasks(
            paper_id=paper_id,
            is_admin=True
        )
        
        return success_response({
            "tasks": tasks
        }, "获取PDF解析任务列表成功")
    
    except Exception as exc:
        logger.error(f"获取管理员论文PDF解析任务列表异常 - paper_id: {paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


# ------------------------------------------------------------------
# 文件上传相关路由（从upload.py迁移）
# ------------------------------------------------------------------

def allowed_file(filename, allowed_extensions=None):
    """
    检查文件扩展名是否允许
    
    Args:
        filename: 文件名
        allowed_extensions: 允许的扩展名列表，默认为图片格式
        
    Returns:
        是否允许上传
    """
    if allowed_extensions is None:
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}
    
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions


@bp.route("/upload/image", methods=["POST"])
@login_required
def upload_image():
    """
    上传图片到七牛云
    
    请求格式: multipart/form-data
    参数:
        file: 图片文件
        
    返回示例:
        {
            "code": 0,
            "message": "上传成功",
            "data": {
                "url": "https://your-domain.com/papers/images/12345678_abc123.jpg",
                "key": "papers/images/12345678_abc123.jpg",
                "size": 102400,
                "contentType": "image/jpeg",
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    """
    try:
        # 检查七牛云服务是否可用
        if not QINIU_AVAILABLE:
            return bad_request_response("七牛云服务不可用，请检查安装和配置")
        
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 检查文件类型是否允许
        if not allowed_file(file.filename):
            return bad_request_response("不支持的文件类型，仅支持: png, jpg, jpeg, gif, webp")
        
        # 获取文件扩展名
        filename = secure_filename(file.filename)
        file_extension = os.path.splitext(filename)[1].lower()
        
        # 读取文件数据
        file_data = file.read()
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 验证文件
        is_valid, error_message = qiniu_service.validate_file(file_data, file_extension)
        if not is_valid:
            return bad_request_response(error_message)
        
        # 上传文件到七牛云，使用图片路径前缀
        upload_result = qiniu_service.upload_file_data(file_data, file_extension, file_type="image")
        
        if upload_result["success"]:
            return success_response(upload_result, "图片上传成功")
        else:
            error_msg = f"图片上传失败: {upload_result['error']}"
            return internal_error_response(error_msg)
             
    except Exception as exc:
        import traceback
        error_msg = f"服务器错误: {exc}"
        return internal_error_response(error_msg)


@bp.route("/upload/pdf", methods=["POST"])
@login_required
def upload_pdf():
    """
    上传PDF文件到七牛云
    
    请求格式: multipart/form-data
    参数:
        file: PDF文件
        
    返回示例:
        {
            "code": 0,
            "message": "上传成功",
            "data": {
                "url": "https://your-domain.com/neuink/pdf/12345678_abc123.pdf",
                "key": "neuink/pdf/12345678_abc123.pdf",
                "size": 1024000,
                "contentType": "application/pdf",
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    """
    try:
        # 检查七牛云服务是否可用
        if not QINIU_AVAILABLE:
            return bad_request_response("七牛云服务不可用，请检查安装和配置")
        
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 检查文件类型是否允许
        allowed_extensions = {'pdf'}
        if not allowed_file(file.filename, allowed_extensions):
            return bad_request_response(f"不支持的文件类型，仅支持: {', '.join(allowed_extensions)}")
        
        # 获取文件扩展名
        filename = secure_filename(file.filename)
        file_extension = os.path.splitext(filename)[1].lower()
        
        # 读取文件数据
        file_data = file.read()
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 验证文件
        is_valid, error_message = qiniu_service.validate_file(file_data, file_extension)
        if not is_valid:
            return bad_request_response(error_message)
        
        # 上传文件到七牛云，使用PDF路径前缀
        upload_result = qiniu_service.upload_file_data(file_data, file_extension, file_type="pdf")
        
        if upload_result["success"]:
            return success_response(upload_result, "PDF文件上传成功")
        else:
            return internal_error_response(f"PDF文件上传失败: {upload_result['error']}")
            
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/upload/document", methods=["POST"])
@login_required
def upload_document():
    """
    上传文档到七牛云（除PDF和Markdown外的其他文档类型）
    
    请求格式: multipart/form-data
    参数:
        file: 文档文件
        
    返回示例:
        {
            "code": 0,
            "message": "上传成功",
            "data": {
                "url": "https://your-domain.com/neuink/document/12345678_abc123.docx",
                "key": "neuink/document/12345678_abc123.docx",
                "size": 1024000,
                "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    """
    try:
        # 检查七牛云服务是否可用
        if not QINIU_AVAILABLE:
            return bad_request_response("七牛云服务不可用，请检查安装和配置")
        
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 检查文件类型是否允许（排除PDF和Markdown，因为它们有专门的接口）
        allowed_extensions = {'doc', 'docx', 'ppt', 'pptx', 'txt'}
        if not allowed_file(file.filename, allowed_extensions):
            return bad_request_response(f"不支持的文件类型，仅支持: {', '.join(allowed_extensions)}")
        
        # 获取文件扩展名
        filename = secure_filename(file.filename)
        file_extension = os.path.splitext(filename)[1].lower()
        
        # 读取文件数据
        file_data = file.read()
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 验证文件
        is_valid, error_message = qiniu_service.validate_file(file_data, file_extension)
        if not is_valid:
            return bad_request_response(error_message)
        
        # 上传文件到七牛云，使用文档路径前缀
        upload_result = qiniu_service.upload_file_data(file_data, file_extension, file_type="document")
        
        if upload_result["success"]:
            return success_response(upload_result, "文档上传成功")
        else:
            return internal_error_response(f"文档上传失败: {upload_result['error']}")
            
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/upload/markdown", methods=["POST"])
@login_required
def upload_markdown():
    """
    上传Markdown文件到七牛云
    
    请求格式: multipart/form-data
    参数:
        file: Markdown文件
        
    返回示例:
        {
            "code": 0,
            "message": "上传成功",
            "data": {
                "url": "https://your-domain.com/neuink/markdown/12345678_abc123.md",
                "key": "neuink/markdown/12345678_abc123.md",
                "size": 102400,
                "contentType": "text/markdown",
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    """
    try:
        # 检查七牛云服务是否可用
        if not QINIU_AVAILABLE:
            return bad_request_response("七牛云服务不可用，请检查安装和配置")
        
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 检查文件类型是否允许
        allowed_extensions = {'md', 'markdown'}
        if not allowed_file(file.filename, allowed_extensions):
            return bad_request_response(f"不支持的文件类型，仅支持: {', '.join(allowed_extensions)}")
        
        # 获取文件扩展名
        filename = secure_filename(file.filename)
        file_extension = os.path.splitext(filename)[1].lower()
        
        # 读取文件数据
        file_data = file.read()
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 验证文件
        is_valid, error_message = qiniu_service.validate_file(file_data, file_extension)
        if not is_valid:
            return bad_request_response(error_message)
        
        # 上传文件到七牛云，使用Markdown路径前缀
        upload_result = qiniu_service.upload_file_data(file_data, file_extension, file_type="markdown")
        
        if upload_result["success"]:
            return success_response(upload_result, "Markdown文件上传成功")
        else:
            return internal_error_response(f"Markdown文件上传失败: {upload_result['error']}")
            
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/upload/paper-image", methods=["POST"])
@login_required
def upload_paper_image():
    """
    上传论文图片到七牛云（专门用于论文中的图片）
    
    请求格式: multipart/form-data
    参数:
        file: 图片文件
        paper_id: 论文ID（可选，用于分类存储）
        
    返回示例:
        {
            "code": 0,
            "message": "上传成功",
            "data": {
                "url": "https://your-domain.com/papers/images/paper_123/12345678_abc123.jpg",
                "key": "papers/images/paper_123/12345678_abc123.jpg",
                "size": 102400,
                "contentType": "image/jpeg",
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    """
    try:
        # 检查七牛云服务是否可用
        if not QINIU_AVAILABLE:
            return bad_request_response("七牛云服务不可用，请检查安装和配置")
        
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 检查文件类型是否允许
        if not allowed_file(file.filename):
            return bad_request_response("不支持的文件类型，仅支持: png, jpg, jpeg, gif, webp")
        
        # 获取文件扩展名
        filename = secure_filename(file.filename)
        file_extension = os.path.splitext(filename)[1].lower()
        
        # 读取文件数据
        file_data = file.read()
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 验证文件
        is_valid, error_message = qiniu_service.validate_file(file_data, file_extension)
        if not is_valid:
            return bad_request_response(error_message)
        
        # 获取论文ID（可选）
        paper_id = request.form.get('paper_id', '')
        
        # 构建存储路径前缀
        if paper_id:
            prefix = f"papers/images/{paper_id}/"
        else:
            prefix = "papers/images/"
        
        # 上传文件到七牛云，使用论文图片路径前缀
        if paper_id:
            # 如果有论文ID，使用统一目录结构
            upload_result = qiniu_service.upload_file_data(
                file_data=file_data,
                file_extension=file_extension,
                file_type="unified_paper",
                filename=f"images/{filename}",
                paper_id=paper_id
            )
        else:
            upload_result = qiniu_service.upload_file_data(file_data, file_extension, file_type="paper_image")
        
        if upload_result["success"]:
            return success_response(upload_result, "论文图片上传成功")
        else:
            return internal_error_response(f"论文图片上传失败: {upload_result['error']}")
            
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/upload/token", methods=["GET"])
@login_required
def get_upload_token():
    """
    获取七牛云上传凭证（用于前端直传）
    
    参数:
        key: 文件在七牛云中的存储路径
        expires: 凭证有效期（秒），默认3600
        
    返回示例:
        {
            "code": 0,
            "message": "获取成功",
            "data": {
                "token": "上传凭证字符串",
                "key": "文件存储路径",
                "expires": 3600,
                "domain": "https://your-domain.com"
            }
        }
    """
    try:
        # 检查七牛云服务是否可用
        if not QINIU_AVAILABLE:
            return bad_request_response("七牛云服务不可用，请检查安装和配置")
        
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 获取参数
        key = request.args.get('key')
        expires = int(request.args.get('expires', 3600))
        
        if not key:
            return bad_request_response("文件路径不能为空")
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 生成上传凭证
        token = qiniu_service.generate_upload_token(key, expires)
        
        return success_response({
            "token": token,
            "key": key,
            "expires": expires,
            "domain": f"https://{qiniu_service.domain}"
        }, "获取上传凭证成功")
        
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/upload/config", methods=["GET"])
@login_required
def get_upload_config():
    """
    获取上传配置信息
    
    返回示例:
        {
            "code": 0,
            "message": "获取成功",
            "data": {
                "maxFileSize": 10485760,
                "allowedImageTypes": ["png", "jpg", "jpeg", "gif", "webp"],
                "allowedDocumentTypes": ["pdf", "doc", "docx", "ppt", "pptx", "txt", "md"],
                "domain": "https://your-domain.com",
                "isConfigured": true
            }
        }
    """
    try:
        # 检查七牛云服务是否可用
        configured = QINIU_AVAILABLE and is_qiniu_configured()
        
        config = {
            "isConfigured": configured,
            "maxFileSize": 52428800,  # 50MB (50 * 1024 * 1024)
            "allowedImageTypes": ["png", "jpg", "jpeg", "gif", "webp"],
            "allowedPdfTypes": ["pdf"],
            "allowedDocumentTypes": ["doc", "docx", "ppt", "pptx", "txt"],
            "allowedMarkdownTypes": ["md", "markdown"],
        }
        
        if configured:
            qiniu_service = get_qiniu_service()
            config["domain"] = f"https://{qiniu_service.domain}"
        
        return success_response(config, "获取上传配置成功")
        
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")