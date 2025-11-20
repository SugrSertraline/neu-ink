"""
大模型工具类
<<<<<<< HEAD
=======
提供基础的大模型调用方法，不包含具体业务逻辑
>>>>>>> origin/main
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
<<<<<<< HEAD
    """大模型工具类"""
=======
    """大模型工具类 - 只提供基础调用方法"""
>>>>>>> origin/main
    
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
    
<<<<<<< HEAD
    def call_llm_stream(
        self,
        messages: List[Dict[str, str]],
        model: LLMModel = LLMModel.GLM_4_6,
        temperature: float = 0.1,
        max_tokens: int = 100000,
        **kwargs
    ):
        """
        调用大模型接口（流式输出）
        
        Args:
            messages: 对话消息列表，格式：[{"role": "user", "content": "..."}]
            model: 使用的模型
            temperature: 温度参数，控制随机性
            max_tokens: 最大输出 token 数
            **kwargs: 其他模型特定参数
            
        Yields:
            流式响应的每个chunk
        """
        try:
            provider = self._get_provider(model)
            logger.info(f"流式调用 {model.value} 模型，消息数量: {len(messages)}")
            for chunk in provider.call_api_stream(messages, temperature, max_tokens, **kwargs):
                yield chunk
        except Exception as e:
            logger.error(f"LLM流式调用失败: {e}")
            yield {"error": f"API调用失败: {e}"}
    
    def extract_paper_metadata(self, text: str) -> Dict[str, Any]:
        """
        仅使用 LLM 提取论文信息；任何错误都直接抛出异常，不做兜底解析。
        """
        logger.info("开始解析论文文本（严格模式：无兜底）")
        logger.info(f"文本长度: {len(text)} 字符")

        # 检查API可用性
        try:
            provider = self._get_provider()
            if not provider.api_key or provider.api_key == "your_glm_api_key_here":
                raise RuntimeError("LLM 不可用：未配置或使用了占位 GLM_API_KEY")
        except Exception as e:
            raise RuntimeError(f"LLM 不可用: {e}")

        # 只走 LLM；失败即抛错
        try:
            result = self._extract_with_llm(text)
        except Exception as e:
            raise RuntimeError(f"LLM 解析失败: {e}")

        if not result:
            raise RuntimeError("LLM 返回空结果")

        return result

    def _extract_with_llm(self, text: str) -> Optional[Dict[str, Any]]:
        """使用LLM解析文本"""
        system_prompt = """你是一个专业的学术论文解析助手。请从给定的论文文本中提取以下信息，并以JSON格式返回：

1. metadata（元数据）:
   - title: 论文标题
   - titleZh: 论文标题的中文翻译
   - authors: 作者列表，格式：[{"name": "作者姓名", "affiliation": "所属机构"}]
   - year: 发表年份
   - journal: 期刊名称
   - articleType: 文章类型（如：journal, conference, preprint）
   - doi: DOI
   - tags: 相关标签

2. abstract（摘要）:
   - zh: 中文摘要（如果有）
   - en: 英文摘要（如果有）

3. keywords（关键词）:
   - 关键词列表

