# user_papers/papers.py
import json
import logging
from datetime import datetime

from flask import jsonify, request, g


from ...services.userPaperService import get_user_paper_service
from ...models.paper import PaperModel
from ...utils.auth import login_required
from ...utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
)
from ...config.constants import BusinessCode, ResponseCode
from . import bp

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


def _parse_pagination_args():
    """统一分页参数解析"""
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("pageSize", 20)), 100)
    return page, page_size


def _parse_sort_args():
    """统一排序参数解析"""
    sort_by = request.args.get("sortBy", "addedAt")
    sort_order = request.args.get("sortOrder", "desc")
    return sort_by, sort_order


def _parse_user_paper_filters():
    """
    个人论文库筛选参数
    """
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


@bp.route("", methods=["GET"])
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


@bp.route("", methods=["POST"])
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


@bp.route("/create-from-text", methods=["POST"])
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
        from ...services.paperService import get_paper_service

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


@bp.route("/create-from-metadata", methods=["POST"])
@login_required
def create_user_paper_from_metadata():
    """
    用户通过元数据创建个人论文
    """
    try:
        data = request.get_json()
        if not data or not data.get("metadata"):
            return bad_request_response("元数据不能为空")

        metadata = data.get("metadata")
        extra = data.get("extra", {})

        from ...utils.common import get_current_time

        # 确保abstract使用正确的格式
        abstract = metadata.get("abstract", "")
        if isinstance(abstract, str):
            abstract_data = {
                "en": abstract,
                "zh": abstract,
            }
        elif isinstance(abstract, dict):
            abstract_data = {
                "en": abstract.get("en", ""),
                "zh": abstract.get("zh", abstract.get("en", "")),
            }
        else:
            abstract_data = {"en": "", "zh": ""}

        # 构建论文数据
        paper_data = {
            "metadata": metadata,
            "abstract": abstract_data,
            "keywords": metadata.get("keywords", []),
            "sections": [],  # 不再使用sections数据，改为空数组
            "references": metadata.get("references", []),
            "attachments": {},
            "createdAt": get_current_time(),
            "updatedAt": get_current_time(),
        }

        # 直接添加到个人论文库，不经过Paper集合
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


@bp.route("/<entry_id>", methods=["GET"])
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


@bp.route("/<entry_id>/progress", methods=["PATCH"])
@login_required
def update_reading_progress(entry_id):
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


@bp.route("/<entry_id>", methods=["DELETE"])
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


@bp.route("/statistics", methods=["GET"])
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


@bp.route("/check-in-library", methods=["GET"])
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



