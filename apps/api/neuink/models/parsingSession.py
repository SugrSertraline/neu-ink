"""
解析会话模型
用于存储和管理文本解析会话的状态，支持页面刷新后恢复流式连接
"""
import json
import time
from typing import Dict, Any, Optional, List
from ..services.db import get_db_service

class ParsingSessionModel:
    """解析会话数据模型"""
    
    def __init__(self):
        self.db_service = get_db_service()
        self.collection_name = "parsing_sessions"
    
    def create_session(
        self,
        session_id: str,
        user_id: str,
        paper_id: str,
        section_id: str,
        text: str,
        after_block_id: Optional[str] = None,
        is_admin: bool = False,
        user_paper_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        创建新的解析会话
        
        Args:
            session_id: 会话唯一标识
            user_id: 用户ID
            paper_id: 论文ID
            section_id: 章节ID
            text: 待解析的文本
            after_block_id: 在指定block后插入
            is_admin: 是否为管理员操作
            user_paper_id: 用户论文ID（个人论文时使用）
            
        Returns:
            创建的会话数据
        """
        session_data = {
            "_id": session_id,
            "userId": user_id,
            "paperId": paper_id,
            "sectionId": section_id,
            "text": text,
            "afterBlockId": after_block_id,
            "isAdmin": is_admin,
            "userPaperId": user_paper_id,
            "status": "pending",  # pending, processing, completed, failed
            "progress": 0,
            "message": "准备解析文本...",
            "createdAt": time.time(),
            "updatedAt": time.time(),
            "progressBlockId": None,  # 进度块ID
            "completedBlocks": [],  # 已完成的blocks
            "error": None
        }
        
        self.db_service.insert_one(self.collection_name, session_data)
        return session_data
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        获取解析会话
        
        Args:
            session_id: 会话ID
            
        Returns:
            会话数据或None
        """
        return self.db_service.find_one(self.collection_name, {"_id": session_id})
    
    def update_session(
        self,
        session_id: str,
        update_data: Dict[str, Any]
    ) -> bool:
        """
        更新解析会话
        
        Args:
            session_id: 会话ID
            update_data: 更新的数据
            
        Returns:
            是否更新成功
        """
        update_data["updatedAt"] = time.time()
        result = self.db_service.update_one(
            self.collection_name,
            {"_id": session_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    def update_progress(
        self,
        session_id: str,
        status: str,
        progress: int,
        message: str,
        progress_block_id: Optional[str] = None,
        completed_blocks: Optional[List[Dict[str, Any]]] = None,
        error: Optional[str] = None
    ) -> bool:
        """
        更新解析进度
        
        Args:
            session_id: 会话ID
            status: 状态
            progress: 进度百分比
            message: 进度消息
            progress_block_id: 进度块ID
            completed_blocks: 已完成的blocks
            error: 错误信息
            
        Returns:
            是否更新成功
        """
        update_data = {
            "status": status,
            "progress": progress,
            "message": message,
            "updatedAt": time.time()
        }
        
        if progress_block_id:
            update_data["progressBlockId"] = progress_block_id
            
        if completed_blocks:
            update_data["completedBlocks"] = completed_blocks
            
        if error:
            update_data["error"] = error
            
        return self.update_session(session_id, update_data)
    
    def complete_session(
        self,
        session_id: str,
        completed_blocks: List[Dict[str, Any]],
        paper_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        完成解析会话
        
        Args:
            session_id: 会话ID
            completed_blocks: 完成的blocks
            paper_data: 更新后的论文数据
            
        Returns:
            是否更新成功
        """
        update_data = {
            "status": "completed",
            "progress": 100,
            "message": "解析完成",
            "completedBlocks": completed_blocks,
            "updatedAt": time.time()
        }
        
        if paper_data:
            update_data["paperData"] = paper_data
            
        return self.update_session(session_id, update_data)
    
    def fail_session(
        self,
        session_id: str,
        error: str
    ) -> bool:
        """
        标记解析会话失败
        
        Args:
            session_id: 会话ID
            error: 错误信息
            
        Returns:
            是否更新成功
        """
        update_data = {
            "status": "failed",
            "error": error,
            "message": f"解析失败: {error}",
            "updatedAt": time.time()
        }
        
        return self.update_session(session_id, update_data)
    
    def get_active_sessions_by_user(
        self,
        user_id: str,
        paper_id: Optional[str] = None,
        section_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        获取用户的活跃解析会话
        
        Args:
            user_id: 用户ID
            paper_id: 可选的论文ID过滤
            section_id: 可选的章节ID过滤
            
        Returns:
            活跃会话列表
        """
        query = {
            "userId": user_id,
            "status": {"$in": ["pending", "processing"]}
        }
        
        if paper_id:
            query["paperId"] = paper_id
            
        if section_id:
            query["sectionId"] = section_id
            
        return list(self.db_service.find(
            self.collection_name,
            query,
            sort=[("createdAt", -1)]
        ))
    
    def get_sessions_by_section(
        self,
        user_id: str,
        paper_id: str,
        section_id: str,
        is_admin: bool = False
    ) -> List[Dict[str, Any]]:
        """
        获取指定section的所有解析会话
        
        Args:
            user_id: 用户ID
            paper_id: 论文ID
            section_id: 章节ID
            is_admin: 是否为管理员操作
            
        Returns:
            会话列表
        """
        query = {
            "userId": user_id,
            "paperId": paper_id,
            "sectionId": section_id,
            "isAdmin": is_admin
        }
        
        # 转换时间戳为ISO字符串格式
        sessions = list(self.db_service.find(
            self.collection_name,
            query,
            sort=[("createdAt", -1)]
        ))
        
        # 格式化时间戳
        for session in sessions:
            if "createdAt" in session:
                session["createdAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(session["createdAt"]))
            if "updatedAt" in session:
                session["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(session["updatedAt"]))
        
        return sessions
    
    def cleanup_old_sessions(self, max_age_hours: int = 24) -> int:
        """
        清理旧的解析会话
        
        Args:
            max_age_hours: 最大保留时间（小时）
            
        Returns:
            清理的会话数量
        """
        cutoff_time = time.time() - (max_age_hours * 3600)
        result = self.db_service.delete_many(
            self.collection_name,
            {
                "createdAt": {"$lt": cutoff_time},
                "status": {"$in": ["completed", "failed"]}
            }
        )
        return result.deleted_count
    
    def delete_session(self, session_id: str) -> bool:
        """
        删除解析会话
        
        Args:
            session_id: 会话ID
            
        Returns:
            是否删除成功
        """
        result = self.db_service.delete_one(
            self.collection_name,
            {"_id": session_id}
        )
        return result.deleted_count > 0

# 全局实例
_parsing_session_model: Optional[ParsingSessionModel] = None

def get_parsing_session_model() -> ParsingSessionModel:
    """获取解析会话模型全局实例"""
    global _parsing_session_model
    if _parsing_session_model is None:
        _parsing_session_model = ParsingSessionModel()
    return _parsing_session_model