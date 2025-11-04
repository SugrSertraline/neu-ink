"""
Markdown解析服务
将Markdown文件解析为结构化的论文数据
"""
import re
from typing import Dict, Any, List, Optional, Tuple
from ..utils.common import generate_id


class MarkdownParserService:
    """Markdown解析服务类"""

    def __init__(self):
        self.section_counter = 0
        self.block_counter = 0
        self.reference_counter = 0

    def parse_markdown_upload(self, file, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        处理文件上传并解析

        Args:
            file: Flask文件对象
            metadata: 可选的补充元数据

        Returns:
            结构化的论文数据
        """
        try:
            content = file.read().decode('utf-8')
            return self.parse_markdown_file(content, metadata)
        except UnicodeDecodeError:
            raise ValueError("文件编码错误，请使用UTF-8编码的Markdown文件")

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

        # 重置计数器
        self.section_counter = 0
        self.block_counter = 0
        self.reference_counter = 0

        # 按行分割内容
        lines = file_content.split('\n')

        # 预拆分章节（仅打印预览，方便后续提示工程）
        section_splits = self.split_sections(lines)
        print("=== Section Split Preview ===")
        for split in section_splits:
            print(f"[Level {split['level']}] Title: {split['title']} (lines {split['start_line']} - {split['end_line']})")
        print("=============================")

        # 解析各个部分
        parsed_metadata = self._parse_metadata(lines, metadata)
        abstract = self._parse_abstract(lines)
        sections = self._parse_sections(lines)
        references = self._parse_references(lines)
        keywords = self._parse_keywords(lines)

        return {
            "metadata": parsed_metadata,
            "abstract": abstract,
            "keywords": keywords,
            "sections": sections,
            "references": references,
            "attachments": {},
            "parseStatus": {
                "status": "completed",
                "progress": 100,
                "message": "Markdown解析完成"
            }
        }

    def split_sections(self, lines: List[str]) -> List[Dict[str, Any]]:
        """
        根据标题层级拆分章节，输出每个一级/二级标题块的范围。
        这一步用于调用大模型前的预检查和提示信息构建。
        """
        sections_info: List[Dict[str, Any]] = []
        active_stack: List[Dict[str, Any]] = []

        def close_sections_until(level: int, end_line: int) -> None:
            """当新标题出现时，关闭栈中层级 >= level 的旧标题。"""
            while active_stack and active_stack[-1]["level"] >= level:
                finished = active_stack.pop()
                finished["end_line"] = end_line - 1
                sections_info.append(finished)

        for idx, raw_line in enumerate(lines):
            stripped = raw_line.strip()
            if not stripped.startswith('#'):
                continue

            heading_match = re.match(r'^(#+)\s+(.*)$', stripped)
            if not heading_match:
                continue

            level = len(heading_match.group(1))
            title = heading_match.group(2).strip()

            close_sections_until(level, idx)

            active_stack.append(
                {
                    "level": level,
                    "title": title,
                    "start_line": idx + 1,
                    "end_line": None,
                }
            )

        # 关闭所有未结束的标题
        total_lines = len(lines)
        close_sections_until(1, total_lines + 1)
        close_sections_until(2, total_lines + 1)
        close_sections_until(3, total_lines + 1)
        close_sections_until(4, total_lines + 1)
        close_sections_until(5, total_lines + 1)
        close_sections_until(6, total_lines + 1)

        # sections_info 里包含所有已关闭的标题块；按出现顺序排序
        sections_info.sort(key=lambda item: item["start_line"])
        return sections_info

    def _parse_metadata(self, lines: List[str], extra_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """解析元数据"""
        metadata = {
            "title": extra_metadata.get("title", ""),
            "authors": [],
            "publication": "",
            "year": extra_metadata.get("year"),
            "doi": "",
            "articleType": "journal",
            "tags": []
        }

        # 从Markdown内容中提取元数据
        i = 0
        while i < len(lines):
            line = lines[i].strip()

            # 标题
            if not metadata["title"] and line.startswith('# '):
                metadata["title"] = line[2:].strip()
                i += 1
                continue

            # 作者信息
            if line.lower().startswith('author') or line.lower().startswith('authors'):
                authors_text = self._extract_value(line)
                if authors_text:
                    # 简单的作者解析，按逗号分割
                    author_names = [name.strip() for name in authors_text.split(',') if name.strip()]
                    metadata["authors"] = [{"name": name} for name in author_names]
                i += 1
                continue

            # 年份
            if not metadata["year"] and (line.lower().startswith('year') or line.lower().startswith('date')):
                year_text = self._extract_value(line)
                if year_text:
                    try:
                        metadata["year"] = int(year_text)
                    except ValueError:
                        pass
                i += 1
                continue

            # DOI
            if line.lower().startswith('doi'):
                doi_text = self._extract_value(line)
                if doi_text:
                    metadata["doi"] = doi_text
                i += 1
                continue

            # 期刊/会议
            if line.lower().startswith('journal') or line.lower().startswith('conference') or line.lower().startswith('publication'):
                pub_text = self._extract_value(line)
                if pub_text:
                    metadata["publication"] = pub_text
                i += 1
                continue

            # 如果遇到空行或内容开始，停止解析元数据
            if line == "" or (line.startswith('#') and metadata["title"]):
                break

            i += 1

        # 使用额外提供的元数据覆盖
        if extra_metadata.get("title"):
            metadata["title"] = extra_metadata["title"]
        if extra_metadata.get("authors"):
            author_names = [name.strip() for name in extra_metadata["authors"].split(',') if name.strip()]
            metadata["authors"] = [{"name": name} for name in author_names]
        if extra_metadata.get("year"):
            try:
                metadata["year"] = int(extra_metadata["year"])
            except ValueError:
                pass

        return metadata

    def _parse_abstract(self, lines: List[str]) -> Optional[Dict[str, Any]]:
        """解析摘要"""
        abstract_start = -1
        abstract_end = -1

        for i, line in enumerate(lines):
            if line.lower().strip() in ['## abstract', '## 摘要', '# abstract', '# 摘要']:
                abstract_start = i + 1
                continue
            elif abstract_start != -1 and (line.startswith('## ') or line.startswith('# ') or line.strip() == ''):
                if line.strip() == '':
                    continue
                else:
                    abstract_end = i
                    break

        if abstract_start == -1:
            return None

        if abstract_end == -1:
            abstract_end = len(lines)

        abstract_lines = lines[abstract_start:abstract_end]
        abstract_text = '\n'.join(abstract_lines).strip()

        if not abstract_text:
            return None

        return {"en": abstract_text}

    def _parse_sections(self, lines: List[str]) -> List[Dict[str, Any]]:
        """解析章节"""
        sections = []
        current_section = None
        current_content = []

        i = 0
        while i < len(lines):
            line = lines[i]

            # 检查是否是章节标题
            if line.startswith('## '):
                # 保存之前的章节
                if current_section:
                    current_section["content"] = self._parse_blocks(current_content)
                    sections.append(current_section)

                # 创建新章节
                self.section_counter += 1
                section_title = line[3:].strip()
                current_section = {
                    "id": f"section_{self.section_counter}",
                    "number": str(self.section_counter),
                    "title": {"en": section_title},
                    "content": []
                }
                current_content = []
                i += 1
                continue

            # 如果在章节内，收集内容
            if current_section:
                current_content.append(line)

            i += 1

        # 保存最后一个章节
        if current_section:
            current_section["content"] = self._parse_blocks(current_content)
            sections.append(current_section)

        return sections

    def _parse_blocks(self, lines: List[str]) -> List[Dict[str, Any]]:
        """解析块内容"""
        blocks = []
        current_paragraph = []

        for line in lines:
            line = line.rstrip()

            # 空行表示段落结束
            if line.strip() == "":
                if current_paragraph:
                    blocks.append(self._create_paragraph_block(current_paragraph))
                    current_paragraph = []
                continue

            # 检查是否是列表项
            if line.strip().startswith(('- ', '* ', '+ ')):
                if current_paragraph:
                    blocks.append(self._create_paragraph_block(current_paragraph))
                    current_paragraph = []
                blocks.append(self._create_list_block(line))
                continue

            # 检查是否是代码块
            if line.strip().startswith('```'):
                if current_paragraph:
                    blocks.append(self._create_paragraph_block(current_paragraph))
                    current_paragraph = []
                code_block, end_index = self._parse_code_block(lines[lines.index(line):])
                if code_block:
                    blocks.append(code_block)
                continue

            # 普通段落内容
            current_paragraph.append(line)

        # 保存最后一个段落
        if current_paragraph:
            blocks.append(self._create_paragraph_block(current_paragraph))

        return blocks

    def _create_paragraph_block(self, lines: List[str]) -> Dict[str, Any]:
        """创建段落块"""
        self.block_counter += 1
        text = ' '.join(line.strip() for line in lines if line.strip())
        return {
            "id": f"block_{self.block_counter}",
            "type": "paragraph",
            "content": [{"type": "text", "text": text}]
        }

    def _create_list_block(self, line: str) -> Dict[str, Any]:
        """创建列表块"""
        self.block_counter += 1
        # 简单的列表项处理
        item_text = line.strip()[2:].strip()
        return {
            "id": f"block_{self.block_counter}",
            "type": "list",
            "content": [{"type": "text", "text": item_text}]
        }

    def _parse_code_block(self, lines: List[str]) -> Tuple[Optional[Dict[str, Any]], int]:
        """解析代码块"""
        if not lines or not lines[0].strip().startswith('```'):
            return None, 0

        # 获取语言标识
        first_line = lines[0].strip()
        language = ""
        if len(first_line) > 3:
            language = first_line[3:].strip()

        # 找到代码块结束
        end_index = 1
        code_lines = []
        while end_index < len(lines):
            if lines[end_index].strip() == '```':
                break
            code_lines.append(lines[end_index])
            end_index += 1

        if end_index >= len(lines):
            return None, 0

        self.block_counter += 1
        code_text = '\n'.join(code_lines)

        return {
            "id": f"block_{self.block_counter}",
            "type": "code",
            "content": [{"type": "text", "text": code_text, "language": language}]
        }, end_index + 1

    def _parse_references(self, lines: List[str]) -> List[Dict[str, Any]]:
        """解析参考文献"""
        references = []
        references_start = -1

        # 查找参考文献部分
        for i, line in enumerate(lines):
            if line.lower().strip() in ['## references', '## 参考文献', '# references', '# 参考文献']:
                references_start = i + 1
                break

        if references_start == -1:
            return references

        # 解析参考文献条目
        for line in lines[references_start:]:
            line = line.strip()
            if not line:
                continue

            # 检查是否是参考文献格式 [1] 或 1.
            if re.match(r'^\[\d+\]|\d+\.', line):
                ref_text = re.sub(r'^\[\d+\]|\d+\.\s*', '', line).strip()
                if ref_text:
                    self.reference_counter += 1
                    references.append({
                        "id": f"ref_{self.reference_counter}",
                        "number": self.reference_counter,
                        "title": ref_text,
                        "authors": [],
                        "publication": "",
                        "year": None
                    })

        return references

    def _parse_keywords(self, lines: List[str]) -> List[str]:
        """解析关键词"""
        keywords = []

        for line in lines:
            line = line.strip().lower()
            if line.startswith('keywords') or line.startswith('关键词'):
                # 提取关键词
                keywords_text = self._extract_value(line)
                if keywords_text:
                    # 按逗号分割关键词
                    keywords = [kw.strip() for kw in keywords_text.split(',') if kw.strip()]
                break

        return keywords

    def _extract_value(self, line: str) -> str:
        """从键值对行中提取值"""
        # 支持多种格式：key: value, key=value, key value
        separators = [':', '=', ' ']

        for sep in separators:
            if sep in line:
                parts = line.split(sep, 1)
                if len(parts) == 2:
                    return parts[1].strip()

        return ""


# 单例模式
_markdown_parser_service: Optional[MarkdownParserService] = None


def get_markdown_parser_service() -> MarkdownParserService:
    """获取MarkdownParserService单例"""
    global _markdown_parser_service
    if _markdown_parser_service is None:
        _markdown_parser_service = MarkdownParserService()
    return _markdown_parser_service
