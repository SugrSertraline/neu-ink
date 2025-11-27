# neuink/api/routes/paper_content.py
import logging
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
bp = Blueprint("paper_content", __name__)


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