请确保返回的是有效的JSON格式，如果某些信息无法从文本中提取，请设置为null或空数组。"""

        user_prompt = f"请分析以下论文文本，提取metadata, abstract和keywords：\n\n{text[:40000]}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = self.call_llm(messages, temperature=0.6)
            
            if not response or 'choices' not in response:
                logger.error("LLM 响应格式错误")
                return None
                
            content = response['choices'][0]['message']['content']
            
            # 尝试解析 JSON
            try:
                # 提取 JSON 部分（可能包含在代码块中）
                if '```json' in content:
                    json_start = content.find('```json') + 7
                    json_end = content.find('```', json_start)
                    content = content[json_start:json_end].strip()
                elif '```' in content:
                    json_start = content.find('```') + 3
                    json_end = content.find('```', json_start)
                    content = content[json_start:json_end].strip()
                
                parsed_data = json.loads(content)
                return parsed_data
                
            except json.JSONDecodeError as e:
                logger.error(f"LLM 返回的内容不是有效的JSON格式: {e}")
                logger.error(f"原始内容: {content}")
                return None
                
        except Exception as e:
            logger.error(f"提取论文元数据时出错: {e}")
            return None
    
=======
>>>>>>> origin/main
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

<<<<<<< HEAD
    def parse_text_to_blocks(self, text: str, section_context: str = "") -> List[Dict[str, Any]]:
        """
        解析文本并生成适合添加到section中的block结构
        
        Args:
            text: 需要解析的文本内容
            section_context: section的上下文信息，帮助大模型更好地理解和解析
            
        Returns:
            解析后的block列表
        """
        logger.info("开始解析文本为blocks")
        logger.info(f"文本长度: {len(text)} 字符")
        
        # 检查API可用性
        try:
            provider = self._get_provider()
            if not provider.api_key or provider.api_key == "your_glm_api_key_here":
                raise RuntimeError("LLM服务不可用：未配置GLM_API_KEY或使用了占位符值。请在.env文件中设置有效的GLM API密钥。")
        except Exception as e:
            raise RuntimeError(f"LLM服务不可用: {e}")
        
        try:
            return self._extract_blocks_with_llm(text, section_context, stream=False)
        except Exception as e:
            error_msg = f"LLM解析失败: {e}。请检查API密钥是否有效，或稍后重试。"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def parse_text_to_blocks_stream(
        self,
        text: str,
        section_context: str = ""
    ):
        """
        流式解析文本并生成适合添加到section中的block结构
        
        Args:
            text: 需要解析的文本内容
            section_context: section的上下文信息，帮助大模型更好地理解和解析
            
        Yields:
            流式解析过程中的进度信息
        """
        logger.info("开始流式解析文本为blocks")
        logger.info(f"文本长度: {len(text)} 字符")
        
        # 检查API可用性
        try:
            provider = self._get_provider()
            if not provider.api_key or provider.api_key == "your_glm_api_key_here":
                error_msg = "LLM服务不可用：未配置GLM_API_KEY或使用了占位符值。请在.env文件中设置有效的GLM API密钥。"
                yield {"type": "error", "message": error_msg}
                return
        except Exception as e:
            error_msg = f"LLM服务不可用: {e}"
            yield {"type": "error", "message": error_msg}
            return
        
        try:
            yield from self._extract_blocks_with_llm(text, section_context, stream=True)
        except Exception as e:
            error_msg = f"LLM解析失败: {e}。请检查API密钥是否有效，或稍后重试。"
            logger.error(error_msg)
            yield {"type": "error", "message": error_msg}

    def _extract_blocks_with_llm(self, text: str, section_context: str = "", stream: bool = False):
        """
        使用LLM解析Markdown格式的学术论文文本，转换为结构化的block数组
        
        Args:
            text: 要解析的Markdown文本
            section_context: 当前section的上下文信息
            stream: 是否使用流式输出
            
        Returns:
            List[Dict[str, Any]]: 解析后的block列表 (当stream=False时)
            Yields: 流式解析过程中的进度信息 (当stream=True时)
        """
        import re
        from typing import List, Dict, Any

        PARSER_SYSTEM_PROMPT = """你是一个专业的学术论文Markdown解析助手，负责将Markdown格式的论文文本转换为结构化的JSON数据。

## 核心任务
解析Markdown格式的学术论文，输出符合规范的JSON数组，每个元素代表一个内容块(block)。

## 重要要求
1. **必须同时包含中英文内容** - 每个block的content字段必须同时包含en和zh两个语言数组
2. **必须输出纯JSON数组**，以[开头，以]结尾
3. **不包含任何额外文字、注释或markdown代码块标记**
4. **所有文本内容使用InlineContent数组格式**

## Markdown识别规则

### 标题 (heading)
- 以#开头的行视为Markdown标题
- 1.为一级标题 1.1为二级标题 1.1.1为三级标题，需要设置level属性，例如1.1.1设置level为3，最多支持到六级
**level判定优先级**：如果一行标题存在数字结构前缀，必须优先根据数字结构决定 level，而不是根据 # 的数量
- 以此类推至六级标题
- 输出格式示例：
{
"type": "heading",
"level": 2,
"content": {
    "en": [{"type": "text", "content": "Introduction"}]
}
}

### 段落 (paragraph)
- 非特殊格式的连续文本行
- 空行分隔不同段落
- 输出格式示例：
{
"type": "paragraph",
"content": {
    "en": [{"type": "text", "content": "This is a paragraph."}]
}
}

