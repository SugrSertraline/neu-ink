"""
UserPaper 数据模型
处理个人论文库相关的数据库操作
"""
import logging
from typing import Dict, Any, List, Optional, Tuple
from .basePaper import BasePaperModel
from ..config.constants import Collections
from ..utils.common import get_current_time
from .section import find_sections_by_ids

# 初始化logger
logger = logging.getLogger(__name__)


class UserPaperModel(BasePaperModel):
    """UserPaper 数据模型类"""

    def get_collection_name(self) -> str:
        """返回集合名称"""
        return Collections.USER_PAPER

    def _ensure_indexes(self):
        """确保必要的索引存在"""
        import logging
        logger = logging.getLogger(__name__)
        collection_name = self.get_collection_name()
        
        logger.info(f"开始为集合 {collection_name} 创建用户论文特有索引")
        
        # 先调用父类的索引创建方法
        super()._ensure_indexes()
        
        # 添加用户论文特有的索引
        try:
            self.collection.create_index("userId")
            logger.info(f"集合 {collection_name}: 创建索引 userId")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 userId 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("sourcePaperId")
            logger.info(f"集合 {collection_name}: 创建索引 sourcePaperId")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 sourcePaperId 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index([("userId", 1), ("sourcePaperId", 1)])
            logger.info(f"集合 {collection_name}: 创建复合索引 userId, sourcePaperId")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建复合索引失败 - {str(e)}")
        
        # 全文搜索索引 - 添加异常处理避免索引冲突
        try:
            self.collection.create_index([
                ("metadata.title", "text"),
                ("metadata.titleZh", "text"),
                ("abstract.en", "text"),
                ("abstract.zh", "text"),
            ])
            logger.info(f"集合 {collection_name}: 创建扩展全文索引 metadata.title, metadata.titleZh, abstract.en, abstract.zh")
        except Exception as e:
            # 如果索引已存在或类似索引已存在，忽略错误
            # 这通常发生在数据库结构变更后，旧索引仍存在的情况
            error_msg = str(e).lower()
            logger.warning(f"集合 {collection_name}: 创建扩展全文索引失败 - {str(e)}")
            if any(keyword in error_msg for keyword in ["already exists", "indexoptionsconflict", "duplicate"]):
                # 索引已存在，跳过创建
                logger.info(f"集合 {collection_name}: 索引已存在，跳过创建")
                pass
            else:
                # 其他类型的错误，重新抛出
                logger.error(f"集合 {collection_name}: 创建索引时发生未知错误 - {str(e)}")
                raise e
                 
        try:
            self.collection.create_index("customTags")
            logger.info(f"集合 {collection_name}: 创建索引 customTags")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 customTags 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("readingStatus")
            logger.info(f"集合 {collection_name}: 创建索引 readingStatus")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 readingStatus 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("priority")
            logger.info(f"集合 {collection_name}: 创建索引 priority")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 priority 索引失败 - {str(e)}")
            
        try:
            self.collection.create_index("addedAt")
            logger.info(f"集合 {collection_name}: 创建索引 addedAt")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 addedAt 索引失败 - {str(e)}")
            
        # 新增：阅读相关索引
        try:
            self.collection.create_index("lastReadTime")
            logger.info(f"集合 {collection_name}: 创建索引 lastReadTime")
        except Exception as e:
            logger.warning(f"集合 {collection_name}: 创建 lastReadTime 索引失败 - {str(e)}")
            
        logger.info(f"集合 {collection_name} 用户论文特有索引创建完成")

    def get_specific_fields(self, paper_data: Dict[str, Any]) -> Dict[str, Any]:
        """获取用户论文特有的字段"""
        return {
            "userId": paper_data["userId"],
            "sourcePaperId": paper_data.get("sourcePaperId"),
            "customTags": paper_data.get("customTags", []),
            "readingStatus": paper_data.get("readingStatus", "unread"),
            "priority": paper_data.get("priority", "medium"),
            "readingPosition": paper_data.get("readingPosition"),  # blockId 或 None
            "totalReadingTime": paper_data.get("totalReadingTime", 0),  # 秒
            "lastReadTime": paper_data.get("lastReadTime"),  # datetime 或 None
            "remarks": paper_data.get("remarks"),  # 备注
            "addedAt": get_current_time(),
        }

    def find_by_user_and_source(
        self, user_id: str, source_paper_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        查找用户是否已添加某个公共论文
        """
        return self.collection.find_one(
            {"userId": user_id, "sourcePaperId": source_paper_id},
            {"_id": 0}
        )

    def find_by_user_or_filters(
        self,
        skip: int,
        limit: int,
        sort_by: str,
        sort_order: int,
        search: Optional[str],
        filters: Optional[Dict[str, Any]],
        user_id: Optional[str] = None,
        **kwargs
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        根据用户或筛选条件查询论文列表
        """
        base_query = {"userId": user_id}
        
        # 应用筛选条件
        if filters:
            if filters.get("readingStatus"):
                base_query["readingStatus"] = filters["readingStatus"]
            if filters.get("priority"):
                base_query["priority"] = filters["priority"]
            if filters.get("customTag"):
                base_query["customTags"] = {"$in": [filters["customTag"]]}
            if filters.get("hasSource") is not None:
                if filters["hasSource"]:
                    base_query["sourcePaperId"] = {"$ne": None}
                else:
                    base_query["sourcePaperId"] = None

        # 使用列表页面的投影，只返回必要字段，不包括完整的论文数据
        projection = self._list_summary_projection(include_score=bool(search))
        
        # 全文搜索
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

    def find_by_user(
        self,
        user_id: str,
        skip: int,
        limit: int,
        sort_by: str,
        sort_order: int,
        search: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        查询用户的个人论文库列表
        """
        return self.find_by_user_or_filters(
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search,
            filters=filters,
            user_id=user_id
        )

    def count_by_user(self, user_id: str) -> int:
        """
        统计用户的论文数量
        """
        return self.collection.count_documents({"userId": user_id})

    def get_user_statistics(self, user_id: str) -> Dict[str, Any]:
        """
        获取用户的统计信息
        """
        total = self.count_by_user(user_id)
        
        # 按阅读状态统计
        reading_status_stats = {}
        for status in ["unread", "reading", "finished"]:
            count = self.collection.count_documents({
                "userId": user_id,
                "readingStatus": status
            })
            reading_status_stats[status] = count
        
        # 按优先级统计
        priority_stats = {}
        for priority in ["high", "medium", "low"]:
            count = self.collection.count_documents({
                "userId": user_id,
                "priority": priority
            })
            priority_stats[priority] = count
        
        # 统计来源
        from_public = self.collection.count_documents({
            "userId": user_id,
            "sourcePaperId": {"$ne": None}
        })
        uploaded = total - from_public
        
        return {
            "total": total,
            "readingStatus": reading_status_stats,
            "priority": priority_stats,
            "fromPublic": from_public,
            "uploaded": uploaded,
        }

    def get_search_filters(self, **kwargs) -> Dict[str, Any]:
        """获取用户论文特有的搜索过滤条件"""
        user_id = kwargs.get("user_id")
        if user_id:
            return {"userId": user_id}
        return {}

    def get_projection(self, include_score: bool = False) -> Dict[str, Any]:
        """获取查询投影"""
        return self._list_summary_projection(include_score)

    @staticmethod
    def _list_summary_projection(include_score: bool = False) -> Dict[str, Any]:
        """
        列表页面的投影，只返回必要字段
        """
        projection: Dict[str, Any] = {
            "_id": 0,
            "id": 1,
            "userId": 1,
            "sourcePaperId": 1,
            "sectionIds": 1,  # 新增：section ID列表
            "customTags": 1,
            "readingStatus": 1,
            "priority": 1,
            "readingPosition": 1,
            "totalReadingTime": 1,
            "lastReadTime": 1,
            "remarks": 1,
            "addedAt": 1,
            "updatedAt": 1,
            # 返回基本元数据，不包括大字段
            "metadata": 1,
            "abstract": 1,
            "attachments": 1,
        }
        if include_score:
            projection["score"] = {"$meta": "textScore"}
        return projection
    
    def add_references_to_paper(self, user_paper_id: str, references: List[Dict[str, Any]], user_id: str) -> bool:
        """
        添加参考文献到个人论文
        
        Args:
            user_paper_id: 个人论文ID
            references: 参考文献列表
            user_id: 用户ID
            
        Returns:
            是否成功
        """
        try:
            # 获取个人论文
            paper = self.find_by_id(user_paper_id)
            if not paper:
                return False
            
            # 验证权限
            if paper.get("userId") != user_id:
                return False
            
            # 按照ID排序参考文献
            sorted_references = sorted(references, key=lambda x: int(x.get("id", "0")))
            
            # 更新论文的参考文献
            update_data = {"references": sorted_references}
            result = self.update(user_paper_id, update_data)
            
            if result:
                logger.info(f"成功添加 {len(sorted_references)} 条参考文献到个人论文 {user_paper_id}")
                return True
            else:
                logger.error(f"添加参考文献到个人论文失败: {user_paper_id}")
                return False
                
        except Exception as e:
            logger.error(f"添加参考文献到个人论文异常: {str(e)}")
            return False