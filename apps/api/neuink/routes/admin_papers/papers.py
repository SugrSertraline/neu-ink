# neuink/api/admin_papers/papers.py
from flask import request, g

from . import bp, _parse_pagination_args, _parse_sort_args, _parse_admin_filters
from ...services.paperService import get_paper_service
from ...services.paperTranslationService import PaperTranslationService
from ...models.paper import PaperModel
from ...utils.auth import login_required, admin_required
from ...utils.common import (
    success_response,
    bad_request_response,
    validate_required_fields,
    internal_error_response,
)
from ...config.constants import BusinessCode


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
        from ...services.paperReferenceService import get_paper_reference_service

        reference_service = get_paper_reference_service()
        parse_result = reference_service.parse_reference_text(text)

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



@bp.route("/<paper_id>/translate-block", methods=["POST"])
@login_required
@admin_required
def translate_block(paper_id):
    """
    管理员翻译论文中的block
    
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
