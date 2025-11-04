"""
增强的Markdown解析服务
将Markdown文件解析为结构化的论文数据，符合TypeScript类型定义
"""
import json
import os
import re
from typing import Dict, Any, List, Optional, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

# from zai import ZhipuAiClient  # 用户需要安装zai模块
# 创建模拟客户端用于测试
class MockZhipuAiClient:
    def __init__(self, api_key=None):
        self.api_key = api_key
    
    @property
    def chat(self):
        return self
    
    def completions(self):
        return self
    
    def create(self, **kwargs):
        # 模拟AI响应
        return type('Response', (), {
            'choices': [type('Choice', (), {
                'message': type('Message', (), {
                    'content': '{"blocks": [{"id": "mock-1", "type": "paragraph", "content": {"en": [{"type": "text", "content": "Mock response"}], "zh": []}}]}'
                })()
            })()]
        })()

# 如果没有zai模块，使用模拟客户端
try:
    from zai import ZhipuAiClient
except ImportError:
    ZhipuAiClient = MockZhipuAiClient


class BlockType(Enum):
    """块级元素类型"""
    HEADING = "heading"
    PARAGRAPH = "paragraph"
    MATH = "math"
    FIGURE = "figure"
    TABLE = "table"
    CODE = "code"
    ORDERED_LIST = "ordered-list"
    UNORDERED_LIST = "unordered-list"
    QUOTE = "quote"
    DIVIDER = "divider"


class InlineType(Enum):
    """内联元素类型"""
    TEXT = "text"
    LINK = "link"
    INLINE_MATH = "inline-math"
    CITATION = "citation"
    FIGURE_REF = "figure-ref"
    TABLE_REF = "table-ref"
    SECTION_REF = "section-ref"
    EQUATION_REF = "equation-ref"
    FOOTNOTE = "footnote"


@dataclass
class TextNode:
    """文本节点"""
    type: str = "text"
    content: str = ""
    style: Optional[Dict[str, Any]] = None


@dataclass
class LinkNode:
    """链接节点"""
    type: str = "link"
    url: str = ""
    children: List[Dict[str, Any]] = None
    title: Optional[str] = None

    def __post_init__(self):
        if self.children is None:
            self.children = []


@dataclass
class InlineMathNode:
    """内联数学节点"""
    type: str = "inline-math"
    latex: str = ""


@dataclass
class CitationNode:
    """引用节点"""
    type: str = "citation"
    reference_ids: List[str] = None
    display_text: str = ""

    def __post_init__(self):
        if self.reference_ids is None:
            self.reference_ids = []


@dataclass
class FigureRefNode:
    """图表引用节点"""
    type: str = "figure-ref"
    figure_id: str = ""
    display_text: str = ""


@dataclass
class TableRefNode:
    """表格引用节点"""
    type: str = "table-ref"
    table_id: str = ""
    display_text: str = ""


@dataclass
class SectionRefNode:
    """章节引用节点"""
    type: str = "section-ref"
    section_id: str = ""
    display_text: str = ""


@dataclass
class EquationRefNode:
    """公式引用节点"""
    type: str = "equation-ref"
    equation_id: str = ""
    display_text: str = ""


@dataclass
class FootnoteNode:
    """脚注节点"""
    type: str = "footnote"
    id: str = ""
    content: str = ""
    display_text: str = ""


@dataclass
class HeadingBlock:
    """标题块"""
    id: str = ""
    type: str = "heading"
    level: int = 1
    content: Dict[str, List[Dict[str, Any]]] = None
    number: Optional[str] = None

    def __post_init__(self):
        if self.content is None:
            self.content = {"en": [], "zh": []}


@dataclass
class ParagraphBlock:
    """段落块"""
    id: str = ""
    type: str = "paragraph"
    content: Dict[str, List[Dict[str, Any]]] = None
    align: Optional[str] = None

    def __post_init__(self):
        if self.content is None:
            self.content = {"en": [], "zh": []}


@dataclass
class MathBlock:
    """数学块"""
    id: str = ""
    type: str = "math"
    latex: str = ""
    label: Optional[str] = None
    number: Optional[int] = None


