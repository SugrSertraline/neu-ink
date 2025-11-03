"""
Note 业务逻辑服务
处理笔记相关的业务逻辑
"""
from typing import Dict, Any, Optional, List

from bson import ObjectId

from ..models.note import NoteModel
from ..models.userPaper import UserPaperModel
from ..config.constants import BusinessCode


class NoteService:
    """Note 业务逻辑服务类"""

    def __init__(self) -> None:
        self.note_model = NoteModel()
        self.user_paper_model = UserPaperModel()

    # ------------------------------------------------------------------
    # 创建笔记
    # ------------------------------------------------------------------
    def create_note(
        self,
        user_id: str,
        user_paper_id: str,
        block_id: str,
        content: List[Dict[str, Any]],
        plain_text: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        创建笔记
        content 格式为 InlineContent[]
        """
        try:
            # 1. 检查论文是否存在且属于该用户
            user_paper = self.user_paper_model.find_by_id(user_paper_id)
            if not user_paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND,
                    "论文不存在"
                )

            if user_paper["userId"] != user_id:
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED,
                    "无权在此论文添加笔记"
                )

            # 2. 验证 block 是否存在（可选，增强健壮性）
            if not self._block_exists_in_paper(user_paper["paperData"], block_id):
                return self._wrap_failure(
                    BusinessCode.INVALID_PARAMS,
                    f"论文中不存在 blockId: {block_id}"
                )

            # 3. 创建笔记
            note_data = {
                "userId": user_id,
                "userPaperId": user_paper_id,
                "blockId": block_id,
                "content": content,
            }
            if plain_text is not None:
                note_data["plainText"] = plain_text

            note = self.note_model.create(note_data)
            return self._wrap_success("笔记创建成功", self._serialize_note(note))

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"创建笔记失败: {exc}")

    # ------------------------------------------------------------------
    # 获取笔记列表
    # ------------------------------------------------------------------
    def get_notes_by_paper(
        self,
        user_id: str,
        user_paper_id: str,
        page: int = 1,
        page_size: int = 100,
    ) -> Dict[str, Any]:
        """
        获取某篇论文的所有笔记
        """
        try:
            # 权限检查
            user_paper = self.user_paper_model.find_by_id(user_paper_id)
            if not user_paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND,
                    "论文不存在"
                )

            if user_paper["userId"] != user_id:
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED,
                    "无权访问此论文的笔记"
                )

            skip = self._calc_skip(page, page_size)
            notes, total = self.note_model.find_by_user_paper(
                user_paper_id=user_paper_id,
                skip=skip,
                limit=page_size,
            )

            return self._wrap_success(
                "获取笔记列表成功",
                {
                    "notes": self._serialize_notes(notes),
                    "pagination": self._build_pagination(total, page, page_size),
                },
            )

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取笔记列表失败: {exc}")

    def get_notes_by_block(
        self,
        user_id: str,
        user_paper_id: str,
        block_id: str,
    ) -> Dict[str, Any]:
        """
        获取某个 block 的所有笔记
        """
        try:
            # 权限检查
            user_paper = self.user_paper_model.find_by_id(user_paper_id)
            if not user_paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND,
                    "论文不存在"
                )

            if user_paper["userId"] != user_id:
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED,
                    "无权访问此论文的笔记"
                )

            notes = self.note_model.find_by_block(
                user_paper_id=user_paper_id,
                block_id=block_id,
            )

            return self._wrap_success(
                "获取 block 笔记成功",
                {"notes": self._serialize_notes(notes)},
            )

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取笔记失败: {exc}")

    def get_user_notes(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """
        获取用户的所有笔记（跨论文）
        """
        try:
            skip = self._calc_skip(page, page_size)
            notes, total = self.note_model.find_by_user(
                user_id=user_id,
                skip=skip,
                limit=page_size,
            )

            return self._wrap_success(
                "获取用户笔记成功",
                {
                    "notes": self._serialize_notes(notes),
                    "pagination": self._build_pagination(total, page, page_size),
                },
            )

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取用户笔记失败: {exc}")

    # ------------------------------------------------------------------
    # 搜索笔记
    # ------------------------------------------------------------------
    def search_notes(
        self,
        user_id: str,
        keyword: str,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """
        搜索用户的笔记内容
        """
        try:
            if not keyword or not keyword.strip():
                return self._wrap_failure(
                    BusinessCode.INVALID_PARAMS,
                    "搜索关键词不能为空"
                )

            skip = self._calc_skip(page, page_size)
            notes, total = self.note_model.search_by_content(
                user_id=user_id,
                keyword=keyword.strip(),
                skip=skip,
                limit=page_size,
            )

            return self._wrap_success(
                "搜索笔记成功",
                {
                    "notes": self._serialize_notes(notes),
                    "pagination": self._build_pagination(total, page, page_size),
                },
            )

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"搜索笔记失败: {exc}")

    # ------------------------------------------------------------------
    # 更新笔记
    # ------------------------------------------------------------------
    def update_note(
        self,
        note_id: str,
        user_id: str,
        update_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        更新笔记内容
        """
        try:
            note = self.note_model.find_by_id(note_id)

            if not note:
                return self._wrap_failure(
                    BusinessCode.NOTE_NOT_FOUND,
                    "笔记不存在"
                )

            # 权限检查
            if note["userId"] != user_id:
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED,
                    "无权修改此笔记"
                )

            # 允许修改 content 与 plainText
            allowed_fields = {"content", "plainText"}
            filtered_data = {
                k: v for k, v in update_data.items() if k in allowed_fields
            }

            if not filtered_data:
                return self._wrap_failure(
                    BusinessCode.INVALID_PARAMS,
                    "没有可更新的字段"
                )

            # 更新
            if self.note_model.update(note_id, filtered_data):
                updated = self.note_model.find_by_id(note_id)
                return self._wrap_success(
                    "笔记更新成功",
                    self._serialize_note(updated),
                )

            return self._wrap_error("笔记更新失败")

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"更新笔记失败: {exc}")

    # ------------------------------------------------------------------
    # 删除笔记
    # ------------------------------------------------------------------
    def delete_note(
        self,
        note_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        删除笔记
        """
        try:
            note = self.note_model.find_by_id(note_id)

            if not note:
                return self._wrap_failure(
                    BusinessCode.NOTE_NOT_FOUND,
                    "笔记不存在"
                )

            # 权限检查
            if note["userId"] != user_id:
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED,
                    "无权删除此笔记"
                )

            # 删除
            if self.note_model.delete(note_id):
                return self._wrap_success("笔记删除成功", None)

            return self._wrap_error("笔记删除失败")

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"删除笔记失败: {exc}")

    # ------------------------------------------------------------------
    # 批量删除笔记
    # ------------------------------------------------------------------
    def delete_notes_by_paper(
        self,
        user_paper_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        删除某篇论文的所有笔记
        """
        try:
            # 权限检查
            user_paper = self.user_paper_model.find_by_id(user_paper_id)
            if not user_paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND,
                    "论文不存在"
                )

            if user_paper["userId"] != user_id:
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED,
                    "无权删除此论文的笔记"
                )

            deleted_count = self.note_model.delete_by_user_paper(user_paper_id)

            return self._wrap_success(
                f"已删除 {deleted_count} 条笔记",
                {"deletedCount": deleted_count}
            )

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"批量删除笔记失败: {exc}")

    # ------------------------------------------------------------------
    # 辅助方法
    # ------------------------------------------------------------------
    @staticmethod
    def _block_exists_in_paper(paper_data: Dict[str, Any], block_id: str) -> bool:
        """
        检查 block 是否存在于论文中
        递归检查所有 sections 和 subsections
        """

        def check_section(section: Dict[str, Any]) -> bool:
            # 检查当前 section 的所有 blocks
            for block in section.get("content", []):
                if block.get("id") == block_id:
                    return True

            # 递归检查 subsections
            for subsection in section.get("subsections", []):
                if check_section(subsection):
                    return True

            return False

        # 检查所有顶级 sections
        for section in paper_data.get("sections", []):
            if check_section(section):
                return True

        return False

    @staticmethod
    def _calc_skip(page: int, page_size: int) -> int:
        return max(page - 1, 0) * page_size

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
    def _normalize_value(value: Any) -> Any:
        """将 ObjectId、datetime 等类型转换为可 JSON 序列化的值"""
        if isinstance(value, ObjectId):
            return str(value)

        if isinstance(value, list):
            return [NoteService._normalize_value(item) for item in value]

        if isinstance(value, dict):
            return {
                key: NoteService._normalize_value(val)
                for key, val in value.items()
            }

        if hasattr(value, "isoformat"):
            try:
                return value.isoformat()
            except TypeError:
                pass

        return value

    def _serialize_note(self, note: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not note:
            return None

        serialized = {
            key: self._normalize_value(val)
            for key, val in note.items()
            if key != "_id"
        }

        if "_id" in note:
            serialized["id"] = self._normalize_value(note["_id"])

        # 兜底：如果原始文档已有 id 字段，也确保是字符串
        if "id" in serialized:
            serialized["id"] = str(serialized["id"])

        return serialized

    def _serialize_notes(self, notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [self._serialize_note(note) for note in notes]

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


_note_service: Optional[NoteService] = None


def get_note_service() -> NoteService:
    """获取 NoteService 单例"""
    global _note_service
    if _note_service is None:
        _note_service = NoteService()
    return _note_service
