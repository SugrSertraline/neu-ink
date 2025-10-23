"""
Paper 数据模型
处理论文相关的数据库操作
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from bson import ObjectId

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
        # 创建索引以提高查询性能
        self.collection.create_index("id", unique=True)
        self.collection.create_index("isPublic")
        self.collection.create_index("createdBy")
        self.collection.create_index([("metadata.title", "text"), ("metadata.titleZh", "text")])
        self.collection.create_index("createdAt")

    def create(self, paper_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建新论文
        
        Args:
            paper_data: 论文数据
            
        Returns:
            创建的论文数据
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
            "parseStatus": paper_data.get("parseStatus", {
                "status": "completed",
                "progress": 100,
                "message": "论文已就绪"
            }),
            "createdAt": current_time,
            "updatedAt": current_time
        }

        self.collection.insert_one(paper)
        return paper

    def find_by_id(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """
        根据ID查找论文
        
        Args:
            paper_id: 论文ID
            
        Returns:
            论文数据或None
        """
        paper = self.collection.find_one({"id": paper_id}, {"_id": 0})
        return paper

    def find_all(
        self,
        is_public: Optional[bool] = None,
        created_by: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "createdAt",
        sort_order: int = -1
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        查询论文列表
        
        Args:
            is_public: 是否公开（None表示不筛选）
            created_by: 创建者ID
            skip: 跳过数量
            limit: 返回数量
            sort_by: 排序字段
            sort_order: 排序顺序（1升序，-1降序）
            
        Returns:
            (论文列表, 总数)
        """
        query = {}
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
        limit: int = 20
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        搜索论文
        
        Args:
            keyword: 搜索关键词
            is_public: 是否公开
            skip: 跳过数量
            limit: 返回数量
            
        Returns:
            (论文列表, 总数)
        """
        query = {"$text": {"$search": keyword}}
        if is_public is not None:
            query["isPublic"] = is_public

        total = self.collection.count_documents(query)
        papers = list(
            self.collection.find(query, {"_id": 0, "score": {"$meta": "textScore"}})
            .sort([("score", {"$meta": "textScore"})])
            .skip(skip)
            .limit(limit)
        )
        
        return papers, total

    def update(self, paper_id: str, update_data: Dict[str, Any]) -> bool:
        """
        更新论文
        
        Args:
            paper_id: 论文ID
            update_data: 更新数据
            
        Returns:
            是否更新成功
        """
        update_data["updatedAt"] = get_current_time()
        
        result = self.collection.update_one(
            {"id": paper_id},
            {"$set": update_data}
        )
        
        return result.modified_count > 0

    def delete(self, paper_id: str) -> bool:
        """
        删除论文
        
        Args:
            paper_id: 论文ID
            
        Returns:
            是否删除成功
        """
        result = self.collection.delete_one({"id": paper_id})
        return result.deleted_count > 0

    def exists(self, paper_id: str) -> bool:
        """
        检查论文是否存在
        
        Args:
            paper_id: 论文ID
            
        Returns:
            是否存在
        """
        return self.collection.count_documents({"id": paper_id}, limit=1) > 0

    def get_statistics(self) -> Dict[str, Any]:
        """
        获取论文统计信息
        
        Returns:
            统计数据
        """
        total = self.collection.count_documents({})
        public_count = self.collection.count_documents({"isPublic": True})
        private_count = total - public_count

        return {
            "total": total,
            "public": public_count,
            "private": private_count
        }
