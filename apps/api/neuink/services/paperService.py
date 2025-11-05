"""
Paper 业务逻辑服务
处理论文相关的业务逻辑
"""
from typing import Dict, Any, Optional, Tuple, List

from ..models.paper import PaperModel
from ..config.constants import BusinessCode


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

    def _wrap_error(self, message: str) -> Dict[str, Any]:
        return self._wrap_failure(BusinessCode.UNKNOWN_ERROR, message)


_paper_service: Optional[PaperService] = None


def get_paper_service() -> PaperService:
    global _paper_service
    if _paper_service is None:
        _paper_service = PaperService()
    return _paper_service
