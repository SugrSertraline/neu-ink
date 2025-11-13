"""
Paper 业务逻辑服务 - 主服务类
处理论文的基础CRUD操作和查询功能
"""
import time
from typing import Dict, Any, Optional, List, Tuple
from ..models.paper import PaperModel
from ..config.constants import BusinessCode
from ..utils.llm_utils import get_llm_utils
from ..utils.common import get_current_time
from .paperContentService import PaperContentService
from .paperTranslationService import PaperTranslationService


class PaperService:
    """Paper 业务逻辑服务类 - 主服务"""

    def __init__(self) -> None:
        self.paper_model = PaperModel()
        self.content_service = PaperContentService(self.paper_model)
        self.translation_service = PaperTranslationService(self.paper_model)

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
        """
        return self.translation_service.auto_check_and_complete_translation(paper)

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
                return self._wrap_success("论文可见状态更新成功", {
                    "paperId": paper_id,
                    "previousVisibility": previous_visibility,
                    "currentVisibility": is_public,
                    "changed": True
                })
            else:
                return self._wrap_error("更新论文可见状态失败")
                
        except Exception as exc:
            return self._wrap_error(f"更新论文可见状态失败: {exc}")

    # ------------------------------------------------------------------
    # 内容操作代理方法
    # ------------------------------------------------------------------
    def add_section(self, *args, **kwargs):
        """添加章节"""
        return self.content_service.add_section(*args, **kwargs)

    def update_section(self, *args, **kwargs):
        """更新章节"""
        return self.content_service.update_section(*args, **kwargs)

    def delete_section(self, *args, **kwargs):
        """删除章节"""
        return self.content_service.delete_section(*args, **kwargs)

    def add_blocks_to_section(self, *args, **kwargs):
        """添加blocks到章节"""
        return self.content_service.add_blocks_to_section(*args, **kwargs)

    def update_block(self, *args, **kwargs):
        """更新block"""
        return self.content_service.update_block(*args, **kwargs)

    def delete_block(self, *args, **kwargs):
        """删除block"""
        return self.content_service.delete_block(*args, **kwargs)

    def add_block_directly(self, *args, **kwargs):
        """直接添加block"""
        return self.content_service.add_block_directly(*args, **kwargs)

    def add_block_from_text(self, *args, **kwargs):
        """从文本添加block"""
        return self.content_service.add_block_from_text(*args, **kwargs)

    def parse_references(self, *args, **kwargs):
        """解析参考文献"""
        return self.content_service.parse_references(*args, **kwargs)

    def add_references_to_paper(self, *args, **kwargs):
        """添加参考文献到论文"""
        return self.content_service.add_references_to_paper(*args, **kwargs)

    # ------------------------------------------------------------------
    # 翻译操作代理方法
    # ------------------------------------------------------------------
    def check_and_complete_translation(self, *args, **kwargs):
        """检查并补全翻译"""
        return self.translation_service.check_and_complete_translation(*args, **kwargs)

    def get_translation_status(self, *args, **kwargs):
        """获取翻译状态"""
        return self.translation_service.get_translation_status(*args, **kwargs)

    def migrate_paper_translation_status(self, *args, **kwargs):
        """迁移翻译状态"""
        return self.translation_service.migrate_paper_translation_status(*args, **kwargs)

    def migrate_abstract_format(self, *args, **kwargs):
        """迁移摘要格式"""
        return self.translation_service.migrate_abstract_format(*args, **kwargs)

    def migrate_title_format(self, *args, **kwargs):
        """迁移标题格式"""
        return self.translation_service.migrate_title_format(*args, **kwargs)

    # ------------------------------------------------------------------
    # 统计 & 个人论文库
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


_paper_service: Optional[PaperService] = None


def get_paper_service() -> PaperService:
    global _paper_service
    if _paper_service is None:
        _paper_service = PaperService()
    return _paper_service
