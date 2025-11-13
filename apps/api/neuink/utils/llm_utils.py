"""
大模型工具类
支持多种大模型调用，目前集成 GLM-4.6 模型
"""

import os
import sys
import json
import requests
import locale
from typing import Dict, Any, Optional, List
from enum import Enum

import logging
import threading

# 配置日志系统 - 使用线程安全的配置
def setup_logger():
    """设置线程安全的日志器"""
    logger = logging.getLogger(__name__)
    
    # 避免重复添加处理器
    if logger.handlers:
        return logger
    
    logger.setLevel(logging.INFO)
    
    # 创建格式器
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    
    # 文件处理器 - 确保线程安全
    file_handler = logging.FileHandler('neuink_llm.log', encoding='utf-8')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # 控制台处理器 - 使用线程安全的处理方式
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger

# 初始化日志器
logger = setup_logger()

# 创建线程锁以确保日志输出的线程安全
_log_lock = threading.Lock()

# 安全的日志打印函数
def safe_print(*args, **kwargs):
    """安全的打印函数，避免编码错误，同时输出到日志文件和控制台"""
    global _log_lock
    # 确保_log_lock已初始化
    if _log_lock is None:
        _log_lock = threading.Lock()
    
    with _log_lock:  # 使用线程锁确保线程安全
        try:
            # 构建消息字符串
            message = ' '.join(str(arg) for arg in args)
            
            # 输出到日志文件（UTF-8编码）
            logger.info(message)
            
            # 尝试输出到控制台
            try:
                print(message, **kwargs)
            except UnicodeEncodeError:
                # Windows控制台编码错误处理
                try:
                    # 尝试使用Windows控制台兼容的编码
                    print(message.encode('gbk', errors='replace').decode('gbk'), **kwargs)
                except:
                    # 最后的兜底方案：移除非ASCII字符
                    safe_message = ''.join(char if ord(char) < 128 else '?' for char in message)
                    print(safe_message, **kwargs)
                    
        except Exception as e:
            # 如果所有方法都失败，至少记录到日志文件
            try:
                logger.error(f"safe_print failed: {e}")
            except:
                pass  # 避免递归错误

class LLMModel(Enum):
    """支持的大模型枚举"""
    GLM_4_6 = "glm-4.6"
    GLM_4_5 = "glm-4.5"
    GLM_4_PLUS = "glm-4-plus"
    # 未来可以扩展其他模型
    # GPT_4 = "gpt-4"
    # CLAUDE_3 = "claude-3"

