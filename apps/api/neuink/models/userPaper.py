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
        # 全文搜索索引
        self.collection.create_index([
            ("paperData.metadata.title", "text"),
            ("paperData.metadata.titleZh", "text"),
            ("paperData.abstract.en", "text"),
            ("paperData.abstract.zh", "text"),
        ])
        self.collection.create_index("customTags")
        self.collection.create_index("readingStatus")
        self.collection.create_index("priority")
        self.collection.create_index("addedAt")
        # 新增：阅读相关索引
        self.collection.create_index("lastReadTime")

    def create(self, user_paper_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建新的个人论文库条目
        """
        user_paper_id = generate_id()
        current_time = get_current_time()

        user_paper = {
            "id": user_paper_id,
            "userId": user_paper_data["userId"],
            "sourcePaperId": user_paper_data.get("sourcePaperId"),
            "paperData": user_paper_data["paperData"],
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
        return user_paper

    def find_by_id(self, user_paper_id: str) -> Optional[Dict[str, Any]]:
        """
        根据ID查找个人论文
        """
        return self.collection.find_one({"id": user_paper_id}, {"_id": 0})

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

        projection = {"_id": 0}
        
        # 全文搜索
        if search:
            query = dict(base_query)
            query["$text"] = {"$search": search}
            projection["score"] = {"$meta": "textScore"}
            
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