@dataclass
class FigureBlock:
    """图表块"""
    id: str = ""
    type: str = "figure"
    src: str = ""
    alt: Optional[str] = None
    number: Optional[int] = None
    caption: Dict[str, List[Dict[str, Any]]] = None
    description: Optional[Dict[str, List[Dict[str, Any]]]] = None
    width: Optional[str] = None
    height: Optional[str] = None
    uploaded_filename: Optional[str] = None

    def __post_init__(self):
        if self.caption is None:
            self.caption = {"en": [], "zh": []}


@dataclass
class TableBlock:
    """表格块"""
    id: str = ""
    type: str = "table"
    number: Optional[int] = None
    caption: Dict[str, List[Dict[str, Any]]] = None
    description: Optional[Dict[str, List[Dict[str, Any]]]] = None
    headers: Optional[List[str]] = None
    rows: List[List[Union[str, Dict[str, str]]]] = None
    align: Optional[List[str]] = None

    def __post_init__(self):
        if self.caption is None:
            self.caption = {"en": [], "zh": []}
        if self.rows is None:
            self.rows = []


@dataclass
class CodeBlock:
    """代码块"""
    id: str = ""
    type: str = "code"
    language: Optional[str] = None
    code: str = ""
    caption: Optional[Dict[str, List[Dict[str, Any]]]] = None
    show_line_numbers: Optional[bool] = None

    def __post_init__(self):
        if self.caption is None:
            self.caption = {"en": [], "zh": []}


@dataclass
class OrderedListBlock:
    """有序列表块"""
    id: str = ""
    type: str = "ordered-list"
    items: List[Dict[str, Dict[str, List[Dict[str, Any]]]]] = None
    start: Optional[int] = None

    def __post_init__(self):
        if self.items is None:
            self.items = []


@dataclass
class UnorderedListBlock:
    """无序列表块"""
    id: str = ""
    type: str = "unordered-list"
    items: List[Dict[str, Dict[str, List[Dict[str, Any]]]]] = None

    def __post_init__(self):
        if self.items is None:
            self.items = []


@dataclass
class QuoteBlock:
    """引用块"""
    id: str = ""
    type: str = "quote"
    content: Dict[str, List[Dict[str, Any]]] = None
    author: Optional[str] = None

    def __post_init__(self):
        if self.content is None:
            self.content = {"en": [], "zh": []}


@dataclass
class DividerBlock:
    """分隔线块"""
    id: str = ""
    type: str = "divider"


@dataclass
class Author:
    """作者"""
    name: str = ""
    affiliation: Optional[str] = None
    email: Optional[str] = None


@dataclass
class Reference:
    """参考文献"""
    id: str = ""
    number: Optional[int] = None
    authors: List[str] = None
    title: str = ""
    publication: Optional[str] = None
    year: Optional[int] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    pages: Optional[str] = None
    volume: Optional[str] = None
    issue: Optional[str] = None

    def __post_init__(self):
        if self.authors is None:
            self.authors = []


@dataclass
class Section:
    """章节"""
    id: str = ""
    number: Optional[str] = None
    title: Dict[str, str] = None
    content: List[Dict[str, Any]] = None
    subsections: Optional[List[Dict[str, Any]]] = None

    def __post_init__(self):
        if self.title is None:
            self.title = {"en": "", "zh": ""}
        if self.content is None:
            self.content = []
        if self.subsections is None:
            self.subsections = []


@dataclass
class ParseStatus:
    """解析状态"""
    status: str = "pending"
    progress: int = 0
    message: str = ""


@dataclass
class PaperMetadata:
    """论文元数据"""
    title: str = ""
    title_zh: Optional[str] = None
    short_title: Optional[str] = None
    authors: List[Dict[str, Any]] = None
    publication: Optional[str] = None
    year: Optional[int] = None
    date: Optional[str] = None
    doi: Optional[str] = None
    article_type: Optional[str] = None
    sci_quartile: Optional[str] = None
    cas_quartile: Optional[str] = None
    ccf_rank: Optional[str] = None
    impact_factor: Optional[float] = None
    tags: Optional[List[str]] = None

    def __post_init__(self):
        if self.authors is None:
            self.authors = []
        if self.tags is None:
            self.tags = []


@dataclass
class PaperAttachments:
    """论文附件"""
    pdf: Optional[str] = None
    markdown: Optional[str] = None


