# neuink/api/routes/papers.py
import logging
import json
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