@bp.route("/<entry_id>/parse-references", methods=["POST"])
@login_required
def parse_references_for_user_paper(entry_id):
    """
    用户解析参考文献文本并添加到个人论文中
    """
    try:
        data = request.get_json()
        if not data or not data.get("text"):
            return bad_request_response("参考文献文本不能为空")

        text = data.get("text")

        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                from flask import jsonify

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

        from ...services.paperReferenceService import get_paper_reference_service

        reference_service = get_paper_reference_service()
        parse_result = reference_service.parse_reference_text(text)

        parsed_references = parse_result["references"]

        if not parsed_references and not parse_result["errors"]:
            return bad_request_response("未能从文本中解析出有效的参考文献")

        add_result = reference_service.add_references_to_paper(
            paper_id=paper_id,
            references=parsed_references,
            user_id=g.current_user["user_id"],
            is_admin=False,
            is_user_paper=True,
        )

        if add_result["code"] == BusinessCode.SUCCESS:
            updated_paper = add_result["data"].get("paper")
            if updated_paper:
                # 不再从sections获取section_ids，因为sections字段已被移除
                # 应该从sectionIds字段获取
                section_ids = updated_paper.get("sectionIds", [])
                update_result = service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"sectionIds": section_ids},
                )

                if update_result["code"] == BusinessCode.SUCCESS:
                    response_data = add_result["data"].copy()
                    response_data["parseResult"] = {
                        "references": parse_result["references"],
                        "count": parse_result["count"],
                        "errors": parse_result["errors"],
                    }
                    return success_response(response_data, add_result["message"])
                else:
                    return internal_error_response("更新用户论文库失败")
            else:
                response_data = add_result["data"].copy()
                response_data["parseResult"] = {
                    "references": parse_result["references"],
                    "count": parse_result["count"],
                    "errors": parse_result["errors"],
                }
                return success_response(response_data, add_result["message"])
        else:
            return bad_request_response(add_result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/translate-block", methods=["POST"])
@login_required
def translate_user_paper_block(entry_id):
    """
    用户翻译个人论文中的block
    
    请求体示例:
    {
        "block": {
            "id": "block_123",
            "type": "paragraph",
            "content": {
                "en": [{"type": "text", "content": "This is a paragraph."}]
            }
        },
        "model": "glm-4.6",  // 可选，默认使用 glm-4.6
        "temperature": 0.1,  // 可选，默认 0.1
        "maxTokens": 100000  // 可选，默认 100000
    }
    
    响应示例:
    {
        "code": 200,
        "message": "翻译成功",
        "data": {
            "originalBlock": {...},
            "translatedBlock": {
                "id": "block_123",
                "type": "paragraph",
                "content": {
                    "en": [{"type": "text", "content": "This is a paragraph."}],
                    "zh": [{"type": "text", "content": "这是一个段落。"}]
                }
            },
            "model": "glm-4.6"
        }
    }
    """
    try:
        data = request.get_json()
        if not data or not data.get("block"):
            return bad_request_response("block数据不能为空")
        
        block_data = data.get("block")
        
        # 验证block类型
        supported_types = ["heading", "paragraph", "figure", "table", "ordered-list", "unordered-list", "quote"]
        if block_data.get("type") not in supported_types:
            return bad_request_response(f"不支持的block类型: {block_data.get('type')}，支持的类型: {supported_types}")
        
        # 获取模型配置参数
        model_str = data.get("model", "glm-4.6")
        temperature = float(data.get("temperature", 0.1))
        max_tokens = int(data.get("maxTokens", 100000))
        
        # 验证模型参数
        from ...utils.llm_config import LLMModel
        try:
            model = LLMModel(model_str)
        except ValueError:
            return bad_request_response(f"不支持的模型: {model_str}")
        
        # 验证温度参数范围
        if not 0 <= temperature <= 2:
            return bad_request_response("temperature 参数必须在 0-2 之间")
        
        # 验证最大token数
        if not 100 <= max_tokens <= 200000:
            return bad_request_response("maxTokens 参数必须在 100-200000 之间")
        
        # 导入翻译提示词
        from ...utils.llm_prompts import BLOCK_TRANSLATION_SYSTEM_PROMPT, BLOCK_TRANSLATION_USER_PROMPT_TEMPLATE
        from ...utils.llm_utils import get_llm_utils
        import json
        
        # 构建翻译提示词
        block_json = json.dumps(block_data, ensure_ascii=False, indent=2)
        user_message = BLOCK_TRANSLATION_USER_PROMPT_TEMPLATE.format(block_json=block_json)
        
        # 构建消息格式
        messages = [
            {"role": "system", "content": BLOCK_TRANSLATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ]
        
        # 调用LLM进行翻译
        llm_utils = get_llm_utils()
        response = llm_utils.call_llm(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            thinking={
                "type": "disabled"  # 不使用深度思考模式
            }
        )
        
        if not response or 'choices' not in response or len(response['choices']) == 0:
            return internal_error_response("翻译失败，请稍后重试")
        
        # 提取翻译结果
        translated_content = response['choices'][0]['message']['content']
        
        # 清理翻译结果，提取JSON内容
        translated_content = llm_utils._clean_json_response(translated_content)
        
        # 解析翻译后的JSON
        try:
            translated_block = json.loads(translated_content)
        except json.JSONDecodeError as e:
            return internal_error_response(f"翻译结果解析失败: {str(e)}")
        
        # 返回翻译结果
        return success_response({
            "originalBlock": block_data,
            "translatedBlock": translated_block,
            "model": model.value,
            "temperature": temperature,
            "maxTokens": max_tokens
        }, "翻译成功")
        
    except Exception as exc:
        return internal_error_response(f"翻译过程中发生错误: {str(exc)}")


@bp.route("/<entry_id>/references", methods=["PUT"])
@login_required
def update_user_paper_references(entry_id):
    """
    更新个人论文的参考文献
    支持增删改排序等所有操作
    """
    try:
        data = request.get_json()
        if not data or "references" not in data:
            return bad_request_response("参考文献数据不能为空")

        references = data.get("references", [])
        
        # 验证参考文献数据格式
        if not isinstance(references, list):
            return bad_request_response("参考文献必须是数组格式")
        
        # 验证每个参考文献的基本字段
        for i, ref in enumerate(references):
            if not isinstance(ref, dict):
                return bad_request_response(f"第{i+1}条参考文献格式错误，必须是对象")
            
            if not ref.get("id"):
                return bad_request_response(f"第{i+1}条参考文献缺少id字段")
            
            if not ref.get("title"):
                return bad_request_response(f"第{i+1}条参考文献缺少title字段")

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

        # 更新参考文献
        from ...services.paperReferenceService import get_paper_reference_service
        
        reference_service = get_paper_reference_service()
        add_result = reference_service.add_references_to_paper(
            paper_id=paper_id,
            references=references,
            user_id=g.current_user["user_id"],
            is_admin=False,
            is_user_paper=True,
        )

        if add_result["code"] == BusinessCode.SUCCESS:
            updated_paper = add_result["data"].get("paper")
            if updated_paper:
                # 不再从sections获取section_ids，因为sections字段已被移除
                # 应该从sectionIds字段获取
                section_ids = updated_paper.get("sectionIds", [])
                update_result = service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"sectionIds": section_ids},
                )

                if update_result["code"] == BusinessCode.SUCCESS:
                    response_data = {
                        "references": references,
                        "totalReferences": len(references),
                        "paper": updated_paper
                    }
                    return success_response(response_data, f"成功更新{len(references)}条参考文献")
                else:
                    return internal_error_response("更新用户论文库失败")
            else:
                response_data = {
                    "references": references,
                    "totalReferences": len(references)
                }
                return success_response(response_data, f"成功更新{len(references)}条参考文献")
        else:
            return bad_request_response(add_result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")