@dataclass
class Paper:
    """完整论文"""
    id: str = ""
    is_public: bool = False
    created_by: str = ""
    metadata: Dict[str, Any] = None
    abstract: Optional[Dict[str, str]] = None
    keywords: Optional[List[str]] = None
    sections: List[Dict[str, Any]] = None
    references: List[Dict[str, Any]] = None
    attachments: Dict[str, Any] = None
    parse_status: Dict[str, Any] = None
    created_at: str = ""
    updated_at: str = ""

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.sections is None:
            self.sections = []
        if self.references is None:
            self.references = []
        if self.attachments is None:
            self.attachments = {}
        if self.parse_status is None:
            self.parse_status = {}


class EnhancedMarkdownParserService:
    """增强的Markdown解析服务类"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        glm_model: str = "glm-4.6",
        enable_ai_parsing: bool = True,
        max_chunk_size: int = 8000,  # 大模型上下文限制
    ):
        self.api_key = api_key or os.getenv("ZHIPU_API_KEY")
        self.glm_model = glm_model
        self.enable_ai_parsing = enable_ai_parsing and self.api_key
        self.max_chunk_size = max_chunk_size
        self._glm_client: Optional[ZhipuAiClient] = None

        # 提示词模板
        self._prompts = self._load_prompts()

    def _load_prompts(self) -> Dict[str, str]:
        """加载提示词模板"""
        return {
            "metadata": self._get_metadata_prompt(),
            "section": self._get_section_prompt(),
            "reference": self._get_reference_prompt(),
            "block_parsing": self._get_block_parsing_prompt(),
            "inline_parsing": self._get_inline_parsing_prompt(),
        }

    def _get_metadata_prompt(self) -> str:
        """获取元数据解析提示词"""
        return """你是一位专业的学术论文元数据提取专家。请仔细分析提供的Markdown内容，提取以下信息并以JSON格式返回：

需要提取的字段：
- title: 论文标题（英文）
- title_zh: 中文标题（如果有）
- short_title: 短标题（如果有）
- authors: 作者列表，每个作者包含name（姓名）、affiliation（机构）、email（邮箱，可选）
- publication: 发表期刊/会议名称
- year: 发表年份
- date: 具体日期（YYYY-MM-DD格式）
- doi: DOI号
- article_type: 文章类型（journal/conference/preprint/book/thesis）
- abstract: 摘要（英文）
- abstract_zh: 中文摘要（如果有）
- keywords: 关键词列表

输出要求：
1. 严格遵循JSON格式
2. 如果某个字段不存在，设为null或空数组
3. 作者信息尽可能详细
4. 摘要和关键词要完整提取
5. 只返回JSON，不要其他文本

示例格式：
{
  "title": "论文标题",
  "title_zh": "中文标题",
  "authors": [
    {
      "name": "作者姓名",
      "affiliation": "所属机构",
      "email": "邮箱地址"
    }
  ],
  "abstract": "英文摘要内容",
  "keywords": ["关键词1", "关键词2"]
}"""

    def _get_section_prompt(self) -> str:
        """获取章节解析提示词"""
        return """你是一位专业的学术论文章节结构分析专家。请分析提供的章节内容，识别其中的结构化元素并返回JSON格式结果。

需要识别的block类型：
1. heading: 标题（1-6级）
2. paragraph: 段落
3. math: 数学公式（行间公式）
4. figure: 图表
5. table: 表格
6. code: 代码块
7. ordered-list: 有序列表
8. unordered-list: 无序列表
9. quote: 引用
10. divider: 分隔线

每个block需要包含：
- id: 唯一标识符
- type: block类型
- content: 内容（根据类型不同结构不同）

对于内联元素识别：
- text: 文本（支持bold、italic、underline等样式）
- link: 链接
- inline-math: 行内公式
- citation: 引用 [1] 或 [1,2]
- figure-ref: 图表引用
- table-ref: 表格引用
- section-ref: 章节引用
- equation-ref: 公式引用

输出要求：
1. 严格按照指定的JSON结构返回
2. 为每个block生成唯一ID
3. 保持原始内容完整性
4. 正确识别内联元素
5. 只返回JSON，不要其他文本