### 行间公式 (math)
- 独立成行的 $$...$$ 或 \\[...\\] 格式
- **重要**：去除\\tag{...}等编号，只保留公式本体
- 空格规范化（必须执行）
- 输出格式示例：在写入 latex 字段之前，对公式字符串进行空格清理，移出不必要的空格,让显示效果更好
{
"type": "math",
"latex": "E = mc^2"
}

### 行内公式 (inline-math)
- 文本中的 $...$ 或 \\(...\\) 格式
- **必须使用latex字段，不能使用content字段**
- 输出格式示例：在写入 latex 字段之前，对公式字符串进行空格清理,移出不必要的空格,让显示效果更好
- 输出格式示例：
{"type": "inline-math", "latex": "x^2 + y^2 = z^2"}

### 有序列表 (ordered-list)
- 以 1. , 2. 等数字开头
- 输出格式示例：
{
"type": "ordered-list",
"items": [
    {"content": {"en": [{"type": "text", "content": "First item"}]}},
    {"content": {"en": [{"type": "text", "content": "Second item"}]}}
]
}

### 无序列表 (unordered-list)
- 以 - , * , + 开头
- 输出格式同有序列表，type为"unordered-list"

### 代码块 (code)
- 三个反引号包围的代码块
- 识别语言标记（如python）
- 输出格式示例：
{
"type": "code",
"language": "python",
"code": "def hello():\\n    print('Hello')"
}

### 表格 (table)
- Markdown表格格式：|列1|列2|
- HTML表格格式：<table>...</table>
- **重要：支持复杂表格结构，包括colspan（跨列）和rowspan（跨行）**
- 除此之外，表格还包含caption，caption有en和zh两个属性，在解析表格时，需要自动识别与该表格关联的标题行（caption），并填入 caption 字段。典型形式包括：
Table 1: Comparison of methods
Table 2. Performance on test set
Tab. 3: Results of ablation study
- 输出格式示例：

