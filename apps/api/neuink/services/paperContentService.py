"""
Paper 内容操作服务
处理论文内容相关的操作（章节、块、参考文献）
"""
import time
import uuid
import re
from typing import Dict, Any, Optional, List, Tuple
from ..models.paper import PaperModel
from ..config.constants import BusinessCode
from ..utils.llm_utils import get_llm_utils


class PaperContentService:
    """Paper 内容操作服务类"""

    def __init__(self, paper_model: PaperModel) -> None:
        self.paper_model = paper_model

    # ------------------------------------------------------------------
    # Section 操作
    # ------------------------------------------------------------------
    def add_section(
        self,
        paper_id: str,
        section_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False,
        parent_section_id: Optional[str] = None,
        position: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        向论文添加新章节
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 获取当前sections
            sections = paper.get("sections", [])
            
            # 确保新章节有必要的字段
            title_data = section_data.get("title", {})
            title_zh_data = section_data.get("titleZh", "")
            
            if isinstance(title_data, dict) and "en" in title_data:
                new_section = {
                    "id": section_data.get("id"),
                    "title": title_data.get("en", "Untitled Section"),
                    "titleZh": title_data.get("zh", title_zh_data or "未命名章节"),
                    "content": section_data.get("content", [])
                }
            else:
                new_section = {
                    "id": section_data.get("id"),
                    "title": title_data if title_data else "Untitled Section",
                    "titleZh": title_zh_data if title_zh_data else "未命名章节",
                    "content": section_data.get("content", [])
                }
            
            # 如果没有提供ID，生成一个
            if not new_section["id"]:
                new_section["id"] = f"section_{len(sections) + 1}_{int(time.time())}"
            
            # 确定插入位置
            if position is None:
                position = -1
                
            # 添加到根级章节
            if position == -1:
                sections.append(new_section)
            elif 0 <= position < len(sections):
                sections.insert(position, new_section)
            else:
                sections.append(new_section)
            
            # 更新论文
            update_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_data):
                return self._wrap_success(
                    "成功添加章节",
                    {
                        "addedSection": new_section,
                        "addedSectionId": new_section["id"],
                        "parentSectionId": parent_section_id,
                        "position": position
                    }
                )
            else:
                return self._wrap_error("更新论文失败")

        except Exception as exc:
            return self._wrap_error(f"添加章节失败: {exc}")

    def update_section(
        self,
        paper_id: str,
        section_id: str,
        update_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """
        更新指定章节
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 查找并更新section
            sections = paper.get("sections", [])
            target_section = None
            section_index = -1
            
            for i, section in enumerate(sections):
                if section.get("id") == section_id:
                    target_section = section
                    section_index = i
                    break
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")

            # 更新section数据
            for key, value in update_data.items():
                if key == "title":
                    if isinstance(value, dict) and "en" in value:
                        target_section["title"] = value.get("en", "")
                        zh_value = value.get("zh", "")
                        if zh_value and zh_value.strip() != "未命名章节":
                            target_section["titleZh"] = zh_value
                    else:
                        target_section["title"] = value
                elif key == "titleZh":
                    target_section["titleZh"] = value
                elif key == "content":
                    target_section[key] = value

            sections[section_index] = target_section

            # 更新论文
            update_paper_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_paper_data):
                return self._wrap_success(
                    "章节更新成功",
                    {
                        "updatedSection": target_section,
                        "sectionId": section_id
                    }
                )
            else:
                return self._wrap_error("更新论文失败")

        except Exception as exc:
            return self._wrap_error(f"更新章节失败: {exc}")

    def delete_section(
        self,
        paper_id: str,
        section_id: str,
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """
        删除指定章节
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 查找并删除section
            sections = paper.get("sections", [])
            target_section = None
            section_index = -1
            
            for i, section in enumerate(sections):
                if section.get("id") == section_id:
                    target_section = section
                    section_index = i
                    break
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")

            # 删除section
            sections.pop(section_index)

            # 更新论文
            update_paper_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_paper_data):
                return self._wrap_success("章节删除成功", {
                    "deletedSectionId": section_id
                })
            else:
                return self._wrap_error("更新论文失败")

        except Exception as exc:
            return self._wrap_error(f"删除章节失败: {exc}")

    # ------------------------------------------------------------------
    # Block 操作
    # ------------------------------------------------------------------
    def add_blocks_to_section(
        self,
        paper_id: str,
        section_id: str,
        text: str,
        user_id: str,
        is_admin: bool = False,
        after_block_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        使用大模型解析文本并将生成的blocks添加到指定section中
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 检查输入文本
            if not text or not text.strip():
                return self._wrap_error("文本内容不能为空")

            # 查找目标section
            sections = paper.get("sections", [])
            target_section = None
            section_index = -1
            
            for i, section in enumerate(sections):
                if section.get("id") == section_id:
                    target_section = section
                    section_index = i
                    break
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")

            # 获取section上下文信息
            section_context = f"Section标题: {target_section.get('title', '未知')}"
            if target_section.get('content'):
                section_context += f", Section内容: {target_section['content'][:200]}..."

            # 使用LLM解析文本为blocks
            llm_utils = get_llm_utils()
            try:
                new_blocks = llm_utils.parse_text_to_blocks(text, section_context)
            except Exception as llm_exc:
                raise Exception(f"LLM文本解析失败: {llm_exc}")

            if not new_blocks:
                return self._wrap_error("文本解析失败，无法生成有效的blocks")

            # 将新blocks添加到section中
            if "content" not in target_section:
                target_section["content"] = []
            
            # 根据after_block_id确定插入位置
            current_blocks = target_section["content"]
            insert_index = len(current_blocks)
            
            if after_block_id:
                for i, block in enumerate(current_blocks):
                    if block.get("id") == after_block_id:
                        insert_index = i + 1
                        break
            
            # 使用MongoDB原子更新操作
            if insert_index == len(current_blocks):
                # 在末尾添加，使用$push
                update_operation = {
                    "$push": {
                        f"sections.{section_index}.content": {
                            "$each": new_blocks
                        }
                    }
                }
            else:
                # 在中间插入，使用$push配合$position，避免替换整个数组
                update_operation = {
                    "$push": {
                        f"sections.{section_index}.content": {
                            "$each": new_blocks,
                            "$position": insert_index
                        }
                    }
                }
            
            # 执行原子更新
            if self.paper_model.update(paper_id, update_operation):
                return self._wrap_success(
                    f"成功向section添加了{len(new_blocks)}个blocks",
                    {
                        "addedBlocks": new_blocks,
                        "sectionId": section_id
                    }
                )
            else:
                return self._wrap_error("更新论文失败")

        except Exception as exc:
            return self._wrap_error(f"添加blocks到section失败: {exc}")

    def update_block(
        self,
        paper_id: str,
        section_id: str,
        block_id: str,
        update_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """
        更新指定block
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 查找目标section
            sections = paper.get("sections", [])
            target_section = None
            section_index = -1
            
            for i, section in enumerate(sections):
                if section.get("id") == section_id:
                    target_section = section
                    section_index = i
                    break
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")

            # 查找并更新block
            blocks = target_section.get("content", [])
            target_block_index = -1
            
            for i, block in enumerate(blocks):
                if block.get("id") == block_id:
                    target_block_index = i
                    break
            
            if target_block_index == -1:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的block不存在")

            # 更新block数据
            target_block = blocks[target_block_index]
            for key, value in update_data.items():
                if key in ["content", "type", "metadata", "src", "alt", "width", "height", "caption", "description", "uploadedFilename"]:
                    target_block[key] = value

            blocks[target_block_index] = target_block
            target_section["content"] = blocks
            sections[section_index] = target_section

            # 更新论文
            update_paper_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_paper_data):
                return self._wrap_success(
                    "block更新成功",
                    {
                        "updatedBlock": target_block,
                        "blockId": target_block["id"],
                        "sectionId": section_id
                    }
                )
            else:
                return self._wrap_error("更新论文失败")

        except Exception as exc:
            return self._wrap_error(f"更新block失败: {exc}")

    def delete_block(
        self,
        paper_id: str,
        section_id: str,
        block_id: str,
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """
        删除指定block
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 查找目标section
            sections = paper.get("sections", [])
            target_section = None
            section_index = -1
            
            for i, section in enumerate(sections):
                if section.get("id") == section_id:
                    target_section = section
                    section_index = i
                    break
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")

            # 查找并删除block
            blocks = target_section.get("content", [])
            target_block_index = -1
            
            for i, block in enumerate(blocks):
                if block.get("id") == block_id:
                    target_block_index = i
                    break
            
            if target_block_index == -1:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的block不存在")

            # 删除block
            blocks.pop(target_block_index)
            target_section["content"] = blocks
            sections[section_index] = target_section

            # 更新论文
            update_paper_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_paper_data):
                return self._wrap_success("block删除成功", {
                    "deletedBlockId": block_id,
                    "sectionId": section_id
                })
            else:
                return self._wrap_error("更新论文失败")

        except Exception as exc:
            return self._wrap_error(f"删除block失败: {exc}")

    def add_block_directly(
        self,
        paper_id: str,
        section_id: str,
        block_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False,
        after_block_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        直接向指定section添加一个block，不通过LLM解析
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 验证block数据
            if not block_data or not block_data.get("type"):
                return self._wrap_error("block数据不完整，缺少type字段")

            # 查找目标section
            sections = paper.get("sections", [])
            target_section = None
            section_index = -1
            
            for i, section in enumerate(sections):
                if section.get("id") == section_id:
                    target_section = section
                    section_index = i
                    break
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")

            # 确保section有content字段
            if "content" not in target_section:
                target_section["content"] = []
            
            # 根据after_block_id确定插入位置
            current_blocks = target_section["content"]
            insert_index = len(current_blocks)
            
            if after_block_id:
                for i, block in enumerate(current_blocks):
                    if block.get("id") == after_block_id:
                        insert_index = i + 1
                        break
            
            # 创建新block
            frontend_id = block_data.get("id")
            if frontend_id and isinstance(frontend_id, str):
                new_block_id = frontend_id
            else:
                new_block_id = f"block_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            
            new_block = {
                "id": new_block_id,
                "type": block_data.get("type"),
                "content": block_data.get("content", {}),
                "metadata": block_data.get("metadata", {}),
            }
            
            # 根据不同类型设置默认值
            if block_data.get("type") == "math" and "latex" in block_data:
                new_block["latex"] = block_data["latex"]
            elif block_data.get("type") == "code" and "code" in block_data:
                new_block["code"] = block_data["code"]
                new_block["language"] = block_data.get("language", "python")
            elif block_data.get("type") == "figure" and "url" in block_data:
                new_block["url"] = block_data["url"]
                new_block["alt"] = block_data.get("alt", "")
            elif block_data.get("type") == "table":
                new_block["headers"] = block_data.get("headers", ["Column 1", "Column 2"])
                new_block["rows"] = block_data.get("rows", [[]])
            elif block_data.get("type") in ["ordered-list", "unordered-list"]:
                new_block["items"] = block_data.get("items", [
                    {
                        "content": {
                            "en": [{"type": "text", "content": "First item"}],
                            "zh": [{"type": "text", "content": "第一项"}]
                        }
                    },
                    {
                        "content": {
                            "en": [{"type": "text", "content": "Second item"}],
                            "zh": [{"type": "text", "content": "第二项"}]
                        }
                    }
                ])
                if block_data.get("type") == "ordered-list":
                    new_block["start"] = block_data.get("start", 1)
            elif block_data.get("type") == "quote":
                new_block["author"] = block_data.get("author", "Author")
            elif block_data.get("type") == "heading":
                new_block["level"] = block_data.get("level", 2)
            
            # 使用MongoDB原子更新操作
            if insert_index == len(current_blocks):
                # 在末尾添加，使用$push
                update_operation = {
                    "$push": {
                        f"sections.{section_index}.content": new_block
                    }
                }
            else:
                # 在中间插入，使用$push配合$position，避免替换整个数组
                update_operation = {
                    "$push": {
                        f"sections.{section_index}.content": {
                            "$each": [new_block],
                            "$position": insert_index
                        }
                    }
                }
            
            # 执行原子更新
            if self.paper_model.update(paper_id, update_operation):
                return self._wrap_success(
                    "成功添加block",
                    {
                        "addedBlock": new_block,
                        "blockId": new_block["id"],
                        "sectionId": section_id
                    }
                )
            else:
                return self._wrap_error("更新论文失败")

        except Exception as exc:
            return self._wrap_error(f"添加block失败: {exc}")

    def add_block_from_text(
        self,
        paper_id: str,
        section_id: str,
        text: str,
        user_id: str,
        is_admin: bool = False,
        after_block_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        使用大模型解析文本并将生成的block添加到指定section中
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 检查输入文本
            if not text or not text.strip():
                return self._wrap_error("文本内容不能为空")

            # 查找目标section
            sections = paper.get("sections", [])
            target_section = None
            section_index = -1
            
            for i, section in enumerate(sections):
                if section.get("id") == section_id:
                    target_section = section
                    section_index = i
                    break
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")

            # 获取section上下文信息
            section_context = f"Section标题: {target_section.get('title', '未知')}"
            if target_section.get('content'):
                section_context += f", Section内容: {target_section['content'][:200]}..."

            # 使用LLM解析文本为blocks
            llm_utils = get_llm_utils()
            try:
                new_blocks = llm_utils.parse_text_to_blocks(text, section_context)
            except Exception as llm_exc:
                raise Exception(f"LLM文本解析失败: {llm_exc}")

            if not new_blocks:
                return self._wrap_error("文本解析失败，无法生成有效的blocks")

            # 将新blocks添加到section中
            if "content" not in target_section:
                target_section["content"] = []
            
            # 根据after_block_id确定插入位置
            current_blocks = target_section["content"]
            insert_index = len(current_blocks)
            
            if after_block_id:
                for i, block in enumerate(current_blocks):
                    if block.get("id") == after_block_id:
                        insert_index = i + 1
                        break
            
            # 使用MongoDB原子更新操作
            if insert_index == len(current_blocks):
                # 在末尾添加，使用$push
                update_operation = {
                    "$push": {
                        f"sections.{section_index}.content": {
                            "$each": new_blocks
                        }
                    }
                }
            else:
                # 在中间插入，使用$push配合$position，避免替换整个数组
                update_operation = {
                    "$push": {
                        f"sections.{section_index}.content": {
                            "$each": new_blocks,
                            "$position": insert_index
                        }
                    }
                }
            
            # 执行原子更新
            if self.paper_model.update(paper_id, update_operation):
                return self._wrap_success(
                    f"成功向section添加了{len(new_blocks)}个blocks",
                    {
                        "addedBlocks": new_blocks,
                        "sectionId": section_id
                    }
                )
            else:
                return self._wrap_error("更新论文失败")

        except Exception as exc:
            import traceback
            error_details = f"从文本添加block到section失败: {exc}\n详细错误: {traceback.format_exc()}"
            return self._wrap_error(error_details)

    # ------------------------------------------------------------------
    # 参考文献操作
    # ------------------------------------------------------------------
    def parse_references(self, text: str) -> Dict[str, Any]:
        """
        解析参考文献文本，返回结构化的参考文献列表
        """
        try:
            # 使用parse_reference_text方法解析参考文献
            result = self.parse_reference_text(text)
            
            # 检查是否有任何成功解析的参考文献
            if not result["references"] and not result["errors"]:
                return self._wrap_error("参考文献解析失败，无法提取有效的参考文献")
            
            # 返回包含成功解析的参考文献和错误信息的结果
            return self._wrap_success(
                "参考文献解析完成",
                {
                    "references": result["references"],
                    "count": result["count"],
                    "errors": result["errors"]
                }
            )
        except Exception as exc:
            return self._wrap_error(f"参考文献解析失败: {exc}")

    @staticmethod
    def parse_reference_text(text: str) -> Dict[str, Any]:
        """
        简化的参考文献解析方法，主要提取标题和原始文本
        """
        # 分条
        def split_entries(s: str) -> List[Tuple[Optional[int], str]]:
            """分割参考文献条目"""
            items: List[Tuple[Optional[int], str]] = []
            matches = list(re.finditer(r'\[(\d+)\]\s*', s))
            if not matches:
                return [(None, s.strip())]
            for i, m in enumerate(matches):
                idx = int(m.group(1))
                start = m.end()
                end = matches[i + 1].start() if i + 1 < len(matches) else len(s)
                raw = s[start:end].strip().rstrip('.')
                items.append((idx, raw))
            return items

        # 提取标题
        def extract_title(raw: str) -> str:
            """从原始文本中提取标题（在引号内的内容）"""
            # 尝试匹配双引号内的标题
            m = re.search(r'"([^"]+)"', raw)
            if m:
                return m.group(1).strip()
            
            # 尝试匹配单引号内的标题
            m = re.search(r"'([^']+)'", raw)
            if m:
                return m.group(1).strip()
            
            # 如果没有引号，尝试提取第一个逗号前的内容作为标题
            parts = raw.split(',', 1)
            if len(parts) > 1:
                return parts[0].strip()
            
            # 如果都没有，返回整个文本的前50个字符作为标题
            return raw[:50].strip() + ('...' if len(raw) > 50 else '')

        def parse_one(raw: str, idx: Optional[int]) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
            print(f"\n[解析开始] 处理参考文献 #{idx}: '{raw[:100]}...'")
            
            # 提取标题
            title = extract_title(raw)
            print(f"[解析过程] 提取的标题: '{title}'")
            
            # 提取年份
            year_match = re.search(r'(19|20|21)\d{2}', raw)
            year = int(year_match.group()) if year_match else None
            print(f"[解析过程] 提取的年份: {year}")
            
            # 创建参考文献记录
            rec = {
                'index': idx,
                'type': 'journal',
                'authors': [],
                'has_et_al': False,
                'title': title,
                'venue': '',
                'volume': None,
                'number': None,
                'pages': None,
                'article_no': None,
                'year': year,
                'doi': None,
                'eprint': None,
                'eprint_type': None,
                'raw': raw.strip(),
                'is_incomplete': False if title else True,
                'originalText': raw.strip()
            }
            
            if not title:
                error_message = '未能提取标题'
                rec['is_incomplete'] = True
                rec['title'] = f'【解析错误】{error_message}'
                err = {'index': idx, 'raw': raw.strip(), 'message': error_message}
                print(f"[解析错误] {error_message}")
                return rec, err
            
            print(f"[解析成功] 标题: {rec.get('title', '')}, 年份: {rec.get('year', '')}")
            return rec, None

        refs: List[Dict[str, Any]] = []
        errors: List[Dict[str, Any]] = []
        
        entries = split_entries(text)
        print(f"\n[参考文献解析] 开始解析{len(entries)}条参考文献")
        
        for idx, raw in entries:
            rec, err = parse_one(raw, idx)
            if rec:
                refs.append(rec)
                if rec.get('is_incomplete', False) and err:
                    errors.append(err)
            elif err:
                errors.append(err)

        print(f"\n[参考文献解析] 解析完成: 成功{len(refs)}条，失败{len(errors)}条")
        if errors:
            print(f"[参考文献解析] 解析错误列表:")
            for err in errors:
                print(f"  - 索引{err.get('index')}: {err.get('message')}")
        
        return {
            'references': refs,
            'count': len(refs),
            'errors': errors,
        }

    def add_references_to_paper(
        self,
        paper_id: str,
        references: List[Dict[str, Any]],
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """
        将解析后的参考文献添加到论文中，只保存原始文本，不进行重复检测
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 获取当前参考文献列表
            current_references = paper.get("references", [])
            
            # 按照解析出的index字段排序
            sorted_references = sorted(references, key=lambda x: x.get("index", 0))
            
            # 处理参考文献：直接添加，不进行重复检测
            added_references = []
            
            print(f"\n[参考文献处理] 开始处理{len(sorted_references)}条参考文献")
            print(f"[参考文献处理] 当前已有{len(current_references)}条参考文献")
            
            for ref in sorted_references:
                ref_index = ref.get("index")
                
                print(f"\n[参考文献处理] 处理参考文献 #{ref_index}")
                
                if ref_index is None:
                    print(f"[参考文献处理] 跳过索引为None的参考文献")
                    continue
                
                ref_id = f"ref-{ref_index}"
                ref_number = ref_index
                
                new_ref = {
                    "id": ref_id,
                    "number": ref_number,
                    "authors": ref.get("authors", []),
                    "title": ref.get("title", ""),
                    "publication": ref.get("venue"),
                    "year": ref.get("year"),
                    "doi": ref.get("doi"),
                    "url": None,
                    "pages": ref.get("pages"),
                    "volume": ref.get("volume"),
                    "issue": ref.get("number"),
                    "originalText": ref.get("originalText", "")
                }
                
                # 移除空值字段
                new_ref = {k: v for k, v in new_ref.items() if v is not None}
                
                print(f"[参考文献处理] 添加新参考文献")
                added_references.append(new_ref)
                current_references.append(new_ref)
            
            # 更新论文
            update_data = {"references": current_references}
            if self.paper_model.update(paper_id, update_data):
                result_message = f"成功添加{len(added_references)}条参考文献"
                
                return self._wrap_success(
                    result_message,
                    {
                        "addedReferences": added_references,
                        "totalProcessed": len(sorted_references),
                        "totalReferences": len(current_references)
                    }
                )
            else:
                return self._wrap_error("更新论文失败")
                
        except Exception as exc:
            return self._wrap_error(f"添加参考文献失败: {exc}")

    # ------------------------------------------------------------------
    # 辅助方法
    # ------------------------------------------------------------------
    @staticmethod
    def _wrap_success(message: str, data: Any) -> Dict[str, Any]:
        return {
            "code": BusinessCode.SUCCESS,
            "message": message,
            "data": data,
        }

    @staticmethod
    def _wrap_failure(code: int, message: str) -> Dict[str, Any]:
        return {
            "code": code,
            "message": message,
            "data": None,
        }

    @staticmethod
    def _wrap_error(message: str) -> Dict[str, Any]:
        return {
            "code": BusinessCode.INTERNAL_ERROR,
            "message": message,
            "data": None,
        }