示例：
{
  "blocks": [
    {
      "id": "heading-1",
      "type": "heading",
      "level": 1,
      "content": {
        "en": [{"type": "text", "content": "Introduction"}],
        "zh": []
      }
    },
    {
      "id": "para-1", 
      "type": "paragraph",
      "content": {
        "en": [
          {"type": "text", "content": "This is a "},
          {"type": "bold", "content": "bold text"},
          {"type": "text", "content": " with "},
          {"type": "link", "url": "http://example.com", "children": [{"type": "text", "content": "link"}]}
        ],
        "zh": []
      }
    }
  ]
}"""

    def _get_reference_prompt(self) -> str:
        """获取参考文献解析提示词"""
        return """你是一位专业的学术论文参考文献格式分析专家。请分析提供的参考文献内容，提取详细信息并返回JSON格式结果。

需要提取的字段：
- id: 参考文献ID
- number: 参考文献编号
- authors: 作者列表
- title: 论文标题
- publication: 期刊/会议名称
- year: 发表年份
- doi: DOI号
- url: 网址链接
- pages: 页码
- volume: 卷号
- issue: 期号

输出要求：
1. 严格遵循JSON数组格式
2. 每个参考文献一个对象
3. 尽可能提取完整信息
4. 保持原始格式准确性
5. 只返回JSON，不要其他文本

示例：
{
  "references": [
    {
      "id": "ref-1",
      "number": 1,
      "authors": ["作者1", "作者2"],
      "title": "论文标题",
      "publication": "期刊名称",
      "year": 2023,
      "doi": "10.xxxx/xxxxx"
    }
  ]
}"""

    def _get_block_parsing_prompt(self) -> str:
        """获取具体block类型解析提示词"""
        return """你是一位专业的学术文档结构分析专家。请精确分析提供的block内容，识别其具体类型和结构。

