"""
大模型工具类
提供基础的大模型调用方法，不包含具体业务逻辑
支持多种大模型调用，目前集成 GLM-4.6 模型
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from .llm_config import LLMModel, LLMFactory, LLMProvider

# 设置简单的日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LLMUtils:
    """大模型工具类 - 只提供基础调用方法"""
    
    def __init__(self):
        """初始化配置"""
        self.provider = None
        self.current_model = LLMModel.GLM_4_6
    
    def _get_provider(self, model: LLMModel = None) -> 'LLMProvider':
        """获取模型提供者"""
        if model is None:
            model = self.current_model
        
        if self.provider is None or self.current_model != model:
            self.provider = LLMFactory.create_provider(model)
            self.current_model = model
        
        return self.provider
    
    def call_llm(
        self,
        messages: List[Dict[str, str]],
        model: LLMModel = LLMModel.GLM_4_6,
        temperature: float = 0.1,
        max_tokens: int = 100000,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        调用大模型接口
        
        Args:
            messages: 对话消息列表，格式：[{"role": "user", "content": "..."}]
            model: 使用的模型
            temperature: 温度参数，控制随机性
            max_tokens: 最大输出 token 数
            **kwargs: 其他模型特定参数
            
        Returns:
            模型响应结果或 None（如果出错）
        """
        try:
            provider = self._get_provider(model)
            logger.info(f"调用 {model.value} 模型，消息数量: {len(messages)}")
            return provider.call_api(messages, temperature, max_tokens, **kwargs)
        except Exception as e:
            logger.error(f"LLM调用失败: {e}")
            return None
    
    def simple_text_chat(self, user_message: str, system_message: str = "你是一个有用的AI助手。") -> Optional[str]:
        """
        简单的文本对话接口
        
        Args:
            user_message: 用户消息
            system_message: 系统消息
            
        Returns:
            模型回复内容或 None
        """
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]
        
        response = self.call_llm(messages)
        
        if response and 'choices' in response and len(response['choices']) > 0:
            return response['choices'][0]['message']['content']
        
        return None

    def _clean_json_response(self, content: str) -> str:
        """清理LLM响应，尽可能提取出纯净的JSON内容"""
        import re

        if not content:
            return ""

        content = content.strip()

        # 1. 先处理 ```json 或 ``` 包裹的情况
        if "```json" in content:
            start = content.find("```json") + len("```json")
            end = content.find("```", start)
            if end != -1:
                content = content[start:end].strip()
        elif "```" in content:
            start = content.find("```") + len("```")
            end = content.find("```", start)
            if end != -1:
                content = content[start:end].strip()

        # 到这里，content 可能还是 "说明文字 + JSON + 说明文字"

        # 2. 去掉前后多余的说明文字：
        #    - 找第一个 '[' 或 '{'
        #    - 找最后一个 ']' 或 '}'
        first_bracket = len(content)
        first_idx_list = []
        for ch in ["[", "{"]:
            idx = content.find(ch)
            if idx != -1:
                first_idx_list.append(idx)
        if first_idx_list:
            first_bracket = min(first_idx_list)
        else:
            # 根本没找到起始括号，直接返回原始（让上层报错）
            return content

        last_bracket = -1
        last_idx_list = []
        for ch in ["]", "}"]:
            idx = content.rfind(ch)
            if idx != -1:
                last_idx_list.append(idx)
        if last_idx_list:
            last_bracket = max(last_idx_list)
        else:
            return content

        content = content[first_bracket:last_bracket + 1].strip()

        # 3. 简单清理：去掉可能出现的 BOM 或奇怪的前缀
        #    有时模型会输出 'json\n[ ... ]' 之类
        if content.startswith("json"):
            content = content[4:].lstrip()

        return content

    def get_api_config(self) -> Dict[str, Any]:
        """获取API配置信息"""
        try:
            provider = self._get_provider()
            return {
                "api_endpoint": provider.base_url,
                "api_key_status": "已配置" if provider.api_key and provider.api_key != 'your_glm_api_key_here' else "未配置或为占位符",
                "model": self.current_model.value
            }
        except Exception as e:
            return {
                "api_endpoint": "获取失败",
                "api_key_status": "获取失败",
                "model": self.current_model.value,
                "error": str(e)
            }

    def _save_error_log(self, content: str, error: Exception):
        """保存错误日志"""
        import os
        import traceback
        from datetime import datetime
        
        try:
            error_dir = "error_logs"
            if not os.path.exists(error_dir):
                os.makedirs(error_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            error_file = os.path.join(error_dir, f"json_parse_error_{timestamp}.txt")
            
            with open(error_file, 'w', encoding='utf-8') as f:
                f.write(f"JSON解析错误时间: {datetime.now()}\n")
                f.write(f"错误类型: {type(error).__name__}\n")
                f.write(f"错误信息: {str(error)}\n")
                f.write("=" * 50 + "\n")
                f.write("完整响应内容:\n")
                f.write(content)
                f.write("\n" + "=" * 50 + "\n")
                f.write("完整堆栈跟踪:\n")
                f.write(traceback.format_exc())
            
            logger.info(f"错误内容已保存到: {error_file}")
        except Exception as save_error:
            logger.error(f"保存错误日志失败: {save_error}")


# 全局实例
_llm_utils: Optional[LLMUtils] = None

def get_llm_utils() -> LLMUtils:
    """获取 LLMUtils 全局实例"""
    global _llm_utils
    if _llm_utils is None:
        _llm_utils = LLMUtils()
    return _llm_utils
