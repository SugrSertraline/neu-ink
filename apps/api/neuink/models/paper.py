"""
Paper 数据模型
处理论文相关的数据库操作
"""
from typing import Dict, Any, List, Optional, Tuple

from ..services.db import get_db
from ..utils.common import generate_id, get_current_time
from ..config.constants import Collections


class PaperModel:
    """Paper 数据模型类"""

    def __init__(self):
        """初始化 Paper 模型"""
        self.collection = get_db()[Collections.PAPER]
        self._ensure_indexes()

    def _ensure_indexes(self):
        """确保必要的索引存在"""
        self.collection.create_index("id", unique=True)
        self.collection.create_index("isPublic")
        self.collection.create_index("createdBy")
        self.collection.create_index([("metadata.title", "text"), ("metadata.titleZh", "text")])
        self.collection.create_index("createdAt")
        self.collection.create_index("metadata.year")
        self.collection.create_index("metadata.articleType")
        self.collection.create_index("metadata.tags")
        self.collection.create_index("metadata.authors.name")
        self.collection.create_index("parseStatus.status")
        self.collection.create_index("sections.content.type")
        self.collection.create_index("sections.content.id")

    def create(self, paper_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建新论文
        """
        paper_id = generate_id()
        current_time = get_current_time()

        paper = {
            "id": paper_id,
            "isPublic": paper_data.get("isPublic", True),
            "createdBy": paper_data.get("createdBy"),
            "metadata": paper_data.get("metadata", {}),
            "abstract": paper_data.get("abstract"),
            "keywords": paper_data.get("keywords", []),
            "sections": paper_data.get("sections", []),
            "references": paper_data.get("references", []),
            "attachments": paper_data.get("attachments", {}),
            "parseStatus": paper_data.get(
                "parseStatus",
                {
                    "status": "completed",
                    "progress": 100,
                    "message": "论文已就绪",
                },
            ),
            "translationStatus": paper_data.get(
                "translationStatus",
                {
                    "isComplete": False,
                    "lastChecked": None,
                    "missingFields": [],
                    "updatedAt": None,
                },
            ),
            "createdAt": current_time,
            "updatedAt": current_time,
        }

        self.collection.insert_one(paper)
        # 返回前查询一次，确保不包含任何MongoDB特定对象
        return self.find_by_id(paper_id)

    def find_by_id(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """
        根据ID查找论文
        """
        return self.collection.find_one({"id": paper_id}, {"_id": 0})

    def find_public_papers(
        self,
        skip: int,
        limit: int,
        sort_by: str,
        sort_order: int,
        search: Optional[str],
        filters: Optional[Dict[str, Any]],
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        查询公开论文列表，仅返回概要信息（metadata 等）
        """
        filters = filters.copy() if filters else {}
        base_query = self._build_public_filters(filters)
        projection = self._public_summary_projection(include_score=bool(search))

        if search:
            query = dict(base_query)
            query["$text"] = {"$search": search}
            cursor = (
                self.collection.find(query, projection)
                .sort([("score", {"$meta": "textScore"}), (sort_by, sort_order)])
                .skip(skip)
                .limit(limit)
            )
            total = self.collection.count_documents(query)
        else:
            cursor = (
                self.collection.find(base_query, projection)
                .sort(sort_by, sort_order)
                .skip(skip)
                .limit(limit)
            )
            total = self.collection.count_documents(base_query)
        papers = list(cursor)
        for paper in papers:
            paper.pop("score", None)
        return papers, total

    def find_public_paper_by_id(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """
        查询公开论文详情
        """
        query = {"id": paper_id, "isPublic": True}
        return self.collection.find_one(query, self._full_document_projection())

    def find_admin_papers(
        self,
        user_id: str,
        skip: int,
        limit: int,
        sort_by: str,
        sort_order: int,
        search: Optional[str],
        filters: Optional[Dict[str, Any]],
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        管理端论文查询
        """
        filters = filters.copy() if filters else {}
        base_query = self._build_admin_filters(user_id, filters)
        projection = self._full_document_projection(include_score=bool(search))

        if search:
            query = dict(base_query)
            query["$text"] = {"$search": search}
            cursor = (
                self.collection.find(query, projection)
                .sort([("score", {"$meta": "textScore"}), (sort_by, sort_order)])
                .skip(skip)
                .limit(limit)
            )
            total = self.collection.count_documents(query)
        else:
            cursor = (
                self.collection.find(base_query, projection)
                .sort(sort_by, sort_order)
                .skip(skip)
                .limit(limit)
            )
            total = self.collection.count_documents(base_query)

        papers = list(cursor)
        for paper in papers:
            paper.pop("score", None)
        return papers, total

    def find_all(
        self,
        is_public: Optional[bool] = None,
        created_by: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "createdAt",
        sort_order: int = -1,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        查询论文列表（原始接口，保留用于个人库等内部调用）
        """
        query: Dict[str, Any] = {}
        if is_public is not None:
            query["isPublic"] = is_public
        if created_by:
            query["createdBy"] = created_by

        total = self.collection.count_documents(query)
        papers = list(
            self.collection.find(query, {"_id": 0})
            .sort(sort_by, sort_order)
            .skip(skip)
            .limit(limit)
        )
        return papers, total

    def search(
        self,
        keyword: str,
        is_public: Optional[bool] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        基础全文搜索
        """
        query: Dict[str, Any] = {"$text": {"$search": keyword}}
        if is_public is not None:
            query["isPublic"] = is_public

        total = self.collection.count_documents(query)
        papers = list(
            self.collection.find(query, {"_id": 0, "score": {"$meta": "textScore"}})
            .sort([("score", {"$meta": "textScore"})])
            .skip(skip)
            .limit(limit)
        )
        for paper in papers:
            paper.pop("score", None)
        return papers, total

    def update(self, paper_id: str, update_data: Dict[str, Any]) -> bool:
        """
        更新论文
        """
        update_data["updatedAt"] = get_current_time()
        result = self.collection.update_one({"id": paper_id}, {"$set": update_data})
        return result.modified_count > 0

    def delete(self, paper_id: str) -> bool:
        """
        删除论文
        """
        result = self.collection.delete_one({"id": paper_id})
        return result.deleted_count > 0

    def exists(self, paper_id: str) -> bool:
        """
        检查论文是否存在
        """
        return self.collection.count_documents({"id": paper_id}, limit=1) > 0

    def get_statistics(self) -> Dict[str, Any]:
        """
        获取论文统计信息
        """
        total = self.collection.count_documents({})
        public_count = self.collection.count_documents({"isPublic": True})
        private_count = total - public_count
        return {
            "total": total,
            "public": public_count,
            "private": private_count,
        }

    # ------------------------------------------------------------------
    # 内部辅助方法
    # ------------------------------------------------------------------
    def _build_public_filters(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        query: Dict[str, Any] = {"isPublic": True}
        query.update(self._build_metadata_filters(filters))
        return query

    def _build_admin_filters(self, user_id: str, filters: Dict[str, Any]) -> Dict[str, Any]:
        query: Dict[str, Any] = {}

        created_by = filters.pop("createdBy", None)
        if created_by:
            query["createdBy"] = created_by

        is_public = filters.pop("isPublic", None)
        if is_public is not None:
            query["isPublic"] = is_public

        parse_status = filters.pop("parseStatus", None)
        if parse_status:
            query["parseStatus.status"] = parse_status

        query.update(self._build_metadata_filters(filters))
        return query

    def _build_metadata_filters(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        query: Dict[str, Any] = {}

        year = filters.pop("year", None)
        year_from = filters.pop("yearFrom", None)
        year_to = filters.pop("yearTo", None)
        if year is not None:
            query["metadata.year"] = year
        else:
            range_filter: Dict[str, Any] = {}
            if year_from is not None:
                range_filter["$gte"] = year_from
            if year_to is not None:
                range_filter["$lte"] = year_to
            if range_filter:
                query["metadata.year"] = range_filter

        article_type = filters.pop("articleType", None)
        if article_type:
            query["metadata.articleType"] = article_type

        sci_quartile = filters.pop("sciQuartile", None)
        if sci_quartile:
            query["metadata.sciQuartile"] = sci_quartile

        cas_quartile = filters.pop("casQuartile", None)
        if cas_quartile:
            query["metadata.casQuartile"] = cas_quartile

        ccf_rank = filters.pop("ccfRank", None)
        if ccf_rank:
            query["metadata.ccfRank"] = ccf_rank

        tag = filters.pop("tag", None)
        if tag:
            query["metadata.tags"] = {"$in": [tag]}

        author = filters.pop("author", None)
        if author:
            query["metadata.authors.name"] = {"$regex": author, "$options": "i"}

        publication = filters.pop("publication", None)
        if publication:
            query["metadata.publication"] = {"$regex": publication, "$options": "i"}

        doi = filters.pop("doi", None)
        if doi:
            query["metadata.doi"] = doi

        return query

    @staticmethod
    def _public_summary_projection(include_score: bool) -> Dict[str, Any]:
        projection: Dict[str, Any] = {
            "_id": 0,
            "id": 1,
            "isPublic": 1,
            "metadata": 1,
            "createdAt": 1,
            "updatedAt": 1,
        }
        if include_score:
            projection["score"] = {"$meta": "textScore"}
        return projection

    @staticmethod
    def _full_document_projection(include_score: bool = False) -> Dict[str, Any]:
        projection: Dict[str, Any] = {
            "_id": 0,
            "id": 1,
            "isPublic": 1,
            "createdBy": 1,
            "metadata": 1,
            "abstract": 1,
            "keywords": 1,
            "sections": 1,
            "references": 1,
            "attachments": 1,
            "parseStatus": 1,
            "translationStatus": 1,
            "createdAt": 1,
            "updatedAt": 1,
        }
        if include_score:
            projection["score"] = {"$meta": "textScore"}
        return projection

    def find_admin_paper_by_id(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """管理员获取论文详情；不限制公开状态"""
        return self.collection.find_one({"id": paper_id}, self._full_document_projection())