Block类型识别规则：
1. heading: 以#开头的标题行
2. paragraph: 普通文本段落
3. math: $$...$$ 或 \\[...\\] 包围的数学公式
4. figure: ![alt](src) 格式的图片
5. table: | 分割的表格结构
6. code: ``` 包围的代码块
7. ordered-list: 数字开头的列表项
8. unordered-list: - 或 * 开头的列表项
9. quote: > 开头的引用
10. divider: --- 或 *** 分隔线

请返回详细的block结构分析。"""

    def _get_inline_parsing_prompt(self) -> str:
        """获取内联元素解析提示词"""
        return """你是一位专业的文本内联元素识别专家。请分析文本内容，识别其中的内联元素。

内联元素识别规则：
1. **bold** 或 __bold__: 粗体文本
2. *italic* 或 _italic_: 斜体文本
3. ~~strikethrough~~: 删除线
4. `code`: 行内代码
5. [text](url): 链接
6. $math$: 行内数学公式
7. [1], [1,2]: 引用
8. Figure 1, Table 2: 图表引用
9. Eq. (1): 公式引用
10. Section 1.2: 章节引用

请返回内联元素的详细结构。"""

    def parse_markdown_file(self, file_content: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        解析Markdown文件内容

        Args:
            file_content: Markdown文件内容
            metadata: 可选的补充元数据

        Returns:
            结构化的论文数据
        """
        metadata = metadata or {}
        
        try:
            # 更新解析状态
            result = {
                "metadata": {},
                "abstract": None,
                "keywords": [],
                "sections": [],
                "references": [],
                "attachments": {},
                "parseStatus": {
                    "status": "parsing",
                    "progress": 0,
                    "message": "开始解析Markdown文件"
                }
            }

            # 第一步：粗粒度分割
            sections = self._coarse_grain_split(file_content)
            
            # 第二步：解析元数据、摘要、关键词
            result["metadata"] = self._parse_metadata(sections.get("metadata_section", ""))
            result["abstract"] = self._parse_abstract(sections.get("abstract_section", ""))
            result["keywords"] = self._parse_keywords(sections.get("keywords_section", ""))
            
            # 更新进度
            result["parseStatus"]["progress"] = 30
            result["parseStatus"]["message"] = "元数据解析完成"

            # 第三步：解析章节
            result["sections"] = self._parse_sections(sections.get("content_sections", []))
            
            # 更新进度
            result["parseStatus"]["progress"] = 80
            result["parseStatus"]["message"] = "章节解析完成"

            # 第四步：解析参考文献
            result["references"] = self._parse_references(sections.get("references_section", ""))
            
            # 完成解析
            result["parseStatus"]["status"] = "completed"
            result["parseStatus"]["progress"] = 100
            result["parseStatus"]["message"] = "Markdown解析完成"

            return result

        except Exception as e:
            return {
                "metadata": metadata,
                "abstract": None,
                "keywords": [],
                "sections": [],
                "references": [],
                "attachments": {},
                "parseStatus": {
                    "status": "failed",
                    "progress": 0,
                    "message": f"解析失败: {str(e)}"
                }
            }

    def _coarse_grain_split(self, content: str) -> Dict[str, List[str]]:
        """粗粒度内容分割"""
        lines = content.split('\n')
        sections = {
            "metadata_section": "",
            "abstract_section": "",
            "keywords_section": "",
            "content_sections": [],
            "references_section": ""
        }
        
        current_section = []
        in_references = False
        
        for line in lines:
            line_stripped = line.strip()
            
            # 检测参考文献开始
            if re.match(r'^#+\s*(references|bibliography|参考文献)', line_stripped, re.IGNORECASE):
                if current_section:
                    if in_references:
                        sections["references_section"] = '\n'.join(current_section)
                    else:
                        sections["content_sections"].append('\n'.join(current_section))
                current_section = []
                in_references = True
                continue
            
            # 检测摘要开始
            if re.match(r'^#+\s*(abstract|摘要)', line_stripped, re.IGNORECASE):
                if current_section:
                    sections["content_sections"].append('\n'.join(current_section))
                current_section = [line]
                in_references = False
                continue
            
            # 检测关键词开始
            if re.match(r'^#+\s*(keywords|关键词)', line_stripped, re.IGNORECASE):
                if current_section:
                    sections["content_sections"].append('\n'.join(current_section))
                current_section = [line]
                in_references = False
                continue
            
            current_section.append(line)
        
        # 处理最后一个section
        if current_section:
            if in_references:
                sections["references_section"] = '\n'.join(current_section)
            else:
                sections["content_sections"].append('\n'.join(current_section))
        
        return sections

    def _parse_metadata(self, metadata_content: str) -> Dict[str, Any]:
        """解析元数据"""
        if not metadata_content or not self.enable_ai_parsing:
            return {}
        
        client = self._get_glm_client()
        if not client:
            return {}
        
        try:
            response = client.chat.completions.create(
                model=self.glm_model,
                messages=[
                    {"role": "system", "content": "你是一位专业的学术论文元数据提取专家。"},
                    {"role": "user", "content": f"{self._prompts['metadata']}\n\n待分析内容：\n{metadata_content}"}
                ],
                max_tokens=2000,
                temperature=0.1,
            )
            
            content = response.choices[0].message.content
            if isinstance(content, list):
                content = "".join(item.get("text", "") if isinstance(item, dict) else str(item) for item in content)
            
            parsed = json.loads(content)
            return parsed
            
        except Exception as e:
            print(f"元数据解析失败: {e}")
            return {}

    def _parse_abstract(self, abstract_content: str) -> Optional[Dict[str, str]]:
        """解析摘要"""
        if not abstract_content:
            return None
        
        # 简单的摘要提取逻辑
        lines = abstract_content.split('\n')
        abstract_text = []
        in_abstract = False
        
        for line in lines:
            line_stripped = line.strip()
            if re.match(r'^#+\s*(abstract|摘要)', line_stripped, re.IGNORECASE):
                in_abstract = True
                continue
            elif in_abstract and line_stripped.startswith('#'):
                break
            elif in_abstract:
                abstract_text.append(line)
        
        if abstract_text:
            return {"en": '\n'.join(abstract_text).strip(), "zh": None}
        return None

    def _parse_keywords(self, keywords_content: str) -> List[str]:
        """解析关键词"""
        if not keywords_content:
            return []
        
        lines = keywords_content.split('\n')
        keywords = []
        in_keywords = False
        
        for line in lines:
            line_stripped = line.strip()
            if re.match(r'^#+\s*(keywords|关键词)', line_stripped, re.IGNORECASE):
                in_keywords = True
                continue
            elif in_keywords and line_stripped.startswith('#'):
                break
            elif in_keywords:
                # 提取关键词（逗号或分号分割）
                line_keywords = re.split(r'[,;，；]', line_stripped)
                keywords.extend([kw.strip() for kw in line_keywords if kw.strip()])
        
        return keywords

    def _parse_sections(self, sections_content: List[str]) -> List[Dict[str, Any]]:
        """解析章节"""
        sections = []
        
        for i, section_content in enumerate(sections_content):
            if not section_content.strip():
                continue
                
            # 检查是否需要分块处理
            if len(section_content) > self.max_chunk_size:
                parsed_blocks = self._parse_section_chunked(section_content)
            else:
                parsed_blocks = self._parse_section_direct(section_content)
            
            section = {
                "id": f"section-{i+1}",
                "number": f"{i+1}",
                "title": {"en": "", "zh": ""},
                "content": parsed_blocks,
                "subsections": []
            }
            
            sections.append(section)
        
        return sections

    def _parse_section_direct(self, section_content: str) -> List[Dict[str, Any]]:
        """直接解析章节内容"""
        if not self.enable_ai_parsing:
            return self._parse_section_fallback(section_content)
        
        client = self._get_glm_client()
        if not client:
            return self._parse_section_fallback(section_content)
        
        try:
            response = client.chat.completions.create(
                model=self.glm_model,
                messages=[
                    {"role": "system", "content": "你是一位专业的学术论文章节结构分析专家。"},
                    {"role": "user", "content": f"{self._prompts['section']}\n\n待分析内容：\n{section_content}"}
                ],
                max_tokens=4000,
                temperature=0.1,
            )
            
            content = response.choices[0].message.content
            if isinstance(content, list):
                content = "".join(item.get("text", "") if isinstance(item, dict) else str(item) for item in content)
            
            parsed = json.loads(content)
            return parsed.get("blocks", [])
            
        except Exception as e:
            print(f"章节解析失败: {e}")
            return self._parse_section_fallback(section_content)

    def _parse_section_chunked(self, section_content: str) -> List[Dict[str, Any]]:
        """分块解析长章节内容"""
        blocks = []
        lines = section_content.split('\n')
        
        # 按逻辑块分割
        chunks = self._split_into_chunks(lines)
        
        for chunk in chunks:
            chunk_content = '\n'.join(chunk)
            chunk_blocks = self._parse_section_direct(chunk_content)
            blocks.extend(chunk_blocks)
        
        return blocks

    def _split_into_chunks(self, lines: List[str]) -> List[List[str]]:
        """将内容分割成适合的块"""
        chunks = []
        current_chunk = []
        current_size = 0
        
        for line in lines:
            line_size = len(line.encode('utf-8'))
            
            # 如果加上这一行会超出限制，且当前块不为空
            if current_size + line_size > self.max_chunk_size and current_chunk:
                chunks.append(current_chunk)
                current_chunk = [line]
                current_size = line_size
            else:
                current_chunk.append(line)
                current_size += line_size
        
        # 添加最后一个块
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks

    def _parse_section_fallback(self, section_content: str) -> List[Dict[str, Any]]:
        """回退解析方法（不使用AI）"""
        blocks = []
        lines = section_content.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            if not line:
                i += 1
                continue
            
            # 标题
            if line.startswith('#'):
                level = len(line) - len(line.lstrip('#'))
                title_text = line.lstrip('#').strip()
                blocks.append({
                    "id": f"heading-{len(blocks)+1}",
                    "type": "heading",
                    "level": min(level, 6),
                    "content": {
                        "en": [{"type": "text", "content": title_text}],
                        "zh": []
                    }
                })
            
            # 代码块
            elif line.startswith('```'):
                code_lines = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith('```'):
                    code_lines.append(lines[i])
                    i += 1
                
                blocks.append({
                    "id": f"code-{len(blocks)+1}",
                    "type": "code",
                    "language": line[3:].strip() if len(line) > 3 else None,
                    "code": '\n'.join(code_lines)
                })
            
            # 列表
            elif line.startswith('- ') or line.startswith('* '):
                list_items = []
                while i < len(lines) and (lines[i].strip().startswith('- ') or lines[i].strip().startswith('* ')):
                    item_text = lines[i].strip()[2:].strip()
                    list_items.append({
                        "content": {
                            "en": [{"type": "text", "content": item_text}],
                            "zh": []
                        }
                    })
                    i += 1
                
                blocks.append({
                    "id": f"list-{len(blocks)+1}",
                    "type": "unordered-list",
                    "items": list_items
                })
                i -= 1  # 回退一步，因为外层循环会自增
            
            # 引用
            elif line.startswith('>'):
                quote_lines = []
                while i < len(lines) and lines[i].strip().startswith('>'):
                    quote_lines.append(lines[i].strip()[1:].strip())
                    i += 1
                
                blocks.append({
                    "id": f"quote-{len(blocks)+1}",
                    "type": "quote",
                    "content": {
                        "en": [{"type": "text", "content": '\n'.join(quote_lines)}],
                        "zh": []
                    }
                })
                i -= 1  # 回退一步
            
            # 分隔线
            elif line.strip() in ['---', '***', '___']:
                blocks.append({
                    "id": f"divider-{len(blocks)+1}",
                    "type": "divider"
                })
            
            # 段落
            else:
                para_lines = [line]
                i += 1
                # 收集连续的非空行
                while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith('#') and not lines[i].strip().startswith('```') and not lines[i].strip().startswith('- ') and not lines[i].strip().startswith('* ') and not lines[i].strip().startswith('>') and lines[i].strip() not in ['---', '***', '___']:
                    para_lines.append(lines[i])
                    i += 1
                
                blocks.append({
                    "id": f"paragraph-{len(blocks)+1}",
                    "type": "paragraph",
                    "content": {
                        "en": [{"type": "text", "content": '\n'.join(para_lines)}],
                        "zh": []
                    }
                })
                i -= 1  # 回退一步
            
            i += 1
        
        return blocks

    def _parse_references(self, references_content: str) -> List[Dict[str, Any]]:
        """解析参考文献"""
        if not references_content or not self.enable_ai_parsing:
            return self._parse_references_fallback(references_content)
        
        client = self._get_glm_client()
        if not client:
            return self._parse_references_fallback(references_content)
        
        try:
            response = client.chat.completions.create(
                model=self.glm_model,
                messages=[
                    {"role": "system", "content": "你是一位专业的学术论文参考文献格式分析专家。"},
                    {"role": "user", "content": f"{self._prompts['reference']}\n\n待分析内容：\n{references_content}"}
                ],
                max_tokens=3000,
                temperature=0.1,
            )
            
            content = response.choices[0].message.content
            if isinstance(content, list):
                content = "".join(item.get("text", "") if isinstance(item, dict) else str(item) for item in content)
            
            parsed = json.loads(content)
            return parsed.get("references", [])
            
        except Exception as e:
            print(f"参考文献解析失败: {e}")
            return self._parse_references_fallback(references_content)

    def _parse_references_fallback(self, references_content: str) -> List[Dict[str, Any]]:
        """回退解析参考文献方法"""
        if not references_content:
            return []
        
        references = []
        lines = references_content.split('\n')
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            if not line_stripped:
                continue
            
            # 简单的参考文献解析
            ref = {
                "id": f"ref-{i+1}",
                "number": i + 1,
                "authors": [],
                "title": line_stripped,
                "publication": None,
                "year": None,
                "doi": None,
                "url": None,
                "pages": None,
                "volume": None,
                "issue": None
            }
            
            references.append(ref)
        
        return references

    def _get_glm_client(self) -> Optional[ZhipuAiClient]:
        """获取GLM客户端"""
        if not self.api_key:
            return None
        if self._glm_client is None:
            self._glm_client = ZhipuAiClient(api_key=self.api_key)
        return self._glm_client


# 单例模式
_enhanced_markdown_parser_service: Optional[EnhancedMarkdownParserService] = None


def get_enhanced_markdown_parser_service() -> EnhancedMarkdownParserService:
    """获取EnhancedMarkdownParserService单例"""
    global _enhanced_markdown_parser_service
    if _enhanced_markdown_parser_service is None:
        _enhanced_markdown_parser_service = EnhancedMarkdownParserService()
    return _enhanced_markdown_parser_service