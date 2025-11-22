"""
Section 数据模型
处理论文章节相关的数据库操作
"""
from typing import Dict, Any, List, Optional, Tuple

from ..services.db import get_db
from ..utils.common import generate_id, get_current_time
from ..config.constants import Collections


class SectionModel:
    """Section 数据模型类"""

    def __init__(self):
        """初始化 Section 模型"""
        self.collection = get_db()[Collections.SECTION]
        self._ensure_indexes()

    def _ensure_indexes(self):
        """确保必要的索引存在"""
        self.collection.create_index("id", unique=True)
        self.collection.create_index("paperId")
        self.collection.create_index("createdAt")
        self.collection.create_index("updatedAt")

    def create(self, section_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建新章节
        """
        section_id = section_data.get("id") or generate_id()
        current_time = get_current_time()

        section = {
            "id": section_id,
            "paperId": section_data.get("paperId"),
            "title": section_data.get("title", ""),
            "titleZh": section_data.get("titleZh", ""),
            "content": section_data.get("content", []),
            "createdAt": current_time,
            "updatedAt": current_time,
        }

        self.collection.insert_one(section)
        # 返回前查询一次，确保不包含任何MongoDB特定对象
        return self.find_by_id(section_id)

    def find_by_id(self, section_id: str) -> Optional[Dict[str, Any]]:
        """
        根据ID查找章节
        """
        return self.collection.find_one({"id": section_id}, {"_id": 0})

    def find_by_paper_id(self, paper_id: str) -> List[Dict[str, Any]]:
        """
        根据论文ID查找所有章节
        """
        try:
            sections = list(self.collection.find({"paperId": paper_id}, {"_id": 0}).sort("createdAt", 1))
            return sections
        except Exception as e:
            raise e

    def update(self, section_id: str, update_data: Dict[str, Any]) -> bool:
        """
        更新章节
        """
        # 检查是否是嵌套字段更新（如 content.0）
        has_nested_fields = any('.' in key for key in update_data.keys())
        
        if has_nested_fields:
            # 对于嵌套字段，不添加updatedAt到根级别
            result = self.collection.update_one({"id": section_id}, {"$set": update_data})
        else:
            # 对于非嵌套字段，添加updatedAt
            update_data["updatedAt"] = get_current_time()
            result = self.collection.update_one({"id": section_id}, {"$set": update_data})
        
        return result.modified_count > 0

    def update_direct(self, section_id: str, update_operation: Dict[str, Any]) -> bool:
        """
        直接使用MongoDB更新操作（如$pull, $push等）
        """
        # 添加updatedAt到根级别
        update_operation["$set"] = update_operation.get("$set", {})
        update_operation["$set"]["updatedAt"] = get_current_time()
        
        result = self.collection.update_one({"id": section_id}, update_operation)
        return result.modified_count > 0

    def delete(self, section_id: str) -> bool:
        """
        删除章节
        """
        result = self.collection.delete_one({"id": section_id})
        return result.deleted_count > 0

    def delete_by_paper_id(self, paper_id: str) -> bool:
        """
        根据论文ID删除所有章节
        """
        result = self.collection.delete_many({"paperId": paper_id})
        return result.deleted_count > 0

    def exists(self, section_id: str) -> bool:
        """
        检查章节是否存在
        """
        return self.collection.count_documents({"id": section_id}, limit=1) > 0

    def get_section_ids_by_paper_id(self, paper_id: str) -> List[str]:
        """
        获取论文的所有章节ID列表
        """
        sections = self.collection.find({"paperId": paper_id}, {"id": 1, "_id": 0})
        return [section["id"] for section in sections]

    def bulk_create(self, sections_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        批量创建章节
        """
        current_time = get_current_time()
        sections = []
        
        for section_data in sections_data:
            section_id = section_data.get("id") or generate_id()
            section = {
                "id": section_id,
                "paperId": section_data.get("paperId"),
                "title": section_data.get("title", ""),
                "titleZh": section_data.get("titleZh", ""),
                "content": section_data.get("content", []),
                "createdAt": current_time,
                "updatedAt": current_time,
            }
            sections.append(section)
        
        if sections:
            self.collection.insert_many(sections)
        
        # 返回创建的章节列表（不包含MongoDB特定对象）
        return [{"id": section["id"], "paperId": section["paperId"], 
                "title": section["title"], "titleZh": section["titleZh"],
                "content": section["content"], "createdAt": section["createdAt"],
                "updatedAt": section["updatedAt"]} for section in sections]


_section_model: Optional[SectionModel] = None


def get_section_model() -> SectionModel:
    global _section_model
    if _section_model is None:
        _section_model = SectionModel()
    return _section_model