#### 简单表格：
{
"type": "table",
 "caption": {
    "en": [
      { "type": "text", "content": "Comparison of methods" }
    ],
    "zh": [
      { "type": "text", "content": "不同方法的对比" }
    ],
"headers": [
    {
        "cells": [
            {"content": "Column 1", "isHeader": true},
            {"content": "Column 2", "isHeader": true}
        ]
    }
],
"rows": [
    {
        "cells": [
            {"content": "Cell 1"},
            {"content": "Cell 2"}
        ]
    },
    {
        "cells": [
            {"content": "Cell 3"},
            {"content": "Cell 4"}
        ]
    }
]
}

#### 复杂表格（支持colspan和rowspan）：
{
"type": "table",
"caption": {
    "en": [
      { "type": "text", "content": "Comparison of methods" }
    ],
    "zh": [
      { "type": "text", "content": "不同方法的对比" }
    ]
"headers": [
    {
        "cells": [
            {"content": "Header 1", "colspan": 2, "rowspan": 1, "isHeader": true},
            {"content": "Header 2", "colspan": 1, "rowspan": 2, "isHeader": true}
        ]
    },
    {
        "cells": [
            {"content": "Sub-header 1", "isHeader": true}
        ]
    }
],
"rows": [
    {
        "cells": [
            {"content": "Cell 1"},
            {"content": "Cell 2"}
        ]
    }
]
}

#### 表格单元格属性说明：
- content: 单元格内容，可以是字符串或多语言对象
- colspan: 跨列数（可选，默认为1）
- rowspan: 跨行数（可选，默认为1）
- isHeader: 是否为表头单元格（表头中为true，数据行中为false）
- align: 对齐方式（可选，值为'left'/'center'/'right'）

#### HTML表格解析规则：
- 解析<table>、<tr>、<td>、<th>标签
- 识别colspan和rowspan属性
- <th>标签自动设置isHeader: true
- 如果没有<th>，请你自行判断第一行是否为表头，如果不是请你给我补充完整表头
- 支持多行表头结构

#### Markdown表格解析规则：
- 标准Markdown表格转换为简单结构
- 如果检测到复杂合并单元格，尝试转换为HTML格式再解析

### 引用 (quote)
- 以 > 开头的行
- 输出格式示例：
{
"type": "quote",
"content": {
    "en": [{"type": "text", "content": "This is a quote"}]
}
}

### 分割线 (divider)
- ---, ***, ___ 等
- 输出格式示例：
{"type": "divider"}

## 特殊处理规则

### 引用删除
**完全删除**以下内容，不要包含在输出中：
- 参考文献引用：如 [1], [2,3], [Smith et al., 2020]
- 图片引用：如 Fig. 1, Figure 2, 图1
- 表格引用：如 Table 1, Tab. 2, 表1
- 公式引用：如 Eq. (1), Equation 2, 式(1)
- 脚注标记：如 [^1], [^note]
- 交叉引用：如 see Section 2, as shown in Chapter 3

### 文本处理
混合文本和公式时，将公式识别为inline-math类型。例如：
输入："The equation $x^2 + y^2 = z^2$ represents..."
输出：[
{"type": "text", "content": "The equation "},
{"type": "inline-math", "latex": "x^2 + y^2 = z^2"},
{"type": "text", "content": " represents..."}
]

## 完整示例

输入Markdown：
## Introduction

Machine learning has revolutionized many fields. The basic equation $y = wx + b$ represents a linear model.

$$
L = \\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2 \\tag{1}
$$

Key advantages include:
- High accuracy
- Fast processing

| Method | Accuracy |
|--------|----------|
| SVM    | 95%      |
| CNN    | 98%      |

输出JSON：
[
{
    "type": "heading",
    "level": 2,
    "content": {
    "en": [{"type": "text", "content": "Introduction"}]
    }
},
{
    "type": "paragraph",
    "content": {
    "en": [
        {"type": "text", "content": "Machine learning has revolutionized many fields. The basic equation "},
        {"type": "inline-math", "latex": "y = wx + b"},
        {"type": "text", "content": " represents a linear model."}
    ]
    }
},
{
    "type": "math",
    "latex": "L = \\\\frac{1}{n}\\\\sum_{i=1}^{n}(y_i - \\\\hat{y}_i)^2"
},
{
    "type": "paragraph",
    "content": {
    "en": [{"type": "text", "content": "Key advantages include:"}]
    }
},
{
    "type": "unordered-list",
    "items": [
    {"content": {"en": [{"type": "text", "content": "High accuracy"}]}},
    {"content": {"en": [{"type": "text", "content": "Fast processing"}]}}
    ]
},
{
"type": "table",
"headers": [
    {
        "cells": [
            {"content": "Method", "isHeader": true},
            {"content": "Accuracy", "isHeader": true}
        ]
    }
],
"rows": [
    {
        "cells": [
            {"content": "SVM"},
            {"content": "95%"}
        ]
    },
    {
        "cells": [
            {"content": "CNN"},
            {"content": "98%"}
        ]
    }
]
}
]

## 重要提醒
1. **只输出JSON数组，不要任何其他内容**
2. **inline-math必须用latex字段，不能用content字段**
3. **删除所有引用标记**
4. **保持学术术语的准确性**"""

        def _parse_markdown():
            """使用LLM解析Markdown文本"""
            logger.info("开始解析Markdown文本")
            
            # 预处理：清理文本
            cleaned_text = text.strip()
            
            # 替换行内公式格式 $...$ -> \(...\)
            cleaned_text = re.sub(r'\$([^$]+)\$', r'\\(\1\\)', cleaned_text)
            
            # 替换行间公式格式 $...$ -> \\[...\\]
            cleaned_text = re.sub(r'\$\$([^$]+)\$\$', r'\\[\1\\]', cleaned_text, flags=re.DOTALL)
            
            # 限制文本长度
            if len(cleaned_text) > 30000:
                logger.warning(f"文本过长({len(cleaned_text)}字符)，截断至30000字符")
                cleaned_text = cleaned_text[:30000]
            
            user_prompt = f"""请解析以下Markdown格式的学术论文文本，输出JSON数组：

{cleaned_text}

记住：
1. 只输出JSON数组
2. 删除所有引用
3. inline-math使用latex字段
4. 去除公式编号如\\tag{{}}
5. **重要：必须同时包含中英文内容，每个block的content字段必须同时包含en和zh两个语言数组**"""

            messages = [
                {"role": "system", "content": PARSER_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ]
            
            if stream:
                # 流式处理
                full_content = ""
                last_progress_update = 0
                for chunk in self.call_llm_stream(messages, temperature=0.1, max_tokens=50000):
                    if chunk.get("type") == "stream":
                        full_content += chunk["content"]
                        
                        current_length = len(full_content)
                        if current_length - last_progress_update >= 350:
                            yield {
                                "type": "progress",
                                "stage": "parsing",
                                "message": f"正在解析...({current_length} 字符)",
                                "progress": min(20 + int(current_length / 100), 85)
                            }
                            last_progress_update = current_length
                        
                        # 传递原始流式数据，标记为glm_stream类型
                        yield {
                            "type": "glm_stream",
                            "content": chunk["content"],
                            "model": chunk.get("model", self.current_model.value),
                            "usage": chunk.get("usage", {})
                        }
                    elif "error" in chunk:
                        yield chunk
                        return
                
                # 解析完整的响应
                content = self._clean_json_response(full_content)
                try:
                    blocks = json.loads(content)
                    logger.info(f"解析完成，得到 {len(blocks)} 个blocks")
                    yield {"type": "progress", "stage": "parsing", "message": f"解析完成，得到 {len(blocks)} 个内容块", "progress": 95}
                    return blocks
                except json.JSONDecodeError as e:
                    logger.error(f"JSON解析失败: {e}")
                    yield {"type": "error", "message": f"解析失败，JSON格式错误: {e}"}
                    return None
            else:
                # 非流式处理
                response = self.call_llm(messages, temperature=0.1, max_tokens=50000)
                
                if not response or "choices" not in response:
                    raise Exception("LLM响应无效")
                
                content = response["choices"][0]["message"]["content"]
                content = self._clean_json_response(content)
                
                try:
                    return json.loads(content)
                except json.JSONDecodeError as e:
                    logger.error(f"JSON解析失败: {e}")
                    try:
                        self._save_error_log(full_content, e)
                    except Exception as log_e:
                        logger.error(f"保存流式JSON错误日志失败: {log_e}")
                    yield {"type": "error", "message": f"解析失败，JSON格式错误: {e}"}
                    return None

        def _fix_and_validate(blocks):
            """修复和验证blocks"""
            # 导入必要的工具函数
            try:
                from ..utils.common import generate_id, get_current_time
            except ImportError:
                import uuid
                from datetime import datetime
                
                def generate_id():
                    return str(uuid.uuid4())
                
                def get_current_time():
                    return datetime.now()
            
            validated_blocks = []
            
            for idx, block in enumerate(blocks):
                try:
                    if not isinstance(block, dict) or "type" not in block:
                        logger.warning(f"跳过无效block {idx}: 缺少type字段")
                        continue
                    
                    # 添加必需字段
                    if "id" not in block:
                        block["id"] = generate_id()
                    if "createdAt" not in block:
                        block["createdAt"] = get_current_time().isoformat()
                    
                    # 确保content字段格式正确
                    if "content" in block:
                        content = block["content"]
                        if isinstance(content, dict):
                            # 确保有en和zh字段
                            if "en" not in content:
                                content["en"] = []
                            if "zh" not in content:
                                content["zh"] = content.get("en", []).copy()
                            
                            # 修复inline-math字段
                            for lang in ["en", "zh"]:
                                if lang in content and isinstance(content[lang], list):
                                    for item in content[lang]:
                                        if isinstance(item, dict) and item.get("type") == "inline-math":
                                            if "content" in item and "latex" not in item:
                                                item["latex"] = item.pop("content")
                    
                    # 处理列表项
                    if block["type"] in ["ordered-list", "unordered-list"]:
                        if "items" in block and isinstance(block["items"], list):
                            for item in block["items"]:
                                if "content" in item and isinstance(item["content"], dict):
                                    if "en" not in item["content"]:
                                        item["content"]["en"] = []
                                    if "zh" not in item["content"]:
                                        item["content"]["zh"] = item["content"].get("en", []).copy()
                    
                    # 处理数学公式块
                    if block["type"] == "math":
                        if "latex" in block:
                            latex = block["latex"]
                            latex = re.sub(r'\\tag\{[^}]*\}', '', latex)
                            latex = re.sub(r'\s+', ' ', latex).strip()
                            block["latex"] = latex
                    
                    # 处理表格块 - 支持新的表格结构
                    if block["type"] == "table":
                        # 向后兼容：如果使用旧格式，转换为新格式
                        if "headers" in block and isinstance(block["headers"], list):
                            # 检查是否为旧格式（字符串数组）
                            if len(block["headers"]) > 0 and isinstance(block["headers"][0], str):
                                # 转换旧格式为新格式
                                old_headers = block["headers"]
                                block["headers"] = [
                                    {
                                        "cells": [
                                            {
                                                "content": header,
                                                "isHeader": True,
                                                "colspan": 1,
                                                "rowspan": 1
                                            } for header in old_headers
                                        ]
                                    }
                                ]
                        
                        # 处理表格行
                        if "rows" in block and isinstance(block["rows"], list):
                            # 检查是否为旧格式（二维数组）
                            if len(block["rows"]) > 0 and isinstance(block["rows"][0], list):
                                # 转换旧格式为新格式
                                old_rows = block["rows"]
                                new_rows = []
                                for row in old_rows:
                                    new_row = {
                                        "cells": []
                                    }
                                    for cell in row:
                                        if isinstance(cell, str):
                                            new_row["cells"].append({
                                                "content": cell,
                                                "colspan": 1,
                                                "rowspan": 1
                                            })
                                        elif isinstance(cell, dict):
                                            new_row["cells"].append({
                                                "content": cell,
                                                "colspan": 1,
                                                "rowspan": 1
                                            })
                                    new_rows.append(new_row)
                                block["rows"] = new_rows
                            
                            # 验证和修复新格式的表格行
                            for row in block["rows"]:
                                if "cells" in row and isinstance(row["cells"], list):
                                    for cell in row["cells"]:
                                        # 确保必要属性存在
                                        if "colspan" not in cell:
                                            cell["colspan"] = 1
                                        if "rowspan" not in cell:
                                            cell["rowspan"] = 1
                                        if "isHeader" not in cell:
                                            cell["isHeader"] = False
                                        
                                        # 处理单元格内容的多语言支持
                                        if isinstance(cell["content"], str):
                                            # 如果是字符串，转换为多语言格式
                                            cell["content"] = {
                                                "en": [{"type": "text", "content": cell["content"]}],
                                                "zh": [{"type": "text", "content": cell["content"]}]
                                            }
                    
                    validated_blocks.append(block)
                    logger.info(f"验证block {idx}: type={block['type']}")
                    
                except Exception as e:
                    logger.error(f"验证block {idx} 失败: {e}")
                    continue
            
            return validated_blocks

        # 主执行流程
        try:
            if stream:
                # 流式处理
                blocks = yield from _parse_markdown()
                if blocks is None:
                    return
                
                # 添加验证进度
                yield {"type": "progress", "stage": "validating", "message": "正在验证和修复内容块格式...", "progress": 97}
                
                validated_blocks = _fix_and_validate(blocks)
                
                # 添加最终完成进度
                yield {"type": "progress", "stage": "finalizing", "message": f"验证完成，共生成 {len(validated_blocks)} 个内容块", "progress": 99}
                
                yield {"type": "complete", "message": f"解析完成，共生成 {len(validated_blocks)} 个内容块", "blocks": validated_blocks, "progress": 100}
            else:
                # 非流式处理
                blocks = _parse_markdown()
                if not blocks:
                    raise Exception("解析失败，未得到有效blocks")
                
                validated_blocks = _fix_and_validate(blocks)
                logger.info(f"最终生成 {len(validated_blocks)} 个有效blocks")
                return validated_blocks
                
        except Exception as e:
            logger.error(f"处理失败: {e}")
            if stream:
                yield {"type": "error", "message": f"解析失败: {e}"}
            else:
                raise Exception(f"LLM解析失败: {e}")

=======
>>>>>>> origin/main
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

<<<<<<< HEAD
    def parse_text_to_blocks_and_save(
        self,
        text: str,
        paper_id: str,
        section_id: str,
        section_context: str = "",
        user_id: str = "",
        after_block_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        解析文本为blocks并直接保存到论文中
        
        Args:
            text: 需要解析的文本内容
            paper_id: 论文ID
            section_id: section ID
            section_context: section的上下文信息
            user_id: 用户ID
            after_block_id: 在指定block后插入，不传则在末尾添加
            
        Returns:
            保存结果
        """
        try:
            logger.info("开始解析文本并保存到论文")
            logger.info(f"文本长度: {len(text)} 字符")
            logger.info(f"论文ID: {paper_id}")
            logger.info(f"Section ID: {section_id}")
            
            # 首先解析文本为blocks
            parsed_blocks = self.parse_text_to_blocks(text, section_context)
            
            if not parsed_blocks:
                return {
                    "success": False,
                    "error": "文本解析失败，无法生成有效的blocks"
                }
            
            logger.info(f"成功解析生成 {len(parsed_blocks)} 个blocks")
            
            # 获取paper服务来保存
            from ..services.paperService import get_paper_service
            paper_service = get_paper_service()
            
            # 获取当前论文数据
            paper = paper_service.paper_model.find_by_id(paper_id)
            if not paper:
                return {
                    "success": False,
                    "error": f"未找到指定的论文: {paper_id}"
                }
            
            # 查找目标section
            sections = paper.get("sections", [])
            target_section = None
            section_index = -1
            
            for i, section in enumerate(sections):
                if section.get("id") == section_id:
                    target_section = section
                    section_index = i
                    break
            
            if not target_section:
                return {
                    "success": False,
                    "error": f"未找到指定的section: {section_id}"
                }
            
            # 确保section有content字段
            if "content" not in target_section:
                target_section["content"] = []
            
            # 根据after_block_id确定插入位置
            current_blocks = target_section["content"]
            insert_index = len(current_blocks)  # 默认在末尾
            
            if after_block_id:
                for i, block in enumerate(current_blocks):
                    if block.get("id") == after_block_id:
                        insert_index = i + 1  # 插入到指定block后面
                        break
            
            # 使用MongoDB的原子更新操作
            logger.info(f"在位置 {insert_index} 插入 {len(parsed_blocks)} 个blocks")
            
            # 构建更新操作
            if insert_index == len(current_blocks):
                update_operation = {
                    "$push": {
                        f"sections.{section_index}.content": {
                            "$each": parsed_blocks
                        }
                    }
                }
            else:
                update_operation = {
                    "$push": {
                        f"sections.{section_index}.content": {
                            "$each": parsed_blocks,
                            "$position": insert_index
                        }
                    }
                }
            
            # 执行原子更新
            if paper_service.paper_model.update(paper_id, update_operation):
                updated_paper = paper_service.paper_model.find_by_id(paper_id)
                return {
                    "success": True,
                    "message": f"成功向section添加了{len(parsed_blocks)}个blocks",
                    "data": {
                        "paper": updated_paper,
                        "addedBlocks": parsed_blocks,
                        "sectionId": section_id,
                        "totalBlocks": len(parsed_blocks)
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "更新论文失败"
                }
            
        except Exception as e:
            logger.error(f"解析并保存失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "success": False,
                "error": f"解析并保存失败: {str(e)}"
            }

    def parse_references(self, text: str) -> List[Dict[str, Any]]:
        """
        解析参考文献文本，返回结构化的参考文献列表
        
        Args:
            text: 参考文献文本，可能包含多条参考文献
            
        Returns:
            解析后的参考文献列表，每条参考文献包含标准字段
        """
        logger.info("开始解析参考文献")
        logger.info(f"文本长度: {len(text)} 字符")
        
        # 检查API可用性
        try:
            provider = self._get_provider()
            if not provider.api_key or provider.api_key == "your_glm_api_key_here":
                raise RuntimeError("LLM服务不可用：未配置GLM_API_KEY或使用了占位符值。请在.env文件中设置有效的GLM API密钥。")
        except Exception as e:
            raise RuntimeError(f"LLM服务不可用: {e}")
        
        try:
            return self._parse_references_with_llm(text)
        except Exception as e:
            error_msg = f"参考文献解析失败: {e}。请检查API密钥是否有效，或稍后重试。"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def _parse_references_with_llm(self, text: str) -> List[Dict[str, Any]]:
        """使用LLM解析参考文献"""
        import re
        
        # 限制文本长度以避免超出token限制
        truncated_text = text[:50000] if len(text) > 50000 else text
        logger.info(f"原始文本长度: {len(text)} 字符")
        logger.info(f"解析文本长度: {len(truncated_text)} 字符")
        if len(text) > 50000:
            logger.warning("文本被截断，前50,000字符将被解析")
        
        system_prompt = """你是一个专业的学术参考文献解析助手。请从给定的参考文献文本中解析出每一条参考文献，并以JSON格式返回。

**任务要求：**
1. 识别并分离每一条参考文献
2. 提取每条参考文献的以下信息：
- authors: 作者列表（字符串数组）
- title: 论文标题
- publication: 发表期刊/会议名称
- year: 发表年份（整数）
- volume: 卷号（如果有）
- issue: 期号（如果有）
- pages: 页码（如果有）
- doi: DOI（如果有）
- url: URL链接（如果有）
- type: 文献类型（journal/conference/preprint/book/thesis等）

**输出格式要求：**
1. 必须返回一个有效的JSON数组，每个元素代表一条参考文献
2. 如果某些字段无法提取，请设置为null或省略
3. 确保所有字符串值都经过适当的trim处理
4. 保持原始数据的准确性，不要添加或修改内容

**参考文献格式示例：**
- [1] J. Smith, "Title of paper," Journal Name, vol. 10, no. 2, pp. 123-145, 2020.
- [2] K. Johnson et al., "Another paper title," Conference Name, 2019.
- [3] L. Wang, "Book title," Publisher, 2018.

请确保返回的是有效的JSON数组格式，不要包含任何额外的解释或注释。"""

        user_prompt = f"""请解析以下参考文献文本，提取每条参考文献的详细信息：

{truncated_text}

请返回一个JSON数组，每个元素代表一条解析后的参考文献。"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            logger.info("发送参考文献解析请求到LLM...")
            response = self.call_llm(messages, temperature=0.1, max_tokens=100000)
            
            if not response or "choices" not in response:
                logger.error("LLM响应格式错误")
                raise Exception("LLM响应格式错误")
                
            content = response["choices"][0]["message"]["content"]
            logger.info(f"LLM原始响应: {content[:500]}...")
            
            # 提取JSON内容
            if "```json" in content:
                fence = "```json"
                start = content.find(fence) + len(fence)
                end = content.find("```", start)
                content = content[start:end].strip()
            elif "```" in content:
                fence = "```"
                start = content.find(fence) + len(fence)
                end = content.find("```", start)
                content = content[start:end].strip()
            
            # 清理可能的特殊字符
            content = content.strip()
            if content.startswith('json'):
                content = content[4:].strip()
            
            logger.info(f"解析JSON内容: {content[:200]}...")
            parsed_references = json.loads(content)
            
            # 确保返回的是数组
            if not isinstance(parsed_references, list):
                logger.error("LLM返回的不是数组格式")
                raise Exception("LLM返回的不是数组格式")
            
            # 为每条参考文献添加ID并验证格式
            try:
                from ..utils.common import generate_id
            except ImportError:
                import uuid
                def generate_id():
                    return str(uuid.uuid4())
            
            validated_references = []
            
            for i, ref in enumerate(parsed_references):
                if not isinstance(ref, dict):
                    logger.warning(f"跳过无效参考文献: {ref}")
                    continue
                
                # 确保有标题
                if not ref.get("title"):
                    logger.warning(f"跳过无标题参考文献: {ref}")
                    continue
                
                # 添加ID
                ref["id"] = generate_id()
                
                # 确保authors是数组
                if "authors" in ref and not isinstance(ref["authors"], list):
                    if isinstance(ref["authors"], str):
                        ref["authors"] = [author.strip() for author in ref["authors"].split(",")]
                    else:
                        ref["authors"] = [str(ref["authors"])]
                
                validated_references.append(ref)
                logger.info(f"验证参考文献 {i+1}: {ref.get('title', 'Unknown')}")
            
            logger.info(f"完成验证，生成{len(validated_references)}条有效参考文献")
            return validated_references
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析失败: {e}")
            logger.error(f"原始内容: {content}")
            self._save_error_log(content, e)
            raise Exception(f"参考文献解析失败，无法解析JSON: {e}")
        except Exception as e:
            logger.error(f"参考文献解析失败: {e}")
            raise Exception(f"参考文献解析失败: {e}")

=======
>>>>>>> origin/main

# 全局实例
_llm_utils: Optional[LLMUtils] = None

def get_llm_utils() -> LLMUtils:
    """获取 LLMUtils 全局实例"""
    global _llm_utils
    if _llm_utils is None:
        _llm_utils = LLMUtils()
<<<<<<< HEAD
    return _llm_utils
=======
    return _llm_utils
>>>>>>> origin/main
