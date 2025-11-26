# neuink/api/routes/parsing.py
import logging
import json
from flask import request, g, Blueprint

from neuink.services.paperService import get_paper_service
from neuink.services.userPaperService import get_user_paper_service
from neuink.services.paperReferenceService import get_paper_reference_service
from neuink.utils.auth import login_required, admin_required
from neuink.utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
    ResponseCode,
)
from neuink.config.constants import BusinessCode
from neuink.utils.llm_config import LLMModel
from neuink.utils.llm_prompts import BLOCK_TRANSLATION_SYSTEM_PROMPT, BLOCK_TRANSLATION_USER_PROMPT_TEMPLATE
from neuink.utils.llm_utils import get_llm_utils

logger = logging.getLogger(__name__)

# 创建蓝图
bp = Blueprint("parsing", __name__)


# ==================== 管理员论文解析操作 ====================

@bp.route("/admin/<paper_id>/parse-references", methods=["POST"])
@login_required
@admin_required
def parse_admin_paper_references(paper_id):
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
        reference_service = get_paper_reference_service()
        parse_result = reference_service.parse_reference_text(text)

        # parse_reference_text 直接返回包含 references, count, errors 的字典，不是包装在 data 中
        parsed_references = parse_result["references"]

        if not parsed_references and not parse_result["errors"]:
            return bad_request_response("未能从文本中解析出有效的参考文献")

        # 将解析后的参考文献添加到论文中
        from ..services.userPaperService import add_references_to_paper
        add_result = add_references_to_paper(
            service=get_paper_service(),
            user_paper_id=paper_id,
            references=parsed_references,
            user_id=g.current_user["user_id"]
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


@bp.route("/admin/<paper_id>/translate-block", methods=["POST"])
@login_required
@admin_required
def translate_admin_paper_block(paper_id):
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




# ==================== 用户论文解析操作 ====================

@bp.route("/user/<entry_id>/parse-references", methods=["POST"])
@login_required
def parse_user_paper_references(entry_id):
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

        reference_service = get_paper_reference_service()
        parse_result = reference_service.parse_reference_text(text)

        parsed_references = parse_result["references"]

        if not parsed_references and not parse_result["errors"]:
            return bad_request_response("未能从文本中解析出有效的参考文献")

        from ..services.userPaperService import add_references_to_paper
        add_result = add_references_to_paper(
            service=service,
            user_paper_id=paper_id,
            references=parsed_references,
            user_id=g.current_user["user_id"]
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


@bp.route("/user/<entry_id>/translate-block", methods=["POST"])
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