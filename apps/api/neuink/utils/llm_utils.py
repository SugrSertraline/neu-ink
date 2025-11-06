"""
大模型工具类
支持多种大模型调用，目前集成 GLM-4.6 模型
"""

import os
import json
import requests
from typing import Dict, Any, Optional, List
from enum import Enum

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
        print(f"🔑 GLM API Key 状态: {'✅ 已配置' if self.glm_api_key and self.glm_api_key != 'your_glm_api_key_here' else '❌ 未配置或为占位符'}")
        print(f"🌐 API端点: {self.glm_base_url}")
        
    def call_llm(
        self,
        messages: List[Dict[str, str]],
        model: LLMModel = LLMModel.GLM_4_6,
        temperature: float = 1.0,
        max_tokens: int = 65536,
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
        print("🚀 开始调用GLM API")
        print(f"📝 请求消息数量: {len(messages)}")
        
        if not self.glm_api_key:
            print("❌ 错误：未设置 GLM_API_KEY 环境变量")
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
        
        print(f"🤖 模型: {payload['model']}")
        print(f"🌡️  温度: {payload['temperature']}")
        print(f"📏 最大Token数: {payload['max_tokens']}")
        print(f"📋 消息内容预览:")
        for i, msg in enumerate(messages):
            print(f"  {i+1}. [{msg['role']}] {msg['content'][:100]}{'...' if len(msg['content']) > 100 else ''}")
        
        # 检查API密钥长度和格式
        if len(self.glm_api_key) < 20:
            print(f"⚠️  警告：API密钥长度异常 ({len(self.glm_api_key)} 字符)")
        
        headers = {
            "Authorization": f"Bearer {self.glm_api_key}",  # 显示完整密钥便于调试
            "Content-Type": "application/json"
        }
        
        try:
            print("🌐 正在发送请求到GLM API...")
            print(f"📡 API端点: {self.glm_base_url}")
            
            # 详细记录请求体
            print(f"📤 请求体预览:")
            print(f"  model: {payload['model']}")
            print(f"  temperature: {payload['temperature']}")
            print(f"  max_tokens: {payload['max_tokens']}")
            print(f"  stream: {payload['stream']}")
            
            response = requests.post(
                self.glm_base_url,
                json=payload,
                headers=headers,
                timeout=60  # 60秒超时
            )
            
            print(f"📥 响应状态码: {response.status_code}")
            print(f"📥 响应头: {dict(response.headers)}")
            
            # 如果是401错误，显示响应内容
            if response.status_code == 401:
                try:
                    error_response = response.json()
                    print(f"❌ 401错误详情: {error_response}")
                except:
                    print(f"❌ 401错误响应内容: {response.text[:500]}")
            
            response.raise_for_status()
            
            result = response.json()
            print("✅ GLM API调用成功")
            
            if 'choices' in result:
                print(f"🎯 返回选择数量: {len(result['choices'])}")
                if result['choices']:
                    content = result['choices'][0]['message']['content']
                    print(f"📄 响应内容长度: {len(content)} 字符")
                    print(f"📄 响应内容预览: {content[:200]}{'...' if len(content) > 200 else ''}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            print(f"❌ GLM API 调用失败: {e}")
            if hasattr(e, 'response'):
                print(f"📍 请求详情: 状态码 {e.response.status_code}")
                try:
                    error_content = e.response.json()
                    print(f"📍 错误详情: {error_content}")
                except:
                    print(f"📍 错误响应: {e.response.text[:500]}")
            else:
                print(f"📍 请求详情: 无响应对象")
            return None
        except json.JSONDecodeError as e:
            print(f"❌ GLM API 响应解析失败: {e}")
            return None
    
    def extract_paper_metadata(self, text: str) -> Dict[str, Any]:
        """
        仅使用 LLM 提取论文信息；任何错误都直接抛出异常，不做兜底解析。
        """
        print("=" * 60)
        print("开始解析论文文本（严格模式：无兜底）")
        print(f"文本长度: {len(text)} 字符")
        print("=" * 60)

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
                print("GLM 响应格式错误")
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
                print(f"GLM 返回的内容不是有效的JSON格式: {e}")
                print(f"原始内容: {content}")
                return None
                
        except Exception as e:
            print(f"提取论文元数据时出错: {e}")
            return None
    
    def _extract_with_simple_parsing(self, text: str) -> Dict[str, Any]:
        """简单的文本解析方法，当LLM不可用时使用"""
        import re
        
        print("🔍 开始简单文本解析")
        print(f"📝 文本行数: {len(text.split(chr(10)))}")
        
        lines = text.split('\n')
        
        # 改进的标题提取逻辑
        title = "未命名论文"
        print(f"🔍 开始提取标题 (检查前15行)")
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
                print(f"✅ 提取到标题: {title} (来自第{i+1}行)")
                break
        
        # 改进的作者提取逻辑
        authors = []
        print(f"🔍 开始提取作者信息")
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
                        
                        print(f"📝 在第{i+1}行发现作者信息: {line}")
                        
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
                                print(f"  ✅ 提取作者: {part}")
                        authors_found = True
                        break
        
        # 提取年份 - 优先在特定位置查找
        year = None
        print(f"🔍 开始提取年份")
        
        # 1. 在标题附近查找年份
        for i in range(max(0, title_line_index - 3), min(len(lines), title_line_index + 10)):
            year_match = re.search(r'\b(19|20)\d{2}\b', lines[i])
            if year_match:
                year = int(year_match.group())
                print(f"📅 提取到年份: {year} (来自第{i+1}行)")
                break
        
        # 如果上面没找到，搜索整个文本
        if not year:
            year_match = re.search(r'\b(19|20)\d{2}\b', text)
            if year_match:
                year = int(year_match.group())
                print(f"📅 提取到年份: {year} (全文搜索)")
        
        # 改进的摘要提取逻辑
        abstract_text = ""
        abstract_found = False
        print(f"🔍 开始提取摘要")
        
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            
            # 寻找摘要开始标记
            if (('abstract' in line_lower and ':' not in line_lower) or
                ('summary' in line_lower and ':' not in line_lower) or
                ('we present' in line_lower and len(line_lower) < 100)):
                
                abstract_found = True
                print(f"📄 在第{i+1}行发现摘要开始: {line.strip()}")
                
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
                        print(f"📄 摘要提取内容: {abstract_text[:200]}...")
                break
        
        # 提取DOI
        doi = None
        print(f"🔍 开始提取DOI")
        
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
                print(f"🔗 提取到DOI: {doi}")
                break
        
        # 改进的关键词提取逻辑
        keywords = []
        print(f"🔍 开始提取关键词")
        
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            
            # 寻找关键词标记
            if (('keywords' in line_lower and ':' not in line_lower) or
                ('index terms' in line_lower) or
                (line_lower.startswith('keywords') or line_lower.startswith('index terms'))):
                
                print(f"🏷️  在第{i+1}行发现关键词: {line.strip()}")
                
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
                print(f"  🏷️  提取关键词: {extracted_keywords}")
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
        
        print("✅ 简单文本解析完成")
        print(f"📊 解析结果摘要:")
        print(f"  📝 标题: {result['metadata']['title']}")
        print(f"  👥 作者数量: {len(result['metadata']['authors'])}")
        if result['metadata']['authors']:
            print(f"  👥 作者列表: {[author['name'] for author in result['metadata']['authors']]}")
        print(f"  📅 年份: {result['metadata']['year']}")
        print(f"  📄 摘要长度: {len(result['abstract']['en'] or '')} 字符")
        print(f"  🔗 DOI: {result['metadata']['doi']}")
        print(f"  🏷️  关键词数量: {len(result['keywords'])}")
        print(f"  📝 文章类型: {result['metadata']['articleType']}")
        
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
        print("🔍 开始解析文本为blocks")
        print(f"📝 文本长度: {len(text)} 字符")
        print(f"📋 Section上下文: {section_context}")
        
        if not self.glm_api_key or self.glm_api_key == "your_glm_api_key_here":
            print("⚠️ LLM不可用，使用简单解析")
            return self._simple_text_to_blocks(text)
        
        try:
            return self._extract_blocks_with_llm(text, section_context)
        except Exception as e:
            print(f"❌ LLM解析失败: {e}")
            print("🔄 回退到简单解析")
            return self._simple_text_to_blocks(text)

    def _extract_blocks_with_llm(self, text: str, section_context: str) -> List[Dict[str, Any]]:
        """使用LLM解析文本为blocks"""
        system_prompt = """你是一个专业的学术论文结构化助手。请将给定的文本内容解析为结构化的blocks，每个block代表一个段落或内容单元。

返回格式为JSON数组，每个block对象包含：
1. type: block类型，可以是 "paragraph"（段落）, "list"（列表）, "heading"（标题）, "formula"（公式）, "table"（表格）, "figure"（图片）
2. content: 具体内容
3. level: 如果是heading类型，表示标题级别（1-6）
4. items: 如果是list类型，包含列表项数组

请确保返回有效的JSON格式。如果是公式，请保留LaTeX格式。"""

        context_info = f"当前section上下文：{section_context}" if section_context else "无特定section上下文"
        user_prompt = f"""请将以下文本解析为结构化的blocks：

{context_info}

文本内容：
{text[:30000]}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            response = self.call_llm(messages, temperature=0.3)
            
            if not response or 'choices' not in response:
                print("GLM 响应格式错误")
                return self._simple_text_to_blocks(text)
                
            content = response['choices'][0]['message']['content']
            
            # 解析JSON
            try:
                if '```json' in content:
                    json_start = content.find('```json') + 7
                    json_end = content.find('```', json_start)
                    content = content[json_start:json_end].strip()
                elif '```' in content:
                    json_start = content.find('```') + 3
                    json_end = content.find('```', json_start)
                    content = content[json_start:json_end].strip()
                
                blocks = json.loads(content)
                
                # 验证blocks格式
                if isinstance(blocks, list):
                    validated_blocks = []
                    for block in blocks:
                        if isinstance(block, dict) and 'type' in block and 'content' in block:
                            # 添加ID和时间戳
                            from ..utils.common import generate_id, get_current_time
                            block['id'] = generate_id()
                            block['createdAt'] = get_current_time()
                            validated_blocks.append(block)
                    
                    print(f"✅ LLM解析成功，生成 {len(validated_blocks)} 个blocks")
                    return validated_blocks
                else:
                    print("❌ LLM返回的不是有效的block数组")
                    return self._simple_text_to_blocks(text)
                    
            except json.JSONDecodeError as e:
                print(f"❌ JSON解析失败: {e}")
                print(f"原始内容: {content}")
                return self._simple_text_to_blocks(text)
                
        except Exception as e:
            print(f"❌ LLM调用失败: {e}")
            return self._simple_text_to_blocks(text)

    def _simple_text_to_blocks(self, text: str) -> List[Dict[str, Any]]:
        """简单的文本解析为blocks的方法"""
        from ..utils.common import generate_id, get_current_time
        
        blocks = []
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        for paragraph in paragraphs:
            # 简单的类型判断
            block_type = "paragraph"
            extra_props = {}
            
            # 检查是否是标题（以#开头或者短且大写较多）
            if paragraph.startswith('#'):
                block_type = "heading"
                level = len(paragraph) - len(paragraph.lstrip('#'))
                extra_props['level'] = min(level, 6)
                paragraph = paragraph.lstrip('#').strip()
            elif len(paragraph) < 100 and paragraph.isupper():
                block_type = "heading"
                extra_props['level'] = 2
            
            # 检查是否是列表
            elif any(paragraph.startswith(marker) for marker in ['- ', '* ', '+ ', '1. ', '2. ']):
                block_type = "list"
                items = [item.strip() for item in paragraph.split('\n') if item.strip()]
                extra_props['items'] = items
            
            # 检查是否包含公式（简单检测）
            elif '$' in paragraph or '\\' in paragraph:
                block_type = "formula"
            
            block = {
                'id': generate_id(),
                'type': block_type,
                'content': paragraph,
                'createdAt': get_current_time(),
                **extra_props
            }
            blocks.append(block)
        
        print(f"✅ 简单解析完成，生成 {len(blocks)} 个blocks")
        return blocks


# 全局实例
_llm_utils: Optional[LLMUtils] = None

def get_llm_utils() -> LLMUtils:
    """获取 LLMUtils 全局实例"""
    global _llm_utils
    if _llm_utils is None:
        _llm_utils = LLMUtils()
    return _llm_utils