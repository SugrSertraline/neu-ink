"""
Paper 业务逻辑服务
处理论文相关的业务逻辑
"""
import time
import uuid
import random
from typing import Dict, Any, Optional, Tuple, List
import re
from ..models.paper import PaperModel
from ..config.constants import BusinessCode
from ..utils.llm_utils import get_llm_utils
from ..utils.common import get_current_time


class PaperService:
    """Paper 业务逻辑服务类"""

    def __init__(self) -> None:
        self.paper_model = PaperModel()

    # ------------------------------------------------------------------
    # 公共论文库
    # ------------------------------------------------------------------
    def get_public_papers(
        self,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
        search: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        try:
            skip = self._calc_skip(page, page_size)
            sort_direction = self._parse_sort_order(sort_order)
            filters = filters or {}

            papers, total = self.paper_model.find_public_papers(
                skip=skip,
                limit=page_size,
                sort_by=sort_by,
                sort_order=sort_direction,
                search=search,
                filters=filters,
            )

            payload = [self._build_public_summary(paper) for paper in papers]
            return self._wrap_success(
                "获取公开论文成功",
                {
                    "papers": payload,
                    "pagination": self._build_pagination(total, page, page_size),
                },
            )
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取公开论文失败: {exc}")

    def get_public_paper_detail(self, paper_id: str) -> Dict[str, Any]:
        try:
            paper = self.paper_model.find_public_paper_by_id(paper_id)
            if not paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND, "论文不存在或不可访问"
                )
            
            # 自动检查并补全翻译
            paper = self._auto_check_and_complete_translation(paper)
            
            return self._wrap_success("获取论文成功", paper)
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取论文失败: {exc}")

    def get_public_paper_content(self, paper_id: str) -> Dict[str, Any]:
        detail = self.get_public_paper_detail(paper_id)
        if detail["code"] != BusinessCode.SUCCESS or not detail["data"]:
            return detail

        paper = detail["data"]
        content = {
            "metadata": paper.get("metadata", {}),
            "abstract": paper.get("abstract"),
            "keywords": paper.get("keywords", []),
            "sections": paper.get("sections", []),
            "references": paper.get("references", []),
            "attachments": paper.get("attachments", {}),
        }
        return self._wrap_success("获取论文内容成功", content)

    # ------------------------------------------------------------------
    # 管理端接口
    # ------------------------------------------------------------------
    def get_admin_papers(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
        search: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        try:
            skip = self._calc_skip(page, page_size)
            sort_direction = self._parse_sort_order(sort_order)

            papers, total = self.paper_model.find_admin_papers(
                user_id=user_id,
                skip=skip,
                limit=page_size,
                sort_by=sort_by,
                sort_order=sort_direction,
                search=search,
                filters=filters or {},
            )

            return self._wrap_success(
                "获取论文列表成功",
                {
                    "papers": papers,
                    "pagination": self._build_pagination(total, page, page_size),
                },
            )
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取论文列表失败: {exc}")


    def get_admin_paper_detail(self, paper_id: str, user_id: str) -> Dict[str, Any]:
        paper = self.paper_model.find_admin_paper_by_id(paper_id)
        if not paper:
            return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")
        
        # 自动检查并补全翻译
        paper = self._auto_check_and_complete_translation(paper)
        
        return self._wrap_success("获取论文成功", paper)

    def create_paper(self, paper_data: Dict[str, Any], creator_id: str) -> Dict[str, Any]:
        try:
            paper_data["createdBy"] = creator_id
            paper = self.paper_model.create(paper_data)
            return self._wrap_success("论文创建成功", paper)
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"创建论文失败: {exc}")

    def create_paper_from_text(self, text: str, creator_id: str, is_public: bool = True) -> Dict[str, Any]:
        """
        从文本创建论文，通过大模型解析 metadata、abstract 和 keywords
        """
        try:
            # 检查输入文本
            if not text or not text.strip():
                return self._wrap_error("文本内容不能为空")

            # 使用 LLM 工具类解析文本
            llm_utils = get_llm_utils()
            parsed_data = llm_utils.extract_paper_metadata(text)

            if not parsed_data:
                return self._wrap_error("文本解析失败，无法提取论文元数据。请检查文本格式或尝试使用手动输入。")

            # 验证解析结果
            metadata = parsed_data.get("metadata", {})
            if not metadata.get("title"):
                return self._wrap_error("解析结果中缺少标题信息，请尝试使用手动输入或重新格式化文本。")
            
            # 确保标题使用新的结构（title 和 titleZh）
            if "title" in metadata and isinstance(metadata["title"], dict):
                # 如果是旧格式 {en: "...", zh: "..."}，转换为新格式
                title_obj = metadata["title"]
                if "en" in title_obj:
                    metadata["title"] = title_obj["en"]
                if "zh" in title_obj:
                    metadata["titleZh"] = title_obj["zh"]

            # 构建论文数据，只包含 metadata、abstract 和 keywords
            # 确保 abstract 使用字符串格式
            abstract_data = parsed_data.get("abstract", {})
            if isinstance(abstract_data, dict):
                abstract = {
                    "en": str(abstract_data.get("en", "")),
                    "zh": str(abstract_data.get("zh", ""))
                }
            else:
                abstract = {"en": str(abstract_data), "zh": ""}
            
            paper_data = {
                "isPublic": is_public,
                "metadata": metadata,
                "abstract": abstract,
                "keywords": parsed_data.get("keywords", []),
                "sections": [],  # 空的章节列表
                "references": [],  # 空的参考文献列表
                "attachments": {},  # 空的附件
                "translationStatus": {
                    "isComplete": False,
                    "lastChecked": None,
                    "missingFields": [],
                    "updatedAt": get_current_time().isoformat()
                },
                "parseStatus": {
                    "status": "partial",
                    "progress": 30,
                    "message": "已解析基本信息（metadata、abstract、keywords），章节内容待补充",
                },
            }

            # 创建论文
            return self.create_paper(paper_data, creator_id)
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"从文本创建论文失败: {exc}")

    def create_paper_from_metadata(self, metadata: Dict[str, Any], creator_id: str, is_public: bool = False) -> Dict[str, Any]:
        """
        从元数据创建论文，直接提供 metadata、abstract 和 keywords 等信息

        Args:
            metadata: 论文元数据，包含 title, authors, year 等
            creator_id: 创建者ID
            is_public: 是否公开（个人论文设为False）

        Returns:
            创建结果
        """
        try:
            # 验证必填字段
            if not metadata or not metadata.get("title"):
                return self._wrap_error("元数据不完整，标题不能为空")
            
            # 确保标题使用新的结构（title 和 titleZh）
            if "title" in metadata and isinstance(metadata["title"], dict):
                # 如果是旧格式 {en: "...", zh: "..."}，转换为新格式
                title_obj = metadata["title"]
                if "en" in title_obj:
                    metadata["title"] = title_obj["en"]
                if "zh" in title_obj:
                    metadata["titleZh"] = title_obj["zh"]

            # 构建论文数据，确保 abstract 使用字符串格式
            abstract_data = metadata.get("abstract", "")
            if isinstance(abstract_data, dict):
                abstract = {
                    "en": str(abstract_data.get("en", "")),
                    "zh": str(abstract_data.get("zh", ""))
                }
            else:
                abstract = {"en": str(abstract_data), "zh": ""}
            
            paper_data = {
                "isPublic": is_public,
                "metadata": metadata,
                "abstract": abstract,
                "keywords": metadata.get("keywords", []),
                "sections": [],  # 空的章节列表
                "references": [],  # 空的参考文献列表
                "attachments": {},  # 空的附件
                "translationStatus": {
                    "isComplete": False,
                    "lastChecked": None,
                    "missingFields": [],
                    "updatedAt": get_current_time().isoformat()
                },
                "parseStatus": {
                    "status": "partial",
                    "progress": 20,
                    "message": "已提供基本元数据，章节内容待补充",
                },
            }

            # 创建论文
            return self.create_paper(paper_data, creator_id)
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"从元数据创建论文失败: {exc}")

    def _auto_check_and_complete_translation(self, paper: Dict[str, Any]) -> Dict[str, Any]:
        """
        自动检查并补全论文的翻译
        此方法在用户查看论文时自动调用，对用户透明
        
        Args:
            paper: 论文数据
            
        Returns:
            更新后的论文数据
        """
        try:
            # 检查并补全翻译
            updated_paper, _ = self._check_and_translate_paper(paper, get_llm_utils())
            
            if updated_paper and "id" in paper:
                # 更新论文到数据库
                update_data = {
                    "metadata": updated_paper.get("metadata", {}),
                    "abstract": updated_paper.get("abstract", {}),
                    "sections": updated_paper.get("sections", [])
                }
                self.paper_model.update(paper["id"], update_data)
                # 重新获取最新数据
                updated_paper = self.paper_model.find_by_id(paper["id"])
                return updated_paper
            
            return paper
            
        except Exception as e:
            # 翻译过程中出错不影响论文的正常访问，只记录日志
            print(f"自动翻译检查失败: {e}")
            return paper

    def get_paper_by_id(
        self,
        paper_id: str,
        user_id: Optional[str] = None,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        paper = self.paper_model.find_by_id(paper_id)
        if not paper:
            return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

        if not paper["isPublic"] and not is_admin and user_id and paper["createdBy"] != user_id:
            return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权访问此论文")

        # 自动检查并补全翻译
        paper = self._auto_check_and_complete_translation(paper)

        return self._wrap_success("获取论文成功", paper)

    def update_paper(
        self,
        paper_id: str,
        update_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        paper = self.paper_model.find_by_id(paper_id)
        if not paper:
            return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

        if not is_admin and paper["createdBy"] != user_id:
            return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

        for field in ["id", "createdBy", "createdAt"]:
            update_data.pop(field, None)

        if self.paper_model.update(paper_id, update_data):
            updated = self.paper_model.find_by_id(paper_id)
            return self._wrap_success("论文更新成功", updated)

        return self._wrap_error("论文更新失败")

    def delete_paper(
        self,
        paper_id: str,
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        paper = self.paper_model.find_by_id(paper_id)
        if not paper:
            return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

        if not is_admin and paper["createdBy"] != user_id:
            return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权删除此论文")

        if self.paper_model.delete(paper_id):
            return self._wrap_success("论文删除成功", None)

        return self._wrap_error("论文删除失败")

    def update_paper_visibility(
        self,
        paper_id: str,
        is_public: bool,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        管理员修改论文的可见状态
        
        Args:
            paper_id: 论文ID
            is_public: 是否公开 (True: 公开, False: 私有)
            user_id: 操作用户ID
            
        Returns:
            操作结果
        """
        try:
            # 检查论文是否存在
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")
            
            # 记录修改前的状态
            previous_visibility = paper.get("isPublic", False)
            
            # 如果状态没有变化，直接返回
            if previous_visibility == is_public:
                return self._wrap_success("论文可见状态未变化", {
                    "paperId": paper_id,
                    "previousVisibility": previous_visibility,
                    "currentVisibility": is_public,
                    "changed": False
                })
            
            # 更新论文可见状态
            update_data = {"isPublic": is_public}
            if self.paper_model.update(paper_id, update_data):
                updated_paper = self.paper_model.find_by_id(paper_id)
                return self._wrap_success("论文可见状态更新成功", {
                    "paperId": paper_id,
                    "previousVisibility": previous_visibility,
                    "currentVisibility": is_public,
                    "changed": True,
                    "paper": updated_paper
                })
            else:
                return self._wrap_error("更新论文可见状态失败")
                
        except Exception as exc:
            return self._wrap_error(f"更新论文可见状态失败: {exc}")

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
        
        Args:
            paper_id: 论文ID
            section_id: section ID
            text: 需要解析的文本
            user_id: 用户ID
            is_admin: 是否为管理员
            after_block_id: 在指定block后插入，不传则在末尾添加
            
        Returns:
            操作结果
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
                # 直接抛出异常，不使用降级方案
                raise Exception(f"LLM文本解析失败: {llm_exc}")

            if not new_blocks:
                return self._wrap_error("文本解析失败，无法生成有效的blocks")

            # 将新blocks添加到section中
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
            
            # 插入新blocks
            current_blocks[insert_index:insert_index] = new_blocks
            sections[section_index] = target_section

            # 更新论文
            update_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_data):
                updated_paper = self.paper_model.find_by_id(paper_id)
                return self._wrap_success(
                    f"成功向section添加了{len(new_blocks)}个blocks",
                    {
                        "paper": updated_paper,
                        "addedBlocks": new_blocks,
                        "sectionId": section_id
                    }
                )
            else:
                return self._wrap_error("更新论文失败")

        except Exception as exc:
            return self._wrap_error(f"添加blocks到section失败: {exc}")

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
        
        Args:
            paper_id: 论文ID
            section_data: 新章节数据
            user_id: 用户ID
            is_admin: 是否为管理员
            parent_section_id: 父章节ID，为null则添加到根级
            position: 插入位置，-1为末尾
            
        Returns:
            操作结果
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
            
            # 确保新章节有必要的字段（使用新的 title 和 titleZh 结构）
            title_data = section_data.get("title", {})
            if isinstance(title_data, dict) and "en" in title_data:
                # 新格式：{en: "...", zh: "..."}
                new_section = {
                    "id": section_data.get("id"),
                    "title": title_data.get("en", "Untitled Section"),
                    "titleZh": title_data.get("zh", "未命名章节"),
                    "content": section_data.get("content", []),
                    "subsections": section_data.get("subsections", [])
                }
            else:
                # 兼容旧格式或直接字符串
                new_section = {
                    "id": section_data.get("id"),
                    "title": title_data if title_data else "Untitled Section",
                    "titleZh": section_data.get("titleZh", "未命名章节"),
                    "content": section_data.get("content", []),
                    "subsections": section_data.get("subsections", [])
                }
            
            # 如果没有提供ID，生成一个
            if not new_section["id"]:
                new_section["id"] = f"section_{len(sections) + 1}_{int(time.time())}"
            
            # 确定插入位置
            if position is None:
                position = -1
                
            # 如果指定了父章节，添加到子章节中
            if parent_section_id:
                sections = self._insert_section_into_subsections(
                    sections, parent_section_id, new_section, position
                )
            else:
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
                updated_paper = self.paper_model.find_by_id(paper_id)
                return self._wrap_success(
                    "成功添加章节",
                    {
                        "paper": updated_paper,
                        "addedSection": new_section,
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
        
        Args:
            paper_id: 论文ID
            section_id: 章节ID
            update_data: 更新数据，包含title, content等
            user_id: 用户ID
            is_admin: 是否为管理员
            
        Returns:
            操作结果
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
            target_section, section_index, parent_path = self._find_section_by_id(
                sections, section_id
            )
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")

            # 更新section数据
            for key, value in update_data.items():
                if key == "title":
                    # 处理title字段，兼容新旧格式
                    if isinstance(value, dict) and "en" in value:
                        # 新格式：{en: "...", zh: "..."}
                        target_section["title"] = value.get("en", "")
                        if "zh" in value and value.get("zh"):
                            target_section["titleZh"] = value.get("zh")
                    else:
                        # 旧格式：直接字符串
                        target_section["title"] = value
                elif key in ["content", "subsections"]:
                    target_section[key] = value

            # 重新更新sections结构
            if parent_path:
                # 如果是在子章节中，需要递归更新
                sections = self._update_section_in_path(sections, parent_path, target_section)
            else:
                # 根级章节直接更新
                sections[section_index] = target_section

            # 更新论文
            update_paper_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_paper_data):
                updated_paper = self.paper_model.find_by_id(paper_id)
                return self._wrap_success(
                    "章节更新成功",
                    {
                        "paper": updated_paper,
                        "updatedSection": target_section
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
        
        Args:
            paper_id: 论文ID
            section_id: 章节ID
            user_id: 用户ID
            is_admin: 是否为管理员
            
        Returns:
            操作结果
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
            target_section, section_index, parent_path = self._find_section_by_id(
                sections, section_id
            )
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")

            # 删除section
            if parent_path:
                # 如果是在子章节中，需要递归更新
                sections = self._delete_section_in_path(sections, parent_path)
            else:
                # 根级章节直接删除
                sections.pop(section_index)

            # 更新论文
            update_paper_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_paper_data):
                return self._wrap_success("章节删除成功", {"deletedSectionId": section_id})
            else:
                return self._wrap_error("更新论文失败")

        except Exception as exc:
            return self._wrap_error(f"删除章节失败: {exc}")

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
        
        Args:
            paper_id: 论文ID
            section_id: 章节ID
            block_id: block ID
            update_data: 更新数据，包含content等
            user_id: 用户ID
            is_admin: 是否为管理员
            
        Returns:
            操作结果
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
            target_section, section_index, parent_path = self._find_section_by_id(
                sections, section_id
            )
            
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
                if key in ["content", "type", "metadata"]:
                    target_block[key] = value

            blocks[target_block_index] = target_block
            target_section["content"] = blocks

            # 重新更新sections结构
            if parent_path:
                sections = self._update_section_in_path(sections, parent_path, target_section)
            else:
                sections[section_index] = target_section

            # 更新论文
            update_paper_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_paper_data):
                updated_paper = self.paper_model.find_by_id(paper_id)
                return self._wrap_success(
                    "block更新成功",
                    {
                        "paper": updated_paper,
                        "updatedBlock": target_block
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
        
        Args:
            paper_id: 论文ID
            section_id: 章节ID
            block_id: block ID
            user_id: 用户ID
            is_admin: 是否为管理员
            
        Returns:
            操作结果
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
            target_section, section_index, parent_path = self._find_section_by_id(
                sections, section_id
            )
            
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
            deleted_block = blocks.pop(target_block_index)
            target_section["content"] = blocks

            # 重新更新sections结构
            if parent_path:
                sections = self._update_section_in_path(sections, parent_path, target_section)
            else:
                sections[section_index] = target_section

            # 更新论文
            update_paper_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_paper_data):
                return self._wrap_success("block删除成功", {"deletedBlockId": block_id})
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
        
        Args:
            paper_id: 论文ID
            section_id: section ID
            block_data: block数据
            user_id: 用户ID
            is_admin: 是否为管理员
            after_block_id: 在指定block后插入，不传则在末尾添加
            
        Returns:
            操作结果
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
            insert_index = len(current_blocks)  # 默认在末尾
            
            if after_block_id:
                for i, block in enumerate(current_blocks):
                    if block.get("id") == after_block_id:
                        insert_index = i + 1  # 插入到指定block后面
                        break
            
            # 创建新block
            new_block = {
                "id": block_data.get("id", f"block_{int(time.time())}_{hash(block_data.get('type', 'unknown'))}"),
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
                # 处理列表类型的items字段
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
            
            # 插入新block
            current_blocks.insert(insert_index, new_block)
            target_section["content"] = current_blocks
            sections[section_index] = target_section

            # 更新论文
            update_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_data):
                updated_paper = self.paper_model.find_by_id(paper_id)
                return self._wrap_success(
                    "成功添加block",
                    {
                        "paper": updated_paper,
                        "addedBlock": new_block,
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
        
        Args:
            paper_id: 论文ID
            section_id: section ID
            text: 需要解析的文本
            user_id: 用户ID
            is_admin: 是否为管理员
            after_block_id: 在指定block后插入，不传则在末尾添加
            
        Returns:
            操作结果
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

            # 创建加载块
            loading_block_id = f"loading_{int(time.time())}_{hash(text) % 10000}"
            loading_block = {
                "id": loading_block_id,
                "type": "loading",
                "status": "pending",
                "message": "准备解析文本...",
                "progress": 0,
                "originalText": text,
                "sectionId": section_id,
                "afterBlockId": after_block_id,
                "createdAt": get_current_time().isoformat()
            }

            # 将加载块添加到section中
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
            
            # 插入加载块
            current_blocks.insert(insert_index, loading_block)
            target_section["content"] = current_blocks
            sections[section_index] = target_section

            # 更新论文，添加加载块
            update_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_data):
                # 启动异步解析任务
                self._start_async_text_parsing(paper_id, loading_block_id, section_id, text, after_block_id)
                
                return self._wrap_success(
                    "文本解析任务已启动",
                    {
                        "loadingBlockId": loading_block_id,
                        "sectionId": section_id,
                        "status": "pending"
                    }
                )
            else:
                return self._wrap_error("更新论文失败")

        except Exception as exc:
            # 记录完整的异常信息以便调试
            import traceback
            error_details = f"从文本添加block到section失败: {exc}\n详细错误: {traceback.format_exc()}"
            return self._wrap_error(error_details)

    def _start_async_text_parsing(
        self,
        paper_id: str,
        loading_block_id: str,
        section_id: str,
        text: str,
        after_block_id: Optional[str] = None,
    ) -> None:
        """
        启动异步文本解析任务
        
        Args:
            paper_id: 论文ID
            loading_block_id: 加载块ID
            section_id: 章节ID
            text: 要解析的文本
            after_block_id: 在指定block后插入
        """
        import threading
        
        def parse_text_task():
            try:
                # 更新状态为处理中
                self.paper_model.update_loading_block(paper_id, loading_block_id, {
                    "status": "processing",
                    "message": "正在解析文本内容...",
                    "progress": 10
                })
                
                # 获取论文和section信息
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    self.paper_model.update_loading_block(paper_id, loading_block_id, {
                        "status": "failed",
                        "message": "找不到论文信息",
                        "completedAt": get_current_time().isoformat()
                    })
                    return
                
                sections = paper.get("sections", [])
                target_section = None
                section_index = -1
                
                for i, section in enumerate(sections):
                    if section.get("id") == section_id:
                        target_section = section
                        section_index = i
                        break
                
                if not target_section:
                    self.paper_model.update_loading_block(paper_id, loading_block_id, {
                        "status": "failed",
                        "message": "找不到目标章节",
                        "completedAt": get_current_time().isoformat()
                    })
                    return
                
                # 更新进度
                self.paper_model.update_loading_block(paper_id, loading_block_id, {
                    "progress": 30,
                    "message": "正在调用AI服务解析文本..."
                })
                
                # 获取section上下文信息
                section_context = f"Section标题: {target_section.get('title', '未知')}"
                if target_section.get('content'):
                    section_context += f", Section内容: {str(target_section['content'])[:200]}..."

                # 使用LLM解析文本为blocks
                try:
                    llm_utils = get_llm_utils()
                    new_blocks = llm_utils.parse_text_to_blocks(text, section_context)
                except Exception as llm_exc:
                    # 捕获LLM解析异常
                    error_msg = str(llm_exc)
                    if "GLM_API_KEY" in error_msg:
                        message = "LLM服务未正确配置：缺少有效的API密钥。请联系管理员配置GLM_API_KEY。"
                    elif "timeout" in error_msg.lower() or "超时" in error_msg:
                        message = "文本解析超时：文本内容可能过多或服务器响应较慢，请减少文本量或稍后重试。"
                    elif "network" in error_msg.lower() or "网络" in error_msg:
                        message = "网络连接错误：无法连接到LLM服务，请检查网络连接后重试。"
                    else:
                        message = f"文本解析失败：{error_msg}"
                    
                    self.paper_model.update_loading_block(paper_id, loading_block_id, {
                        "status": "failed",
                        "message": message,
                        "completedAt": get_current_time().isoformat()
                    })
                    return

                # 更新进度
                self.paper_model.update_loading_block(paper_id, loading_block_id, {
                    "progress": 80,
                    "message": "正在保存解析结果..."
                })

                if not new_blocks:
                    self.paper_model.update_loading_block(paper_id, loading_block_id, {
                        "status": "failed",
                        "message": "文本解析失败，无法生成有效的blocks。请检查文本内容是否合适。",
                        "completedAt": get_current_time().isoformat()
                    })
                    return

                # 移除加载块并添加解析后的blocks
                if self.paper_model.remove_loading_block(paper_id, loading_block_id, new_blocks):
                    self.paper_model.update_loading_block(paper_id, loading_block_id, {
                        "status": "completed",
                        "message": f"成功解析并添加了{len(new_blocks)}个段落",
                        "progress": 100,
                        "completedAt": get_current_time().isoformat()
                    })
                else:
                    self.paper_model.update_loading_block(paper_id, loading_block_id, {
                        "status": "failed",
                        "message": "保存解析结果失败",
                        "completedAt": get_current_time().isoformat()
                    })
                
            except Exception as exc:
                # 记录完整的异常信息以便调试
                import traceback
                error_details = f"异步文本解析失败: {exc}\n详细错误: {traceback.format_exc()}"
                self.paper_model.update_loading_block(paper_id, loading_block_id, {
                    "status": "failed",
                    "message": f"解析过程中发生错误: {str(exc)}",
                    "completedAt": get_current_time().isoformat()
                })
        
        # 启动后台线程执行解析任务
        thread = threading.Thread(target=parse_text_task)
        thread.daemon = True
        thread.start()

    def get_loading_block_status(self, paper_id: str, loading_block_id: str) -> Dict[str, Any]:
        """
        获取加载块的状态
        
        Args:
            paper_id: 论文ID
            loading_block_id: 加载块ID
            
        Returns:
            加载块状态信息
        """
        try:
            loading_blocks = self.paper_model.find_loading_blocks(paper_id)
            
            for block in loading_blocks:
                if block.get("blockId") == loading_block_id:
                    return self._wrap_success("获取加载块状态成功", block)
            
            return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "找不到指定的加载块")
        except Exception as exc:
            return self._wrap_error(f"获取加载块状态失败: {exc}")

    def get_all_loading_blocks_status(self, paper_id: str) -> Dict[str, Any]:
        """
        获取论文中所有加载块的状态
        
        Args:
            paper_id: 论文ID
            
        Returns:
            所有加载块的状态信息
        """
        try:
            loading_blocks = self.paper_model.find_loading_blocks(paper_id)
            return self._wrap_success("获取所有加载块状态成功", {
                "loadingBlocks": loading_blocks,
                "count": len(loading_blocks)
            })
        except Exception as exc:
            return self._wrap_error(f"获取所有加载块状态失败: {exc}")

    # 全局缓存，用于减少数据库查询
    _loading_block_cache = {}
    _cache_timestamps = {}
    _cache_ttl = 5  # 缓存5秒
    
    def check_loading_block_status(
        self,
        paper_id: str,
        section_id: str,
        block_id: str,
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """
        检查指定加载块的状态，使用缓存减少数据库查询
        
        Args:
            paper_id: 论文ID
            section_id: 章节ID
            block_id: 加载块ID
            user_id: 用户ID
            is_admin: 是否为管理员
            
        Returns:
            加载块状态信息
        """
        try:
            # 检查缓存
            cache_key = f"{paper_id}_{section_id}_{block_id}"
            current_time = time.time()
            
            # 如果缓存存在且未过期，直接返回缓存结果
            if (cache_key in self._loading_block_cache and
                cache_key in self._cache_timestamps and
                current_time - self._cache_timestamps[cache_key] < self._cache_ttl):
                
                cached_result = self._loading_block_cache[cache_key]
                # 如果是已完成或失败状态，可以长期缓存
                if cached_result.get("status") in ["completed", "failed"]:
                    return cached_result
            
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权访问此论文")

            # 查找加载块
            loading_blocks = self.paper_model.find_loading_blocks(paper_id)
            target_block = None
            
            for block in loading_blocks:
                if block.get("blockId") == block_id and block.get("sectionId") == section_id:
                    target_block = block
                    break
            
            if not target_block:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "找不到指定的加载块")
            
            status = target_block.get("status", "unknown")
            progress = target_block.get("progress", 0)
            message = target_block.get("message", "")
            
            # 构建结果
            result = None
            
            # 如果解析完成，返回更新后的论文数据
            if status == "completed":
                updated_paper = self.paper_model.find_by_id(paper_id)
                result = self._wrap_success("解析已完成", {
                    "status": status,
                    "progress": progress,
                    "message": message,
                    "paper": updated_paper
                })
            # 如果解析失败，返回错误信息
            elif status == "failed":
                result = self._wrap_success("解析失败", {
                    "status": status,
                    "progress": progress,
                    "message": message,
                    "error": target_block.get("error", "未知错误")
                })
            # 如果仍在解析中，返回当前状态
            else:
                result = self._wrap_success("解析中", {
                    "status": status,
                    "progress": progress,
                    "message": message
                })
            
            # 更新缓存
            self._loading_block_cache[cache_key] = result
            self._cache_timestamps[cache_key] = current_time
            
            return result
            
        except Exception as exc:
            return self._wrap_error(f"检查加载块状态失败: {exc}")
    
    def clear_loading_block_cache(self, paper_id: str = None) -> None:
        """
        清除加载块状态缓存
        
        Args:
            paper_id: 如果提供，只清除指定论文的缓存；否则清除所有缓存
        """
        if paper_id:
            # 清除指定论文的缓存
            keys_to_remove = [key for key in self._loading_block_cache.keys() if key.startswith(f"{paper_id}_")]
            for key in keys_to_remove:
                self._loading_block_cache.pop(key, None)
                self._cache_timestamps.pop(key, None)
        else:
            # 清除所有缓存
            self._loading_block_cache.clear()
            self._cache_timestamps.clear()

    def _insert_section_into_subsections(
        self,
        sections: List[Dict[str, Any]],
        parent_section_id: str,
        new_section: Dict[str, Any],
        position: int
    ) -> List[Dict[str, Any]]:
        """在指定章节的子章节中插入新章节"""
        for i, section in enumerate(sections):
            if section.get("id") == parent_section_id:
                # 找到父章节
                current_subsections = section.get("subsections", [])
                if position == -1 or position >= len(current_subsections):
                    current_subsections.append(new_section)
                elif 0 <= position < len(current_subsections):
                    current_subsections.insert(position, new_section)
                else:
                    current_subsections.append(new_section)
                
                sections[i]["subsections"] = current_subsections
                return sections
            
            # 递归检查子章节
            if section.get("subsections"):
                updated_subsections = self._insert_section_into_subsections(
                    section["subsections"], parent_section_id, new_section, position
                )
                if updated_subsections != section["subsections"]:
                    sections[i]["subsections"] = updated_subsections
                    return sections
        
        return sections

    def _find_section_by_id(
        self, sections: List[Dict[str, Any]], section_id: str, parent_path: str = ""
    ) -> Tuple[Optional[Dict[str, Any]], int, Optional[str]]:
        """
        根据ID查找章节，返回章节、索引和父路径
        
        Args:
            sections: 章节列表
            section_id: 章节ID
            parent_path: 父路径
            
        Returns:
            (章节对象, 索引, 父路径)
        """
        for i, section in enumerate(sections):
            current_path = f"{parent_path}/{i}" if parent_path else str(i)
            
            if section.get("id") == section_id:
                return section, i, parent_path if parent_path else None
            
            # 递归查找子章节
            if section.get("subsections"):
                found, index, path = self._find_section_by_id(
                    section["subsections"], section_id, current_path
                )
                if found:
                    return found, index, path
        
        return None, -1, None

    def _update_section_in_path(
        self,
        sections: List[Dict[str, Any]],
        parent_path: str,
        updated_section: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        根据路径更新章节
        
        Args:
            sections: 章节列表
            parent_path: 父路径
            updated_section: 更新后的章节
            
        Returns:
            更新后的章节列表
        """
        if not parent_path:
            return sections
        
        path_parts = parent_path.split("/")
        if not path_parts:
            return sections
        
        # 找到要更新的章节索引
        section_index = int(path_parts[0])
        
        if len(path_parts) == 1:
            # 根级章节，直接更新
            sections[section_index] = updated_section
        else:
            # 子章节，递归更新
            remaining_path = "/".join(path_parts[1:])
            sections[section_index]["subsections"] = self._update_section_in_path(
                sections[section_index].get("subsections", []),
                remaining_path,
                updated_section
            )
        
        return sections

    def _delete_section_in_path(
        self,
        sections: List[Dict[str, Any]],
        parent_path: str
    ) -> List[Dict[str, Any]]:
        """
        根据路径删除章节
        
        Args:
            sections: 章节列表
            parent_path: 父路径
            
        Returns:
            更新后的章节列表
        """
        if not parent_path:
            return sections
        
        path_parts = parent_path.split("/")
        if not path_parts:
            return sections
        
        # 找到要删除的章节索引
        section_index = int(path_parts[0])
        
        if len(path_parts) == 1:
            # 根级章节，直接删除
            sections.pop(section_index)
        else:
            # 子章节，递归删除
            remaining_path = "/".join(path_parts[1:])
            sections[section_index]["subsections"] = self._delete_section_in_path(
                sections[section_index].get("subsections", []),
                remaining_path
            )
        
        return sections

    # ------------------------------------------------------------------
    # 统计 & 个人论文库占位
    # ------------------------------------------------------------------
    def get_statistics(self) -> Dict[str, Any]:
        try:
            stats = self.paper_model.get_statistics()
            return self._wrap_success("获取统计信息成功", stats)
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取统计信息失败: {exc}")

    def get_user_papers(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            skip = self._calc_skip(page, page_size)
            sort_direction = self._parse_sort_order(sort_order)

            if search:
                public_papers, public_total = self.paper_model.search(
                    keyword=search,
                    is_public=True,
                    skip=skip,
                    limit=page_size,
                )
                user_papers, user_total = [], 0
            else:
                public_papers, public_total = self.paper_model.find_all(
                    is_public=True,
                    skip=skip,
                    limit=page_size,
                    sort_by=sort_by,
                    sort_order=sort_direction,
                )
                user_papers, user_total = [], 0

            combined, total = self._merge_public_and_user_papers(
                public_papers,
                user_papers,
                public_total,
                user_total,
            )
            return self._wrap_success(
                "获取用户论文列表成功",
                {
                    "papers": combined,
                    "pagination": self._build_pagination(total, page, page_size),
                },
            )
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取用户论文列表失败: {exc}")

    # ------------------------------------------------------------------
    # 辅助方法
    # ------------------------------------------------------------------
    @staticmethod
    def _calc_skip(page: int, page_size: int) -> int:
        return max(page - 1, 0) * page_size

    @staticmethod
    def _parse_sort_order(sort_order: str) -> int:
        return -1 if sort_order.lower() == "desc" else 1

    @staticmethod
    def _build_pagination(total: int, page: int, page_size: int) -> Dict[str, int]:
        total_pages = (total + page_size - 1) // page_size if page_size else 0
        return {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": total_pages,
        }

    @staticmethod
    def _merge_public_and_user_papers(
        public_papers: List[Dict[str, Any]],
        user_papers: List[Dict[str, Any]],
        public_total: int,
        user_total: int,
    ) -> Tuple[List[Dict[str, Any]], int]:
        merged = public_papers.copy()
        seen_ids = {paper.get("id") for paper in public_papers}

        for paper in user_papers:
            if paper.get("id") not in seen_ids:
                merged.append(paper)
                seen_ids.add(paper.get("id"))

        return merged, public_total + user_total

    @staticmethod
    def _build_public_summary(paper: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": paper.get("id"),
            "isPublic": paper.get("isPublic", True),
            "metadata": paper.get("metadata", {}),
            "createdAt": paper.get("createdAt"),
            "updatedAt": paper.get("updatedAt"),
        }

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

    def parse_references(self, text: str) -> Dict[str, Any]:
        """
        解析参考文献文本，返回结构化的参考文献列表
        
        Args:
            text: 参考文献文本，可能包含多条参考文献
            
        Returns:
            解析后的参考文献列表，包含成功解析的参考文献和错误信息
        """
        try:
            # 使用parse_reference_text方法解析参考文献
            result = PaperService.parse_reference_text(text)
            
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


    def parse_reference_text(text: str) -> Dict[str, Any]:
        """
        纯规则/正则解析参考文献文本（顺序编码制）。
        支持常见 IEEE/GB/T 写法：
        - [1] A. Author and B. Author, "Title", Journal, vol. X, no. Y, pp. 1-10, 2020.
        - [2] A. Author et al., "Title", Conference, in Proceedings of ..., pp. 1-2, 2021.
        - [3] 作者. 题名[J]. 刊名, 年, 卷(期): 页码.
        解析失败的条目会记录到 errors。
        返回：
        {
            "references": [ {...}, ... ],
            "count": int,
            "errors": [ {"index": int|None, "raw": str, "message": str}, ... ]
        }
        参考规范（要素与字段命名）来自：
        - IEEE Editorial Style Manual / References（作者、题名、期刊、卷/期/页、年份/DOI）；
        - GB/T 7714-2015 要素结构与文献类型标识；
        - APA 对“期刊文章含文章号/页码”的要素说明。
        """

        def normalize_text(s: str) -> str:
            # 统一空白与引号/破折号等常见字符
            s = s.replace('“', '"').replace('”', '"').replace('’', "'").replace('‘', "'")
            s = s.replace('—', '-').replace('–', '-').replace('−', '-')
            # 全角逗号/冒号简单规整（尽量不破坏英文结构）
            s = s.replace('，', ',').replace('：', ':').replace('（', '(').replace('）', ')')
            # 合并多余空白
            s = re.sub(r'[ \t]+', ' ', s)
            # 统一换行 -> 空格，避免条目跨行
            s = re.sub(r'\s*\n\s*', ' ', s).strip()
            return s

        def split_entries(s: str) -> List[Tuple[Optional[int], str]]:
            """
            把整段文本按 [n] 分条；返回 (index, raw_item) 列表。
            """
            s = normalize_text(s)
            items = []
            matches = list(re.finditer(r'\[(\d+)\]\s*', s))
            if not matches:
                # 没有顺序编码，也作为一个整体尝试解析
                return [(None, s)]
            for i, m in enumerate(matches):
                idx = int(m.group(1))
                start = m.end()
                end = matches[i + 1].start() if i + 1 < len(matches) else len(s)
                raw = s[start:end].strip().rstrip('.').strip()
                items.append((idx, raw))
            return items

        def split_authors(authors_str: str) -> Tuple[List[str], bool]:
            """
            解析作者列表；兼容英文 'and'、逗号分隔、以及 'et al.'。
            返回 (authors, has_et_al)
            """
            a = authors_str.strip().strip(',')
            # 统一 and -> 逗号，便于 split
            a = re.sub(r'\s+and\s+', ', ', a, flags=re.IGNORECASE)
            # 避免把缩写里的点当分隔；直接按逗号切足够稳妥（示例格式都可）
            parts = [p.strip() for p in a.split(',') if p.strip()]
            has_more = any('et al.' in p.lower() for p in parts)
            # 去掉 'et al.' 标记中的多余空白
            cleaned = []
            for p in parts:
                cleaned.append(re.sub(r'\bet\s+al\.?$', '', p, flags=re.IGNORECASE).strip())
            # 过滤空
            cleaned = [p for p in cleaned if p]
            return cleaned, has_more

        # ---------- 针对常见结构的多个正则（按“严->松”顺序逐个尝试） ----------
        # 1) IEEE 期刊（含 "题名"、vol./no./pp./p./art. no./doi、年份）
        rx_ieee_journal = re.compile(
            r"""^
                (?P<authors>.+?)\s*,\s*
                " (?P<title>.+?) "\s*,\s*
                (?P<venue>[^,]+)\s*,\s*
                (?:
                    vol\.\s*(?P<volume>[^,]+)\s*,\s*
                )?
                (?:
                    no\.\s*(?P<number>[^,]+)\s*,\s*
                )?
                (?:
                    pp\.\s*(?P<pages>[^,]+)\s*,\s*
                |
                    p\.\s*(?P<page_single>[^,]+)\s*,\s*
                )?
                (?:
                    (?:art\.?\s*no\.?|article)\s*(?P<article_no>[^,]+)\s*,\s*
                )?
                (?:
                    doi:\s*(?P<doi>[^,]+)\s*,\s*
                )?
                (?P<year>\d{4})
                \.?
            $""",
            re.IGNORECASE | re.VERBOSE
        )

        # 2) IEEE 会议（in Proceedings ...，可带页码/doi/年份）
        rx_ieee_conf = re.compile(
            r"""^
                (?P<authors>.+?)\s*,\s*
                " (?P<title>.+?) "\s*,\s*
                in\s+(?P<venue>.+?)(?:,|\.)\s*
                (?:
                    pp\.\s*(?P<pages>[^,\.]+)\s*(?:,|\.)\s*
                )?
                (?:
                    doi:\s*(?P<doi>[^,\.]+)\s*(?:,|\.)\s*
                )?
                (?P<year>\d{4})
                \.?
            $""",
            re.IGNORECASE | re.VERBOSE
        )

        # 3) 国标常见期刊（作者. 题名[J]. 刊名, 年, 卷(期): 页码.）
        rx_gbt_journal = re.compile(
            r"""^
                (?P<authors>.+?)\.\s+
                (?P<title>.+?)
                (?:\s*\[\s*[Jj]\s*\])?\.\s+
                (?P<venue>[^,]+)\s*,\s*
                (?P<year>\d{4})
                (?:\s*,\s*(?P<volume>[\dA-Za-z\-]+)
                    (?:\(\s*(?P<number>[^)]+)\s*\))?
                )?
                (?::\s*(?P<pages>[\d\-–]+))?
                \.?
            $""",
            re.VERBOSE
        )

        # 4) 宽松期刊兜底（作者,"题名", 期刊, 年[, 卷][, no. 期][, pp. 页]）
        rx_loose_journal = re.compile(
            r"""^
                (?P<authors>.+?)\s*,\s*
                " (?P<title>.+?) "\s*,\s*
                (?P<venue>[^,]+)\s*,\s*
                (?P<year>\d{4})
                (?:\s*,\s*vol\.\s*(?P<volume>[^,\.]+))?
                (?:\s*,\s*no\.\s*(?P<number>[^,\.]+))?
                (?:\s*,\s*pp\.\s*(?P<pages>[^,\.]+))?
                \.?
            $""",
            re.IGNORECASE | re.VERBOSE
        )

        # DOI/文章号兜底（出现于标题后或末尾）
        rx_doi = re.compile(r'\bdoi:\s*([^\s,]+)', re.IGNORECASE)
        rx_article = re.compile(r'\b(?:art\.?\s*no\.?|article)\s+([A-Za-z0-9\-]+)', re.IGNORECASE)
        rx_pages = re.compile(r'\bpp?\.\s*([0-9]+[-–][0-9]+)', re.IGNORECASE)

        def guess_type(venue: str, matched_name: str) -> str:
            v = (venue or '').lower()
            if matched_name == 'conf' or v.startswith('proc') or 'proceedings' in v:
                return 'conference'
            if any(k in v for k in ['journal', 'review', 'transactions', 'letters']):
                return 'journal'
            return 'journal'

        def parse_one(raw: str, idx: Optional[int]) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
            """
            解析单条；成功返回 (record, None)，失败返回 (None, error)
            对于解析不规范的参考文献，保留编号和ID，但内容为空
            """
            s = normalize_text(raw)

            for name, rx in [('journal', rx_ieee_journal), ('conf', rx_ieee_conf), ('gbt_journal', rx_gbt_journal), ('loose', rx_loose_journal)]:
                m = rx.match(s)
                if not m:
                    continue
                g = m.groupdict()

                authors_raw = (g.get('authors') or '').strip()
                authors, has_et_al = split_authors(authors_raw)

                title = (g.get('title') or '').strip().strip('"')
                venue = (g.get('venue') or '').strip().rstrip('.').strip()

                volume = (g.get('volume') or '').strip() or None
                number = (g.get('number') or '').strip() or None
                pages = (g.get('pages') or '').strip() or None
                if not pages:
                    ps = (g.get('page_single') or '').strip()
                    pages = ps if ps else None

                article_no = (g.get('article_no') or '').strip() or None
                doi = (g.get('doi') or '').strip() or None
                year = None
                if g.get('year'):
                    try:
                        year = int(g['year'])
                    except Exception:
                        year = None

                # 兜底再扫一次 DOI / 文章号 / 页码
                if not doi:
                    m_doi = rx_doi.search(s)
                    if m_doi:
                        doi = m_doi.group(1)
                if not article_no:
                    m_art = rx_article.search(s)
                    if m_art:
                        article_no = m_art.group(1)
                if not pages:
                    m_pg = rx_pages.search(s)
                    if m_pg:
                        pages = m_pg.group(1)

                # 检查解析结果的质量，title是必须字段，作者可以为空
                is_incomplete = not title
                
                rec = {
                    "index": idx,
                    "type": guess_type(venue, name),
                    "authors": authors,  # 作者可以为空
                    "has_et_al": has_et_al,
                    "title": title if not is_incomplete else "解析失败",  # title必须，失败时设为"解析失败"
                    "venue": venue,
                    "volume": volume,
                    "number": number,
                    "pages": pages,
                    "article_no": article_no,
                    "year": year,
                    "doi": doi,
                    "raw": raw.strip(),
                    "is_incomplete": is_incomplete  # 标记是否为不完整解析
                }
                
                # 如果是不完整解析，修改错误消息
                if is_incomplete:
                    return rec, {
                        "index": idx,
                        "raw": raw.strip(),
                        "message": "参考文献格式不完整或不规范，已保留编号，请手动编辑完善内容"
                    }
                
                return rec, None

            # 未匹配到任何模式 -> 返回错误
            err = {
                "index": idx,
                "raw": raw.strip(),
                "message": "未能按规范解析（请检查作者/题名/期刊/卷期页/年份等要素是否完整，或是否符合 IEEE/GB/T 常见写法）"
            }
            return None, err

        refs: List[Dict[str, Any]] = []
        errors: List[Dict[str, Any]] = []

        for idx, raw in split_entries(text):
            rec, err = parse_one(raw, idx)
            if rec:
                refs.append(rec)
                # 如果是不完整解析，也记录为错误，但保留参考文献
                if rec.get("is_incomplete", False):
                    errors.append(err)
            else:
                errors.append(err)

        return {
            "references": refs,
            "count": len(refs),
            "errors": errors
        }




    def add_references_to_paper(
        self,
        paper_id: str,
        references: List[Dict[str, Any]],
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """
        将解析后的参考文献添加到论文中，自动检测并更新重复的参考文献
        
        Args:
            paper_id: 论文ID
            references: 参考文献列表
            user_id: 用户ID
            is_admin: 是否为管理员
            
        Returns:
            添加结果
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
            
            # 按照解析出的index字段排序，确保参考文献按照原始编号顺序添加
            sorted_references = sorted(references, key=lambda x: x.get("index", 0))
            
            # 处理参考文献：检测重复并更新
            added_references = []
            updated_references = []
            duplicate_count = 0
            
            for ref in sorted_references:
                # 直接使用解析出的index作为number，不再自动分配
                ref_number = ref.get("index")
                
                # 创建符合前端Reference接口的参考文献对象
                # 使用解析出的序号作为ID的一部分，确保唯一性
                ref_index = ref.get("index", len(added_references) + len(updated_references))
                new_ref = {
                    "id": f"ref_{ref_index}_{len(added_references) + len(updated_references)}",
                    "number": ref_number,
                    "authors": ref.get("authors", []),
                    "title": ref.get("title", ""),
                    "publication": ref.get("venue"),  # venue -> publication
                    "year": ref.get("year"),
                    "doi": ref.get("doi"),
                    "url": None,  # 解析结果中没有url字段
                    "pages": ref.get("pages"),
                    "volume": ref.get("volume"),
                    "issue": ref.get("number")  # number -> issue
                }
                
                # 移除空值字段
                new_ref = {k: v for k, v in new_ref.items() if v is not None}
                
                # 检测重复参考文献
                duplicate_index = self._find_duplicate_reference(new_ref, current_references)
                
                if duplicate_index is not None:
                    # 发现重复，更新现有参考文献
                    existing_ref = current_references[duplicate_index].copy()
                    # 保留原始ID和number，更新其他字段
                    new_ref["id"] = existing_ref["id"]
                    new_ref["number"] = existing_ref["number"]
                    current_references[duplicate_index] = new_ref
                    updated_references.append(new_ref)
                    duplicate_count += 1
                else:
                    # 没有重复，添加新参考文献
                    added_references.append(new_ref)
                    current_references.append(new_ref)
            
            # 更新论文
            update_data = {"references": current_references}
            if self.paper_model.update(paper_id, update_data):
                updated_paper = self.paper_model.find_by_id(paper_id)
                
                # 构建详细的结果信息
                result_message = f"成功处理{len(sorted_references)}条参考文献"
                if added_references:
                    result_message += f"，新增{len(added_references)}条"
                if updated_references:
                    result_message += f"，更新{len(updated_references)}条重复文献"
                
                return self._wrap_success(
                    result_message,
                    {
                        "paper": updated_paper,
                        "addedReferences": added_references,
                        "updatedReferences": updated_references,
                        "duplicateCount": duplicate_count,
                        "totalProcessed": len(sorted_references),
                        "totalReferences": len(current_references)
                    }
                )
            else:
                return self._wrap_error("更新论文失败")
                
        except Exception as exc:
            return self._wrap_error(f"添加参考文献失败: {exc}")
    
    def _find_duplicate_reference(self, new_ref: Dict[str, Any], existing_refs: List[Dict[str, Any]]) -> Optional[int]:
        """
        查找重复的参考文献
        
        Args:
            new_ref: 新参考文献
            existing_refs: 现有参考文献列表
            
        Returns:
            重复参考文献的索引，如果没有找到重复则返回None
        """
        def normalize_text(text: str) -> str:
            """标准化文本：小写、去除多余空格和标点"""
            if not text:
                return ""
            # 转换为小写
            text = text.lower()
            # 去除多余空格
            text = re.sub(r'\s+', ' ', text)
            # 去除常见标点符号
            text = re.sub(r'[^\w\s]', '', text)
            return text.strip()
        
        def normalize_authors(authors: List[str]) -> str:
            """标准化作者列表：提取姓氏并排序"""
            if not authors:
                return ""
            # 提取每个作者的姓氏（假设格式为 "First Last" 或 "Last, F"）
            surnames = []
            for author in authors:
                # 处理 "Last, F" 格式
                if ',' in author:
                    surname = author.split(',')[0].strip()
                # 处理 "First Last" 格式
                elif ' ' in author:
                    surname = author.split()[-1].strip()
                else:
                    surname = author.strip()
                
                if surname:
                    surnames.append(normalize_text(surname))
            
            # 排序并连接
            surnames.sort()
            return ' '.join(surnames)
        
        # 提取新参考文献的关键信息
        new_title = normalize_text(new_ref.get("title", ""))
        new_authors = normalize_authors(new_ref.get("authors", []))
        new_year = str(new_ref.get("year", ""))
        new_doi = normalize_text(new_ref.get("doi", ""))
        
        # 如果DOI存在，优先使用DOI匹配
        if new_doi:
            for i, existing_ref in enumerate(existing_refs):
                existing_doi = normalize_text(existing_ref.get("doi", ""))
                if existing_doi and existing_doi == new_doi:
                    return i
        
        # 如果标题和作者都存在，使用标题+作者匹配
        if new_title and new_authors:
            for i, existing_ref in enumerate(existing_refs):
                existing_title = normalize_text(existing_ref.get("title", ""))
                existing_authors = normalize_authors(existing_ref.get("authors", []))
                
                # 标题相似度检查（使用简单的包含关系）
                title_match = False
                if len(new_title) > 10 and len(existing_title) > 10:
                    # 较长标题使用包含关系检查
                    if new_title in existing_title or existing_title in new_title:
                        title_match = True
                else:
                    # 较短标题使用精确匹配
                    title_match = new_title == existing_title
                
                # 作者匹配（至少有一个共同作者）
                authors_match = False
                if new_authors and existing_authors:
                    new_author_parts = set(new_authors.split())
                    existing_author_parts = set(existing_authors.split())
                    # 检查是否有共同的部分（姓氏）
                    common_parts = new_author_parts.intersection(existing_author_parts)
                    authors_match = len(common_parts) > 0
                
                # 如果标题和作者都匹配，认为是重复
                if title_match and authors_match:
                    return i
        
        # 如果只有标题存在，使用标题匹配
        if new_title:
            for i, existing_ref in enumerate(existing_refs):
                existing_title = normalize_text(existing_ref.get("title", ""))
                if len(new_title) > 10 and len(existing_title) > 10:
                    if new_title in existing_title or existing_title in new_title:
                        return i
                elif new_title == existing_title:
                    return i
        
        # 如果只有作者和年份存在，使用作者+年份匹配
        if new_authors and new_year:
            for i, existing_ref in enumerate(existing_refs):
                existing_authors = normalize_authors(existing_ref.get("authors", []))
                existing_year = str(existing_ref.get("year", ""))
                
                if existing_authors and existing_year == new_year:
                    # 检查作者相似度
                    new_author_parts = set(new_authors.split())
                    existing_author_parts = set(existing_authors.split())
                    common_parts = new_author_parts.intersection(existing_author_parts)
                    
                    # 如果有至少一半的作者匹配，认为是重复
                    if len(common_parts) >= min(len(new_author_parts), len(existing_author_parts)) / 2:
                        return i
        
        # 没有找到重复
        return None

    def check_and_complete_translation(self, paper_id: str) -> Dict[str, Any]:
        """
        检查论文的翻译完整性并补全缺失的翻译
        
        Args:
            paper_id: 论文ID
            
        Returns:
            翻译检查和补全结果
        """
        try:
            # 获取论文数据
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")
            
            # 初始化LLM工具
            llm_utils = get_llm_utils()
            
            # 检查和补全翻译
            updated_paper, translation_result = self._check_and_translate_paper(paper, llm_utils)
            
            # 更新论文
            if updated_paper:
                update_data = {
                    "metadata": updated_paper.get("metadata", {}),
                    "abstract": updated_paper.get("abstract", {}),
                    "sections": updated_paper.get("sections", []),
                    "translationStatus": updated_paper.get("translationStatus", {})
                }
                
                if self.paper_model.update(paper_id, update_data):
                    final_paper = self.paper_model.find_by_id(paper_id)
                    return self._wrap_success(
                        "翻译检查和补全完成",
                        {
                            "paper": final_paper,
                            "translationResult": translation_result
                        }
                    )
                else:
                    return self._wrap_error("更新论文失败")
            else:
                return self._wrap_error("翻译处理失败")
                
        except Exception as exc:
            return self._wrap_error(f"翻译检查和补全失败: {exc}")
    
    def _check_and_translate_paper(self, paper: Dict[str, Any], llm_utils) -> Tuple[Optional[Dict[str, Any]], Dict[str, Any]]:
        """
        检查论文的翻译完整性并进行翻译补全
        
        Args:
            paper: 论文数据
            llm_utils: LLM工具实例
            
        Returns:
            (更新后的论文, 翻译结果)
        """
        translation_result = {
            "isComplete": True,
            "missingFields": [],
            "translatedFields": [],
            "errors": []
        }
        
        # 深拷贝论文数据以避免修改原数据
        updated_paper = paper.copy()
        updated_paper["metadata"] = paper.get("metadata", {}).copy()
        updated_paper["abstract"] = paper.get("abstract", {}).copy() if paper.get("abstract") else {}
        updated_paper["sections"] = [section.copy() for section in paper.get("sections", [])]
        
        # 检查metadata的翻译
        metadata = updated_paper["metadata"]
        
        # 检查标题翻译（使用新的 title 和 titleZh 结构）
        title = metadata.get("title", "")
        title_zh = metadata.get("titleZh", "")
        
        # 检查是否有英文标题但没有中文标题
        if title and not title_zh:
            try:
                translated_text = llm_utils.simple_text_chat(
                    f"将以下英文标题翻译为中文，只返回翻译结果：\n\n{title}",
                    "你是一个专业的学术翻译助手。只返回翻译后的标题字符串，不要添加任何解释、分析或额外内容。"
                )
                if translated_text:
                    metadata["titleZh"] = translated_text.strip()
                    translation_result["translatedFields"].append({
                        "field": "metadata.titleZh",
                        "from": "en",
                        "to": "zh",
                        "original": title,
                        "translated": translated_text.strip()
                    })
            except Exception as e:
                translation_result["errors"].append(f"翻译失败 metadata.titleZh: {str(e)}")
        
        # 检查是否有中文标题但没有英文标题
        elif title_zh and not title:
            try:
                translated_text = llm_utils.simple_text_chat(
                    f"将以下中文标题翻译为英文，只返回翻译结果：\n\n{title_zh}",
                    "你是一个专业的学术翻译助手。只返回翻译后的标题字符串，不要添加任何解释、分析或额外内容。"
                )
                if translated_text:
                    metadata["title"] = translated_text.strip()
                    translation_result["translatedFields"].append({
                        "field": "metadata.title",
                        "from": "zh",
                        "to": "en",
                        "original": title_zh,
                        "translated": translated_text.strip()
                    })
            except Exception as e:
                translation_result["errors"].append(f"翻译失败 metadata.title: {str(e)}")
        
        # 检查作者信息翻译
        if "authors" in metadata and isinstance(metadata["authors"], list):
            for i, author in enumerate(metadata["authors"]):
                if isinstance(author, dict) and "name" in author:
                    author_name_translation = self._check_and_translate_field(
                        author.get("name", {}),
                        f"metadata.authors[{i}].name",
                        llm_utils,
                        translation_result
                    )
                    if author_name_translation:
                        author["name"] = author_name_translation
                    
                    if "affiliation" in author:
                        affiliation_translation = self._check_and_translate_field(
                            author.get("affiliation", {}),
                            f"metadata.authors[{i}].affiliation",
                            llm_utils,
                            translation_result
                        )
                        if affiliation_translation:
                            author["affiliation"] = affiliation_translation
        
        # 检查abstract翻译（abstract的en/zh是字符串类型）
        abstract = updated_paper["abstract"]
        if abstract and isinstance(abstract, dict):
            has_en = "en" in abstract and abstract["en"] and str(abstract["en"]).strip()
            has_zh = "zh" in abstract and abstract["zh"] and str(abstract["zh"]).strip()
            
            if has_en and not has_zh:
                # 英文存在，中文不存在，翻译英文为中文
                existing_text = str(abstract["en"])
                try:
                    translated_text = llm_utils.simple_text_chat(
                        f"将以下英文摘要翻译为中文，只返回翻译结果：\n\n{existing_text}",
                        "你是一个专业的学术翻译助手。只返回翻译后的摘要字符串，不要添加任何解释、分析或额外内容。"
                    )
                    if translated_text:
                        updated_paper["abstract"]["zh"] = translated_text.strip()
                        translation_result["translatedFields"].append({
                            "field": "abstract",
                            "from": "en",
                            "to": "zh",
                            "original": existing_text,
                            "translated": translated_text.strip()
                        })
                except Exception as e:
                    translation_result["errors"].append(f"翻译失败 abstract: {str(e)}")
            
            elif has_zh and not has_en:
                # 中文存在，英文不存在，翻译中文为英文
                existing_text = str(abstract["zh"])
                try:
                    translated_text = llm_utils.simple_text_chat(
                        f"将以下中文摘要翻译为英文，只返回翻译结果：\n\n{existing_text}",
                        "你是一个专业的学术翻译助手。只返回翻译后的摘要字符串，不要添加任何解释、分析或额外内容。"
                    )
                    if translated_text:
                        updated_paper["abstract"]["en"] = translated_text.strip()
                        translation_result["translatedFields"].append({
                            "field": "abstract",
                            "from": "zh",
                            "to": "en",
                            "original": existing_text,
                            "translated": translated_text.strip()
                        })
                except Exception as e:
                    translation_result["errors"].append(f"翻译失败 abstract: {str(e)}")
                    
            elif has_en and has_zh:
                # 两种语言都存在，检查是否需要补全空值
                en_text = str(abstract.get("en", "")).strip()
                zh_text = str(abstract.get("zh", "")).strip()
                
                if not en_text and zh_text:
                    # 英文为空，中文有值，补充英文
                    try:
                        translated_text = llm_utils.simple_text_chat(
                            f"将以下中文摘要翻译为英文，只返回翻译结果：\n\n{zh_text}",
                            "你是一个专业的学术翻译助手。只返回翻译后的摘要字符串，不要添加任何解释、分析或额外内容。"
                        )
                        if translated_text:
                            updated_paper["abstract"]["en"] = translated_text.strip()
                    except Exception as e:
                        translation_result["errors"].append(f"补全英文摘要失败: {str(e)}")
                        
                if not zh_text and en_text:
                    # 中文为空，英文有值，补充中文
                    try:
                        translated_text = llm_utils.simple_text_chat(
                            f"将以下英文摘要翻译为中文，只返回翻译结果：\n\n{en_text}",
                            "你是一个专业的学术翻译助手。只返回翻译后的摘要字符串，不要添加任何解释、分析或额外内容。"
                        )
                        if translated_text:
                            updated_paper["abstract"]["zh"] = translated_text.strip()
                    except Exception as e:
                        translation_result["errors"].append(f"补全中文摘要失败: {str(e)}")
                        
        elif isinstance(abstract, str):
            # 如果是字符串格式，转换为标准格式
            updated_paper["abstract"] = {"en": abstract, "zh": ""}
        
        # 检查sections翻译
        for section_idx, section in enumerate(updated_paper["sections"]):
            # 检查section标题翻译（使用新的 title 和 titleZh 结构）
            section_title = section.get("title", "")
            section_title_zh = section.get("titleZh", "")
            
            # 检查是否有英文标题但没有中文标题
            if section_title and not section_title_zh:
                try:
                    translated_text = llm_utils.simple_text_chat(
                        f"将以下英文章节标题翻译为中文，只返回翻译结果：\n\n{section_title}",
                        "你是一个专业的学术翻译助手。只返回翻译后的标题字符串，不要添加任何解释、分析或额外内容。"
                    )
                    if translated_text:
                        section["titleZh"] = translated_text.strip()
                        translation_result["translatedFields"].append({
                            "field": f"sections[{section_idx}].titleZh",
                            "from": "en",
                            "to": "zh",
                            "original": section_title,
                            "translated": translated_text.strip()
                        })
                except Exception as e:
                    translation_result["errors"].append(f"翻译失败 sections[{section_idx}].titleZh: {str(e)}")
            
            # 检查是否有中文标题但没有英文标题
            elif section_title_zh and not section_title:
                try:
                    translated_text = llm_utils.simple_text_chat(
                        f"将以下中文章节标题翻译为英文，只返回翻译结果：\n\n{section_title_zh}",
                        "你是一个专业的学术翻译助手。只返回翻译后的标题字符串，不要添加任何解释、分析或额外内容。"
                    )
                    if translated_text:
                        section["title"] = translated_text.strip()
                        translation_result["translatedFields"].append({
                            "field": f"sections[{section_idx}].title",
                            "from": "zh",
                            "to": "en",
                            "original": section_title_zh,
                            "translated": translated_text.strip()
                        })
                except Exception as e:
                    translation_result["errors"].append(f"翻译失败 sections[{section_idx}].title: {str(e)}")
            
            # 检查section内容翻译
            if "content" in section and isinstance(section["content"], list):
                for block_idx, block in enumerate(section["content"]):
                    if "content" in block and isinstance(block["content"], dict):
                        block_content_translation = self._check_and_translate_field(
                            block.get("content", {}),
                            f"sections[{section_idx}].content[{block_idx}].content",
                            llm_utils,
                            translation_result
                        )
                        if block_content_translation:
                            block["content"] = block_content_translation
                        
                        # 处理特殊类型的block
                        if block.get("type") == "figure" and "alt" in block:
                            figure_alt_translation = self._check_and_translate_field(
                                block.get("alt", {}),
                                f"sections[{section_idx}].content[{block_idx}].alt",
                                llm_utils,
                                translation_result
                            )
                            if figure_alt_translation:
                                block["alt"] = figure_alt_translation
                        
                        # 处理列表项翻译
                        if block.get("type") in ["ordered-list", "unordered-list"] and "items" in block:
                            for item_idx, item in enumerate(block.get("items", [])):
                                if "content" in item:
                                    item_content_translation = self._check_and_translate_field(
                                        item.get("content", {}),
                                        f"sections[{section_idx}].content[{block_idx}].items[{item_idx}].content",
                                        llm_utils,
                                        translation_result
                                    )
                                    if item_content_translation:
                                        item["content"] = item_content_translation
        
        # 更新翻译状态
        current_time = get_current_time()
        updated_paper["translationStatus"] = {
            "isComplete": len(translation_result["missingFields"]) == 0,
            "lastChecked": current_time.isoformat(),
            "missingFields": translation_result["missingFields"],
            "updatedAt": current_time.isoformat()
        }
        
        return updated_paper, translation_result
    
    def _check_and_translate_field(self, field_data: Any, field_path: str, llm_utils, translation_result: Dict[str, Any]) -> Optional[Any]:
        """
        检查并翻译单个字段
        
        Args:
            field_data: 字段数据
            field_path: 字段路径
            llm_utils: LLM工具实例
            translation_result: 翻译结果容器
            
        Returns:
            更新后的字段数据
        """
        if not isinstance(field_data, dict):
            # 如果不是字典格式，可能是字符串，直接返回
            return field_data
        
        # 更健壮的字段存在性和内容检查
        has_en = "en" in field_data and field_data["en"] and (
            (isinstance(field_data["en"], str) and field_data["en"].strip()) or
            (isinstance(field_data["en"], list) and field_data["en"])
        )
        has_zh = "zh" in field_data and field_data["zh"] and (
            (isinstance(field_data["zh"], str) and field_data["zh"].strip()) or
            (isinstance(field_data["zh"], list) and field_data["zh"])
        )
        
        # 如果两种语言都存在且不为空，无需翻译
        if has_en and has_zh:
            return field_data
        
        # 记录缺失的翻译
        if not has_en:
            translation_result["missingFields"].append(f"{field_path}.en")
        if not has_zh:
            translation_result["missingFields"].append(f"{field_path}.zh")
        
        # 需要翻译的情况
        source_text = ""
        source_lang = ""
        target_lang = ""
        
        if has_en and not has_zh:
            # 有英文，翻译为中文
            source_text = self._extract_text_from_content(field_data.get("en", []))
            source_lang = "en"
            target_lang = "zh"
        elif has_zh and not has_en:
            # 有中文，翻译为英文
            source_text = self._extract_text_from_content(field_data.get("zh", []))
            source_lang = "zh"
            target_lang = "en"
        elif has_en and has_zh:
            # 两种语言都存在，但可能需要补全空内容
            en_text = self._extract_text_from_content(field_data.get("en", []))
            zh_text = self._extract_text_from_content(field_data.get("zh", []))
            if not en_text.strip() and zh_text.strip():
                # 英文为空，中文有内容，翻译中文为英文
                source_text = zh_text
                source_lang = "zh"
                target_lang = "en"
            elif not zh_text.strip() and en_text.strip():
                # 中文为空，英文有内容，翻译英文为中文
                source_text = en_text
                source_lang = "en"
                target_lang = "zh"
            else:
                # 两种语言都有内容，无需翻译
                return field_data
        else:
            # 都没有，返回原数据
            return field_data
        
        if not source_text.strip():
            return field_data
        
        try:
            # 调用LLM进行翻译
            translated_text = llm_utils.simple_text_chat(
                f"将以下{source_lang}文本翻译为{target_lang}，只返回翻译结果：\n\n{source_text}",
                f"你是一个专业的学术翻译助手。只返回翻译后的文本字符串，不要添加任何解释、分析或额外内容。"
            )
            
            if translated_text:
                # 更新字段数据
                updated_field_data = field_data.copy()
                if source_lang == "en":
                    # 保持原有的结构（数组或字符串），只补充缺失的语言
                    if "en" not in updated_field_data:
                        updated_field_data["en"] = field_data.get("en", [])
                    if "zh" not in updated_field_data or not updated_field_data["zh"]:
                        updated_field_data["zh"] = self._create_text_content(translated_text)
                else:
                    # 保持原有的结构（数组或字符串），只补充缺失的语言
                    if "zh" not in updated_field_data:
                        updated_field_data["zh"] = field_data.get("zh", [])
                    if "en" not in updated_field_data or not updated_field_data["en"]:
                        updated_field_data["en"] = self._create_text_content(translated_text)
                
                translation_result["translatedFields"].append({
                    "field": field_path,
                    "from": source_lang,
                    "to": target_lang,
                    "original": source_text,
                    "translated": translated_text
                })
                
                return updated_field_data
        except Exception as e:
            translation_result["errors"].append(f"翻译失败 {field_path}: {str(e)}")
        
        return field_data
    
    def _extract_text_from_content(self, content: Any) -> str:
        """
        从content数组中提取纯文本
        
        Args:
            content: content数据
            
        Returns:
            提取的纯文本
        """
        if isinstance(content, list):
            text_parts = []
            for item in content:
                if isinstance(item, dict):
                    if item.get("type") == "text" and item.get("text"):
                        text_parts.append(item["text"])
                    elif item.get("type") == "link" and item.get("label"):
                        text_parts.append(item["label"])
                    elif item.get("type") == "link" and item.get("text"):
                        text_parts.append(item["text"])
                elif isinstance(item, str):
                    text_parts.append(item)
            return " ".join(text_parts)
        elif isinstance(content, str):
            return content
        return ""
    
    def _create_text_content(self, text: str) -> List[Dict[str, Any]]:
        """
        创建标准的text content数组
        
        Args:
            text: 文本内容
            
        Returns:
            content数组
        """
        text = str(text) if text else ""
        return [{"type": "text", "text": text}] if text else []
    
    def get_translation_status(self, paper_id: str) -> Dict[str, Any]:
        """
        获取论文的翻译状态
        
        Args:
            paper_id: 论文ID
            
        Returns:
            翻译状态
        """
        try:
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")
            
            translation_status = paper.get("translationStatus", {
                "isComplete": False,
                "lastChecked": None,
                "missingFields": [],
                "updatedAt": None,
            })
            
            return self._wrap_success("获取翻译状态成功", translation_status)
        except Exception as exc:
            return self._wrap_error(f"获取翻译状态失败: {exc}")

    def migrate_paper_translation_status(self, paper_id: str = None) -> Dict[str, Any]:
        """
        为论文添加或更新translationStatus字段
        
        Args:
            paper_id: 特定论文ID，如果为None则迁移所有论文
            
        Returns:
            迁移结果
        """
        try:
            if paper_id:
                # 迁移单个论文
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")
                
                if "translationStatus" not in paper:
                    translation_status = {
                        "isComplete": False,
                        "lastChecked": None,
                        "missingFields": [],
                        "updatedAt": get_current_time().isoformat()
                    }
                    self.paper_model.update(paper_id, {"translationStatus": translation_status})
                    return self._wrap_success("论文translationStatus字段添加成功", {"paperId": paper_id})
                else:
                    return self._wrap_success("论文已有translationStatus字段", {"paperId": paper_id})
            else:
                # 迁移所有论文
                all_papers = list(self.paper_model.collection.find({}, {"_id": 0, "id": 1, "translationStatus": 1}))
                migrated_count = 0
                
                for paper in all_papers:
                    paper_id = paper["id"]
                    if "translationStatus" not in paper:
                        translation_status = {
                            "isComplete": False,
                            "lastChecked": None,
                            "missingFields": [],
                            "updatedAt": get_current_time().isoformat()
                        }
                        self.paper_model.update(paper_id, {"translationStatus": translation_status})
                        migrated_count += 1
                
                return self._wrap_success(f"成功迁移{migrated_count}篇论文的translationStatus字段", {
                    "totalPapers": len(all_papers),
                    "migratedCount": migrated_count
                })
        except Exception as exc:
            return self._wrap_error(f"迁移translationStatus字段失败: {exc}")

    def migrate_abstract_format(self, paper_id: str = None) -> Dict[str, Any]:
        """
        迁移论文的abstract格式，确保使用字符串而不是数组
        
        Args:
            paper_id: 特定论文ID，如果为None则迁移所有论文
            
        Returns:
            迁移结果
        """
        try:
            if paper_id:
                # 迁移单个论文
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")
                
                updated_count = self._migrate_single_abstract_format(paper)
                return self._wrap_success(f"论文abstract格式迁移完成，更新了{updated_count}个字段", {
                    "paperId": paper_id,
                    "updatedFields": updated_count
                })
            else:
                # 迁移所有论文
                all_papers = list(self.paper_model.collection.find({}, {"_id": 0, "id": 1, "abstract": 1}))
                total_updated = 0
                migrated_papers = 0
                
                for paper in all_papers:
                    paper_id = paper["id"]
                    updated_count = self._migrate_single_abstract_format(paper)
                    if updated_count > 0:
                        total_updated += updated_count
                        migrated_papers += 1
                
                return self._wrap_success(f"完成abstract格式迁移", {
                    "totalPapers": len(all_papers),
                    "migratedPapers": migrated_papers,
                    "totalUpdatedFields": total_updated
                })
        except Exception as exc:
            return self._wrap_error(f"迁移abstract格式失败: {exc}")

    def _migrate_single_abstract_format(self, paper: Dict[str, Any]) -> int:
        """
        迁移单个论文的abstract格式
        
        Args:
            paper: 论文数据
            
        Returns:
            更新的字段数量
        """
        updated_count = 0
        paper_id = paper.get("id")
        if not paper_id:
            return 0
        
        # 处理abstract格式
        abstract = paper.get("abstract")
        if abstract:
            if isinstance(abstract, dict) and ("en" in abstract or "zh" in abstract):
                # 确保en和zh都是字符串格式
                new_abstract = {}
                if "en" in abstract:
                    en_value = abstract["en"]
                    if isinstance(en_value, list):
                        new_abstract["en"] = self._extract_text_from_content(en_value)
                    else:
                        new_abstract["en"] = str(en_value)
                    updated_count += 1
                
                if "zh" in abstract:
                    zh_value = abstract["zh"]
                    if isinstance(zh_value, list):
                        new_abstract["zh"] = self._extract_text_from_content(zh_value)
                    else:
                        new_abstract["zh"] = str(zh_value)
                    updated_count += 1
                
                if new_abstract:
                    self.paper_model.update(paper_id, {"abstract": new_abstract})
            
            elif isinstance(abstract, str):
                # 如果是纯字符串，转换为标准格式
                new_abstract = {"en": abstract, "zh": ""}
                self.paper_model.update(paper_id, {"abstract": new_abstract})
                updated_count += 1
        
        return updated_count

    def migrate_title_format(self, paper_id: str = None) -> Dict[str, Any]:
        """
        迁移论文的标题格式，从旧的 {en: "...", zh: "..."} 格式转换为新的 title 和 titleZh 格式
        
        Args:
            paper_id: 特定论文ID，如果为None则迁移所有论文
            
        Returns:
            迁移结果
        """
        try:
            if paper_id:
                # 迁移单个论文
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")
                
                updated_count = self._migrate_single_title_format(paper)
                return self._wrap_success(f"论文标题格式迁移完成，更新了{updated_count}个字段", {
                    "paperId": paper_id,
                    "updatedFields": updated_count
                })
            else:
                # 迁移所有论文
                all_papers = list(self.paper_model.collection.find({}, {"_id": 0, "id": 1, "metadata": 1, "sections": 1}))
                total_updated = 0
                migrated_papers = 0
                
                for paper in all_papers:
                    paper_id = paper["id"]
                    updated_count = self._migrate_single_title_format(paper)
                    if updated_count > 0:
                        total_updated += updated_count
                        migrated_papers += 1
                
                return self._wrap_success(f"完成标题格式迁移", {
                    "totalPapers": len(all_papers),
                    "migratedPapers": migrated_papers,
                    "totalUpdatedFields": total_updated
                })
        except Exception as exc:
            return self._wrap_error(f"迁移标题格式失败: {exc}")

    def _migrate_single_title_format(self, paper: Dict[str, Any]) -> int:
        """
        迁移单个论文的标题格式
        
        Args:
            paper: 论文数据
            
        Returns:
            更新的字段数量
        """
        updated_count = 0
        paper_id = paper.get("id")
        if not paper_id:
            return 0
        
        # 处理metadata中的标题
        metadata = paper.get("metadata", {})
        if "title" in metadata and isinstance(metadata["title"], dict):
            title_obj = metadata["title"]
            new_metadata = metadata.copy()
            
            # 提取英文和中文标题
            if "en" in title_obj:
                new_metadata["title"] = title_obj["en"]
                updated_count += 1
            
            if "zh" in title_obj:
                new_metadata["titleZh"] = title_obj["zh"]
                updated_count += 1
            
            # 更新metadata
            if updated_count > 0:
                self.paper_model.update(paper_id, {"metadata": new_metadata})
        
        # 处理sections中的标题
        sections = paper.get("sections", [])
        updated_sections = []
        sections_updated = False
        
        for section in sections:
            updated_section = section.copy()
            
            # 检查section标题
            if "title" in section and isinstance(section["title"], dict):
                title_obj = section["title"]
                
                # 提取英文和中文标题
                if "en" in title_obj:
                    updated_section["title"] = title_obj["en"]
                    updated_count += 1
                
                if "zh" in title_obj:
                    updated_section["titleZh"] = title_obj["zh"]
                    updated_count += 1
                
                sections_updated = True
            
            # 递归处理子章节
            if "subsections" in section and section["subsections"]:
                updated_subsections = []
                for subsection in section["subsections"]:
                    updated_subsection = subsection.copy()
                    
                    if "title" in subsection and isinstance(subsection["title"], dict):
                        title_obj = subsection["title"]
                        
                        if "en" in title_obj:
                            updated_subsection["title"] = title_obj["en"]
                            updated_count += 1
                        
                        if "zh" in title_obj:
                            updated_subsection["titleZh"] = title_obj["zh"]
                            updated_count += 1
                        
                        sections_updated = True
                    
                    updated_subsections.append(updated_subsection)
                
                updated_section["subsections"] = updated_subsections
            
            updated_sections.append(updated_section)
        
        # 更新sections
        if sections_updated:
            self.paper_model.update(paper_id, {"sections": updated_sections})
        
        return updated_count


_paper_service: Optional[PaperService] = None


def get_paper_service() -> PaperService:
    global _paper_service
    if _paper_service is None:
        _paper_service = PaperService()
    return _paper_service
