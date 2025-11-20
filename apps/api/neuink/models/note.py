"""
Note 数据模型
处理笔记相关的数据库操作
"""
from typing import Dict, Any, List, Optional, Tuple

from ..services.db import get_db
from ..utils.common import generate_id, get_current_time
from ..config.constants import Collections


class NoteModel:
    """Note 数据模型类"""

    def __init__(self):
        """初始化 Note 模型"""
        self.collection = get_db()[Collections.NOTE]
        self._ensure_indexes()

    def _ensure_indexes(self):
        """确保必要的索引存在"""
        self.collection.create_index("id", unique=True)
        self.collection.create_index("userId")
        self.collection.create_index("userPaperId")
        self.collection.create_index("blockId")
        self.collection.create_index([("userId", 1), ("userPaperId", 1)])
        self.collection.create_index([("userPaperId", 1), ("blockId", 1)])
        self.collection.create_index("createdAt")

    def create(self, note_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建新笔记
        """
<<<<<<< HEAD
        note_id = generate_id()
=======
        # 优先使用前端提供的ID，如果没有则生成新ID
        note_id = note_data.get("id") or generate_id()
>>>>>>> origin/main
        current_time = get_current_time()

        note = {
            "id": note_id,
            "userId": note_data["userId"],
            "userPaperId": note_data["userPaperId"],
            "blockId": note_data["blockId"],
            "content": note_data["content"],  # InlineContent[] 格式
            "createdAt": current_time,
            "updatedAt": current_time,
        }

<<<<<<< HEAD
=======
        # 如果提供了 plainText 字段，也保存到数据库
        if "plainText" in note_data:
            note["plainText"] = note_data["plainText"]

>>>>>>> origin/main
        self.collection.insert_one(note)
        return note

    def find_by_id(self, note_id: str) -> Optional[Dict[str, Any]]:
        """
        根据ID查找笔记
<<<<<<< HEAD
        """
=======
        只使用前端生成的UUID格式的id字段
        """
        # 只使用"id"字段查找（前端生成的UUID）
        # 明确排除 _id 字段，防止它覆盖前端传入的 id
>>>>>>> origin/main
        return self.collection.find_one({"id": note_id}, {"_id": 0})

    def find_by_user_paper(
        self,
        user_paper_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        查询某篇个人论文的所有笔记
        """
        query = {"userPaperId": user_paper_id}
        total = self.collection.count_documents(query)
        
        notes = list(
            self.collection.find(query, {"_id": 0})
            .sort("createdAt", -1)
            .skip(skip)
            .limit(limit)
        )
        
        return notes, total

    def find_by_block(
        self,
        user_paper_id: str,
        block_id: str,
    ) -> List[Dict[str, Any]]:
        """
        查询某个 block 的所有笔记
        """
        query = {
            "userPaperId": user_paper_id,
            "blockId": block_id,
        }
        
        return list(
            self.collection.find(query, {"_id": 0})
            .sort("createdAt", -1)
        )

    def find_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        查询用户的所有笔记
        """
        query = {"userId": user_id}
        total = self.collection.count_documents(query)
        
        notes = list(
            self.collection.find(query, {"_id": 0})
            .sort("createdAt", -1)
            .skip(skip)
            .limit(limit)
        )
        
        return notes, total

    def search_by_content(
        self,
        user_id: str,
        keyword: str,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        搜索笔记内容
        注意：这里简化处理，实际需要遍历 InlineContent[] 中的 text 节点
        """
        # 构建正则表达式搜索 content 数组中的 text 节点
        query = {
            "userId": user_id,
            "content.content": {"$regex": keyword, "$options": "i"}
        }
        
        total = self.collection.count_documents(query)
        notes = list(
            self.collection.find(query, {"_id": 0})
            .sort("createdAt", -1)
            .skip(skip)
            .limit(limit)
        )
        
        return notes, total

<<<<<<< HEAD
    def update(self, note_id: str, update_data: Dict[str, Any]) -> bool:
        """
        更新笔记
        """
        update_data["updatedAt"] = get_current_time()
=======
    def update(self, note_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        更新笔记，返回更新后的笔记数据
        只使用前端生成的UUID格式的id字段
        """
        update_data["updatedAt"] = get_current_time()
        
        # 只使用"id"字段更新（前端生成的UUID）
>>>>>>> origin/main
        result = self.collection.update_one(
            {"id": note_id},
            {"$set": update_data}
        )
<<<<<<< HEAD
        return result.modified_count > 0
=======
        
        # 如果更新成功，返回更新后的笔记数据
        if result.modified_count > 0:
            return self.find_by_id(note_id)
        
        # 如果没有修改任何内容，可能是数据相同，仍然返回当前笔记数据
        return self.find_by_id(note_id)
>>>>>>> origin/main

    def delete(self, note_id: str) -> bool:
        """
        删除笔记
<<<<<<< HEAD
        """
=======
        只使用前端生成的UUID格式的id字段
        """
        # 只使用"id"字段删除（前端生成的UUID）
>>>>>>> origin/main
        result = self.collection.delete_one({"id": note_id})
        return result.deleted_count > 0

    def delete_by_user_paper(self, user_paper_id: str) -> int:
        """
        删除某篇个人论文的所有笔记
        返回删除的数量
        """
        result = self.collection.delete_many({"userPaperId": user_paper_id})
        return result.deleted_count

    def count_by_user_paper(self, user_paper_id: str) -> int:
        """
        统计某篇论文的笔记数量
        """
        return self.collection.count_documents({"userPaperId": user_paper_id})

    def count_by_user(self, user_id: str) -> int:
        """
        统计用户的笔记总数
        """
        return self.collection.count_documents({"userId": user_id})