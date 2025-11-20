"""
Paper 数据模型
处理论文相关的数据库操作
"""
from typing import Dict, Any, List, Optional, Tuple

from ..services.db import get_db
from ..utils.common import generate_id, get_current_time
from ..config.constants import Collections
from .section import get_section_model


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
        self.collection.create_index("sectionIds")

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
            "sectionIds": paper_data.get("sectionIds", []),
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
<<<<<<< HEAD
=======
        user_id: Optional[str] = None,
>>>>>>> origin/main
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        查询公开论文列表，仅返回概要信息（metadata 等）
        """
        filters = filters.copy() if filters else {}
<<<<<<< HEAD
        base_query = self._build_public_filters(filters)
=======
        base_query = self._build_public_filters(filters, user_id)
>>>>>>> origin/main
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
<<<<<<< HEAD
        query = {"id": paper_id, "isPublic": True}
        return self.collection.find_one(query, self._full_document_projection())
=======
        print(f"[DEBUG] 查找公开论文: paperId={paper_id}")
        query = {"id": paper_id, "isPublic": True}
        paper = self.collection.find_one(query, self._full_document_projection())
        
        if not paper:
            print(f"[DEBUG] 未找到公开论文: paperId={paper_id}")
            return None
            
        print(f"[DEBUG] 找到公开论文，开始获取sections: paperId={paper_id}")
        # 获取sections数据，按照sectionIds的顺序
        section_model = get_section_model()
        try:
            # 先获取所有sections
            all_sections = section_model.find_by_paper_id(paper_id)
            print(f"[DEBUG] 获取到sections数据，数量: {len(all_sections)}")
            
            # 按照paper中sectionIds的顺序重新排序sections
            section_ids = paper.get("sectionIds", [])
            ordered_sections = []
            
            # 创建section ID到section的映射
            section_map = {section["id"]: section for section in all_sections}
            
            # 按照sectionIds的顺序添加sections
            for section_id in section_ids:
                if section_id in section_map:
                    ordered_sections.append(section_map[section_id])
            
            # 添加可能存在但不在sectionIds中的sections（保持原有顺序）
            for section in all_sections:
                if section["id"] not in section_ids:
                    ordered_sections.append(section)
            
            print(f"[DEBUG] 重新排序后的sections数量: {len(ordered_sections)}")
        except Exception as e:
            print(f"[DEBUG] 获取sections数据失败: {e}", exc_info=True)
            raise e
        
        # 将排序后的sections数据添加到paper中
        paper["sections"] = ordered_sections
        return paper
>>>>>>> origin/main

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
        # 检查是否是嵌套字段更新（如 sections.0）
        has_nested_fields = any('.' in key for key in update_data.keys())
        
        if has_nested_fields:
            # 对于嵌套字段，不添加updatedAt到根级别
            result = self.collection.update_one({"id": paper_id}, {"$set": update_data})
        else:
            # 对于非嵌套字段，添加updatedAt
            update_data["updatedAt"] = get_current_time()
            result = self.collection.update_one({"id": paper_id}, {"$set": update_data})
        
        return result.modified_count > 0

    def update_direct(self, paper_id: str, update_operation: Dict[str, Any]) -> bool:
        """
        直接使用MongoDB更新操作（如$pull, $push等）
        """
        # 添加updatedAt到根级别
        update_operation["$set"] = update_operation.get("$set", {})
        update_operation["$set"]["updatedAt"] = get_current_time()
        
        result = self.collection.update_one({"id": paper_id}, update_operation)
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
<<<<<<< HEAD
    def _build_public_filters(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        query: Dict[str, Any] = {"isPublic": True}
=======
    def _build_public_filters(self, filters: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
        query: Dict[str, Any] = {"isPublic": True}
        
        # 如果提供了user_id，则只返回该用户创建的公开论文
        if user_id:
            query["createdBy"] = user_id
            
>>>>>>> origin/main
        query.update(self._build_metadata_filters(filters))
        return query

    def _build_admin_filters(self, user_id: str, filters: Dict[str, Any]) -> Dict[str, Any]:
<<<<<<< HEAD
        query: Dict[str, Any] = {}
=======
        # 管理员默认只能看到公开的论文
        query: Dict[str, Any] = {"isPublic": True}
>>>>>>> origin/main

        created_by = filters.pop("createdBy", None)
        if created_by:
            query["createdBy"] = created_by

<<<<<<< HEAD
=======
        # 如果明确指定了isPublic过滤条件，则使用指定的值
>>>>>>> origin/main
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
<<<<<<< HEAD
        """管理员获取论文详情；不限制公开状态"""
        return self.collection.find_one({"id": paper_id}, self._full_document_projection())
=======
        """管理员获取论文详情；只能查看公开的论文"""
        paper = self.collection.find_one({"id": paper_id, "isPublic": True}, self._full_document_projection())
        if not paper:
            return None
        
        # 获取sections数据，按照sectionIds的顺序
        section_model = get_section_model()
        try:
            # 先获取所有sections
            all_sections = section_model.find_by_paper_id(paper_id)
            
            # 按照paper中sectionIds的顺序重新排序sections
            section_ids = paper.get("sectionIds", [])
            ordered_sections = []
            
            # 创建section ID到section的映射
            section_map = {section["id"]: section for section in all_sections}
            
            # 按照sectionIds的顺序添加sections
            for section_id in section_ids:
                if section_id in section_map:
                    ordered_sections.append(section_map[section_id])
            
            # 添加可能存在但不在sectionIds中的sections（保持原有顺序）
            for section in all_sections:
                if section["id"] not in section_ids:
                    ordered_sections.append(section)
        except Exception as e:
            # 如果排序失败，使用原始sections
            ordered_sections = section_model.find_by_paper_id(paper_id)
        
        # 将排序后的sections数据添加到paper中
        paper["sections"] = ordered_sections
        return paper
>>>>>>> origin/main

    def find_paper_with_sections(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """
        查找论文并包含完整的sections数据
        这个方法用于向后兼容，确保上层接口不需要改变
        """
        paper = self.find_by_id(paper_id)
        if not paper:
            return None
        
<<<<<<< HEAD
        # 获取sections数据
        section_model = get_section_model()
        sections = section_model.find_by_paper_id(paper_id)
        
        # 将sections数据添加到paper中
        paper["sections"] = sections
=======
        # 获取sections数据，按照sectionIds的顺序
        section_model = get_section_model()
        try:
            # 先获取所有sections
            all_sections = section_model.find_by_paper_id(paper_id)
            
            # 按照paper中sectionIds的顺序重新排序sections
            section_ids = paper.get("sectionIds", [])
            ordered_sections = []
            
            # 创建section ID到section的映射
            section_map = {section["id"]: section for section in all_sections}
            
            # 按照sectionIds的顺序添加sections
            for section_id in section_ids:
                if section_id in section_map:
                    ordered_sections.append(section_map[section_id])
            
            # 添加可能存在但不在sectionIds中的sections（保持原有顺序）
            for section in all_sections:
                if section["id"] not in section_ids:
                    ordered_sections.append(section)
        except Exception as e:
            # 如果排序失败，使用原始sections
            ordered_sections = section_model.find_by_paper_id(paper_id)
        
        # 将排序后的sections数据添加到paper中
        paper["sections"] = ordered_sections
>>>>>>> origin/main
        return paper

    def add_section_id(self, paper_id: str, section_id: str) -> bool:
        """
        向论文添加section ID引用
        """
        result = self.collection.update_one(
            {"id": paper_id},
            {
                "$push": {"sectionIds": section_id},
                "$set": {"updatedAt": get_current_time()}
            }
        )
        return result.modified_count > 0

    def remove_section_id(self, paper_id: str, section_id: str) -> bool:
        """
        从论文中移除section ID引用
        """
        result = self.collection.update_one(
            {"id": paper_id},
            {
                "$pull": {"sectionIds": section_id},
                "$set": {"updatedAt": get_current_time()}
            }
        )
        return result.modified_count > 0

    def update_section_ids(self, paper_id: str, section_ids: List[str]) -> bool:
        """
        更新论文的section ID列表
        """
        result = self.collection.update_one(
            {"id": paper_id},
            {
                "$set": {
                    "sectionIds": section_ids,
                    "updatedAt": get_current_time()
                }
            }
        )
<<<<<<< HEAD
        return result.modified_count > 0
=======
        return result.modified_count > 0

    def add_section_id_at_position(self, paper_id: str, section_id: str, position: int) -> bool:
        """
        在指定位置向论文添加section ID引用
        
        Args:
            paper_id: 论文ID
            section_id: 章节ID
            position: 插入位置，-1表示在末尾，0表示在最顶部
            
        Returns:
            是否成功
        """
        # 获取当前论文
        paper = self.find_by_id(paper_id)
        if not paper:
            return False
            
        # 获取当前的sectionIds
        section_ids = paper.get("sectionIds", [])
        
        # 确定插入位置
        if position == -1 or position >= len(section_ids):
            # 在末尾添加
            section_ids.append(section_id)
        elif position == 0:
            # 在最顶部插入
            section_ids.insert(0, section_id)
        else:
            # 在指定位置插入
            section_ids.insert(position, section_id)
        
        # 更新论文的sectionIds
        return self.update_section_ids(paper_id, section_ids)
>>>>>>> origin/main
