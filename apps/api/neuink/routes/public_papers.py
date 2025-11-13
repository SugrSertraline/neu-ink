"""
公共论文库接口
负责未登录/普通用户看到的公开论文列表，以及阅读公开论文内容。
"""
from flask import Blueprint, request

from ..services.paperService import get_paper_service
from ..services.paperTranslationService import PaperTranslationService
from ..models.paper import PaperModel
from ..utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
)
from ..config.constants import BusinessCode

bp = Blueprint("public_papers", __name__)


def _parse_pagination_args():
    """统一分页参数解析，限制 pageSize 不超过 100。"""
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("pageSize", 20)), 100)
    return page, page_size


def _parse_sort_args():
    """统一排序字段解析，默认按 createdAt 降序。"""
    sort_by = request.args.get("sortBy", "createdAt")
    sort_order = request.args.get("sortOrder", "desc")
    return sort_by, sort_order


def _parse_public_filters():
    """
    公共论文库可选筛选项，后续可在 PaperService 中映射为 Mongo 查询。
    目前覆盖 metadata 中的常用字段。
    """
    filters = {}
    if request.args.get("articleType"):
        filters["articleType"] = request.args["articleType"]
    if request.args.get("sciQuartile"):
        filters["sciQuartile"] = request.args["sciQuartile"]
    if request.args.get("casQuartile"):
        filters["casQuartile"] = request.args["casQuartile"]
    if request.args.get("ccfRank"):
        filters["ccfRank"] = request.args["ccfRank"]
    if request.args.get("year"):
        filters["year"] = request.args.get("year", type=int)
    if request.args.get("yearFrom"):
        filters["yearFrom"] = request.args.get("yearFrom", type=int)
    if request.args.get("yearTo"):
        filters["yearTo"] = request.args.get("yearTo", type=int)
    if request.args.get("tag"):
        filters["tag"] = request.args["tag"]
    if request.args.get("author"):
        filters["author"] = request.args["author"]
    if request.args.get("publication"):
        filters["publication"] = request.args["publication"]
    if request.args.get("doi"):
        filters["doi"] = request.args["doi"]
    return filters


@bp.route("", methods=["GET"])
def list_public_papers():
    """
    公开论文列表。
    返回数据的核心在 metadata，正文内容需要通过详情接口获取。
    """
    try:
        page, page_size = _parse_pagination_args()
        sort_by, sort_order = _parse_sort_args()
        search = request.args.get("search")
        filters = _parse_public_filters()

        service = get_paper_service()
        result = service.get_public_papers(
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


@bp.route("<paper_id>", methods=["GET"])
def get_public_paper_detail(paper_id):
    """
    公开论文详情。仅当论文 isPublic=True 时提供完整信息。
    """
    try:
        service = get_paper_service()
        result = service.get_public_paper_detail(paper_id)

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/translation/check-and-complete", methods=["POST"])
def check_and_complete_translation_public(paper_id):
    """
    检查论文的翻译完整性并补全缺失的翻译（公开接口）
    
    该接口会：
    1. 检查论文各个字段的zh和en翻译是否完整
    2. 对于缺失的翻译，使用LLM自动翻译补全
    3. 更新论文数据和翻译状态
    
    注意：此接口仅对公开论文开放
    """
    try:
        paper_model = PaperModel()
        translation_service = PaperTranslationService(paper_model)
        result = translation_service.check_and_complete_translation(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/translation/status", methods=["GET"])
def get_translation_status_public(paper_id):
    """
    获取论文的翻译状态（公开接口）
    
    返回翻译状态信息，包括：
    - isComplete: 翻译是否完整
    - lastChecked: 最后检查时间
    - missingFields: 缺失的翻译字段列表
    - updatedAt: 最后更新时间
    
    注意：此接口仅对公开论文开放
    """
    try:
        paper_model = PaperModel()
        translation_service = PaperTranslationService(paper_model)
        result = translation_service.get_translation_status(paper_id)
        
        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/content", methods=["GET"])
def get_public_paper_content(paper_id):
    """
    阅读器内容接口，输出结构化正文信息。
    """
    try:
        service = get_paper_service()
        result = service.get_public_paper_content(paper_id)

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")
