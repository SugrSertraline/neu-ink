"""
解析块模型
用于存储和管理文本解析结果，支持用户确认后再插入论文
"""
import time
from typing import Dict, Any, List, Optional
from ..services.db import get_db_service
from ..utils.common import generate_id

class ParseBlocksModel:
    """解析块数据模型"""
    
    def __init__(self):
        self.db = get_db_service()
        self.collection = "parse_blocks"

    def create_record(
        self,
        parse_id: str,
        user_id: str,
        paper_id: str,
        section_id: str,
        text: str,
        after_block_id: Optional[str],
        insert_index: int,
        temp_block_id: str,
        is_admin: bool = False,
        user_paper_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """创建新的解析记录"""
        now = time.time()
        doc = {
            "_id": parse_id,  # MongoDB主键
            "id": parse_id,   # 额外的id字段，便于查询
            "userId": user_id,
            "paperId": paper_id,
            "userPaperId": user_paper_id,
            "sectionId": section_id,
            "isAdmin": is_admin,
            "text": text,
            "afterBlockId": after_block_id,
            "insertIndex": insert_index,
            "tempBlockId": temp_block_id,
            "status": "pending",
            "progress": 0,
            "message": "准备解析文本",
            "error": None,
            "blocks": [],
            "createdAt": now,
            "updatedAt": now,
            "expiresAt": now + 7 * 24 * 3600  # 7天后过期
        }
        self.db.insert_one(self.collection, doc)
        return doc

    def update_record(self, parse_id: str, update: Dict[str, Any]) -> bool:
        """更新解析记录"""
        update["updatedAt"] = time.time()
        # 优先使用_id查询，如果失败则尝试id字段
        result = self.db.update_one(
            self.collection,
            {"_id": parse_id},
            {"$set": update}
        )
        if result.modified_count == 0:
            # 如果用_id没找到，尝试用id字段查询
            result = self.db.update_one(
                self.collection,
                {"id": parse_id},
                {"$set": update}
            )
        return result.modified_count > 0

    def set_completed(self, parse_id: str, blocks: List[Dict[str, Any]]) -> bool:
        """标记解析完成"""
        return self.update_record(parse_id, {
            "status": "completed",
            "progress": 100,
            "message": "解析完成",
            "blocks": blocks
        })

    def set_failed(self, parse_id: str, error: str) -> bool:
        """标记解析失败"""
        return self.update_record(parse_id, {
            "status": "failed",
            "progress": 0,
            "message": f"解析失败: {error}",
            "error": error
        })

    def set_consumed(self, parse_id: str) -> bool:
        """标记解析结果已被消费"""
        return self.update_record(parse_id, {
            "status": "consumed"
        })
    
    # 兼容旧的方法名
    def mark_consumed(self, parse_id: str) -> bool:
        """标记解析结果已被消费（兼容旧方法名）"""
        return self.set_consumed(parse_id)

    def find_by_id(self, parse_id: str) -> Optional[Dict[str, Any]]:
        """根据ID查找解析记录"""
        # 优先使用_id查询，如果失败则尝试id字段
        result = self.db.find_one(self.collection, {"_id": parse_id})
        if result is None:
            # 如果用_id没找到，尝试用id字段查询
            result = self.db.find_one(self.collection, {"id": parse_id})
        return result

    def delete(self, parse_id: str) -> bool:
        """删除解析记录"""
        # 优先使用_id查询，如果失败则尝试id字段
        result = self.db.delete_one(self.collection, {"_id": parse_id})
        if result.deleted_count == 0:
            # 如果用_id没找到，尝试用id字段查询
            result = self.db.delete_one(self.collection, {"id": parse_id})
        return result.deleted_count > 0

    def cleanup_expired(self, max_age_hours: int = 24) -> int:
        """清理过期的解析记录"""
        cutoff_time = time.time() - (max_age_hours * 3600)
        result = self.db.delete_many(
            self.collection,
            {
                "expiresAt": {"$lt": cutoff_time},
                "status": {"$in": ["completed", "failed", "consumed"]}
            }
        )
        return result.deleted_count

    def get_user_parse_records(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """获取用户的解析记录"""
        query = {"userId": user_id}
        if status:
            query["status"] = status
        
        return list(self.db.find(
            self.collection,
            query,
            sort=[("createdAt", -1)],
            limit=limit
        ))


# 全局实例
_parse_blocks_model: Optional[ParseBlocksModel] = None

def get_parse_blocks_model() -> ParseBlocksModel:
    """获取ParseBlocksModel全局实例"""
    global _parse_blocks_model
    if _parse_blocks_model is None:
        _parse_blocks_model = ParseBlocksModel()
    return _parse_blocks_model