class LLMUtils:
    """大模型工具类"""
    
    def __init__(self):
        """初始化配置"""
        self.glm_api_key = os.getenv('GLM_API_KEY')
        self.glm_base_url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
        safe_print(f"GLM API Key 状态: {'[已配置]' if self.glm_api_key and self.glm_api_key != 'your_glm_api_key_here' else '[未配置或为占位符]'}")
        safe_print(f"[API端点]: {self.glm_base_url}")
        
    def call_llm(
        self,
        messages: List[Dict[str, str]],
        model: LLMModel = LLMModel.GLM_4_6,
        temperature: float = 0.1,
        max_tokens: int = 100000,
        stream: bool = True,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        调用大模型接口
        
        Args:
            messages: 对话消息列表，格式：[{"role": "user", "content": "..."}]
            model: 使用的模型
            temperature: 温度参数，控制随机性
            max_tokens: 最大输出 token 数
            stream: 是否使用流式输出
            **kwargs: 其他模型特定参数
            
        Returns:
            模型响应结果或 None（如果出错）
        """
        if model == LLMModel.GLM_4_6:
            return self._call_glm(messages, temperature, max_tokens, stream, **kwargs)
        elif model == LLMModel.GLM_4_5:
            return self._call_glm(messages, temperature, max_tokens, stream, **kwargs)
        else:
            raise ValueError(f"不支持的模型: {model}")
    
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
        if model == LLMModel.GLM_4_6:
            yield from self._call_glm_stream(messages, temperature, max_tokens, **kwargs)
        elif model == LLMModel.GLM_4_5:
            yield from self._call_glm_stream(messages, temperature, max_tokens, **kwargs)
        else:
            raise ValueError(f"不支持的模型: {model}")
    
    def _call_glm(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        stream: bool,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        调用 GLM 模型
        
        Args:
            messages: 对话消息列表
            temperature: 温度参数
            max_tokens: 最大输出 token 数
            stream: 是否使用流式输出
            **kwargs: 其他参数
            
        Returns:
            GLM 响应结果或 None
        """
        safe_print("开始调用GLM API")
        safe_print(f"请求消息数量: {len(messages)}")
        
        if not self.glm_api_key:
            safe_print("错误：未设置 GLM_API_KEY 环境变量")
            return None
            
        # 使用更新的模型名称
        payload = {
            "model": LLMModel.GLM_4_6.value,  # 修复：使用 glm-4.6
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
            **kwargs
        }
        
        safe_print(f"模型: {payload['model']}")
        safe_print(f"温度: {payload['temperature']}")
        safe_print(f"最大Token数: {payload['max_tokens']}")
        safe_print("消息内容预览:")
        for i, msg in enumerate(messages):
            safe_print(f"  {i+1}. [{msg['role']}] {msg['content'][:100]}{'...' if len(msg['content']) > 100 else ''}")
        
        # 检查API密钥长度和格式
        if len(self.glm_api_key) < 20:
            safe_print(f"警告：API密钥长度异常 ({len(self.glm_api_key)} 字符)")
        
        headers = {
            "Authorization": f"Bearer {self.glm_api_key}",  # 显示完整密钥便于调试
            "Content-Type": "application/json"
        }
        
        try:
            safe_print("正在发送请求到GLM API...")
            safe_print(f"API端点: {self.glm_base_url}")
            
            # 详细记录请求体
            safe_print("请求体预览:")
            safe_print(f"  model: {payload['model']}")
            safe_print(f"  temperature: {payload['temperature']}")
            safe_print(f"  max_tokens: {payload['max_tokens']}")
            safe_print(f"  stream: {payload['stream']}")
            
            response = requests.post(
                self.glm_base_url,
                json=payload,
                headers=headers,
                timeout=300  # 增加到300秒超时
            )
            
            safe_print(f"响应状态码: {response.status_code}")
            safe_print(f"响应头: {dict(response.headers)}")
            
            # 如果是401错误，显示响应内容
            if response.status_code == 401:
                try:
                    error_response = response.json()
                    safe_print(f"401错误详情: {error_response}")
                except:
                    safe_print(f"401错误响应内容: {response.text[:500]}")
            
            response.raise_for_status()
            
            result = response.json()
            safe_print("GLM API调用成功")
            
            if 'choices' in result:
                safe_print(f"返回选择数量: {len(result['choices'])}")
                if result['choices']:
                    content = result['choices'][0]['message']['content']
                    safe_print(f"响应内容长度: {len(content)} 字符")
                    safe_print(f"响应内容预览: {content[:200]}{'...' if len(content) > 200 else ''}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            safe_print(f"GLM API 调用失败: {e}")
            if hasattr(e, 'response'):
                safe_print(f"请求详情: 状态码 {e.response.status_code}")
                try:
                    error_content = e.response.json()
                    safe_print(f"错误详情: {error_content}")
                except:
                    safe_print(f"错误响应: {e.response.text[:500]}")
            else:
                safe_print(f"请求详情: 无响应对象")
            return None
        except json.JSONDecodeError as e:
            safe_print(f"GLM API 响应解析失败: {e}")
            return None
    
    def _call_glm_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        **kwargs
    ):
        """
        调用 GLM 模型（流式输出）
        
        Args:
            messages: 对话消息列表
            temperature: 温度参数
            max_tokens: 最大输出 token 数
            **kwargs: 其他参数
            
        Yields:
            流式响应的每个chunk，包含GLM的原始数据
        """
        safe_print("开始调用GLM API (流式)")
        safe_print(f"请求消息数量: {len(messages)}")
        
        if not self.glm_api_key:
            safe_print("错误：未设置 GLM_API_KEY 环境变量")
            yield {"error": "未设置 GLM_API_KEY 环境变量"}
            return
            
        # 使用更新的模型名称
        payload = {
            "model": LLMModel.GLM_4_6.value,  # 修复：使用 glm-4.6
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,  # 启用流式输出
            **kwargs
        }
        
        safe_print(f"模型: {payload['model']}")
        safe_print(f"温度: {payload['temperature']}")
        safe_print(f"最大Token数: {payload['max_tokens']}")
        safe_print("消息内容预览:")
        for i, msg in enumerate(messages):
            safe_print(f"  {i+1}. [{msg['role']}] {msg['content'][:100]}{'...' if len(msg['content']) > 100 else ''}")
        
        headers = {
            "Authorization": f"Bearer {self.glm_api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            safe_print("正在发送流式请求到GLM API...")
            safe_print(f"API端点: {self.glm_base_url}")
            
            response = requests.post(
                self.glm_base_url,
                json=payload,
                headers=headers,
                stream=True,  # 启用流式响应
                timeout=300  # 增加到300秒超时
            )
            
            safe_print(f"响应状态码: {response.status_code}")
            
            if response.status_code == 401:
                try:
                    error_response = response.json()
                    safe_print(f"401错误详情: {error_response}")
                except:
                    safe_print(f"401错误响应内容: {response.text[:500]}")
            
            response.raise_for_status()
            
            # 处理流式响应，直接传递GLM的原始数据
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    if line.startswith('data: '):
                        data_str = line[6:]  # 去掉 'data: ' 前缀
                        
                        if data_str.strip() == '[DONE]':
                            yield {"type": "done", "data": "[DONE]"}
                            break
                            
                        try:
                            # 直接传递GLM的原始JSON数据
                            data = json.loads(data_str)
                            if 'choices' in data and len(data['choices']) > 0:
                                delta = data['choices'][0].get('delta', {})
                                if 'content' in delta:
                                    # 返回GLM的原始数据，包含token使用信息等
                                    yield {
                                        "type": "glm_stream",
                                        "raw_data": data,  # GLM的原始数据
                                        "content": delta['content'],
                                        "model": data.get("model", payload["model"]),
                                        "usage": data.get("usage", {})  # token使用信息
                                    }
                        except json.JSONDecodeError:
                            # 忽略无法解析的行
                            continue
                            
        except requests.exceptions.RequestException as e:
            safe_print(f"GLM API 流式调用失败: {e}")
            yield {"error": f"API调用失败: {e}"}
        except Exception as e:
            safe_print(f"GLM API 流式调用异常: {e}")
            yield {"error": f"流式调用异常: {e}"}
    
    def extract_paper_metadata(self, text: str) -> Dict[str, Any]:
        """
        仅使用 LLM 提取论文信息；任何错误都直接抛出异常，不做兜底解析。
        """
        safe_print("=" * 60)
        safe_print("开始解析论文文本（严格模式：无兜底）")
        safe_print(f"文本长度: {len(text)} 字符")
        safe_print("=" * 60)

        # 1) 必须有可用的 API Key
        if not self.glm_api_key or self.glm_api_key == "your_glm_api_key_here":
            raise RuntimeError("LLM 不可用：未配置或使用了占位 GLM_API_KEY")

        # 2) 只走 LLM；失败即抛错
        try:
            result = self._extract_with_llm(text)
        except Exception as e:
            # 透传一层，给上游/HTTP 层返回清晰的 message
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
            # 使用更保守的参数设置
            response = self.call_llm(messages, temperature=0.6)  # 使用0.6的温度，与示例一致
            
            if not response or 'choices' not in response:
                safe_print("GLM 响应格式错误")
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
                safe_print(f"GLM 返回的内容不是有效的JSON格式: {e}")
                safe_print(f"原始内容: {content}")
                return None
                
        except Exception as e:
            safe_print(f"提取论文元数据时出错: {e}")
            return None
    
    def _extract_with_simple_parsing(self, text: str) -> Dict[str, Any]:
        """简单的文本解析方法，当LLM不可用时使用"""
        import re
        
        safe_print("开始简单文本解析")
        safe_print(f"文本行数: {len(text.split(chr(10)))}")
        
        lines = text.split('\n')
        
        # 改进的标题提取逻辑
        title = "未命名论文"
        safe_print("开始提取标题 (检查前15行)")
        for i, line in enumerate(lines[:15]):  # 检查前15行
            line = line.strip()
            # 更严格的标题过滤条件
            if (len(line) > 10 and
                not line.startswith('#') and
                not line.startswith('http') and
                not any(keyword in line.lower() for keyword in ['abstract', 'introduction', 'keywords', 'doi:', 'author', 'authors', 'by', 'email', 'correspondence']) and
                # 标题通常不包含多个逗号分隔的名字
                not re.search(r'\d+[,×]?\d+[,×]?\*?[,×]?\$?\$?\{.*\}', line) and  # 过滤掉包含上标脚注的行
                # 标题通常不包含邮箱或联系方式
                not '@' in line and not '.edu' in line and not '.org' in line):
                
                title = line
                safe_print(f"提取到标题: {title} (来自第{i+1}行)")
                break
        
        # 改进的作者提取逻辑
        authors = []
        safe_print("开始提取作者信息")
        authors_found = False
        
        # 在标题附近寻找作者信息
        title_line_index = -1
        for i, line in enumerate(lines[:15]):
            if line.strip() == title:
                title_line_index = i
                break
        
        if title_line_index >= 0:
            # 检查标题后的几行
            for i in range(title_line_index + 1, min(title_line_index + 5, len(lines))):
                line = lines[i].strip()
                if line and not line.startswith('#'):
                    # 检查是否像作者行（包含多个姓名和可能的机构信息）
                    if (re.search(r'[A-Za-z][A-Za-z\s,.-]+\s[A-Za-z]', line) and
                        not 'abstract' in line.lower() and
                        not len(line) > 200):  # 作者行通常不会太长
                        
                        safe_print(f"在第{i+1}行发现作者信息: {line}")
                        
                        # 使用更精确的作者名分割
                        # 去除常见的机构信息
                        clean_line = re.sub(r'\([^)]*\)', '', line)  # 去除括号内容
                        clean_line = re.sub(r'\d+[,×]?\d+[,×]?\*?[,×]?', '', clean_line)  # 去除上标
                        
                        # 按常见分隔符分割
                        author_parts = re.split(r'[,\s]+and\s+|\s+and\s+|,\s*|;\s*|;', clean_line)
                        for part in author_parts:
                            part = part.strip()
                            # 过滤掉明显的非姓名内容
                            if (part and
                                len(part) > 2 and
                                len(part) < 50 and
                                not re.match(r'^\d+$', part) and  # 不是纯数字
                                not '@' in part and  # 不是邮箱
                                not any(keyword in part.lower() for keyword in ['university', 'institute', 'department', 'school', 'college'])):
                                authors.append({"name": part, "affiliation": ""})
                                safe_print(f"  提取作者: {part}")
                        authors_found = True
                        break
        
        # 提取年份 - 优先在特定位置查找
        year = None
        safe_print("开始提取年份")
        
        # 1. 在标题附近查找年份
        for i in range(max(0, title_line_index - 3), min(len(lines), title_line_index + 10)):
            year_match = re.search(r'\b(19|20)\d{2}\b', lines[i])
            if year_match:
                year = int(year_match.group())
                safe_print(f"提取到年份: {year} (来自第{i+1}行)")
                break
        
        # 如果上面没找到，搜索整个文本
        if not year:
            year_match = re.search(r'\b(19|20)\d{2}\b', text)
            if year_match:
                year = int(year_match.group())
                safe_print(f"提取到年份: {year} (全文搜索)")
        
        # 改进的摘要提取逻辑
        abstract_text = ""
        abstract_found = False
        safe_print("开始提取摘要")
        
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            
            # 寻找摘要开始标记
            if (('abstract' in line_lower and ':' not in line_lower) or
                ('summary' in line_lower and ':' not in line_lower) or
                ('we present' in line_lower and len(line_lower) < 100)):
                
                abstract_found = True
                safe_print(f"在第{i+1}行发现摘要开始: {line.strip()}")
                
                # 检查下一行是否开始真正的摘要内容
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line and len(next_line) > 50:  # 摘要通常比较长
                        abstract_text = next_line + " "
                        if len(abstract_text) < 300:  # 如果还不够长，继续读取
                            for j in range(i + 2, min(i + 10, len(lines))):
                                if lines[j].strip() and not lines[j].lower().startswith(('keywords', 'index terms', '1.', 'introduction')):
                                    abstract_text += lines[j] + " "
                                else:
                                    break
                        safe_print(f"摘要提取内容: {abstract_text[:200]}...")
                break
        
        # 提取DOI
        doi = None
        safe_print("开始提取DOI")
        
        # 在整个文本中搜索DOI
        doi_patterns = [
            r'doi[:\s]*(10\.\d+[^\s\n]*)',
            r'DOI[:\s]*(10\.\d+[^\s\n]*)',
            r'10\.\d+[/\w\-.,;()\s]*',
        ]
        
        for pattern in doi_patterns:
            doi_match = re.search(pattern, text, re.IGNORECASE)
            if doi_match:
                doi = doi_match.group(1) if '10.' in doi_match.group() else doi_match.group()
                # 清理DOI
                doi = re.sub(r'[.,;]+$', '', doi)  # 去除末尾的标点
                safe_print(f"提取到DOI: {doi}")
                break
        
        # 改进的关键词提取逻辑
        keywords = []
        safe_print("开始提取关键词")
        
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            
            # 寻找关键词标记
            if (('keywords' in line_lower and ':' not in line_lower) or
                ('index terms' in line_lower) or
                (line_lower.startswith('keywords') or line_lower.startswith('index terms'))):
                
                safe_print(f"在第{i+1}行发现关键词: {line.strip()}")
                
                # 提取关键词内容
                keywords_text = line
                if ':' in keywords_text:
                    keywords_text = keywords_text.split(':', 1)[1]
                
                # 清理并分割关键词
                keywords_text = re.sub(r'[—–\-]+', ',', keywords_text)  # 替换各种破折号
                kw_list = re.split(r'[,;]+', keywords_text)
                
                extracted_keywords = []
                for kw in kw_list:
                    kw = kw.strip()
                    # 过滤掉明显不是关键词的内容
                    if (kw and
                        len(kw) > 2 and
                        len(kw) < 30 and
                        not re.match(r'^\d+$', kw) and  # 不是纯数字
                        not kw.lower().startswith(('and', 'or', 'the', 'a', 'an'))):
                        extracted_keywords.append(kw)
                
                keywords.extend(extracted_keywords)
                safe_print(f"  提取关键词: {extracted_keywords}")
                break
        
        # 期刊类型推断
        article_type = "journal"
        if any(keyword in text.lower() for keyword in ['conference', 'proceedings', 'workshop']):
            article_type = "conference"
        elif any(keyword in text.lower() for keyword in ['preprint', 'arxiv']):
            article_type = "preprint"
        
        result = {
            "metadata": {
                "title": title,
                "authors": authors,
                "year": year,
                "journal": "",
                "articleType": article_type,
                "doi": doi,
                "tags": []
            },
            "abstract": {
                "zh": None,  # 简单解析不区分语言
                "en": abstract_text.strip() if abstract_text.strip() else None
            },
            "keywords": keywords[:10]  # 限制关键词数量
        }
        
        safe_print("简单文本解析完成")
        safe_print("解析结果摘要:")
        safe_print(f"  标题: {result['metadata']['title']}")
        safe_print(f"  作者数量: {len(result['metadata']['authors'])}")
        if result['metadata']['authors']:
            safe_print(f"  作者列表: {[author['name'] for author in result['metadata']['authors']]}")
        safe_print(f"  年份: {result['metadata']['year']}")
        safe_print(f"  摘要长度: {len(result['abstract']['en'] or '')} 字符")
        safe_print(f"  DOI: {result['metadata']['doi']}")
        safe_print(f"  关键词数量: {len(result['keywords'])}")
        safe_print(f"  文章类型: {result['metadata']['articleType']}")
        
        return result
    
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

    def parse_text_to_blocks(self, text: str, section_context: str = "") -> List[Dict[str, Any]]:
        """
        解析文本并生成适合添加到section中的block结构
        
        Args:
            text: 需要解析的文本内容
            section_context: section的上下文信息，帮助大模型更好地理解和解析
            
        Returns:
            解析后的block列表
        """
        safe_print("开始解析文本为blocks")
        safe_print(f"文本长度: {len(text)} 字符")
        
        if not self.glm_api_key or self.glm_api_key == "your_glm_api_key_here":
            error_msg = "LLM服务不可用：未配置GLM_API_KEY或使用了占位符值。请在.env文件中设置有效的GLM API密钥。"
            safe_print(error_msg)
            # 抛出异常而不是静默回退，让用户知道问题所在
            raise RuntimeError(error_msg)
        
        try:
            return self._extract_blocks_with_llm(text, section_context)
        except Exception as e:
            error_msg = f"LLM解析失败: {e}。请检查API密钥是否有效，或稍后重试。"
            safe_print(error_msg)
            # 抛出异常而不是静默回退，让用户知道问题所在
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
        safe_print("开始流式解析文本为blocks")
        safe_print(f"文本长度: {len(text)} 字符")
        
        if not self.glm_api_key or self.glm_api_key == "your_glm_api_key_here":
            error_msg = "LLM服务不可用：未配置GLM_API_KEY或使用了占位符值。请在.env文件中设置有效的GLM API密钥。"
            safe_print(error_msg)
            yield {"type": "error", "message": error_msg}
            return
        
        try:
            yield from self._extract_blocks_with_llm_stream(text, section_context)
        except Exception as e:
            error_msg = f"LLM解析失败: {e}。请检查API密钥是否有效，或稍后重试。"
            safe_print(error_msg)
            yield {"type": "error", "message": error_msg}

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
            safe_print("开始解析文本并保存到论文")
            safe_print(f"文本长度: {len(text)} 字符")
            safe_print(f"论文ID: {paper_id}")
            safe_print(f"Section ID: {section_id}")
            
            # 首先解析文本为blocks
            parsed_blocks = self.parse_text_to_blocks(text, section_context)
            
            if not parsed_blocks:
                return {
                    "success": False,
                    "error": "文本解析失败，无法生成有效的blocks"
                }
            
            safe_print(f"成功解析生成 {len(parsed_blocks)} 个blocks")
            
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
            
            # 使用MongoDB的原子更新操作，避免替换整个sections数组
            safe_print(f"在位置 {insert_index} 插入 {len(parsed_blocks)} 个blocks")
            
            # 构建更新操作：使用$push操作符将新blocks插入到指定位置
            if insert_index == len(current_blocks):
                # 如果在末尾添加，使用$push
                update_operation = {
                    "$push": {
                        f"sections.{section_index}.content": {
                            "$each": parsed_blocks
                        }
                    }
                }
            else:
                # 如果在中间插入，使用$push配合$position，避免替换整个数组
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
            safe_print(f"解析并保存失败: {e}")
            import traceback
            safe_print(traceback.format_exc())
            return {
                "success": False,
                "error": f"解析并保存失败: {str(e)}"
            }

    def _ensure_bilingual_inline(self,inline_items):
        """将 InlineContent 数组中缺失语言的文本复制为同内容，确保 en/zh 都有值"""
        if not isinstance(inline_items, list):
            return []
        normalized = []
        for item in inline_items:
            if isinstance(item, dict):
                normalized.append(item)
            else:
                normalized.append({"type": "text", "text": str(item)})
        return normalized

    def _fill_missing_languages(self,block):
        """在 block 的 content 中补全 en/zh，若缺失则以另一语言内容或空数组回填"""
        content = block.get("content")
        if not isinstance(content, dict):
            return block
        en = self._ensure_bilingual_inline(content.get("en"))
        zh = self._ensure_bilingual_inline(content.get("zh"))
        if not en and zh:
            en = [dict(item) for item in zh]
        if not zh and en:
            zh = [dict(item) for item in en]
        block["content"] = {"en": en, "zh": zh}
        return block

    def _extract_blocks_with_llm(self, text: str, section_context: str) -> List[Dict[str, Any]]:
        """
        使用LLM解析Markdown格式的学术论文文本，转换为结构化的block数组
        
        Args:
            text: 要解析的Markdown文本
            section_context: 当前section的上下文信息
            
        Returns:
            List[Dict[str, Any]]: 解析后的block列表
        """
        import json
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
    - # 开头的是标题 #可能有多个
    - 1.为一级标题 1.1为二级标题 1.1.1为三级标题
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
    - 输出格式示例：
    {
    "type": "math",
    "latex": "E = mc^2"
    }

    ### 行内公式 (inline-math)
    - 文本中的 $...$ 或 \\(...\\) 格式
    - **必须使用latex字段，不能使用content字段**
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
    - 输出格式示例：
    {
    "type": "table",
    "headers": ["Column 1", "Column 2"],
    "rows": [
        ["Cell 1", "Cell 2"],
        ["Cell 3", "Cell 4"]
    ]
    }

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
        "headers": ["Method", "Accuracy"],
        "rows": [
        ["SVM", "95%"],
        ["CNN", "98%"]
        ]
    }
    ]

    ## 重要提醒
    1. **只输出JSON数组，不要任何其他内容**
    2. **inline-math必须用latex字段，不能用content字段**
    3. **删除所有引用标记**
    4. **保持学术术语的准确性**"""

        # 移除单独的翻译提示词，因为现在解析和翻译合并为一次调用
        TRANSLATION_PROMPT = """你是一个专业的学术翻译专家。

    ## 任务
    将提供的JSON数组中的英文内容翻译为中文，添加到zh字段中。

    ## 翻译要求
    1. 保持学术术语的专业性和准确性
    2. 数学公式、代码、变量名等保持原样
    3. 使用规范的学术中文表达
    4. 保持原文的语义和逻辑结构

    ## 输入格式
    你会收到一个包含英文内容的JSON数组。

    ## 输出格式
    返回完整的JSON数组，其中每个包含content字段的对象都应该同时包含en和zh两个字段。

    **重要**：只输出JSON数组，不要任何额外文字。"""

        # 使用全局的safe_print函数，避免重复定义

        def _parse_markdown():
            """使用LLM解析Markdown文本"""
            safe_print("🚀 开始解析Markdown文本")
            
            # 预处理：清理文本
            cleaned_text = text.strip()
            
            # 替换行内公式格式 $...$ -> \(...\)
            cleaned_text = re.sub(r'\$([^$]+)\$', r'\\(\1\\)', cleaned_text)
            
            # 替换行间公式格式 $...$ -> \\[...\\]
            cleaned_text = re.sub(r'\$\$([^$]+)\$\$', r'\\[\1\\]', cleaned_text, flags=re.DOTALL)
            
            # 限制文本长度
            if len(cleaned_text) > 30000:
                safe_print(f"⚠️ 文本过长({len(cleaned_text)}字符)，截断至30000字符")
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
            
            safe_print("📤 发送解析请求...")
            response = self.call_llm(messages, temperature=0.1, max_tokens=50000)
            
            if not response or "choices" not in response:
                raise Exception("LLM响应无效")
            
            content = response["choices"][0]["message"]["content"]
            
            # 清理响应内容
            content = content.strip()
            if "```json" in content:
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end != -1:
                    content = content[start:end].strip()
            elif "```" in content:
                start = content.find("```") + 3
                end = content.find("```", start)
                if end != -1:
                    content = content[start:end].strip()
            
            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                safe_print(f"❌ JSON解析失败: {e}")
                safe_print(f"响应内容: {content[:500]}...")
                
                # 保存错误内容到本地文件以便调试
                import os
                import traceback
                from datetime import datetime
                
                # 尝试多个可能的目录位置
                possible_dirs = [
                    "error_logs",
                    "apps/api/error_logs",
                    "apps/api/neuink/error_logs",
                    "/tmp/error_logs" if os.name != 'nt' else "C:\\temp\\error_logs"
                ]
                
                error_dir = None
                for dir_path in possible_dirs:
                    try:
                        if not os.path.exists(dir_path):
                            os.makedirs(dir_path, exist_ok=True)
                        # 测试是否可以写入
                        test_file = os.path.join(dir_path, "test_write.tmp")
                        with open(test_file, 'w') as f:
                            f.write("test")
                        os.remove(test_file)
                        error_dir = dir_path
                        safe_print(f"✅ 使用错误日志目录: {error_dir}")
                        break
                    except Exception as dir_error:
                        safe_print(f"⚠️ 无法使用目录 {dir_path}: {dir_error}")
                        continue
                
                if not error_dir:
                    # 如果所有预设目录都不可用，尝试在当前目录创建
                    try:
                        error_dir = os.getcwd()
                        safe_print(f"⚠️ 使用当前目录作为错误日志目录: {error_dir}")
                    except Exception as cwd_error:
                        safe_print(f"❌ 无法获取当前目录: {cwd_error}")
                        error_dir = "."
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                error_file = os.path.join(error_dir, f"json_parse_error_sync_{timestamp}.txt")
                
                try:
                    with open(error_file, 'w', encoding='utf-8') as f:
                        f.write(f"JSON解析错误时间: {datetime.now()}\n")
                        f.write(f"错误类型: {type(e).__name__}\n")
                        f.write(f"错误信息: {str(e)}\n")
                        f.write(f"错误位置: line {e.lineno}, column {e.colno}, character {e.pos}\n")
                        f.write(f"错误详情: {e.msg if hasattr(e, 'msg') else '无详细信息'}\n")
                        f.write("=" * 50 + "\n")
                        f.write("完整响应内容:\n")
                        f.write(content)
                        f.write("\n" + "=" * 50 + "\n")
                        f.write(f"响应内容长度: {len(content)} 字符\n")
                        f.write(f"前500字符预览: {content[:500]}\n")
                        f.write(f"后500字符预览: {content[-500:] if len(content) > 500 else '无'}\n")
                        f.write("\n" + "=" * 50 + "\n")
                        f.write("错误位置上下文:\n")
                        if hasattr(e, 'pos') and e.pos is not None:
                            start_pos = max(0, e.pos - 100)
                            end_pos = min(len(content), e.pos + 100)
                            f.write(f"位置 {e.pos} 附近内容:\n")
                            f.write(repr(content[start_pos:end_pos]))
                            f.write("\n")
                        f.write("\n" + "=" * 50 + "\n")
                        f.write("完整堆栈跟踪:\n")
                        f.write(traceback.format_exc())
                    safe_print(f"✅ 错误内容已保存到: {error_file}")
                    
                    # 尝试在Windows桌面也保存一份
                    try:
                        desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
                        if os.path.exists(desktop_path):
                            desktop_error_file = os.path.join(desktop_path, f"neuink_json_error_{timestamp}.txt")
                            with open(desktop_error_file, 'w', encoding='utf-8') as f:
                                f.write(f"NeuInk JSON解析错误 - {datetime.now()}\n")
                                f.write(f"错误类型: {type(e).__name__}\n")
                                f.write(f"错误信息: {str(e)}\n")
                                f.write("=" * 50 + "\n")
                                f.write("完整响应内容:\n")
                                f.write(content)
                            safe_print(f"✅ 错误副本已保存到桌面: {desktop_error_file}")
                    except Exception as desktop_error:
                        safe_print(f"⚠️ 无法保存到桌面: {desktop_error}")
                        
                except Exception as save_error:
                    safe_print(f"❌ 保存错误日志失败: {save_error}")
                    safe_print(f"❌ 尝试保存的路径: {error_file}")
                    safe_print(f"❌ 错误详情: {traceback.format_exc()}")
                
                raise

        def _add_translations(blocks):
            """为blocks添加中文翻译"""
            safe_print("🌐 开始添加中文翻译")
            
            # 检查是否需要翻译
            needs_translation = False
            for block in blocks:
                if "content" in block and isinstance(block["content"], dict):
                    if "en" in block["content"] and "zh" not in block["content"]:
                        needs_translation = True
                        break
            
            if not needs_translation:
                safe_print("✅ 所有内容已有中文翻译，跳过翻译步骤")
                return blocks
            
            # 批量处理，每次处理10个block
            batch_size = 10
            for i in range(0, len(blocks), batch_size):
                batch = blocks[i:i+batch_size]
                
                # 只选择需要翻译的blocks
                batch_to_translate = []
                for block in batch:
                    if "content" in block or (block["type"] in ["ordered-list", "unordered-list"] and "items" in block):
                        batch_to_translate.append(block)
                
                if not batch_to_translate:
                    continue
                
                user_prompt = f"""请为以下JSON数组中的英文内容添加中文翻译：

    {json.dumps(batch_to_translate, ensure_ascii=False, indent=2)}

    只输出完整的JSON数组。"""

                messages = [
                    {"role": "system", "content": TRANSLATION_PROMPT},
                    {"role": "user", "content": user_prompt}
                ]
                
                try:
                    response = self.call_llm(messages, temperature=0.1, max_tokens=50000)
                    
                    # 增强的错误检查
                    if not response:
                        safe_print(f"❌ 翻译批次 {i//batch_size + 1} 失败: API响应为空")
                        continue
                        
                    if "choices" not in response:
                        safe_print(f"❌ 翻译批次 {i//batch_size + 1} 失败: 响应格式错误，缺少choices")
                        continue
                        
                    if not response["choices"]:
                        safe_print(f"❌ 翻译批次 {i//batch_size + 1} 失败: choices数组为空")
                        continue
                    
                    if "message" not in response["choices"][0]:
                        safe_print(f"❌ 翻译批次 {i//batch_size + 1} 失败: 缺少message字段")
                        continue
                    
                    content = response["choices"][0]["message"]["content"]
                    
                    # 检查内容是否为空
                    if not content or not content.strip():
                        safe_print(f"❌ 翻译批次 {i//batch_size + 1} 失败: 响应内容为空")
                        continue
                    
                    # 清理响应内容
                    original_content = content  # 保存原始内容用于调试
                    content = content.strip()
                    
                    # 提取JSON内容（支持多种格式）
                    json_extracted = False
                    if "```json" in content:
                        start = content.find("```json") + 7
                        end = content.find("```", start)
                        if end != -1:
                            content = content[start:end].strip()
                            json_extracted = True
                    elif "```" in content:
                        start = content.find("```") + 3
                        end = content.find("```", start)
                        if end != -1:
                            content = content[start:end].strip()
                            json_extracted = True
                    
                    # 检查清理后的内容是否为空
                    if not content:
                        safe_print(f"❌ 翻译批次 {i//batch_size + 1} 失败: 提取JSON后内容为空")
                        safe_print(f"原始响应: {original_content[:200]}...")
                        continue
                    
                    # 尝试解析JSON
                    try:
                        translated_batch = json.loads(content)
                    except json.JSONDecodeError as json_e:
                        safe_print(f"❌ 翻译批次 {i//batch_size + 1} 失败: JSON解析错误 {json_e}")
                        safe_print(f"解析内容: {content[:200]}...")
                        safe_print(f"原始响应: {original_content[:200]}...")
                        continue
                    
                    # 验证解析结果
                    if not isinstance(translated_batch, list):
                        safe_print(f"❌ 翻译批次 {i//batch_size + 1} 失败: 返回的不是数组格式")
                        continue
                    
                    # 更新原始blocks中对应的内容
                    translated_idx = 0
                    updated_count = 0
                    for j in range(len(batch)):
                        if i+j < len(blocks):
                            block = blocks[i+j]
                            # 只更新被翻译的blocks
                            if "content" in block or (block["type"] in ["ordered-list", "unordered-list"] and "items" in block):
                                if translated_idx < len(translated_batch):
                                    blocks[i+j] = translated_batch[translated_idx]
                                    translated_idx += 1
                                    updated_count += 1
                    
                    if updated_count == 0:
                        safe_print(f"⚠️ 翻译批次 {i//batch_size + 1}: 没有blocks被更新")
                    else:
                        safe_print(f"✅ 完成批次 {i//batch_size + 1} 的翻译，更新了 {updated_count} 个blocks")
                        
                except requests.exceptions.RequestException as req_e:
                    safe_print(f"❌ 翻译批次 {i//batch_size + 1} 失败: 网络请求错误 {req_e}")
                    continue
                except Exception as e:
                    safe_print(f"❌ 翻译批次 {i//batch_size + 1} 失败: 未知错误 {e}")
                    safe_print(f"错误类型: {type(e).__name__}")
                    continue
            
            return blocks

        def _fix_and_validate(blocks):
            """修复和验证blocks"""
            # 导入必要的工具函数
            try:
                from ..utils.common import generate_id, get_current_time
            except ImportError:
                # 如果导入失败，使用备用方案
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
                        safe_print(f"⏭️ 跳过无效block {idx}: 缺少type字段")
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
                                # 如果没有zh字段，复制en的内容
                                content["zh"] = content.get("en", []).copy()
                            
                            # 修复inline-math字段
                            for lang in ["en", "zh"]:
                                if lang in content and isinstance(content[lang], list):
                                    for item in content[lang]:
                                        if isinstance(item, dict) and item.get("type") == "inline-math":
                                            # 确保使用latex字段而不是content字段
                                            if "content" in item and "latex" not in item:
                                                item["latex"] = item.pop("content")
                                                safe_print(f"🔧 修复block {idx} 的inline-math字段")
                    
                    # 处理列表项
                    if block["type"] in ["ordered-list", "unordered-list"]:
                        if "items" in block and isinstance(block["items"], list):
                            for item_idx, item in enumerate(block["items"]):
                                if "content" in item and isinstance(item["content"], dict):
                                    # 确保列表项也有双语内容
                                    if "en" not in item["content"]:
                                        item["content"]["en"] = []
                                    if "zh" not in item["content"]:
                                        item["content"]["zh"] = item["content"].get("en", []).copy()
                                    
                                    # 修复列表项中的inline-math
                                    for lang in ["en", "zh"]:
                                        if lang in item["content"] and isinstance(item["content"][lang], list):
                                            for content_item in item["content"][lang]:
                                                if isinstance(content_item, dict) and content_item.get("type") == "inline-math":
                                                    if "content" in content_item and "latex" not in content_item:
                                                        content_item["latex"] = content_item.pop("content")
                    
                    # 处理表格
                    if block["type"] == "table":
                        # 确保表格有必要的字段
                        if "headers" not in block:
                            block["headers"] = []
                        if "rows" not in block:
                            block["rows"] = []
                        # 表格的caption也需要双语
                        if "caption" in block and isinstance(block["caption"], dict):
                            if "en" not in block["caption"]:
                                block["caption"]["en"] = []
                            if "zh" not in block["caption"]:
                                block["caption"]["zh"] = block["caption"].get("en", []).copy()
                    
                    # 处理数学公式块
                    if block["type"] == "math":
                        if "latex" in block:
                            # 去除\tag{}编号
                            latex = block["latex"]
                            latex = re.sub(r'\\tag\{[^}]*\}', '', latex)
                            # 去除多余的空格
                            latex = re.sub(r'\s+', ' ', latex).strip()
                            block["latex"] = latex
                    
                    validated_blocks.append(block)
                    safe_print(f"✅ 验证block {idx}: type={block['type']}")
                    
                except Exception as e:
                    safe_print(f"❌ 验证block {idx} 失败: {e}")
                    continue
            
            return validated_blocks

        # 主执行流程
        try:
            # 步骤1：解析Markdown（现在包含翻译）
            blocks = _parse_markdown()
            safe_print(f"✅ 解析完成，得到 {len(blocks)} 个blocks")
            
            # 步骤2：修复和验证
            validated_blocks = _fix_and_validate(blocks)
            safe_print(f"✅ 最终生成 {len(validated_blocks)} 个有效blocks")
            
            return validated_blocks
            
        except Exception as e:
            safe_print(f"❌ 处理失败: {e}")
            import traceback
            safe_print(traceback.format_exc())
            raise Exception(f"LLM解析失败: {e}")

    def _extract_blocks_with_llm_stream(self, text: str, section_context: str = ""):
        """
        使用LLM流式解析Markdown格式的学术论文文本，转换为结构化的block数组
        
        Args:
            text: 要解析的Markdown文本
            section_context: 当前section的上下文信息
            
        Yields:
            流式解析过程中的进度信息
        """
        import json
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
    - #开头为标题，如果有编号，例如3.1为二级标题 3.1.2为三级标题
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
    - 输出格式示例：
    {
    "type": "math",
    "latex": "E = mc^2"
    }

    ### 行内公式 (inline-math)
    - 文本中的 $...$ 或 \\(...\\) 格式
    - **必须使用latex字段，不能使用content字段**
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
    - 输出格式示例：
    {
    "type": "table",
    "headers": ["Column 1", "Column 2"],
    "rows": [
        ["Cell 1", "Cell 2"],
        ["Cell 3", "Cell 4"]
    ]
    }

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
    **完全删除**脚注标记：如 [^1], [^note]不要包含在输出中

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
        "headers": ["Method", "Accuracy"],
        "rows": [
        ["SVM", "95%"],
        ["CNN", "98%"]
        ]
    }
    ]
    要求：
    - 所有出现在 JSON 字符串中的双引号 " 必须写成 \"。
    - 如果是自然语言中的引号，优先使用单引号 ' 而不是双引号 "。
    - 所有 LaTeX 公式只能出现在 "latex" 字段中，不能直接放在 content 文本字符串里。
    - content 字符串中禁止出现未转义的反斜杠 \，如有需要请使用 \\。
    ## 重要提醒
    1. **只输出JSON数组，不要任何其他内容**
    2. **inline-math必须用latex字段，不能用content字段**
    3. **删除所有引用标记**
    4. **保持学术术语的准确性**
    5. JSON 中的字符串必须是合法 JSON 字符串，所有内部的双引号要写成 \"，反斜杠写成 \\。
    6. 不要在 JSON 外输出任何解释文字
    """

        TRANSLATION_PROMPT = """你是一个专业的学术翻译专家。

## 任务
将提供的JSON数组中的英文内容翻译为中文，添加到zh字段中。

## 翻译要求
1. 保持学术术语的专业性和准确性
2. 数学公式、代码、变量名等保持原样
3. 使用规范的学术中文表达
4. 保持原文的语义和逻辑结构

## 输入格式
你会收到一个包含英文内容的JSON数组。

## 输出格式
返回完整的JSON数组，其中每个包含content字段的对象都应该同时包含en和zh两个字段。

**重要**：只输出JSON数组，不要任何额外文字。"""

        # 使用全局的safe_print函数，避免重复定义

        def _parse_markdown_stream():
            """使用LLM流式解析Markdown文本"""
            safe_print("🚀 开始流式解析Markdown文本")
            yield {"type": "progress", "stage": "parsing", "message": "开始解析文本内容...", "progress": 10}
            
            # 预处理：清理文本
            cleaned_text = text.strip()
            
            # 替换行内公式格式 $...$ -> \(...\)
            cleaned_text = re.sub(r'\$([^$]+)\$', r'\\(\1\\)', cleaned_text)
            
            # 替换行间公式格式 $...$ -> \\[...\\]
            cleaned_text = re.sub(r'\$\$([^$]+)\$\$', r'\\[\1\\]', cleaned_text, flags=re.DOTALL)
            cleaned_text = cleaned_text.replace('"', "'")
            # 限制文本长度
            if len(cleaned_text) > 30000:
                safe_print(f"⚠️ 文本过长({len(cleaned_text)}字符)，截断至30000字符")
                cleaned_text = cleaned_text[:30000]
                yield {"type": "progress", "stage": "parsing", "message": "文本过长，已截断处理", "progress": 15}
            
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
            
            safe_print("📤 发送流式解析请求...")
            yield {"type": "progress", "stage": "parsing", "message": "正在调用大模型解析文本...", "progress": 20}
            
            # 收集流式响应，同时传递GLM的原始数据
            full_content = ""
            content_preview = ""  # 用于生成进度消息的内容预览
            last_progress_update = 0  # 记录上次进度更新的内容长度，避免频繁更新
            
            for chunk in self.call_llm_stream(messages, temperature=0.1, max_tokens=50000):
                if "error" in chunk:
                    yield {"type": "error", "message": chunk["error"]}
                    return
                
                if chunk.get("type") == "glm_stream":
                    # 直接传递GLM的原始流式数据到前端
                    yield {
                        "type": "glm_stream",
                        "raw_data": chunk["raw_data"],
                        "content": chunk["content"],
                        "model": chunk["model"],
                        "usage": chunk["usage"]
                    }
                    
                    # 同时收集内容用于后续解析
                    full_content += chunk["content"]
                    content_preview += chunk["content"]
                    
                    # 计算进度（解析阶段现在占总进度的90%，因为包含翻译且不再有单独翻译步骤）
                    progress = min(20 + int(len(full_content) / 50), 90)
                    
                    # 根据内容生成更详细的进度消息
                    # 只有当内容增长超过一定量时才更新消息，避免过于频繁
                    if len(full_content) - last_progress_update > 100 or progress % 10 == 0:
                        last_progress_update = len(full_content)
                        
                        # 生成基于内容的进度消息
                        if len(content_preview.strip()) > 0:
                            # 获取最新的内容片段用于生成进度消息
                            preview_text = content_preview.strip()[-200:] if len(content_preview.strip()) > 200 else content_preview.strip()
                            
                            # 根据内容特征生成不同的进度消息
                            if progress < 30:
                                message = f"开始解析文本内容...已接收 {len(full_content)} 字符"
                            elif progress < 60:
                                # 尝试识别内容类型
                                if any(keyword in preview_text.lower() for keyword in ['abstract', '摘要', 'introduction', '引言', 'background', '背景']):
                                    message = f"正在解析论文摘要和引言部分...({progress}%)"
                                elif any(keyword in preview_text.lower() for keyword in ['method', '方法', 'approach', '方法', 'experiment', '实验']):
                                    message = f"正在解析方法和实验部分...({progress}%)"
                                else:
                                    message = f"正在解析论文主体内容...({progress}%)"
                            elif progress < 85:
                                # 尝试识别更多内容类型
                                if any(keyword in preview_text.lower() for keyword in ['result', '结果', 'conclusion', '结论', 'discussion', '讨论']):
                                    message = f"正在解析结果和结论部分...({progress}%)"
                                elif any(keyword in preview_text.lower() for keyword in ['table', '表格', 'figure', '图', 'chart', '图表']):
                                    message = f"正在解析表格和图表内容...({progress}%)"
                                else:
                                    message = f"继续解析论文内容...({progress}%)"
                            else:
                                message = f"即将完成解析...({progress}%)"
                            
                            # 如果内容中包含JSON结构，说明正在生成结构化数据
                            if '{' in preview_text and '}' in preview_text and ('type' in preview_text or '"content"' in preview_text):
                                message = f"正在生成结构化内容...({progress}%)"
                        else:
                            message = f"正在解析和翻译文本内容...({progress}%)"
                        
                        yield {"type": "progress", "stage": "parsing", "message": message, "progress": progress}
                        
                elif "content" in chunk:
                    # 兼容旧格式
                    full_content += chunk["content"]
                    content_preview += chunk["content"]
                    progress = min(20 + int(len(full_content) / 50), 90)
                    
                    # 根据内容生成更详细的进度消息
                    if len(full_content) - last_progress_update > 100 or progress % 10 == 0:
                        last_progress_update = len(full_content)
                        message = f"正在解析和翻译文本内容...({progress}%)"
                        yield {"type": "progress", "stage": "parsing", "message": message, "progress": progress}
            
            # 清理响应内容
            content = full_content.strip()
            if "```json" in content:
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end != -1:
                    content = content[start:end].strip()
            elif "```" in content:
                start = content.find("```") + 3
                end = content.find("```", start)
                if end != -1:
                    content = content[start:end].strip()
            
            try:
                blocks = json.loads(content)
                safe_print(f"✅ 解析完成，得到 {len(blocks)} 个blocks")
                yield {"type": "progress", "stage": "parsing", "message": f"解析和翻译完成，得到 {len(blocks)} 个内容块", "progress": 90}
                return blocks
            except json.JSONDecodeError as e:
                safe_print(f"❌ JSON解析失败: {e}")
                safe_print(f"响应内容: {content[:500]}...")
                
                # 保存错误内容到本地文件以便调试
                import os
                import traceback
                from datetime import datetime
                
                # 尝试多个可能的目录位置
                possible_dirs = [
                    "error_logs",
                    "apps/api/error_logs",
                    "apps/api/neuink/error_logs",
                    "/tmp/error_logs" if os.name != 'nt' else "C:\\temp\\error_logs"
                ]
                
                error_dir = None
                for dir_path in possible_dirs:
                    try:
                        if not os.path.exists(dir_path):
                            os.makedirs(dir_path, exist_ok=True)
                        # 测试是否可以写入
                        test_file = os.path.join(dir_path, "test_write.tmp")
                        with open(test_file, 'w') as f:
                            f.write("test")
                        os.remove(test_file)
                        error_dir = dir_path
                        safe_print(f"✅ 使用错误日志目录: {error_dir}")
                        break
                    except Exception as dir_error:
                        safe_print(f"⚠️ 无法使用目录 {dir_path}: {dir_error}")
                        continue
                
                if not error_dir:
                    # 如果所有预设目录都不可用，尝试在当前目录创建
                    try:
                        error_dir = os.getcwd()
                        safe_print(f"⚠️ 使用当前目录作为错误日志目录: {error_dir}")
                    except Exception as cwd_error:
                        safe_print(f"❌ 无法获取当前目录: {cwd_error}")
                        error_dir = "."
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                error_file = os.path.join(error_dir, f"json_parse_error_stream_{timestamp}.txt")
                
                try:
                    with open(error_file, 'w', encoding='utf-8') as f:
                        f.write(f"流式JSON解析错误时间: {datetime.now()}\n")
                        f.write(f"错误类型: {type(e).__name__}\n")
                        f.write(f"错误信息: {str(e)}\n")
                        f.write(f"错误位置: line {e.lineno}, column {e.colno}, character {e.pos}\n")
                        f.write(f"错误详情: {e.msg if hasattr(e, 'msg') else '无详细信息'}\n")
                        f.write("=" * 50 + "\n")
                        f.write("完整响应内容:\n")
                        f.write(content)
                        f.write("\n" + "=" * 50 + "\n")
                        f.write(f"响应内容长度: {len(content)} 字符\n")
                        f.write(f"前500字符预览: {content[:500]}\n")
                        f.write(f"后500字符预览: {content[-500:] if len(content) > 500 else '无'}\n")
                        f.write("\n" + "=" * 50 + "\n")
                        f.write("错误位置上下文:\n")
                        if hasattr(e, 'pos') and e.pos is not None:
                            start_pos = max(0, e.pos - 100)
                            end_pos = min(len(content), e.pos + 100)
                            f.write(f"位置 {e.pos} 附近内容:\n")
                            f.write(repr(content[start_pos:end_pos]))
                            f.write("\n")
                        f.write("\n" + "=" * 50 + "\n")
                        f.write("完整堆栈跟踪:\n")
                        f.write(traceback.format_exc())
                    safe_print(f"✅ 流式错误内容已保存到: {error_file}")
                    
                    # 尝试在Windows桌面也保存一份
                    try:
                        desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
                        if os.path.exists(desktop_path):
                            desktop_error_file = os.path.join(desktop_path, f"neuink_stream_json_error_{timestamp}.txt")
                            with open(desktop_error_file, 'w', encoding='utf-8') as f:
                                f.write(f"NeuInk 流式JSON解析错误 - {datetime.now()}\n")
                                f.write(f"错误类型: {type(e).__name__}\n")
                                f.write(f"错误信息: {str(e)}\n")
                                f.write("=" * 50 + "\n")
                                f.write("完整响应内容:\n")
                                f.write(content)
                            safe_print(f"✅ 流式错误副本已保存到桌面: {desktop_error_file}")
                    except Exception as desktop_error:
                        safe_print(f"⚠️ 无法保存到桌面: {desktop_error}")
                        
                except Exception as save_error:
                    safe_print(f"❌ 保存流式错误日志失败: {save_error}")
                    safe_print(f"❌ 尝试保存的路径: {error_file}")
                    safe_print(f"❌ 错误详情: {traceback.format_exc()}")
                
                yield {"type": "error", "message": f"解析失败，JSON格式错误: {e}"}
                return None

        def _add_translations_stream(blocks):
            """为blocks流式添加中文翻译 - 已优化：解析步骤已包含翻译，此函数现在只做验证"""
            if not blocks:
                return blocks
                
            safe_print("🌐 验证翻译内容（解析步骤已包含翻译）")
            yield {"type": "progress", "stage": "validating_translations", "message": "验证翻译完整性...", "progress": 92}
            
            # 检查是否需要补全翻译
            needs_completion = False
            for block in blocks:
                if "content" in block and isinstance(block["content"], dict):
                    if "en" in block["content"] and not block["content"].get("zh"):
                        # 如果有英文但没有中文，复制英文内容作为中文
                        block["content"]["zh"] = block["content"]["en"].copy()
                        needs_completion = True
                    elif "zh" in block["content"] and not block["content"].get("en"):
                        # 如果有中文但没有英文，复制中文内容作为英文
                        block["content"]["en"] = block["content"]["zh"].copy()
                        needs_completion = True
            
            if needs_completion:
                safe_print("✅ 补全了缺失的翻译内容")
                yield {"type": "progress", "stage": "validating_translations", "message": "补全缺失的翻译内容", "progress": 95}
            else:
                safe_print("✅ 所有内容翻译完整")
                yield {"type": "progress", "stage": "validating_translations", "message": "翻译内容完整", "progress": 95}
            
            return blocks

        def _fix_and_validate_stream(blocks):
            """流式修复和验证blocks"""
            if not blocks:
                return blocks
                
            safe_print("🔧 开始流式修复和验证blocks")
            yield {"type": "progress", "stage": "validating", "message": "开始验证和修复内容格式...", "progress": 90}
            
            # 导入必要的工具函数
            try:
                from ..utils.common import generate_id, get_current_time
            except ImportError:
                # 如果导入失败，使用备用方案
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
                        safe_print(f"⏭️ 跳过无效block {idx}: 缺少type字段")
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
                                # 如果没有zh字段，复制en的内容
                                content["zh"] = content.get("en", []).copy()
                            
                            # 修复inline-math字段
                            for lang in ["en", "zh"]:
                                if lang in content and isinstance(content[lang], list):
                                    for item in content[lang]:
                                        if isinstance(item, dict) and item.get("type") == "inline-math":
                                            # 确保使用latex字段而不是content字段
                                            if "content" in item and "latex" not in item:
                                                item["latex"] = item.pop("content")
                                                safe_print(f"🔧 修复block {idx} 的inline-math字段")
                    
                    # 处理列表项
                    if block["type"] in ["ordered-list", "unordered-list"]:
                        if "items" in block and isinstance(block["items"], list):
                            for item_idx, item in enumerate(block["items"]):
                                if "content" in item and isinstance(item["content"], dict):
                                    # 确保列表项也有双语内容
                                    if "en" not in item["content"]:
                                        item["content"]["en"] = []
                                    if "zh" not in item["content"]:
                                        item["content"]["zh"] = item["content"].get("en", []).copy()
                                    
                                    # 修复列表项中的inline-math
                                    for lang in ["en", "zh"]:
                                        if lang in item["content"] and isinstance(item["content"][lang], list):
                                            for content_item in item["content"][lang]:
                                                if isinstance(content_item, dict) and content_item.get("type") == "inline-math":
                                                    if "content" in content_item and "latex" not in content_item:
                                                        content_item["latex"] = content_item.pop("content")
                    
                    # 处理表格
                    if block["type"] == "table":
                        # 确保表格有必要的字段
                        if "headers" not in block:
                            block["headers"] = []
                        if "rows" not in block:
                            block["rows"] = []
                        # 表格的caption也需要双语
                        if "caption" in block and isinstance(block["caption"], dict):
                            if "en" not in block["caption"]:
                                block["caption"]["en"] = []
                            if "zh" not in block["caption"]:
                                block["caption"]["zh"] = block["caption"].get("en", []).copy()
                    
                    # 处理数学公式块
                    if block["type"] == "math":
                        if "latex" in block:
                            # 去除\tag{}编号
                            latex = block["latex"]
                            latex = re.sub(r'\\tag\{[^}]*\}', '', latex)
                            # 去除多余的空格
                            latex = re.sub(r'\s+', ' ', latex).strip()
                            block["latex"] = latex
                    
                    validated_blocks.append(block)
                    safe_print(f"✅ 验证block {idx}: type={block['type']}")
                    
                except Exception as e:
                    safe_print(f"❌ 验证block {idx} 失败: {e}")
                    continue
            
            safe_print(f"✅ 最终生成 {len(validated_blocks)} 个有效blocks")
            yield {"type": "progress", "stage": "validating", "message": f"验证完成，生成 {len(validated_blocks)} 个有效内容块", "progress": 95}
            return validated_blocks

        # 主执行流程
        try:
            # 步骤1：解析Markdown（现在包含翻译）
            blocks = yield from _parse_markdown_stream()
            if blocks is None:
                return
            
            # 步骤2：修复和验证
            validated_blocks = yield from _fix_and_validate_stream(blocks)
            if validated_blocks is None:
                return
            
            # 完成
            yield {"type": "complete", "message": f"解析完成，共生成 {len(validated_blocks)} 个内容块", "blocks": validated_blocks, "progress": 100}
            
        except Exception as e:
            safe_print(f"❌ 流式处理失败: {e}")
            import traceback
            safe_print(traceback.format_exc())
            yield {"type": "error", "message": f"流式解析失败: {e}"}

    def parse_references(self, text: str) -> List[Dict[str, Any]]:
            """
            解析参考文献文本，返回结构化的参考文献列表
            
            Args:
                text: 参考文献文本，可能包含多条参考文献
                
            Returns:
                解析后的参考文献列表，每条参考文献包含标准字段
            """
            safe_print("=" * 60)
            safe_print("开始解析参考文献")
            safe_print(f"文本长度: {len(text)} 字符")
            safe_print("=" * 60)
            
            # 检查API密钥
            if not self.glm_api_key or self.glm_api_key == "your_glm_api_key_here":
                error_msg = "LLM服务不可用：未配置GLM_API_KEY或使用了占位符值。请在.env文件中设置有效的GLM API密钥。"
                safe_print(error_msg)
                raise RuntimeError(error_msg)
            
            try:
                return self._parse_references_with_llm(text)
            except Exception as e:
                error_msg = f"参考文献解析失败: {e}。请检查API密钥是否有效，或稍后重试。"
                safe_print(error_msg)
                raise RuntimeError(error_msg)
        
    def _parse_references_with_llm(self, text: str) -> List[Dict[str, Any]]:
            """使用LLM解析参考文献"""
            import json
            import re
            
            # 限制文本长度以避免超出token限制
            truncated_text = text[:50000] if len(text) > 50000 else text
            safe_print(f"🔍 原始文本长度: {len(text)} 字符")
            safe_print(f"📝 解析文本长度: {len(truncated_text)} 字符")
            if len(text) > 50000:
                safe_print("⚠️  文本被截断，前50,000字符将被解析")
            
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
                safe_print("📤 发送参考文献解析请求到LLM...")
                response = self.call_llm(messages, temperature=0.1, max_tokens=100000)
                
                if not response or "choices" not in response:
                    safe_print("❌ LLM响应格式错误")
                    raise Exception("LLM响应格式错误")
                    
                content = response["choices"][0]["message"]["content"]
                safe_print(f"💬 LLM原始响应: {content[:500]}...")
                
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
                
                safe_print(f"🔄 解析JSON内容: {content[:200]}...")
                parsed_references = json.loads(content)
                
                # 确保返回的是数组
                if not isinstance(parsed_references, list):
                    safe_print("❌ LLM返回的不是数组格式")
                    raise Exception("LLM返回的不是数组格式")
                
                # 为每条参考文献添加ID并验证格式
                from ..utils.common import generate_id
                validated_references = []
                
                for i, ref in enumerate(parsed_references):
                    if not isinstance(ref, dict):
                        safe_print(f"⏭️  跳过无效参考文献: {ref}")
                        continue
                    
                    # 确保有标题
                    if not ref.get("title"):
                        safe_print(f"⏭️  跳过无标题参考文献: {ref}")
                        continue
                    
                    # 添加ID
                    ref["id"] = generate_id()
                    
                    # 确保authors是数组
                    if "authors" in ref and not isinstance(ref["authors"], list):
                        if isinstance(ref["authors"], str):
                            # 如果是字符串，尝试分割
                            ref["authors"] = [author.strip() for author in ref["authors"].split(",")]
                        else:
                            ref["authors"] = [str(ref["authors"])]
                    
                    validated_references.append(ref)
                    safe_print(f"✅ 验证参考文献 {i+1}: {ref.get('title', 'Unknown')}")
                
                safe_print(f"🎉 完成验证，生成{len(validated_references)}条有效参考文献")
                return validated_references
                
            except json.JSONDecodeError as e:
                safe_print(f"❌ JSON解析失败: {e}")
                safe_print(f"原始内容: {content}")
                
                # 保存错误内容到本地文件以便调试
                import os
                import traceback
                from datetime import datetime
                
                # 尝试多个可能的目录位置
                possible_dirs = [
                    "error_logs",
                    "apps/api/error_logs",
                    "apps/api/neuink/error_logs",
                    "/tmp/error_logs" if os.name != 'nt' else "C:\\temp\\error_logs"
                ]
                
                error_dir = None
                for dir_path in possible_dirs:
                    try:
                        if not os.path.exists(dir_path):
                            os.makedirs(dir_path, exist_ok=True)
                        # 测试是否可以写入
                        test_file = os.path.join(dir_path, "test_write.tmp")
                        with open(test_file, 'w') as f:
                            f.write("test")
                        os.remove(test_file)
                        error_dir = dir_path
                        safe_print(f"✅ 使用错误日志目录: {error_dir}")
                        break
                    except Exception as dir_error:
                        safe_print(f"⚠️ 无法使用目录 {dir_path}: {dir_error}")
                        continue
                
                if not error_dir:
                    # 如果所有预设目录都不可用，尝试在当前目录创建
                    try:
                        error_dir = os.getcwd()
                        safe_print(f"⚠️ 使用当前目录作为错误日志目录: {error_dir}")
                    except Exception as cwd_error:
                        safe_print(f"❌ 无法获取当前目录: {cwd_error}")
                        error_dir = "."
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                error_file = os.path.join(error_dir, f"references_parse_error_{timestamp}.txt")
                
                try:
                    with open(error_file, 'w', encoding='utf-8') as f:
                        f.write(f"参考文献JSON解析错误时间: {datetime.now()}\n")
                        f.write(f"错误类型: {type(e).__name__}\n")
                        f.write(f"错误信息: {str(e)}\n")
                        f.write(f"错误位置: line {e.lineno}, column {e.colno}, character {e.pos}\n")
                        f.write(f"错误详情: {e.msg if hasattr(e, 'msg') else '无详细信息'}\n")
                        f.write("=" * 50 + "\n")
                        f.write("完整响应内容:\n")
                        f.write(content)
                        f.write("\n" + "=" * 50 + "\n")
                        f.write(f"响应内容长度: {len(content)} 字符\n")
                        f.write(f"前500字符预览: {content[:500]}\n")
                        f.write(f"后500字符预览: {content[-500:] if len(content) > 500 else '无'}\n")
                        f.write("\n" + "=" * 50 + "\n")
                        f.write("错误位置上下文:\n")
                        if hasattr(e, 'pos') and e.pos is not None:
                            start_pos = max(0, e.pos - 100)
                            end_pos = min(len(content), e.pos + 100)
                            f.write(f"位置 {e.pos} 附近内容:\n")
                            f.write(repr(content[start_pos:end_pos]))
                            f.write("\n")
                        f.write("\n" + "=" * 50 + "\n")
                        f.write("完整堆栈跟踪:\n")
                        f.write(traceback.format_exc())
                    safe_print(f"✅ 参考文献解析错误内容已保存到: {error_file}")
                    
                    # 尝试在Windows桌面也保存一份
                    try:
                        desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
                        if os.path.exists(desktop_path):
                            desktop_error_file = os.path.join(desktop_path, f"neuink_references_error_{timestamp}.txt")
                            with open(desktop_error_file, 'w', encoding='utf-8') as f:
                                f.write(f"NeuInk 参考文献JSON解析错误 - {datetime.now()}\n")
                                f.write(f"错误类型: {type(e).__name__}\n")
                                f.write(f"错误信息: {str(e)}\n")
                                f.write("=" * 50 + "\n")
                                f.write("完整响应内容:\n")
                                f.write(content)
                            safe_print(f"✅ 参考文献解析错误副本已保存到桌面: {desktop_error_file}")
                    except Exception as desktop_error:
                        safe_print(f"⚠️ 无法保存到桌面: {desktop_error}")
                        
                except Exception as save_error:
                    safe_print(f"❌ 保存参考文献错误日志失败: {save_error}")
                    safe_print(f"❌ 尝试保存的路径: {error_file}")
                    safe_print(f"❌ 错误详情: {traceback.format_exc()}")
                
                raise Exception(f"参考文献解析失败，无法解析JSON: {e}")
            except Exception as e:
                safe_print(f"❌ 参考文献解析失败: {e}")
                raise Exception(f"参考文献解析失败: {e}")
        

# 全局实例
_llm_utils: Optional[LLMUtils] = None

def get_llm_utils() -> LLMUtils:
    """获取 LLMUtils 全局实例"""
    global _llm_utils
    if _llm_utils is None:
        _llm_utils = LLMUtils()
    return _llm_utils