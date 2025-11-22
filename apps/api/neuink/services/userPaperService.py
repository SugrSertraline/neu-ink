"""
UserPaper 业务逻辑服务
处理个人论文库相关的业务逻辑
"""
from typing import Dict, Any, List, Optional, Tuple

from ..models.paper import PaperModel
from ..models.userPaper import UserPaperModel
from ..models.note import NoteModel
from ..config.constants import BusinessCode


class UserPaperService:
    """UserPaper 业务逻辑服务类"""

    def __init__(self) -> None:
        self.paper_model = PaperModel()
        self.user_paper_model = UserPaperModel()
        self.note_model = NoteModel()

    # ------------------------------------------------------------------
    # 个人论文库列表
    # ------------------------------------------------------------------
    def get_user_papers(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "addedAt",
        sort_order: str = "desc",
        search: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        获取用户的个人论文库列表
        优化版本：只返回列表页面需要的字段，不包括完整的论文内容和笔记数量
        """
        try:
            skip = self._calc_skip(page, page_size)
            sort_direction = self._parse_sort_order(sort_order)

            papers, total = self.user_paper_model.find_by_user(
                user_id=user_id,
                skip=skip,
                limit=page_size,
                sort_by=sort_by,
                sort_order=sort_direction,
                search=search,
                filters=filters or {},
            )

            # 扁平化数据结构，确保所有字段都在顶层
            for paper in papers:
                # 确保每篇论文都包含阅读时长字段
                if "totalReadingTime" not in paper:
                    paper["totalReadingTime"] = 0
                if "lastReadTime" not in paper:
                    paper["lastReadTime"] = None

            return self._wrap_success(
                "获取个人论文库成功",
                {
                    "papers": papers,
                    "pagination": self._build_pagination(total, page, page_size),
                },
            )
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取个人论文库失败: {exc}")

    # ------------------------------------------------------------------
    # 添加公共论文到个人库（副本机制）
    # ------------------------------------------------------------------
    def add_public_paper(
        self,
        user_id: str,
        paper_id: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        将公共论文添加到个人论文库（创建副本）
        """
        try:
            # 1. 检查公共论文是否存在
            public_paper = self.paper_model.find_public_paper_by_id(paper_id)
            if not public_paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND,
                    "公共论文不存在或不可访问"
                )

            # 2. 检查是否已添加
            existing = self.user_paper_model.find_by_user_and_source(
                user_id=user_id,
                source_paper_id=paper_id
            )
            if existing:
                return self._wrap_failure(
                    BusinessCode.INVALID_PARAMS,
                    "该论文已在您的个人库中"
                )

            # 3. 创建副本
            paper_data, section_ids = self._extract_paper_data_and_copy_sections(public_paper)
            
            user_paper_data = {
                "userId": user_id,
                "sourcePaperId": paper_id,  # 记录来源
                # 扁平化字段
                "metadata": paper_data["metadata"],
                "abstract": paper_data["abstract"],
                "keywords": paper_data["keywords"],
                "references": paper_data["references"],
                "attachments": paper_data["attachments"],
                "sectionIds": section_ids,  # 复制的section ID列表
                "customTags": extra.get("customTags", []) if extra else [],
                "readingStatus": extra.get("readingStatus", "unread") if extra else "unread",
                "priority": extra.get("priority", "medium") if extra else "medium",
            }

            user_paper = self.user_paper_model.create(user_paper_data)
            
            # 4. 更新sections的paperId为用户论文ID
            if section_ids and user_paper.get("id"):
                from ..models.section import get_section_model
                section_model = get_section_model()
                for section_id in section_ids:
                    section_model.update(section_id, {"paperId": user_paper["id"]})
            
            return self._wrap_success("添加到个人论文库成功", user_paper)

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"添加论文失败: {exc}")

    # ------------------------------------------------------------------
    # 用户上传论文（预留接口）
    # ------------------------------------------------------------------
    def upload_private_paper(
        self,
        user_id: str,
        request: Any,
    ) -> Dict[str, Any]:
        """
        用户上传私有论文（功能已移除）
        """
        return self._wrap_failure(BusinessCode.INVALID_PARAMS, "论文上传功能已移除")

    def add_uploaded_paper(
        self,
        user_id: str,
        paper_data: Dict[str, Any],
        extra: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        添加用户上传的论文到个人论文库
        """
        try:
            # 提取论文数据并复制sections
            extracted_data, section_ids = self._extract_paper_data_and_copy_sections(paper_data)
            
            # 构建用户论文数据（扁平化结构）
            user_paper_data = {
                "userId": user_id,
                "sourcePaperId": None,  # 上传的论文没有来源
                # 扁平化字段
                "metadata": extracted_data["metadata"],
                "abstract": extracted_data["abstract"],
                "keywords": extracted_data["keywords"],
                "references": extracted_data["references"],
                "attachments": extracted_data["attachments"],
                "sectionIds": section_ids,  # 复制的section ID列表
                "customTags": extra.get("customTags", []) if extra else [],
                "readingStatus": extra.get("readingStatus", "unread") if extra else "unread",
                "priority": extra.get("priority", "medium") if extra else "medium",
            }

            user_paper = self.user_paper_model.create(user_paper_data)
            
            # 更新sections的paperId为用户论文ID
            if section_ids and user_paper.get("id"):
                from ..models.section import get_section_model
                section_model = get_section_model()
                for section_id in section_ids:
                    section_model.update(section_id, {"paperId": user_paper["id"]})
            
            return self._wrap_success("添加到个人论文库成功", user_paper)

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"添加论文失败: {exc}")

    # ------------------------------------------------------------------
    # 获取个人论文详情
    # ------------------------------------------------------------------
    def get_user_paper_detail(
        self,
        user_paper_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        获取个人论文详情
        """
        try:
            user_paper = self.user_paper_model.find_by_id(user_paper_id)
            
            if not user_paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND,
                    "论文不存在"
                )
            
            # 权限检查
            if user_paper["userId"] != user_id:
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED,
                    "无权访问此论文"
                )

            # 加载sections数据
            user_paper = self._load_sections_for_user_paper(user_paper)

            # 添加笔记信息
            notes, _ = self.note_model.find_by_user_paper(user_paper_id)
            user_paper["notes"] = notes
            user_paper["noteCount"] = len(notes)

            return self._wrap_success("获取论文详情成功", user_paper)

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取论文详情失败: {exc}")

    # ------------------------------------------------------------------
    # 更新个人论文
    # ------------------------------------------------------------------
    def update_user_paper(
    self,
    entry_id: str,
    user_id: str,
    update_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        更新个人论文库条目
        支持修改：
        1. 论文内容（metadata, abstract, keywords, references, attachments）
        2. 自定义标签（customTags）
        3. 阅读状态（readingStatus）
        4. 优先级（priority）
        5. 阅读位置（readingPosition）
        6. 总阅读时间（totalReadingTime）
        7. 最后阅读时间（lastReadTime）
        8. 备注（remarks）
        """
        try:
            user_paper = self.user_paper_model.find_by_id(entry_id)
            
            if not user_paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND,
                    "论文不存在"
                )
            
            # 权限检查
            if user_paper["userId"] != user_id:
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED,
                    "无权修改此论文"
                )

            # 防止修改关键字段
            for field in ["id", "userId", "sourcePaperId", "addedAt"]:
                update_data.pop(field, None)

            # 更新
            if self.user_paper_model.update(entry_id, update_data):
                updated = self.user_paper_model.find_by_id(entry_id)
                return self._wrap_success("更新成功", updated)

            return self._wrap_error("更新失败")

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"更新论文失败: {exc}")

    # ------------------------------------------------------------------
    # 删除个人论文
    # ------------------------------------------------------------------
    def delete_user_paper(
        self,
        entry_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        删除个人论文库条目
        同时删除关联的所有笔记和附件文件
        """
        try:
            user_paper = self.user_paper_model.find_by_id(entry_id)
            
            if not user_paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND,
                    "论文不存在"
                )
            
            # 权限检查
            if user_paper["userId"] != user_id:
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED,
                    "无权删除此论文"
                )

            # 删除关联的笔记
            deleted_notes = self.note_model.delete_by_user_paper(entry_id)
            
            # 删除关联的sections
            from ..models.section import get_section_model
            section_model = get_section_model()
            section_ids = user_paper.get("sectionIds", [])
            deleted_sections = 0
            for section_id in section_ids:
                if section_model.delete(section_id):
                    deleted_sections += 1

            # 删除附件文件
            deleted_attachments = self._delete_user_paper_attachments(user_paper)

            # 删除论文
            if self.user_paper_model.delete(entry_id):
                message = f"删除成功，同时删除了 {deleted_notes} 条笔记和 {deleted_sections} 个章节"
                if deleted_attachments > 0:
                    message += f"以及 {deleted_attachments} 个附件文件"
                return self._wrap_success(
                    message,
                    {"deletedNotes": deleted_notes, "deletedSections": deleted_sections, "deletedAttachments": deleted_attachments}
                )

            return self._wrap_error("删除失败")

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"删除论文失败: {exc}")

    # ------------------------------------------------------------------
    # 统计信息
    # ------------------------------------------------------------------
    def get_user_statistics(self, user_id: str) -> Dict[str, Any]:
        """
        获取用户的统计信息
        """
        try:
            stats = self.user_paper_model.get_user_statistics(user_id)
            stats["totalNotes"] = self.note_model.count_by_user(user_id)
            
            return self._wrap_success("获取统计信息成功", stats)
        
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取统计信息失败: {exc}")

    # ------------------------------------------------------------------
    # 辅助方法
    # ------------------------------------------------------------------
    @staticmethod
    def _extract_paper_data_and_copy_sections(public_paper: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
        """
        从公共论文中提取需要复制的数据，并复制sections到新的section记录
        返回: (paper_data, new_section_ids)
        """
        from ..models.section import get_section_model
        from ..utils.common import generate_id
        
        section_model = get_section_model()
        
        # 获取原始sections数据
        sections = public_paper.get("sections", [])
        
        # 如果sections仍然为空，尝试从数据库加载（作为后备方案）
        if not sections and "id" in public_paper:
            sections = section_model.find_by_paper_id(public_paper["id"])
        
        # 如果仍然没有sections，但paper有sectionIds，尝试通过sectionIds加载（最后的后备方案）
        if not sections and "sectionIds" in public_paper and public_paper["sectionIds"]:
            sections = []
            for section_id in public_paper["sectionIds"]:
                section = section_model.find_by_id(section_id)
                if section:
                    sections.append(section)
        
        # 复制sections并生成新的ID
        new_section_ids = []
        for section in sections:
            # 创建section的副本，但使用新的ID
            # 注意：这里暂时不设置paperId，因为UserPaper还没有创建
            # paperId将在UserPaper创建后设置
            section_copy = {
                "id": generate_id(),  # 生成新的section ID
                "title": section.get("title", ""),
                "titleZh": section.get("titleZh", ""),
                "content": section.get("content", []),
                "paperId": None,  # 暂时设置为null，稍后更新
            }
            
            # 创建新的section记录
            created_section = section_model.create(section_copy)
            if created_section:
                new_section_ids.append(created_section["id"])
        
        # 构建扁平化的论文数据
        # 注意：不保留原始论文ID，因为sections现在通过sectionIds关联
        paper_data = {
            "metadata": public_paper.get("metadata", {}),
            "abstract": public_paper.get("abstract"),
            "keywords": public_paper.get("keywords", []),
            "references": public_paper.get("references", []),
            "attachments": public_paper.get("attachments", {}),
        }
        
        return paper_data, new_section_ids

    @staticmethod
    def _extract_paper_data(public_paper: Dict[str, Any]) -> Dict[str, Any]:
        """
        从公共论文中提取需要复制的数据（保留原方法用于向后兼容）
        """
        # 直接使用已经加载的sections数据，不需要重新加载
        # find_public_paper_by_id方法已经确保sections数据被正确加载
        sections = public_paper.get("sections", [])
        
        # 如果sections仍然为空，尝试从数据库加载（作为后备方案）
        if not sections and "id" in public_paper:
            from ..models.section import get_section_model
            section_model = get_section_model()
            sections = section_model.find_by_paper_id(public_paper["id"])
        
        # 如果仍然没有sections，但paper有sectionIds，尝试通过sectionIds加载（最后的后备方案）
        if not sections and "sectionIds" in public_paper and public_paper["sectionIds"]:
            from ..models.section import get_section_model
            section_model = get_section_model()
            sections = []
            for section_id in public_paper["sectionIds"]:
                section = section_model.find_by_id(section_id)
                if section:
                    sections.append(section)
        
        return {
            "id": public_paper.get("id"),  # 添加论文ID
            "metadata": public_paper.get("metadata", {}),
            "abstract": public_paper.get("abstract"),
            "keywords": public_paper.get("keywords", []),
            "sections": sections,  # 使用加载的sections数据
            "references": public_paper.get("references", []),
            "attachments": public_paper.get("attachments", {}),
        }

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

    def _load_sections_for_user_paper(self, user_paper: Dict[str, Any]) -> Dict[str, Any]:
        """
        为用户论文加载sections数据
        """
        if "sections" in user_paper:
            # 如果已经有sections数据，直接返回
            return user_paper
            
        # 从Section集合获取数据
        from ..models.section import get_section_model
        section_model = get_section_model()
        
        # 获取用户论文的sectionIds
        section_ids = user_paper.get("sectionIds", [])
        if not section_ids:
            user_paper["sections"] = []
            return user_paper
        
        # 通过sectionIds加载sections数据
        sections = []
        for section_id in section_ids:
            section = section_model.find_by_id(section_id)
            if section:
                sections.append(section)
        
        # 将sections数据添加到user_paper中
        user_paper["sections"] = sections
        return user_paper

    def _wrap_error(self, message: str) -> Dict[str, Any]:
        return self._wrap_failure(BusinessCode.UNKNOWN_ERROR, message)
# ------------------------------------------------------------------
# 更新阅读进度（快速接口）
# ------------------------------------------------------------------
    def update_reading_progress(
        self,
        entry_id: str,
        user_id: str,
        reading_position: Optional[str] = None,
        reading_time: int = 0,
    ) -> Dict[str, Any]:
        """
        快速更新阅读进度
        
        Args:
            entry_id: 个人论文ID
            user_id: 用户ID
            reading_position: 当前阅读位置（blockId）
            reading_time: 本次阅读时长（秒）
        """
        try:
            user_paper = self.user_paper_model.find_by_id(entry_id)
            
            if not user_paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND,
                    "论文不存在"
                )
            
            # 权限检查
            if user_paper["userId"] != user_id:
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED,
                    "无权修改此论文"
                )

            update_data: Dict[str, Any] = {}
            
            # 更新阅读位置
            if reading_position is not None:
                update_data["readingPosition"] = reading_position
            
            # 累加阅读时间
            if reading_time > 0:
                current_time = user_paper.get("totalReadingTime", 0)
                update_data["totalReadingTime"] = current_time + reading_time
            
            # 更新最后阅读时间
            from ..utils.common import get_current_time
            update_data["lastReadTime"] = get_current_time()

            # 执行更新
            if self.user_paper_model.update(entry_id, update_data):
                # 只返回更新成功的信息，不返回完整的论文数据
                return self._wrap_success("阅读进度更新成功", {
                    "updated": True,
                    "readingPosition": update_data.get("readingPosition"),
                    "totalReadingTime": update_data.get("totalReadingTime"),
                    "lastReadTime": update_data.get("lastReadTime")
                })

            return self._wrap_error("阅读进度更新失败")

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"更新阅读进度失败: {exc}")

    def _delete_user_paper_attachments(self, user_paper: Dict[str, Any]) -> int:
        """
        删除用户论文的所有附件文件
        
        Args:
            user_paper: 用户论文数据
            
        Returns:
            成功删除的附件数量
        """
        try:
            # 从扁平化字段中获取附件
            attachments = user_paper.get("attachments", {})
            
            if not attachments:
                return 0
                
            # 获取七牛云服务
            from ..services.qiniuService import get_qiniu_service
            qiniu_service = get_qiniu_service()
            
            deleted_count = 0
            
            # 删除PDF附件
            if "pdf" in attachments and attachments["pdf"].get("key"):
                pdf_key = attachments["pdf"]["key"]
                result = qiniu_service.delete_file(pdf_key)
                if result.get("success"):
                    deleted_count += 1
            
            # 删除Markdown附件
            if "markdown" in attachments and attachments["markdown"].get("key"):
                md_key = attachments["markdown"]["key"]
                result = qiniu_service.delete_file(md_key)
                if result.get("success"):
                    deleted_count += 1
            
            # 删除content_list.json附件（如果存在）
            if "content_list" in attachments and attachments["content_list"].get("key"):
                content_list_key = attachments["content_list"]["key"]
                result = qiniu_service.delete_file(content_list_key)
                if result.get("success"):
                    deleted_count += 1
            
            return deleted_count
            
        except Exception as e:
            return 0

_user_paper_service: Optional[UserPaperService] = None


def get_user_paper_service() -> UserPaperService:
    """获取 UserPaperService 单例"""
    global _user_paper_service
    if _user_paper_service is None:
        _user_paper_service = UserPaperService()
    return _user_paper_service