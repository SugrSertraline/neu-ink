"""
UserPaper 业务逻辑服务
处理个人论文库相关的业务逻辑
"""
from typing import Dict, Any, Optional

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

            # 为每篇论文添加笔记数量
            for paper in papers:
                note_count = self.note_model.count_by_user_paper(paper["id"])
                paper["noteCount"] = note_count

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
            paper_data = self._extract_paper_data(public_paper)
            
            user_paper_data = {
                "userId": user_id,
                "sourcePaperId": paper_id,  # 记录来源
                "paperData": paper_data,
                "customTags": extra.get("customTags", []) if extra else [],
                "readingStatus": extra.get("readingStatus", "unread") if extra else "unread",
                "priority": extra.get("priority", "medium") if extra else "medium",
            }

            user_paper = self.user_paper_model.create(user_paper_data)
            
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
            # 构建用户论文数据
            user_paper_data = {
                "userId": user_id,
                "sourcePaperId": None,  # 上传的论文没有来源
                "paperData": self._extract_paper_data(paper_data),
                "customTags": extra.get("customTags", []) if extra else [],
                "readingStatus": extra.get("readingStatus", "unread") if extra else "unread",
                "priority": extra.get("priority", "medium") if extra else "medium",
            }

            user_paper = self.user_paper_model.create(user_paper_data)
            
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
        1. 论文内容（paperData）
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
        同时删除关联的所有笔记
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

            # 删除论文
            if self.user_paper_model.delete(entry_id):
                return self._wrap_success(
                    f"删除成功，同时删除了 {deleted_notes} 条笔记",
                    {"deletedNotes": deleted_notes}
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
    def _extract_paper_data(public_paper: Dict[str, Any]) -> Dict[str, Any]:
        """
        从公共论文中提取需要复制的数据
        """
        return {
            "id": public_paper.get("id"),  # 添加论文ID
            "metadata": public_paper.get("metadata", {}),
            "abstract": public_paper.get("abstract"),
            "keywords": public_paper.get("keywords", []),
            "sections": public_paper.get("sections", []),
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
                updated = self.user_paper_model.find_by_id(entry_id)
                return self._wrap_success("阅读进度更新成功", updated)

            return self._wrap_error("阅读进度更新失败")

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"更新阅读进度失败: {exc}")

_user_paper_service: Optional[UserPaperService] = None


def get_user_paper_service() -> UserPaperService:
    """获取 UserPaperService 单例"""
    global _user_paper_service
    if _user_paper_service is None:
        _user_paper_service = UserPaperService()
    return _user_paper_service