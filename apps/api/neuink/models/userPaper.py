"""
UserPaper 数据模型
处理个人论文库相关的数据库操作
"""
from typing import Dict, Any, List, Optional, Tuple

from ..services.db import get_db
from ..utils.common import generate_id, get_current_time
from ..config.constants import Collections


class UserPaperModel:
    """UserPaper 数据模型类"""

    def __init__(self):
        """初始化 UserPaper 模型"""
        self.collection = get_db()[Collections.USER_PAPER]
        self._ensure_indexes()

    def _ensure_indexes(self):
        """确保必要的索引存在"""
        self.collection.create_index("id", unique=True)
        self.collection.create_index("userId")
        self.collection.create_index("sourcePaperId")
        self.collection.create_index([("userId", 1), ("sourcePaperId", 1)])
        
        # 全文搜索索引 - 添加异常处理避免索引冲突
        try:
            self.collection.create_index([
                ("metadata.title", "text"),
                ("metadata.titleZh", "text"),
                ("abstract.en", "text"),
                ("abstract.zh", "text"),
            ])
        except Exception as e:
            # 如果索引已存在或类似索引已存在，忽略错误
            # 这通常发生在数据库结构变更后，旧索引仍存在的情况
            error_msg = str(e).lower()
            if any(keyword in error_msg for keyword in ["already exists", "indexoptionsconflict", "duplicate"]):
                # 索引已存在，跳过创建
                pass
            else:
                # 其他类型的错误，重新抛出
                raise e
                
        self.collection.create_index("customTags")
        self.collection.create_index("readingStatus")
        self.collection.create_index("priority")
        self.collection.create_index("addedAt")
        # 新增：阅读相关索引
        self.collection.create_index("lastReadTime")
        # 新增：sectionIds索引
        self.collection.create_index("sectionIds")

    def create(self, user_paper_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建新的个人论文库条目（扁平化结构）
        """
        user_paper_id = generate_id()
        current_time = get_current_time()

        user_paper = {
            "id": user_paper_id,
            "userId": user_paper_data["userId"],
            "sourcePaperId": user_paper_data.get("sourcePaperId"),
            # 扁平化字段
            "metadata": user_paper_data.get("metadata", {}),
            "abstract": user_paper_data.get("abstract"),
            "keywords": user_paper_data.get("keywords", []),
            "references": user_paper_data.get("references", []),
            "attachments": user_paper_data.get("attachments", {}),
            "sectionIds": user_paper_data.get("sectionIds", []),  # section ID列表
            "customTags": user_paper_data.get("customTags", []),
            "readingStatus": user_paper_data.get("readingStatus", "unread"),
            "priority": user_paper_data.get("priority", "medium"),
            "readingPosition": user_paper_data.get("readingPosition"),  # blockId 或 None
            "totalReadingTime": user_paper_data.get("totalReadingTime", 0),  # 秒
            "lastReadTime": user_paper_data.get("lastReadTime"),  # datetime 或 None
            "remarks": user_paper_data.get("remarks"),  # 备注
            "addedAt": current_time,
            "updatedAt": current_time,
        }

        self.collection.insert_one(user_paper)
        # 返回前查询一次，确保不包含任何MongoDB特定对象
        return self.find_by_id(user_paper_id)

    def find_by_id(self, user_paper_id: str) -> Optional[Dict[str, Any]]:
        """
        根据ID查找个人论文（包含sections数据）
        """
        user_paper = self.collection.find_one({"id": user_paper_id}, {"_id": 0})
        if not user_paper:
            return None
            
        # 加载sections数据
        section_ids = user_paper.get("sectionIds", [])
        if section_ids:
            from .section import get_section_model
            section_model = get_section_model()
            
            # 通过sectionIds加载sections数据
            sections = []
            for section_id in section_ids:
                section = section_model.find_by_id(section_id)
                if section:
                    sections.append(section)
            
            # 将sections数据添加到user_paper中
            user_paper["sections"] = sections
        
        return user_paper

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

    def update(self, user_paper_id: str, update_data: Dict[str, Any]) -> bool:
        """
        更新个人论文
        """
        update_data["updatedAt"] = get_current_time()
        result = self.collection.update_one(
            {"id": user_paper_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    def delete(self, user_paper_id: str) -> bool:
        """
        删除个人论文
        """
        result = self.collection.delete_one({"id": user_paper_id})
        return result.deleted_count > 0

    def exists(self, user_paper_id: str) -> bool:
        """
        检查个人论文是否存在
        """
        return self.collection.count_documents({"id": user_paper_id}, limit=1) > 0

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