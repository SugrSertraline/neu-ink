"""
大模型配置模块
支持多种大模型的配置和初始化
"""

import os
from typing import Dict, Any, Optional, TYPE_CHECKING
from enum import Enum
import requests

if TYPE_CHECKING:
    pass


class LLMModel(Enum):
    """支持的大模型枚举"""
    GLM_4_6 = "glm-4.6"
    GLM_4_5 = "glm-4.5"
    GLM_4_PLUS = "glm-4-plus"
    # 未来可以扩展其他模型
    # GPT_4 = "gpt-4"
    # CLAUDE_3 = "claude-3"


class LLMProvider:
    """大模型提供者基类"""
    
    def __init__(self, model: LLMModel):
        self.model = model
        self.api_key = None
        self.base_url = None
        self._setup_config()
    
    def _setup_config(self):
        """设置配置，子类需要实现"""
        raise NotImplementedError
    
    def call_api(self, messages: list, **kwargs) -> Dict[str, Any]:
        """调用API，子类需要实现"""
        raise NotImplementedError
    
    def call_api_stream(self, messages: list, **kwargs):
        """流式调用API，子类需要实现"""
        raise NotImplementedError


class GLMProvider(LLMProvider):
    """GLM模型提供者"""
    
    def _setup_config(self):
        """设置GLM配置"""
        self.api_key = os.getenv('GLM_API_KEY')
        self.base_url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    
    def _build_payload(self, messages: list, temperature: float = 0.1, 
                      max_tokens: int = 100000, stream: bool = False, **kwargs) -> Dict[str, Any]:
        """构建请求载荷"""
        return {
            "model": self.model.value,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
            **kwargs
        }
    
    def _build_headers(self) -> Dict[str, str]:
        """构建请求头"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def call_api(self, messages: list, temperature: float = 0.1, 
                max_tokens: int = 100000, **kwargs) -> Dict[str, Any]:
        """调用GLM API"""
        if not self.api_key:
            raise ValueError("未设置 GLM_API_KEY 环境变量")
        
        payload = self._build_payload(messages, temperature, max_tokens, stream=False, **kwargs)
        headers = self._build_headers()
        
        response = requests.post(
            self.base_url,
            json=payload,
            headers=headers,
            timeout=300
        )
        
        response.raise_for_status()
        return response.json()
    
    def call_api_stream(self, messages: list, temperature: float = 0.1, 
                       max_tokens: int = 100000, **kwargs):
        """流式调用GLM API"""
        if not self.api_key:
            raise ValueError("未设置 GLM_API_KEY 环境变量")
        
        payload = self._build_payload(messages, temperature, max_tokens, stream=True, **kwargs)
        headers = self._build_headers()
        
        response = requests.post(
            self.base_url,
            json=payload,
            headers=headers,
            stream=True,
            timeout=300
        )
        
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data_str = line[6:]
                    
                    if data_str.strip() == '[DONE]':
                        yield {"type": "done", "data": "[DONE]"}
                        break
                    
                    try:
                        import json
                        data = json.loads(data_str)
                        if 'choices' in data and len(data['choices']) > 0:
                            delta = data['choices'][0].get('delta', {})
                            if 'content' in delta:
                                yield {
                                    "type": "stream",
                                    "raw_data": data,
                                    "content": delta['content'],
                                    "model": data.get("model", self.model.value),
                                    "usage": data.get("usage", {})
                                }
                    except json.JSONDecodeError:
                        continue


class LLMFactory:
    """大模型工厂类"""
    
    @staticmethod
    def create_provider(model: LLMModel) -> LLMProvider:
        """创建大模型提供者"""
        if model in [LLMModel.GLM_4_6, LLMModel.GLM_4_5, LLMModel.GLM_4_PLUS]:
            return GLMProvider(model)
        else:
            raise ValueError(f"不支持的模型: {model}")