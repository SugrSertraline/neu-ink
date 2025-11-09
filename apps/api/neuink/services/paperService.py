"""
Paper 业务逻辑服务
处理论文相关的业务逻辑
"""
import time
from typing import Dict, Any, Optional, Tuple, List

from ..models.paper import PaperModel
from ..config.constants import BusinessCode
from ..utils.llm_utils import get_llm_utils


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

            # 构建论文数据，只包含 metadata、abstract 和 keywords
            paper_data = {
                "isPublic": is_public,
                "metadata": metadata,
                "abstract": parsed_data.get("abstract", {}),
                "keywords": parsed_data.get("keywords", []),
                "sections": [],  # 空的章节列表
                "references": [],  # 空的参考文献列表
                "attachments": {},  # 空的附件
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

            # 构建论文数据
            paper_data = {
                "isPublic": is_public,
                "metadata": metadata,
                "abstract": metadata.get("abstract", ""),
                "keywords": metadata.get("keywords", []),
                "sections": [],  # 空的章节列表
                "references": [],  # 空的参考文献列表
                "attachments": {},  # 空的附件
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
            new_blocks = llm_utils.parse_text_to_blocks(text, section_context)

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
            
            # 确保新章节有必要的字段
            new_section = {
                "id": section_data.get("id"),
                "title": section_data.get("title", {"en": "Untitled Section", "zh": "未命名章节"}),
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
                if key in ["title", "content", "subsections"]:
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

            # 获取section上下文信息
            section_context = f"Section标题: {target_section.get('title', '未知')}"
            if target_section.get('content'):
                section_context += f", Section内容: {target_section['content'][:200]}..."

            # 使用LLM解析文本为blocks
            try:
                llm_utils = get_llm_utils()
                new_blocks = llm_utils.parse_text_to_blocks(text, section_context)
            except Exception as llm_exc:
                # 捕获LLM解析异常并返回明确的错误信息
                error_msg = str(llm_exc)
                if "GLM_API_KEY" in error_msg:
                    return self._wrap_error("LLM服务未正确配置：缺少有效的API密钥。请联系管理员配置GLM_API_KEY。")
                elif "timeout" in error_msg.lower() or "超时" in error_msg:
                    return self._wrap_error("文本解析超时：文本内容可能过多或服务器响应较慢，请减少文本量或稍后重试。")
                elif "network" in error_msg.lower() or "网络" in error_msg:
                    return self._wrap_error("网络连接错误：无法连接到LLM服务，请检查网络连接后重试。")
                else:
                    return self._wrap_error(f"文本解析失败：{error_msg}")

            if not new_blocks:
                return self._wrap_error("文本解析失败，无法生成有效的blocks。请检查文本内容是否合适。")

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
            
            # 插入新blocks - 使用切片插入所有blocks
            current_blocks[insert_index:insert_index] = new_blocks
            target_section["content"] = current_blocks
            sections[section_index] = target_section

            # 更新论文
            update_data = {"sections": sections}
            if self.paper_model.update(paper_id, update_data):
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
            # 记录完整的异常信息以便调试
            import traceback
            error_details = f"从文本添加block到section失败: {exc}\n详细错误: {traceback.format_exc()}"
            return self._wrap_error(error_details)

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

    def parse_references(self, text: str) -> Dict[str, Any]:
        """
        解析参考文献文本，返回结构化的参考文献列表
        
        Args:
            text: 参考文献文本，可能包含多条参考文献
            
        Returns:
            解析后的参考文献列表
        """
        try:
            # 使用LLM工具解析参考文献
            llm_utils = get_llm_utils()
            parsed_references = llm_utils.parse_references(text)
            
            if not parsed_references:
                return self._wrap_error("参考文献解析失败，无法提取有效的参考文献")
            
            return self._wrap_success(
                "参考文献解析成功",
                {
                    "references": parsed_references,
                    "count": len(parsed_references)
                }
            )
        except Exception as exc:
            return self._wrap_error(f"参考文献解析失败: {exc}")

    def add_references_to_paper(
        self,
        paper_id: str,
        references: List[Dict[str, Any]],
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """
        将解析后的参考文献添加到论文中
        
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
            
            # 为新参考文献添加编号
            next_number = len(current_references) + 1
            for ref in references:
                if "number" not in ref:
                    ref["number"] = next_number
                    next_number += 1
            
            # 合并参考文献列表
            updated_references = current_references + references
            
            # 更新论文
            update_data = {"references": updated_references}
            if self.paper_model.update(paper_id, update_data):
                updated_paper = self.paper_model.find_by_id(paper_id)
                return self._wrap_success(
                    f"成功添加{len(references)}条参考文献",
                    {
                        "paper": updated_paper,
                        "addedReferences": references,
                        "totalReferences": len(updated_references)
                    }
                )
            else:
                return self._wrap_error("更新论文失败")
                
        except Exception as exc:
            return self._wrap_error(f"添加参考文献失败: {exc}")

    def _wrap_error(self, message: str) -> Dict[str, Any]:
        return self._wrap_failure(BusinessCode.UNKNOWN_ERROR, message)


_paper_service: Optional[PaperService] = None


def get_paper_service() -> PaperService:
    global _paper_service
    if _paper_service is None:
        _paper_service = PaperService()
    return _paper_service
