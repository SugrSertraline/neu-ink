"""
AdminPaper 数据模型
处理管理员论文相关的数据库操作
"""
from typing import Dict, Any, List, Optional, Tuple
from .basePaper import BasePaperModel
from ..config.constants import Collections
from .section import get_section_model, find_sections_by_ids


class AdminPaperModel(BasePaperModel):
    """AdminPaper 数据模型类"""

    def get_collection_name(self) -> str:
        """返回集合名称"""
        return Collections.ADMIN_PAPER

    def _ensure_indexes(self):
        """确保必要的索引存在"""
        import logging
        logger = logging.getLogger(__name__)
        collection_name = self.get_collection_name()
        
        logger.info(f"开始为集合 {collection_name} 创建管理员论文特有索引")
        
        # 先调用父类的索引创建方法
        super()._ensure_indexes()
        
        # 添加管理员论文特有的索引
        try:
            self.collection.create_index("isPublic")
            logger.info(f"集合 {collection_name}: 创建索引 isPublic")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 isPublic 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("createdBy")
            logger.info(f"集合 {collection_name}: 创建索引 createdBy")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 createdBy 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("parseStatus.status")
            logger.info(f"集合 {collection_name}: 创建索引 parseStatus.status")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 parseStatus.status 索引失败 - {str(e)}")
            
        # 为管理员论文创建全文搜索索引
        try:
            self.collection.create_index([
                ("metadata.title", "text"),
                ("metadata.titleZh", "text"),
                ("abstract.en", "text"),
                ("abstract.zh", "text"),
            ])
            logger.info(f"集合 {collection_name}: 创建全文索引 metadata.title, metadata.titleZh, abstract.en, abstract.zh")
        except Exception as e:
            error_msg = str(e).lower()
            logger.warning(f"集合 {collection_name}: 创建全文索引失败 - {str(e)}")
            if any(keyword in error_msg for keyword in ["already exists", "indexoptionsconflict", "duplicate"]):
                logger.info(f"集合 {collection_name}: 全文索引已存在，跳过创建")
                pass
            else:
                logger.error(f"集合 {collection_name}: 创建全文索引时发生未知错误 - {str(e)}")
                raise e
            
        logger.info(f"集合 {collection_name} 管理员论文特有索引创建完成")

    def get_specific_fields(self, paper_data: Dict[str, Any]) -> Dict[str, Any]:
        """获取管理员论文特有的字段"""
        return {
            "isPublic": paper_data.get("isPublic", True),
            "createdBy": paper_data.get("createdBy"),
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
        }

    def find_by_user_or_filters(
        self,
        skip: int,
        limit: int,
        sort_by: str,
        sort_order: int,
        search: Optional[str],
        filters: Optional[Dict[str, Any]],
        user_id: Optional[str] = None,
        is_public: Optional[bool] = None,
        **kwargs
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        根据用户或筛选条件查询论文列表
        """
        filters = filters.copy() if filters else {}
        
        if is_public is not None:
            # 查询公开论文
            base_query = self._build_public_filters(filters, user_id)
            projection = self._public_summary_projection(include_score=bool(search))
        else:
            # 管理员查询所有论文
            base_query = self._build_admin_filters(user_id, filters)
            projection = self._full_document_projection(include_score=bool(search))

        # 添加调试日志
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"查询论文 - is_public: {is_public}, user_id: {user_id}, base_query: {base_query}, projection: {projection}")

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
                .sort([(sort_by, sort_order)])
                .skip(skip)
                .limit(limit)
            )
            total = self.collection.count_documents(base_query)
        
        papers = list(cursor)
        logger.info(f"查询结果 - 论文数量: {len(papers)}, 总数: {total}")
        
        for paper in papers:
            paper.pop("score", None)
        return papers, total

    def find_public_papers(
        self,
        skip: int,
        limit: int,
        sort_by: str,
        sort_order: int,
        search: Optional[str],
        filters: Optional[Dict[str, Any]],
        user_id: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        查询公开论文列表，仅返回概要信息（metadata 等）
        """
        return self.find_by_user_or_filters(
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search,
            filters=filters,
            user_id=user_id,
            is_public=True
        )

    def find_public_paper_by_id(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """
        查询公开论文详情，默认包含sections内容
        
        Args:
            paper_id: 论文ID
        
        Returns:
            论文数据，包含完整的sections内容
        """
        query = {"id": paper_id, "isPublic": True}
        paper = self.collection.find_one(query, self._full_document_projection())
        
        if not paper:
            return None
             
        # 默认从sectionIds查询sections并添加到返回结果中
        if "sectionIds" in paper and paper["sectionIds"]:
            sections = find_sections_by_ids(paper["sectionIds"])
            paper["sections"] = sections
        else:
            paper["sections"] = []
        
        return paper

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
        # 添加调试日志
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"find_admin_papers - user_id: {user_id}, sort_by: {sort_by}, sort_order: {sort_order}, search: {search}, filters: {filters}")
        
        papers, total = self.find_by_user_or_filters(
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search,
            filters=filters,
            user_id=user_id,
            is_public=None  # 管理员可以看到所有论文
        )
        
        # 添加调试日志
        logger.info(f"find_admin_papers - 查询结果: papers数量: {len(papers)}, total: {total}")
        
        # 确保每个论文都有 sections 字段
        for paper in papers:
            if "sections" not in paper:
                # 如果有 sectionIds，则查询 sections
                if "sectionIds" in paper and paper["sectionIds"]:
                    from .section import find_sections_by_ids
                    sections = find_sections_by_ids(paper["sectionIds"])
                    paper["sections"] = sections
                else:
                    paper["sections"] = []
        
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

    def get_search_filters(self, **kwargs) -> Dict[str, Any]:
        """获取管理员论文特有的搜索过滤条件"""
        is_public = kwargs.get("is_public")
        if is_public is not None:
            return {"isPublic": is_public}
        return {}

    def get_projection(self, include_score: bool = False) -> Dict[str, Any]:
        """获取查询投影"""
        return self._full_document_projection(include_score)

    # ------------------------------------------------------------------
    # 内部辅助方法
    # ------------------------------------------------------------------
    def _build_public_filters(self, filters: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
        query: Dict[str, Any] = {"isPublic": True}
        
        # 如果提供了user_id，则只返回该用户创建的公开论文
        if user_id:
            query["createdBy"] = user_id
            
        query.update(self._build_metadata_filters(filters))
        return query

    def _build_admin_filters(self, user_id: str, filters: Dict[str, Any]) -> Dict[str, Any]:
        # 管理员可以看到所有论文（公开和私有的）
        query: Dict[str, Any] = {}

        created_by = filters.pop("createdBy", None)
        if created_by:
            query["createdBy"] = created_by
        else:
            # 如果没有指定 createdBy，则不限制，管理员可以看到所有论文
            pass

        # 如果明确指定了isPublic过滤条件，则使用指定的值
        is_public = filters.pop("isPublic", None)
        if is_public is not None:
            query["isPublic"] = is_public

        parse_status = filters.pop("parseStatus", None)
        if parse_status:
            query["parseStatus.status"] = parse_status

        translation_status = filters.pop("translationStatus", None)
        if translation_status:
            if translation_status == "completed":
                query["translationStatus.isComplete"] = True
            elif translation_status == "incomplete":
                query["translationStatus.isComplete"] = False

        # 添加调试日志
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"_build_admin_filters - query: {query}, remaining filters: {filters}")

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
            "attachments": 1,
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
            "sectionIds": 1,
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
        """
        管理员获取论文详情；可以查看所有论文（公开和私有的），默认包含sections内容
        
        Args:
            paper_id: 论文ID
        
        Returns:
            论文数据，包含完整的sections内容
        """
        paper = self.collection.find_one({"id": paper_id}, self._full_document_projection())
        if not paper:
            return None
        
        # 默认从sectionIds查询sections并添加到返回结果中
        if "sectionIds" in paper and paper["sectionIds"]:
            sections = find_sections_by_ids(paper["sectionIds"])
            paper["sections"] = sections
        else:
            paper["sections"] = []
        
        return paper

