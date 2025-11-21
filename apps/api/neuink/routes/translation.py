"""
快速翻译接口
提供英文到中文的翻译功能
"""
from flask import Blueprint, request, g
from ..utils.auth import login_required
from ..utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
    validate_required_fields,
)
from ..utils.llm_utils import get_llm_utils
from ..utils.llm_config import LLMModel
from ..config.constants import BusinessCode

bp = Blueprint("translation", __name__)


@bp.route("/quick", methods=["POST"])
@login_required
def quick_translation():
    """
    快速翻译接口 - 将英文翻译为中文
    
    请求体示例:
    {
        "text": "This is an English text to be translated.",
        "model": "glm-4.6",  // 可选，默认使用 glm-4.6
        "temperature": 0.1,  // 可选，默认 0.1
        "maxTokens": 100000  // 可选，默认 100000
    }
    
    响应示例:
    {
        "code": 200,
        "message": "翻译成功",
        "data": {
            "originalText": "This is an English text to be translated.",
            "translatedText": "这是一段需要翻译的英文文本。",
            "model": "glm-4.6"
        }
    }
    """
    try:
        data = request.get_json() or {}
        
        # 验证必需字段
        error_msg = validate_required_fields(data, ["text"])
        if error_msg:
            return bad_request_response(error_msg)
        
        # 获取待翻译的文本
        text_to_translate = data["text"].strip()
        
        # 检查文本长度，避免过长的文本
        if len(text_to_translate) > 10000:
            return bad_request_response("文本过长，请控制在10000字符以内")
        
        # 获取模型配置参数
        model_str = data.get("model", "glm-4.5-air")  # 默认使用 glm-4.5-air 模型
        temperature = float(data.get("temperature", 0.1))
        max_tokens = int(data.get("maxTokens", 100000))
        
        # 验证模型参数
        try:
            model = LLMModel(model_str)
        except ValueError:
            return bad_request_response(f"不支持的模型: {model_str}，支持的模型: {[m.value for m in LLMModel]}")
        
        # 验证温度参数范围
        if not 0 <= temperature <= 2:
            return bad_request_response("temperature 参数必须在 0-2 之间")
        
        # 验证最大token数
        if not 100 <= max_tokens <= 200000:
            return bad_request_response("maxTokens 参数必须在 100-200000 之间")
        
        # 构建翻译提示词
        system_message = "你是一个专业的英译中翻译助手，非常擅长翻译学术论文的内容，注意使用学术论文的表述与方式。请将用户提供的英文文本准确、自然地翻译成中文。只返回翻译结果，不要添加任何解释或额外内容。"
        user_message = f"请翻译以下英文文本：\n\n{text_to_translate}"
        
        # 构建消息格式
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]
        
        # 调用LLM进行翻译，使用 GLM-4.5-Air 模型并禁用思考模式
        llm_utils = get_llm_utils()
        response = llm_utils.call_llm(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            # 禁用思考模式的参数
            thinking={
                "type": "disabled"  # 不使用深度思考模式
            }
        )
        
        if not response or 'choices' not in response or len(response['choices']) == 0:
            return internal_error_response("翻译失败，请稍后重试")
        
        # 提取翻译结果
        translated_text = response['choices'][0]['message']['content']
        
        # 清理翻译结果，去除可能的额外内容
        translated_text = translated_text.strip()
        
        # 返回翻译结果
        return success_response({
            "originalText": text_to_translate,
            "translatedText": translated_text,
            "model": model.value,
            "temperature": temperature,
            "maxTokens": max_tokens
        }, "翻译成功")
        
    except Exception as e:
        return internal_error_response(f"翻译过程中发生错误: {str(e)}")


@bp.route("/models", methods=["GET"])
@login_required
def get_available_models():
    """
    获取可用的翻译模型列表
    
    响应示例:
    {
        "code": 200,
        "message": "获取模型列表成功",
        "data": {
            "models": [
                {
                    "value": "glm-4.6",
                    "name": "GLM-4.6",
                    "description": "最新的GLM模型，翻译质量最佳"
                },
                {
                    "value": "glm-4.5",
                    "name": "GLM-4.5",
                    "description": "高性能GLM模型，翻译速度快"
                },
                {
                    "value": "glm-4-plus",
                    "name": "GLM-4-Plus",
                    "description": "增强版GLM-4模型"
                }
            ]
        }
    }
    """
    try:
        models_info = [
            {
                "value": LLMModel.GLM_4_5_AIR.value,
                "name": "GLM-4.5-Air",
                "description": "轻量级GLM模型，翻译速度快，适合快速翻译"
            },
            {
                "value": LLMModel.GLM_4_6.value,
                "name": "GLM-4.6",
                "description": "最新的GLM模型，翻译质量最佳"
            },
            {
                "value": LLMModel.GLM_4_5.value,
                "name": "GLM-4.5",
                "description": "高性能GLM模型，翻译速度快"
            },
            {
                "value": LLMModel.GLM_4_PLUS.value,
                "name": "GLM-4-Plus",
                "description": "增强版GLM-4模型"
            }
        ]
        
        return success_response({
            "models": models_info
        }, "获取模型列表成功")
        
    except Exception as e:
        return internal_error_response(f"获取模型列表失败: {str(e)}")