"""
BasePaper 数据模型抽象基类
处理论文相关的通用数据库操作
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from ..utils.db import get_db
from ..utils.common import generate_id, get_current_time


class BasePaperModel(ABC):
    """BasePaper 数据模型抽象基类"""

    def __init__(self):
        """初始化 BasePaper 模型"""
        self.collection = get_db()[self.get_collection_name()]
        self._ensure_indexes()

    @abstractmethod
    def get_collection_name(self) -> str:
        """返回集合名称"""
        pass

    def _ensure_indexes(self):
        """确保必要的索引存在"""
        import logging
        logger = logging.getLogger(__name__)
        collection_name = self.get_collection_name()
        
        logger.info(f"开始为集合 {collection_name} 创建索引")
        
        try:
            self.collection.create_index("id", unique=True)
            logger.info(f"集合 {collection_name}: 创建唯一索引 id")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 id 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("createdAt")
            logger.info(f"集合 {collection_name}: 创建索引 createdAt")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 createdAt 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("updatedAt")
            logger.info(f"集合 {collection_name}: 创建索引 updatedAt")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 updatedAt 索引失败 - {str(e)}")
            
        # 注意：不在这里创建全文索引，让子类根据需要创建自己的全文索引
        # 这样可以避免基类和子类之间的索引冲突
        logger.info(f"集合 {collection_name}: 跳过全文索引创建，由子类负责")
            
        try:
            self.collection.create_index("metadata.year")
            logger.info(f"集合 {collection_name}: 创建索引 metadata.year")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 metadata.year 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("metadata.articleType")
            logger.info(f"集合 {collection_name}: 创建索引 metadata.articleType")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 metadata.articleType 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("metadata.tags")
            logger.info(f"集合 {collection_name}: 创建索引 metadata.tags")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 metadata.tags 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("metadata.authors.name")
            logger.info(f"集合 {collection_name}: 创建索引 metadata.authors.name")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 metadata.authors.name 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("sectionIds")
            logger.info(f"集合 {collection_name}: 创建索引 sectionIds")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 sectionIds 索引失败 - {str(e)}")
            
        logger.info(f"集合 {collection_name} 索引创建完成")

    def create(self, paper_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建新论文
        """
        paper_id = generate_id()
        current_time = get_current_time()

        # 基础论文结构
        paper = {
            "id": paper_id,
            "metadata": paper_data.get("metadata", {}),
            "abstract": paper_data.get("abstract"),
            "keywords": paper_data.get("keywords", []),
            "references": paper_data.get("references", []),
            "attachments": paper_data.get("attachments", {
                "pdf": None,
                "markdown": None,
                "content_list": None,
                "model": None,
                "layout": None
            }),
            "sectionIds": paper_data.get("sectionIds", []),
            "createdAt": current_time,
            "updatedAt": current_time,
        }

        # 添加子类特有的字段
        paper.update(self.get_specific_fields(paper_data))

        self.collection.insert_one(paper)
        # 返回前查询一次，确保不包含任何MongoDB特定对象
        return self.find_by_id(paper_id)

    @abstractmethod
    def get_specific_fields(self, paper_data: Dict[str, Any]) -> Dict[str, Any]:
        """获取子类特有的字段"""
        pass

    def find_by_id(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """
        根据ID查找论文
        """
        return self.collection.find_one({"id": paper_id}, {"_id": 0})

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
        
        # 添加调试日志
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"add_section_id_at_position - paper_id: {paper_id}, section_id: {section_id}, position: {position}, current_section_ids: {section_ids}")
        
        # 确定插入位置
        if position == -1 or position >= len(section_ids):
            # 在末尾添加
            section_ids.append(section_id)
            logger.info(f"在末尾添加section - final_section_ids: {section_ids}")
        elif position == 0:
            # 在最顶部插入
            section_ids.insert(0, section_id)
            logger.info(f"在顶部插入section - final_section_ids: {section_ids}")
        elif position > 0:
            # 在指定位置插入（确保position是正数）
            section_ids.insert(position, section_id)
            logger.info(f"在位置{position}插入section - final_section_ids: {section_ids}")
        else:
            # position是负数但不是-1，默认添加到末尾
            section_ids.append(section_id)
            logger.info(f"position为负数但不是-1，默认添加到末尾 - final_section_ids: {section_ids}")
        
        # 更新论文的sectionIds
        result = self.update_section_ids(paper_id, section_ids)
        logger.info(f"update_section_ids结果: {result}")
        return result

    def find_paper_with_sections(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """
        查找论文并包含完整的sections数据
        """
        from .section import find_sections_by_ids
        
        paper = self.find_by_id(paper_id)
        if not paper:
            return None
        
        # 从sectionIds查询sections
        if "sectionIds" in paper and paper["sectionIds"]:
            sections = find_sections_by_ids(paper["sectionIds"])
            paper["sections"] = sections
        else:
            paper["sections"] = []
        
        return paper

    @abstractmethod
    def find_by_user_or_filters(
        self,
        skip: int,
        limit: int,
        sort_by: str,
        sort_order: int,
        search: Optional[str],
        filters: Optional[Dict[str, Any]],
        **kwargs
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        根据用户或筛选条件查询论文列表
        """
        pass

    def search(
        self,
        keyword: str,
        skip: int = 0,
        limit: int = 20,
        **kwargs
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        基础全文搜索
        """
        query: Dict[str, Any] = {"$text": {"$search": keyword}}
        
        # 添加子类特有的搜索条件
        query.update(self.get_search_filters(**kwargs))

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

    @abstractmethod
    def get_search_filters(self, **kwargs) -> Dict[str, Any]:
        """获取子类特有的搜索过滤条件"""
        pass

    @abstractmethod
    def get_projection(self, include_score: bool = False) -> Dict[str, Any]:
        """获取查询投影"""
        pass

    def _build_metadata_filters(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """构建元数据过滤条件"""
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