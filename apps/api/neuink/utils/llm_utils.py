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

# 设置编码为UTF-8以处理Unicode字符
if sys.platform.startswith('win'):
    # 在Windows下设置控制台输出编码
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())
    
    # 设置默认编码
    if hasattr(sys, 'setdefaultencoding'):
        sys.setdefaultencoding('utf-8')
        
import logging

# 配置日志系统
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('neuink_llm.log', encoding='utf-8'),
        logging.StreamHandler()  # 同时输出到控制台
    ]
)

logger = logging.getLogger(__name__)

# 安全的日志打印函数
def safe_print(*args, **kwargs):
    """安全的打印函数，避免编码错误，同时输出到日志文件和控制台"""
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
        stream: bool = False,
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
                timeout=180  # 60秒超时
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
            
            # 直接更新论文，不调用可能不兼容的add_blocks_to_section方法
            paper = paper_service.paper_model.find_by_id(paper_id)
            if paper:
                sections = paper.get("sections", [])
                target_section = None
                section_index = -1
                
                for i, section in enumerate(sections):
                    if section.get("id") == section_id:
                        target_section = section
                        section_index = i
                        break
                
                if target_section:
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
                    
                    # 安全地插入新blocks
                    safe_print(f"在位置 {insert_index} 插入 {len(parsed_blocks)} 个blocks")
                    new_blocks = current_blocks[:insert_index] + parsed_blocks + current_blocks[insert_index:]
                    target_section["content"] = new_blocks
                    sections[section_index] = target_section
                    
                    # 更新论文
                    update_data = {"sections": sections}
                    if paper_service.paper_model.update(paper_id, update_data):
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
                else:
                    return {
                        "success": False,
                        "error": f"未找到指定的section: {section_id}"
                    }
            else:
                return {
                    "success": False,
                    "error": f"未找到指定的论文: {paper_id}"
                }
            
        except Exception as e:
            safe_print(f"解析并保存失败: {e}")
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
        import json
        import re

        PARSER_SYSTEM_PROMPT = """你是一个专业的学术论文内容结构化助手，专注于将文本内容解析为标准化的block数组。

**核心任务：**
将输入的文本内容解析为符合学术论文编辑系统的block结构，每个block必须包含中英文内容。

**严格输出要求：**
1. **必须输出纯JSON数组格式** - 以[开头，]结尾，不允许任何其他文字或格式
2. **每个block的content必须同时包含en和zh两个语言数组**
3. **即使原始文本是纯中文，也要生成对应的英文翻译；反之亦然**
4. **不允许任何字段缺失或为空**

**Block类型及字段规范：**
- heading: 标题 (需要level字段1-6)
- paragraph: 段落 (content: {en: [...], zh: [...]})
- ordered-list: 有序列表 (items数组，每项包含content双语言)
- unordered-list: 无序列表 (items数组，每项包含content双语言)
- quote: 引用 (需要author字段，content双语言)
- math: 数学公式 (latex字段保留原始公式，content为解释文字)
- code: 代码 (language字段，code字段保留原始代码)
- figure: 图片 (src, alt, caption双语言)
- table: 表格 (headers, rows, align)
- divider: 分割线

**InlineContent类型：**
- text: 普通文本，可包含样式
- link: 链接
- inline-math: 行内数学公式 (必须使用latex字段存储公式内容，不要使用content字段)

**翻译要求：**
- 如果原始内容是中文，zh数组放原文，en数组放准确英文翻译
- 如果原始内容是英文，en数组放原文，zh数组放准确中文翻译
- 保持学术术语的准确性和专业性
- 保持数学公式、代码等特殊内容的格式

**重要提醒：**
- 每个block的content.en和content.zh都必须是数组，不能为空
- 如果无法翻译，复制原文到目标语言数组
- 严格遵循JSON格式，不能有注释或额外文字"""

        TRANSLATION_SYSTEM_PROMPT = """You are a professional academic translator specializing in scholarly content.

**Translation Requirements:**
- Preserve academic terminology and precision
- Maintain mathematical formulas, code, and technical terms exactly as they appear
- For Chinese to English: Use formal academic English appropriate for research papers
- For English to Chinese: Use standard academic Chinese terminology
- Keep references, and special formatting intact
- Output ONLY the translated text without any additional explanation or formatting markers"""

        chinese_char = re.compile(r"[\u4e00-\u9fff]")

        def _parse_markdown():
            safe_print("🚀 开始使用LLM解析文本")
            section_title = section_context.splitlines()[0].strip() if section_context else ""
            context_info = f"当前section标题：{section_title}" if section_title else "无特定section标题"
            
            # 限制文本长度以避免超出token限制
            truncated_text = text[:40000] if len(text) > 40000 else text
            safe_print(f"🔍 原始文本长度: {len(text)} 字符")
            safe_print(f"📝 解析文本长度: {len(truncated_text)} 字符")
            if len(text) > 40000:
                safe_print("⚠️  文本被截断，前40,000字符将被解析")
                safe_print(f"📋 截断的文本预览: {truncated_text[:200]}...")
            safe_print(f"📊 文本内容统计: 总行数={len(text.split(chr(10)))}")
            
            user_prompt = f"""请将以下文本内容解析为标准化的block数组。

{context_info}

需要解析的文本内容：
{truncated_text}

**重要要求：**
1. 每个block的content必须同时包含en和zh两个语言数组
2. 如果原文本是中文，zh放原文，en放英文翻译
3. 如果原文本是英文，en放原文，zh放中文翻译
4. 保持学术内容的专业性和准确性
5. 严格输出JSON数组格式，不要其他任何文字"""

            messages = [
                {"role": "system", "content": PARSER_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ]
            
            safe_print("📤 发送解析请求到LLM...")
            response = self.call_llm(messages, temperature=0.2, max_tokens=100000)
            
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
            return json.loads(content)

        def _normalize_inline(items):
            """标准化InlineContent数组"""
            normalized = []
            for item in items or []:
                if isinstance(item, dict):
                    normalized.append(item)
                elif isinstance(item, str):
                    normalized.append({"type": "text", "text": item})
            return normalized

        def _inline_plain_text(items):
            """提取纯文本内容用于翻译"""
            fragments = []
            for item in items or []:
                if not isinstance(item, dict):
                    continue
                if item.get("type") == "text" and item.get("text"):
                    fragments.append(item["text"])
                elif item.get("type") == "link":
                    label = item.get("label") or item.get("text")
                    if label:
                        fragments.append(label)
            return " ".join(fragments).strip()

        def _rebuild_inline_from_text(text_value):
            """从纯文本重建InlineContent"""
            text_value = (text_value or "").strip()
            return [{"type": "text", "text": text_value}] if text_value else []

        def _translate_content(source_items, target_lang):
            """翻译InlineContent内容"""
            plain_text = _inline_plain_text(source_items)
            if not plain_text:
                return []
            
            source_lang = "zh" if chinese_char.search(plain_text) else "en"
            if source_lang == target_lang:
                # 同语言，直接返回
                return [dict(item) for item in source_items]
            
            messages = [
                {"role": "system", "content": TRANSLATION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Source language: {source_lang}\nTarget language: {target_lang}\n\nSource text:\n{plain_text}\n\nReturn only the translated text.",
                },
            ]
            
            try:
                safe_print(f"🔄 翻译内容 ({source_lang} -> {target_lang}): {plain_text[:50]}...")
                resp = self.call_llm(messages, temperature=0.1, max_tokens=100000)
                
                if resp and "choices" in resp:
                    translated = resp["choices"][0]["message"]["content"].strip()
                    safe_print(f"✅ 翻译完成: {translated[:50]}...")
                    return _rebuild_inline_from_text(translated)
                else:
                    safe_print("❌ 翻译响应格式错误，使用原文")
                    return [dict(item) for item in source_items]
            except Exception as exc:
                safe_print(f"❌ 翻译失败 ({source_lang}->{target_lang}): {exc}")
                return [dict(item) for item in source_items]

        def _fix_inline_math_in_paragraph(block):
            """修复paragraph中inline-math的字段问题，将content字段改为latex字段"""
            if block.get("type") != "paragraph":
                return block
                
            content = block.get("content", {})
            if not isinstance(content, dict):
                return block
                
            # 修复英文内容
            en_content = content.get("en", [])
            if isinstance(en_content, list):
                for item in en_content:
                    if isinstance(item, dict) and item.get("type") == "inline-math":
                        if "content" in item and "latex" not in item:
                            item["latex"] = item.pop("content")
                            safe_print(f"🔧 修复inline-math: content -> latex")
                            
            # 修复中文内容
            zh_content = content.get("zh", [])
            if isinstance(zh_content, list):
                for item in zh_content:
                    if isinstance(item, dict) and item.get("type") == "inline-math":
                        if "content" in item and "latex" not in item:
                            item["latex"] = item.pop("content")
                            safe_print(f"🔧 修复inline-math: content -> latex")
                            
            return block

        def _ensure_bilingual_content(block):
            """确保block的content包含双语言内容"""
            content = block.get("content")
            if not isinstance(content, dict):
                return block

            # 获取现有内容
            en_items = _normalize_inline(content.get("en", []))
            zh_items = _normalize_inline(content.get("zh", []))

            # 如果缺少某种语言，进行翻译
            if not en_items and zh_items:
                en_items = _translate_content(zh_items, "en")
            if not zh_items and en_items:
                zh_items = _translate_content(en_items, "zh")

            # 确保两种语言都有内容
            if not en_items:
                en_items = [dict(item) for item in zh_items] if zh_items else []
            if not zh_items:
                zh_items = [dict(item) for item in en_items] if en_items else []

            block["content"] = {"en": en_items, "zh": zh_items}
            return block

        try:
            safe_print("🔄 开始LLM解析流程")
            blocks = _parse_markdown()
            
        except Exception as exc:
            safe_print(f"❌ LLM解析失败: {exc}")
            safe_print("🔙 回退到简单解析")
            return self._simple_text_to_blocks(text)

        if not isinstance(blocks, list):
            safe_print("❌ LLM返回的不是block列表")
            return self._simple_text_to_blocks(text)

        safe_print(f"✅ 验证和标准化{len(blocks)}个blocks...")
        from ..utils.common import generate_id, get_current_time

        validated_blocks = []
        for i, block in enumerate(blocks):
            try:
                if not isinstance(block, dict) or "type" not in block:
                    safe_print(f"⏭️  跳过无效block: {block}")
                    continue

                # 修复inline-math的字段问题
                if block.get("type") == "paragraph":
                    block = _fix_inline_math_in_paragraph(block)
                
                # 确保content是字典
                if "content" not in block or not isinstance(block["content"], dict):
                    block["content"] = {"en": [], "zh": []}
                
                # 确保双语言内容
                block = _ensure_bilingual_content(block)
                
                # 添加必要字段
                block["id"] = generate_id()
                block["createdAt"] = get_current_time().isoformat()  # 转换为ISO格式字符串
                
                validated_blocks.append(block)
                safe_print(f"✅ 验证block {i+1}: {block.get('type')}")
                
            except Exception as exc:
                safe_print(f"❌ 验证block失败: {exc}")
                continue

        safe_print(f"🎉 完成验证，生成{len(validated_blocks)}个有效blocks")
        return validated_blocks

    

    def _simple_text_to_blocks(self, text: str) -> List[Dict[str, Any]]:
        """使用大语言模型解析文本为blocks的方法"""
        from ..utils.common import generate_id, get_current_time
        import json
        
        safe_print("🔄 开始LLM文本解析")
        safe_print(f"文本长度: {len(text)} 字符")
        
        # 初始化LLM工具
        llm_utils = LLMUtils()
        
        # 构建系统提示词
        system_prompt = """你是一个专业的学术文档结构化解析专家。你的任务是将输入的文本解析为结构化的JSON格式的blocks数组。

    核心原则：
    1. 绝对不要修改原文内容，保持所有文本的原样，包括标点符号、空格、换行
    2. 准确识别语言，自动检测中文(zh)或英文(en)，对于每个文本内容，将其放在对应语言字段中
    3. 智能识别结构，正确识别标题、段落、列表、公式、代码块等不同类型
    4. 处理行内元素，识别链接、行内公式
    5. 数学公式格式：行内公式识别$...$后转换存储格式，行间公式识别$$...$$或反斜杠方括号后使用反斜杠方括号格式
    6. 跳过参考文献，如果识别到References、参考文献等章节，可以忽略其内容
    7. 一般来说输入都是英文，如果输入的英文，请你自动补全结构中zh的部分

    Block类型定义：

    1. heading 标题
    必需字段：type为heading，content包含en或zh数组
    识别标记：仅仅识别哪些简短的标题，例如#开头的标题

    2. paragraph 段落
    识别标记：普通文本段落
    必需字段：type为paragraph，content包含en或zh数组，具体见inlineContent描述

    3. math 数学公式块
    识别标记：独立的双美元符号或反斜杠方括号
    处理：需要移除其编号
    必需字段：type为math，latex为公式内容（使用反斜杠方括号格式包裹）

    4. code 代码块
    识别标记：三个反引号或缩进的代码
    必需字段：type为code，code为代码内容

    5. ordered-list 有序列表
    识别标记：数字加点开头如1. 2. 3.
    必需字段：type为ordered-list，items数组，每项包含content对象

    6. unordered-list 无序列表
    识别标记：减号、星号、加号开头
    必需字段：type为unordered-list，items数组，每项包含content对象

    7. quote 引用块
    识别标记：大于号开头
    必需字段：type为quote，content包含en或zh数组

    8. table 表格
    识别标记：markdown表格格式
    必需字段：type为table，rows为二维数组

    9. divider 分隔线
    识别标记：三个减号或三个星号
    必需字段：type为divider

    10. figure 图片
    识别标记：感叹号加方括号加圆括号
    必需字段：type为figure，src为图片URL

    InlineContent类型定义：

    1. text 普通文本
    type为text，content为文本内容
    可选style对象包含bold粗体、italic斜体、code代码、underline下划线、strikethrough删除线

    2. link 链接
    type为link，url为链接地址，children为子元素数组
    可选title标题

    3. inline-math 行内公式
    type为inline-math，latex为公式内容（不包含美元符号，必须使用latex字段不要使用content字段），注意识别，行内公式一般不换行，并且左右只有一个$付豪

    返回格式要求：

    必须返回一个JSON对象，包含blocks数组字段。

    示例结构：
    {
    "blocks": [
        {
        "type": "heading",
        "level": 1,
        "content": {
            "en": [{"type": "text", "content": "Introduction"}]
        }
        },
        {
        "type": "paragraph",
        "content": {
            "en": [
            {"type": "text", "content": "This is "},
            {"type": "text", "content": "bold text", "style": {"bold": true}},
            {"type": "text", "content": " with "},
            {"type": "inline-math", "latex": "x^2"},
            {"type": "text", "content": "."}
            ]
        }
        },
        {
        "type": "math",
        "latex": "E = mc^2"
        },
        {
        "type": "unordered-list",
        "items": [
            {
            "content": {
                "en": [{"type": "text", "content": "First item"}]
                "zh":[{"type":"text","content":"第一个元素"}]
            }
            },
            {
            "content": {
                "en": [{"type": "text", "content": "Second item"}]
            }
            }
        ]
        }
    ]
    }

    特殊处理规则：

    1. 数学公式识别
    行内：单美元符号包裹转为inline-math类型，必须使用latex字段存储公式内容，不要使用content字段
    行间：双美元符号或反斜杠方括号转为math block类型

    2. 文本样式识别
    双星号或双下划线为粗体

    3. 列表处理
    不支持嵌套列表，将嵌套项展平处理

    4. 混合语言处理
    如果段落包含中英文混合，检测主要语言并放入对应字段

    5. 空白保留
    段落间空行作为段落分隔，不需创建空白block

    6. 错误处理
    无法识别的结构优先解析为paragraph类型

    现在请将输入的文本解析为blocks数组。记住：不要修改任何原文内容，只需识别结构并转换为JSON格式。"""

        try:
            # 准备消息
            messages = [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": f"请解析以下文本：\n\n{text}"
                }
            ]
            
            # 调用LLM
            safe_print("📡 正在调用GLM API...")
            result = llm_utils.call_llm(
                messages=messages,
                model=LLMModel.GLM_4_6,
                temperature=0.1,
                max_tokens=100000
            )
            
            if not result:
                safe_print("❌ LLM调用失败，使用降级方案")
                return self._fallback_simple_parse(text)
            
            # 提取响应内容
            if 'choices' not in result or not result['choices']:
                safe_print("❌ LLM响应格式错误，使用降级方案")
                return self._fallback_simple_parse(text)
            
            content = result['choices'][0]['message']['content']
            safe_print(f"📥 收到响应，长度: {len(content)} 字符")
            safe_print(f"响应内容预览: {content[:500]}...")
            
            # 解析JSON
            try:
                # 尝试直接解析
                parsed_result = json.loads(content)
            except json.JSONDecodeError:
                # 如果失败，尝试提取JSON部分
                safe_print("⚠️ 直接解析失败，尝试提取JSON部分")
                import re
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    parsed_result = json.loads(json_match.group())
                else:
                    safe_print("❌ 无法提取JSON，使用降级方案")
                    return self._fallback_simple_parse(text)
            
            # 获取blocks数组
            blocks = parsed_result.get("blocks", [])
            
            if not blocks:
                safe_print("⚠️ 未找到blocks数组，使用降级方案")
                return self._fallback_simple_parse(text)
            
            # 为每个block添加id和createdAt
            for block in blocks:
                if 'id' not in block:
                    block['id'] = generate_id()
                if 'createdAt' not in block:
                    block['createdAt'] = get_current_time().isoformat()  # 转换为ISO格式字符串
            
            safe_print(f"🎉 LLM解析完成，生成 {len(blocks)} 个blocks")
            
            # 打印前几个block的类型
            if blocks:
                safe_print("📋 前5个blocks类型：")
                for i, block in enumerate(blocks[:5]):
                    safe_print(f"  {i+1}. {block.get('type', 'unknown')}")
            
            return blocks
            
        except Exception as e:
            safe_print(f"❌ LLM解析过程出错: {str(e)}")
            import traceback
            safe_print(f"错误详情: {traceback.format_exc()}")
            return self._fallback_simple_parse(text)


    def _fallback_simple_parse(self, text: str) -> List[Dict[str, Any]]:
        """降级方案：简单解析"""
        from ..utils.common import generate_id, get_current_time
        import re
        
        safe_print("⚠️ 使用降级解析方案")
        
        blocks = []
        chinese_char = re.compile(r"[\u4e00-\u9fff]")
        
        # 按双换行符分割段落
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        safe_print(f"📊 识别到 {len(paragraphs)} 个段落")
        
        for i, paragraph in enumerate(paragraphs):
            # 检测语言
            is_chinese = bool(chinese_char.search(paragraph))
            lang_key = "zh" if is_chinese else "en"
            
            # 检查是否是标题
            if paragraph.startswith('#'):
                level = len(paragraph) - len(paragraph.lstrip('#'))
                level = min(level, 6)
                content_text = paragraph.lstrip('#').strip()
                
                block = {
                    'id': generate_id(),
                    'type': 'heading',
                    'level': level,
                    'content': {
                        lang_key: [{"type": "text", "content": content_text}]
                    },
                    'createdAt': get_current_time().isoformat()  # 转换为ISO格式字符串
                }
            else:
                # 创建基本的paragraph block
                block = {
                    'id': generate_id(),
                    'type': 'paragraph',
                    'content': {
                        lang_key: [{"type": "text", "content": paragraph}]
                    },
                    'createdAt': get_current_time().isoformat()  # 转换为ISO格式字符串
                }
            
            blocks.append(block)
            safe_print(f"📝 生成block {i+1}: {block['type']}")
        
        safe_print(f"✅ 降级解析完成，生成 {len(blocks)} 个blocks")
        return blocks

# 全局实例
_llm_utils: Optional[LLMUtils] = None

def get_llm_utils() -> LLMUtils:
    """获取 LLMUtils 全局实例"""
    global _llm_utils
    if _llm_utils is None:
        _llm_utils = LLMUtils()
    return _llm_utils